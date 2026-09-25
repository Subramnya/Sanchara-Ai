#!/usr/bin/env node
/* Sanchara.AI ML lab — step 1: build a training set from simulated tourists.
 *
 * Each synthetic tourist has HIDDEN preferences the app never sees directly: how strongly they care about
 * each interest, secret tag affinities (e.g. loves sunsets, dislikes crowds), personal distance aversion
 * and random taste noise. They "choose" the 10 places they'd most enjoy among those reachable.
 * The app only observes its 8 features (exactly the ones computed in assets/js/engine/recommender.js),
 * so the model must learn how those observable features predict the hidden choices.
 *
 * Output: ml/data/training.csv  (one row per tourist × candidate place)
 * Usage:  node ml/generate_dataset.js [numTourists=1200] [seed=7]
 */
"use strict";
const fs = require("fs");
const path = require("path");
globalThis.window = globalThis;
const R = path.join(__dirname, "..", "assets", "js");
["data/districts", "data/places", "data/food", "data/stays", "engine/core", "engine/model-weights", "engine/recommender", "engine/planner"]
  .forEach((f) => require(path.join(R, f + ".js")));
const S = globalThis.SANCHARA, E = S.engine;

const N = +(process.argv[2] || 1200), SEED = +(process.argv[3] || 7);
const rnd = E.rng(SEED);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const gumbel = () => -Math.log(-Math.log(Math.max(1e-9, rnd())));
const FEATURES = S.MODEL.features;
const BUNDLES = [["heritage", "photography"], ["heritage", "spiritual"], ["nature", "waterfalls"], ["trekking", "adventure"], ["wildlife", "family"],
  ["beaches", "relaxing"], ["boating", "nature"], ["museums", "heritage"], ["food", "shopping"], ["spiritual", "relaxing"]];
const ALL_TAGS = Array.from(new Set(S.PLACES.flatMap((p) => p.tags || [])));
const towns = [];
S.DISTRICTS.forEach((d) => d.towns.forEach((t) => towns.push({ lat: t.lat, lng: t.lng, label: t.name, district: d.name, north: /Kittur|Kalyana/.test(d.region) })));

const rows = [];
for (let u = 0; u < N; u++) {
  // --- observable profile (what the tourist types into the wizard) ---
  const o = rnd() < 0.65 ? pick(towns.filter((t) => t.north)) : pick(towns);
  const interests = new Set(pick(BUNDLES));
  const extra = Math.floor(rnd() * 3);
  for (let i = 0; i < extra; i++) interests.add(pick(E.INTERESTS).id);
  const group = pick(["solo", "couple", "family", "friends", "seniors"]);
  const members = group === "solo" ? 1 : group === "couple" ? 2 : 2 + Math.floor(rnd() * 5);
  const days = 1 + Math.floor(rnd() * 3);
  const month = 1 + Math.floor(rnd() * 12);
  const ppBudget = [800, 1500, 2500, 4000, 7000][Math.floor(rnd() * 5)] * days;
  const P = E.normalizeProfile({ origin: o, interests: Array.from(interests), group, members, days, budget: ppBudget, budgetMode: "perPerson",
    startDate: "2026-" + String(month).padStart(2, "0") + "-12", startTime: "08:30", mode: pick(["car", "car", "cab", "bus", "bike"]) });

  // --- hidden preferences (never shown to the model) ---
  const intensity = {}; P.interests.forEach((i) => { intensity[i] = 0.6 + rnd() * 1.4; });
  const tagLove = {}; for (let k = 0; k < 4; k++) tagLove[pick(ALL_TAGS)] = 0.3 + rnd() * 0.9;
  const distAversion = 0.5 + rnd() * 2.0;          // utility lost per 100 km
  const fameLove = rnd() * 1.2;                     // some tourists chase icons, some don't
  const crowdHate = rnd() * 0.8;

  const cands = E.recommend(P);
  if (cands.length < 15) { u--; continue; }
  const util = cands.map((r) => {
    const p = r.place, acts = p.activities || [];
    let v = 0;
    acts.forEach((a) => { if (intensity[a]) v += intensity[a]; });
    (p.tags || []).forEach((t) => { if (tagLove[t]) v += tagLove[t]; });
    v -= distAversion * r.km / 100;
    v += fameLove * ((p.popularity || 3) - 3) / 2 + (p.unesco ? 0.3 : 0);
    if ((p.bestMonths || []).indexOf(month) >= 0) v += 0.35;
    if (p.category === "waterfall" && month >= 6 && month <= 10) v += 0.4;
    v -= crowdHate * ((p.crowd || 3) - 3) / 2;
    if (group === "family") v += ((p.kid || 3) - 3) * 0.3;
    if (group === "seniors") v -= ((p.effort || 2) - 2) * 0.45;
    if (group === "friends" && (p.effort || 2) >= 3) v += 0.3;
    if (((p.fee || 0) + (p.extraCost || 0)) > ppBudget * 0.08) v -= 0.6;
    return v + 0.55 * gumbel();
  });
  const order = util.map((v, i) => i).sort((a, b) => util[b] - util[a]);
  const chosen = new Set(order.slice(0, 10));
  cands.forEach((r, i) => {
    rows.push([u, r.place.id].concat(FEATURES.map((k) => r.f[k].toFixed(5))).concat([chosen.has(i) ? 1 : 0,
      r.km.toFixed(1), r.place.popularity, P.interests.join("|"), group, days]).join(","));
  });
  if ((u + 1) % 200 === 0) process.stdout.write("  simulated " + (u + 1) + " tourists\n");
}
const out = path.join(__dirname, "data");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "training.csv"), ["tourist,place_id," + FEATURES.join(",") + ",chosen,km,popularity,interests,group,days"].concat(rows).join("\n"));
console.log("Wrote ml/data/training.csv — " + rows.length + " rows from " + N + " simulated tourists.");
