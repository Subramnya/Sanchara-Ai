"""Sanchara.AI ML lab — step 2: train and evaluate the learning-to-rank model.

    pip install -r requirements.txt
    python train_ranker.py            (auto-runs `node generate_dataset.js` if data is missing)

What it does
  1. Loads ml/data/training.csv (simulated tourists × reachable places, 8 observable features, label = chosen).
  2. Splits by TOURIST (80% train / 20% held-out) so the test tourists are completely unseen.
  3. Trains a logistic-regression ranker (scikit-learn) — the same sigmoid(bias + w·x) the browser runs.
  4. Compares it on held-out tourists with baselines: random, nearest-first, most-popular, interest-only and
     the hand-tuned v0 weights, using Precision@5, Recall@10, NDCG@10 and MAP@10.
  5. Exports the learned weights to assets/js/engine/model-weights.js and saves charts + metrics to ml/outputs/.
"""
import datetime
import json
import os
import subprocess
import sys

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupShuffleSplit

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(HERE, "data", "training.csv")
OUT = os.path.join(HERE, "outputs")
FEATURES = ["interest", "proximity", "popularity", "season", "crowdCalm", "groupFit", "budgetFit", "openFit"]
LABELS = {"interest": "Interest match (TF-IDF)", "proximity": "Proximity", "popularity": "Popularity / UNESCO", "season": "Right season",
          "crowdCalm": "Predicted calm (crowd)", "groupFit": "Group fit", "budgetFit": "Budget fit", "openFit": "Open at that time"}
HEURISTIC = {"weights": {"interest": 4.2, "proximity": 1.7, "popularity": 1.5, "season": 0.8, "crowdCalm": 0.5, "groupFit": 0.9, "budgetFit": 0.6, "openFit": 0.9}, "bias": -5.2}

# Chart style (validated palette: laterite #b4532a + blue #2377b4 pass lightness, chroma, CVD and contrast checks)
INK, INK2, MUTED, GRID, SURFACE = "#221b14", "#4b4035", "#7b6f62", "#e7dccb", "#ffffff"
C_MAIN, C_ALT = "#b4532a", "#2377b4"


def ensure_data():
    if not os.path.exists(DATA):
        print("training.csv not found — simulating tourists with Node …")
        subprocess.run(["node", os.path.join(HERE, "generate_dataset.js")], check=True)


def per_tourist_metrics(df, scores, k=5, k2=10):
    df = df.assign(_s=scores)
    p5, r10, ndcg, ap = [], [], [], []
    for _, g in df.groupby("tourist"):
        g = g.sort_values("_s", ascending=False)
        rel = g["chosen"].to_numpy()
        n_rel = rel.sum()
        if n_rel == 0:
            continue
        p5.append(rel[:k].mean())
        r10.append(rel[:k2].sum() / n_rel)
        disc = 1 / np.log2(np.arange(2, k2 + 2))
        dcg = (rel[:k2] * disc[: len(rel[:k2])]).sum()
        ideal = (np.sort(rel)[::-1][:k2] * disc[: min(k2, len(rel))]).sum()
        ndcg.append(dcg / ideal if ideal else 0)
        hits, precs = 0, []
        for i, r in enumerate(rel[:k2]):
            if r:
                hits += 1
                precs.append(hits / (i + 1))
        ap.append(np.sum(precs) / min(n_rel, k2))
    return {"P@5": float(np.mean(p5)), "R@10": float(np.mean(r10)), "NDCG@10": float(np.mean(ndcg)), "MAP@10": float(np.mean(ap))}


def style(ax):
    ax.set_facecolor(SURFACE)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(colors=MUTED, length=0, labelsize=10)
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)


