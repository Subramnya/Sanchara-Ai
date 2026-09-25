#!/usr/bin/env node
/* Sanchara.AI — engine smoke test (npm test). Runs trips from several districts and checks the invariants. */
"use strict";
const path = require("path");
globalThis.window = globalThis;
const R = path.join(__dirname, "..", "assets", "js");
["data/districts", "data/places", "data/food", "data/stays", "data/images", "engine/core", "engine/model-weights", "engine/recommender", "engine/planner", "engine/assistant-lite"]
  .forEach((f) => require(path.join(R, f + ".js")));
const S = globalThis.SANCHARA, E = S.engine;
S.live = { gmapsDir: () => "https://maps", gmapsPlace: () => "https://maps" };

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log("  ✗ " + msg); } };
const town = (d, t) => { const D = E.districtByName(d); const x = D.towns.find((y) => y.name === t) || D.towns[0]; return { lat: x.lat, lng: x.lng, label: x.name, district: d }; };

const cases = [
  { name: "Bagalkot heritage, 1 day, car", p: { origin: town("Bagalkot", "Bagalkot"), interests: ["heritage", "photography"], days: 1, members: 4, budget: 6000, buffer: 1000, mode: "car" } },
  { name: "Hampi family, 2 days, veg, cab", p: { origin: town("Vijayanagara", "Hampi"), interests: ["heritage", "wildlife", "boating"], days: 2, members: 5, group: "family", budget: 3000, budgetMode: "perPerson", buffer: 2000, mode: "cab", food: "veg" } },
  { name: "Shivamogga trekkers, 3 days, bike", p: { origin: town("Shivamogga", "Shivamogga"), interests: ["trekking", "waterfalls", "wildlife"], days: 3, members: 2, group: "friends", budget: 9000, buffer: 1500, mode: "bike" } },
  { name: "Belagavi seniors, accessible, bus", p: { origin: town("Belagavi", "Belagavi"), interests: ["spiritual", "heritage"], days: 2, members: 3, group: "seniors", budget: 7000, buffer: 1000, mode: "bus", accessible: true } },
  { name: "Tight budget forces AI adjustments", p: { origin: town("Vijayapura", "Vijayapura"), interests: ["heritage", "photography"], days: 3, members: 4, budget: 6000, buffer: 500, mode: "cab", stayTier: "premium" } },
  { name: "Coastal beaches, 2 days", p: { origin: town("Udupi", "Udupi"), interests: ["beaches", "spiritual", "food"], days: 2, members: 2, group: "couple", budget: 12000, buffer: 2000 } },
  { name: "Late start → next morning", p: { origin: town("Dharwad", "Hubballi"), interests: ["nature", "family"], days: 1, members: 3, startTime: "19:30", budget: 4000 } },
  { name: "No budget given", p: { origin: town("Mysuru", "Mysuru"), interests: ["heritage", "museums"], days: 2, members: 2 } }
];

console.log("\nSanchara.AI engine smoke test\n");
cases.forEach((c) => {
  const t0 = Date.now(), plan = E.plan(Object.assign({ startDate: "2026-09-26", startTime: "08:00" }, c.p)), ms = Date.now() - t0;
  const T = plan.totals, B = plan.budget;
  console.log("• " + c.name + " — " + T.visits + " places, " + T.km + " km, " + E.inr(T.total) + " (" + B.status + "), route saved " + plan.route.savedPct + "%, " + ms + " ms" + (plan.adjustments.length ? ", " + plan.adjustments.length + " AI adjustment(s)" : ""));
  ok(plan.days.length === plan.profile.days, "days count");
  ok(T.visits >= 1, "at least one visit");
  ok([T.travel, T.stay, T.food, T.tickets, T.activities, T.total].every((v) => Number.isFinite(v) && v >= 0), "finite non-negative costs");
  ok(T.total === T.travel + T.stay + T.food + T.tickets + T.activities, "total adds up");
  if (B.total > 0) ok(B.status !== "over" || plan.adjustments.length > 0 || plan.suggestions.length > 0, "over-budget plans are adjusted or explained");
  plan.days.forEach((d) => {
    let last = -1;
    d.items.forEach((it) => { if (it.start != null && it.type !== "stay") { ok(it.start >= last - 1, d.label + " timeline is ordered (" + it.type + ")"); last = it.end != null ? it.end : it.start; } });
    const meals = d.items.filter((i) => i.type === "meal").map((i) => i.meal.id);
    ok(new Set(meals).size === meals.length, d.label + " has no duplicate meals");
    d.items.filter((i) => i.type === "meal").forEach((m) => ok(m.start >= m.meal.from - 60 && m.start <= m.meal.to + 90, d.label + " " + m.meal.id + " at a sensible time (" + E.fmtTime(m.start) + ")"));
  });
  if (plan.profile.days > 1) ok(plan.days.slice(0, -1).every((d) => d.items.some((i) => i.type === "stay")), "every night has a stay");
  if (plan.profile.accessible) plan.days.forEach((d) => d.visits.forEach((id) => { const p = E.placeById(id); ok(p.effort <= 2 && p.senior >= 3, "accessible filter " + id); }));
  ok(ms < 4000, "fast enough");
});

[["07:45", "breakfast"], ["13:10", "lunch"], ["17:00", "snacks"], ["20:45", "dinner"]].forEach(([hm, meal]) => {
  const s = E.onSpot({ origin: town("Vijayanagara", "Hampi"), interests: ["heritage", "food"], members: 2, now: "2026-09-25T" + hm + ":00" });
  ok(s.meal && s.meal.id === meal, "on-spot " + hm + " → " + meal);
  ok(s.picks.length >= 3, "on-spot has picks");
});
console.log("• On-the-spot mode: meal windows breakfast/lunch/snacks/dinner ✓");
const a = E.answer("What should I eat for lunch near Badami?", { origin: town("Bagalkot", "Badami") });
ok(/lunch/i.test(a), "offline assistant answers food questions");
console.log("• Offline assistant ✓");
console.log(fails ? "\n✗ " + fails + " check(s) failed\n" : "\n✓ All checks passed\n");
process.exit(fails ? 1 : 0);
