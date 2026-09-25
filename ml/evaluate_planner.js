#!/usr/bin/env node
/* Sanchara.AI ML lab — step 3: evaluate the trip planner on random trips.
 * Measures: route km saved by the optimiser (vs visiting in ranked order), budget compliance,
 * meal-timing correctness, stays for every night, and planning time.  Usage: node ml/evaluate_planner.js [trips=300]
 * Output: ml/outputs/planner_metrics.json */
"use strict";
const fs = require("fs");
const path = require("path");
globalThis.window = globalThis;
const R = path.join(__dirname, "..", "assets", "js");
["data/districts", "data/places", "data/food", "data/stays", "engine/core", "engine/model-weights", "engine/recommender", "engine/planner"]
  .forEach((f) => require(path.join(R, f + ".js")));
const S = globalThis.SANCHARA, E = S.engine;
const N = +(process.argv[2] || 300), rnd = E.rng(11), pick = (a) => a[Math.floor(rnd() * a.length)];
const towns = []; S.DISTRICTS.forEach((d) => d.towns.forEach((t) => towns.push({ lat: t.lat, lng: t.lng, label: t.name, district: d.name })));

let saved = [], within = 0, withBudget = 0, fitted = 0, overBefore = 0, meals = 0, mealsOk = 0, nights = 0, nightsOk = 0, ms = [], visits = [];
for (let i = 0; i < N; i++) {
  const days = 1 + Math.floor(rnd() * 3), members = 1 + Math.floor(rnd() * 5);
  const P = { origin: pick(towns), interests: [pick(E.INTERESTS).id, pick(E.INTERESTS).id], days, members,
    group: members === 1 ? "solo" : pick(["couple", "family", "friends", "seniors"]), mode: pick(["car", "cab", "bus", "bike"]),
    budget: pick([1500, 2500, 4000, 6000]) * days, budgetMode: "perPerson", buffer: pick([0, 500, 1000, 2000]) * members,
    startDate: "2026-10-" + String(1 + Math.floor(rnd() * 28)).padStart(2, "0"), startTime: pick(["07:30", "08:30", "09:30", "11:00"]) };
  const t0 = Date.now(), plan = E.plan(P); ms.push(Date.now() - t0);
  if (plan.route.baselineKm > 0) saved.push(plan.route.savedPct);
  visits.push(plan.totals.visits);
  withBudget++;
  if (plan.budget.status !== "over") within++;
  if (plan.adjustments.length) { overBefore++; if (plan.budget.status !== "over") fitted++; }
  plan.days.forEach((d, di) => {
    d.items.filter((x) => x.type === "meal").forEach((m) => { meals++; if (m.start >= m.meal.from - 60 && m.start <= m.meal.to + 90) mealsOk++; });
    if (di < plan.days.length - 1) { nights++; if (d.items.some((x) => x.type === "stay")) nightsOk++; }
  });
}
const avg = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
ms.sort((a, b) => a - b);
const out = {
  trips: N,
  routeSavingPctAvg: +avg(saved).toFixed(1),
  withinBudgetOrBufferPct: +(100 * within / withBudget).toFixed(1),
  overBudgetTripsFixedByAIPct: overBefore ? +(100 * fitted / overBefore).toFixed(1) : 100,
  mealsInCorrectWindowPct: +(100 * mealsOk / Math.max(1, meals)).toFixed(1),
  nightsWithStayPct: +(100 * nightsOk / Math.max(1, nights)).toFixed(1),
  avgPlacesPerTrip: +avg(visits).toFixed(1),
  planningMsMedian: ms[Math.floor(ms.length / 2)], planningMsP95: ms[Math.floor(ms.length * 0.95)]
};
fs.mkdirSync(path.join(__dirname, "outputs"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "outputs", "planner_metrics.json"), JSON.stringify(out, null, 2));
console.log(out);