def main():
    ensure_data()
    os.makedirs(OUT, exist_ok=True)
    df = pd.read_csv(DATA)
    n_tourists = df["tourist"].nunique()
    print(f"Loaded {len(df):,} rows · {n_tourists:,} simulated tourists · {df['chosen'].mean():.1%} positives")

    split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    tr_idx, te_idx = next(split.split(df, groups=df["tourist"]))
    train, test = df.iloc[tr_idx], df.iloc[te_idx]

    model = LogisticRegression(C=1.0, class_weight="balanced", max_iter=3000)
    model.fit(train[FEATURES], train["chosen"])
    w = dict(zip(FEATURES, model.coef_[0].round(4).tolist()))
    b = float(round(model.intercept_[0], 4))

    rng = np.random.default_rng(0)
    X = test[FEATURES].to_numpy()
    heur = X @ np.array([HEURISTIC["weights"][f] for f in FEATURES]) + HEURISTIC["bias"]
    methods = {
        "Random": rng.random(len(test)),
        "Nearest first": -test["km"].to_numpy(),
        "Most popular": test["popularity"].to_numpy() - test["km"].to_numpy() / 1e4,
        "Interest only": test["interest"].to_numpy(),
        "Hand-tuned v0": heur,
        "Sanchara (learned)": model.decision_function(test[FEATURES]),
    }
    results = {m: per_tourist_metrics(test, s) for m, s in methods.items()}
    auc = float(roc_auc_score(test["chosen"], methods["Sanchara (learned)"]))
    print("\nHeld-out ranking quality ({} unseen tourists)".format(test["tourist"].nunique()))
    print("{:<20}{:>8}{:>8}{:>10}{:>9}".format("method", "P@5", "R@10", "NDCG@10", "MAP@10"))
    for m, r in results.items():
        print("{:<20}{:>8.3f}{:>8.3f}{:>10.3f}{:>9.3f}".format(m, r["P@5"], r["R@10"], r["NDCG@10"], r["MAP@10"]))
    best_base = max((r["NDCG@10"], m) for m, r in results.items() if m not in ("Sanchara (learned)", "Hand-tuned v0"))
    lift = results["Sanchara (learned)"]["NDCG@10"] / best_base[0] - 1
    print(f"\nLearned model AUC {auc:.3f} · NDCG@10 lift over best simple baseline ({best_base[1]}): {lift:+.0%}")
    print("Learned weights:", w, "bias", b)

    # ---- export weights for the browser ----
    today = datetime.date.today().isoformat()
    model_js = {
        "version": "logreg-" + today, "trainedOn": f"{train['tourist'].nunique()} simulated tourists, {len(train):,} tourist-place pairs",
        "features": FEATURES, "weights": w, "bias": b,
        "metrics": {"heldOutTourists": int(test["tourist"].nunique()), "auc": round(auc, 3),
                    **{k: round(v, 3) for k, v in results["Sanchara (learned)"].items()},
                    "baselineBest": best_base[1], "baselineBestNDCG@10": round(best_base[0], 3), "ndcgLift": round(lift, 3)},
    }
    js = ("/* Sanchara.AI — ranking model weights. GENERATED by ml/train_ranker.py on " + today + " — do not edit by hand.\n"
          " * Logistic-regression learning-to-rank on simulated tourists; score = sigmoid(bias + Σ weight_i × feature_i). */\n"
          "(function (root) {\n  var S = root.SANCHARA = root.SANCHARA || {};\n  S.MODEL = " + json.dumps(model_js, indent=2).replace("\n", "\n  ") +
          ";\n})(typeof window !== \"undefined\" ? window : globalThis);\n")
    with open(os.path.join(ROOT, "assets", "js", "engine", "model-weights.js"), "w", encoding="utf-8") as f:
        f.write(js)
    with open(os.path.join(OUT, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump({"results": results, "auc": auc, "weights": w, "bias": b, "tourists": int(n_tourists), "rows": int(len(df))}, f, indent=2)

    # ---- chart 1: ranking quality ----
    names = list(results.keys())
    x = np.arange(len(names))
    fig, ax = plt.subplots(figsize=(8.6, 4.4), dpi=200)
    fig.patch.set_facecolor(SURFACE)
    style(ax)
    bw = 0.36
    p5 = [results[n]["P@5"] for n in names]
    nd = [results[n]["NDCG@10"] for n in names]
    ax.bar(x - bw / 2 - 0.01, p5, bw, color=C_ALT, label="Precision@5", zorder=3)
    ax.bar(x + bw / 2 + 0.01, nd, bw, color=C_MAIN, label="NDCG@10", zorder=3)
    for xi, v in ((x[-1] - bw / 2 - 0.01, p5[-1]), (x[-1] + bw / 2 + 0.01, nd[-1])):
        ax.text(xi, v + 0.015, f"{v:.2f}", ha="center", va="bottom", fontsize=10, color=INK, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels([n.replace(" (", "\n(").replace("Hand-tuned ", "Hand-tuned\n").replace("Nearest ", "Nearest\n").replace("Most ", "Most\n").replace("Interest ", "Interest\n") for n in names], fontsize=9.5, color=INK2)
    ax.get_xticklabels()[-1].set_fontweight("bold")
    ax.get_xticklabels()[-1].set_color(INK)
    ax.set_ylim(0, max(max(p5), max(nd)) * 1.22)
    ax.set_ylabel("Score on unseen tourists (higher is better)", color=MUTED, fontsize=9.5)
    ax.set_title("Ranking quality — held-out simulated tourists", loc="left", color=INK, fontsize=13, fontweight="bold", pad=12)
    leg = ax.legend(frameon=False, loc="upper left", fontsize=9.5, ncol=2)
    for t in leg.get_texts():
        t.set_color(INK2)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "ranking_quality.png"), facecolor=SURFACE)
    plt.close(fig)

    # ---- chart 2: learned feature weights ----
    order = sorted(FEATURES, key=lambda f: w[f])
    fig, ax = plt.subplots(figsize=(7.2, 4.0), dpi=200)
    fig.patch.set_facecolor(SURFACE)
    style(ax)
    ax.grid(axis="y", visible=False)
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.barh([LABELS[f] for f in order], [w[f] for f in order], height=0.55, color=C_MAIN, zorder=3)
    for i, f in enumerate(order):
        ax.text(w[f] + (0.05 if w[f] >= 0 else -0.05), i, f"{w[f]:+.2f}", va="center", ha="left" if w[f] >= 0 else "right", fontsize=9.5, color=INK2)
    ax.axvline(0, color=MUTED, linewidth=0.8)
    ax.tick_params(axis="y", labelcolor=INK2, labelsize=10)
    ax.set_xlabel("Learned weight (logistic regression)", color=MUTED, fontsize=9.5)
    ax.set_title("What drives a recommendation", loc="left", color=INK, fontsize=13, fontweight="bold", pad=12)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "feature_weights.png"), facecolor=SURFACE)
    plt.close(fig)
    print("\nSaved assets/js/engine/model-weights.js, ml/outputs/metrics.json, ranking_quality.png, feature_weights.png")


if __name__ == "__main__":
    sys.exit(main())
