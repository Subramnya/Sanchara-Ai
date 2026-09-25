# Sanchara.AI — ML lab

```bash
cd ml
pip install -r requirements.txt
node generate_dataset.js 1200 7     # simulate 1,200 tourists with hidden preferences → data/training.csv
python train_ranker.py              # train + evaluate the ranker, export ../assets/js/engine/model-weights.js, charts in outputs/
node evaluate_planner.js 300        # route saving, budget compliance, meal timing, speed → outputs/planner_metrics.json
```

## Latest results (held-out, unseen simulated tourists)
| Method | P@5 | NDCG@10 |
|---|---|---|
| Random | 0.23 | 0.24 |
| Nearest first | 0.55 | 0.52 |
| Most popular | 0.35 | 0.34 |
| Interest only | 0.49 | 0.47 |
| Hand-tuned v0 | 0.62 | 0.57 |
| **Sanchara (learned)** | **0.71** | **0.65** |

The learned model has an AUC of 0.81 and a +26% NDCG@10 lift over the best simple baseline.

Planner over 300 random trips: **28%** shorter routes than ranked order, **99.3%** of plans within budget + buffer, **97.8%** of over-budget trips fixed by the AI, **100%** of meals in the correct time window, **100%** of nights with a stay, and a median of **38 ms** per plan.

*Honest note:* the training data is simulated, because there are no real users yet. The simulator gives each tourist hidden preferences the app never sees, so the model has to generalise. Once the app is live, real 👍/👎 feedback replaces the simulation, using the same training script.
