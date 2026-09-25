/* Sanchara.AI — trip planner.
 * Orienteering tour (greedy cheapest insertion: relevance minus detour penalty) → 2-opt route polish → day-by-day
 * time-window scheduling (opening hours, meals at the right time incl. meal stops on the way, sunset,
 * night stay) → budget + buffer optimiser (tier downgrades, then drop the stop that saves most per point of relevance). */
(function (root) {
  "use strict";
  var S = root.SANCHARA, E = S.engine;
  var TIERS = ["budget", "comfort", "premium"];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hhmm(d) { return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }

  E.normalizeProfile = function (p) {
    var o = {}; for (var k in p) o[k] = p[k];
    o.days = clamp(Math.round(+o.days || 1), 1, 7);
    o.members = clamp(Math.round(+o.members || 1), 1, 60);
    o.mode = E.MODES[o.mode] ? o.mode : "car";
    o.pace = E.PACE[o.pace] ? o.pace : "balanced";
    o.food = o.food || "any";
    o.budget = Math.max(0, +o.budget || 0);
    o.buffer = Math.max(0, +o.buffer || 0);
    o.budgetMode = o.budgetMode === "perPerson" ? "perPerson" : "total";
    o.startDate = o.startDate || E.isoDate(new Date());
    o.startTime = o.startTime || "08:30";
    o.returnToOrigin = o.returnToOrigin !== false;
    o.interests = (o.interests && o.interests.length) ? o.interests.slice() : ["heritage", "nature", "photography"];
    o.feedback = o.feedback || { liked: [], disliked: [] };
    o.exclude = (o.exclude || []).slice();
    o.pinned = (o.pinned || []).slice();
    o.group = o.group || (o.members === 1 ? "solo" : o.members === 2 ? "couple" : "friends");
    o.stayTier = o.stayTier || "auto";
    return o;
  };
  E.totalBudget = function (P) { return P.budgetMode === "perPerson" ? P.budget * P.members : P.budget; };
  E.rooms = function (members, group) { return group === "solo" ? 1 : Math.ceil(members / (group === "family" ? 3 : 2)); };
  E.vehicles = function (members, modeId) { var m = E.MODES[modeId]; return m.perPerson ? members : Math.ceil(members / m.capacity); };

  /* ---------- Food & stay suggestions ---------- */
  E.suggestFood = function (pt, mealId, pref, limit) {
    limit = limit || 3;
    var loc = E.locate(pt) || {}, district = loc.district;
    var dishes = (S.DISHES || []).filter(function (d) {
      return d.meals.indexOf(mealId) >= 0 && !(pref === "veg" && !d.veg);
    }).map(function (d) {
      var s = 0;
      if (d.districts.indexOf(district) >= 0) s = 3;
      else {
        var near = Infinity;
        d.districts.forEach(function (n) { var x = E.districtByName(n); if (x) near = Math.min(near, E.haversine(pt, x)); });
        if (near < 170) s = 2.4 - near / 340;
        else if (d.districts.indexOf("*") >= 0) s = 2;
      }
      if (pref === "nonveg" && !d.veg) s += 0.5;
      return { dish: d, s: s };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, limit).map(function (x) { return x.dish; });
    var eateries = (S.EATERIES || []).filter(function (e) {
      return e.meals.indexOf(mealId) >= 0 && !(pref === "veg" && e.veg === "nonveg");
    }).map(function (e) { return { eatery: e, km: E.roadKm(pt, e) }; })
      .filter(function (x) { return x.km <= 30; }).sort(function (a, b) { return a.km - b.km; }).slice(0, 3);
    var what = { breakfast: "breakfast", lunch: pref === "veg" ? "veg meals" : "restaurants", snacks: "snacks", dinner: pref === "veg" ? "veg restaurants" : "restaurants" }[mealId];
    return {
      meal: E.mealById(mealId), town: loc.town, district: district, dishes: dishes, eateries: eateries,
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(what + " near " + (loc.town || "") + ", Karnataka")
    };
  };

  E.suggestStays = function (pt, tier, limit, toward) {
    var ti = TIERS.indexOf(tier); if (ti < 0) ti = 1;
    var target = E.STAY_PRICE[TIERS[ti]];
    var arr = (S.STAYS || []).map(function (s) {
      var km = E.roadKm(pt, s), mid = (s.price[0] + s.price[1]) / 2;
      var cost = km + Math.abs(TIERS.indexOf(s.tier) - ti) * 14 + (toward ? E.roadKm(s, toward) * 0.3 : 0) - (s.govt ? 4 : 0) +
        (ti < 2 ? Math.max(0, mid - target * 1.3) / 120 : 0);
      return { stay: s, km: km, cost: cost, mid: mid };
    }).filter(function (x) { return x.km <= 75 && (ti === 2 || x.mid <= target * 2.2); })
      .sort(function (a, b) { return a.cost - b.cost; }).slice(0, limit || 3);
    var loc = E.locate(pt) || {};
    return { stays: arr, town: loc.town, mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((ti === 0 ? "budget lodges" : ti === 2 ? "best hotels" : "hotels") + " in " + (loc.town || "") + ", Karnataka") };
  };

  /* ---------- Routing ---------- */
  E.routeOrder = function (start, places) {
    var rem = places.slice(), order = [], cur = start;
    while (rem.length) {
      var bi = 0, bd = Infinity;
      for (var i = 0; i < rem.length; i++) { var d = E.haversine(cur, rem[i]); if (d < bd) { bd = d; bi = i; } }
      cur = rem.splice(bi, 1)[0]; order.push(cur);
    }
    var improved = true, guard = 0;
    while (improved && guard++ < 60) {
      improved = false;
      for (var a = 0; a < order.length - 1; a++) for (var b = a + 1; b < order.length; b++) {
        var A = a === 0 ? start : order[a - 1], B = order[a], C = order[b], Dn = order[b + 1];
        var before = E.haversine(A, B) + (Dn ? E.haversine(C, Dn) : 0);
        var after = E.haversine(A, C) + (Dn ? E.haversine(B, Dn) : 0);
        if (after + 1e-6 < before) { var seg = order.slice(a, b + 1).reverse(); Array.prototype.splice.apply(order, [a, seg.length].concat(seg)); improved = true; }
      }
    }
    return order;
  };
  E.pathKm = function (start, pts) { var km = 0, cur = start; pts.forEach(function (p) { km += E.roadKm(cur, p); cur = p; }); return km; };

  /* ---------- Trip route: orienteering heuristic ----------
   * Greedily insert the place with the best gain (relevance minus a detour-time penalty) at its cheapest
   * position, while the trip's time budget and pace allow, then polish the tour with 2-opt. */
  E.twoOpt = function (start, order, end) {
    var improved = true, guard = 0, d = E.haversine;
    while (improved && guard++ < 80) {
      improved = false;
      for (var a = 0; a < order.length - 1; a++) for (var b = a + 1; b < order.length; b++) {
        var A = a === 0 ? start : order[a - 1], B = order[a], C = order[b], Dn = b + 1 < order.length ? order[b + 1] : end;
        var before = d(A, B) + (Dn ? d(C, Dn) : 0), after = d(A, C) + (Dn ? d(B, Dn) : 0);
        if (after + 1e-6 < before) { var seg = order.slice(a, b + 1).reverse(); Array.prototype.splice.apply(order, [a, seg.length].concat(seg)); improved = true; }
      }
    }
    return order;
  };
  E.buildTour = function (P, pool, pace, availMins, maxStops) {
    var mode = P.mode, start = P.origin, end = P.returnToOrigin ? P.origin : null, route = [], used = 0, chosen = {};
    var M = E.MODES[mode], units = M.perPerson ? P.members : E.vehicles(P.members, mode), budget = Math.max(2500, E.totalBudget(P) || 12000);
    function tm(a, b) { return E.driveMins(E.roadKm(a, b), mode); }
    var cands = pool.slice(0, 70), slots = 0;
    function weight(p) {
      if ((p.duration || 1) <= 0.75) return 0.5;
      for (var j = 0; j < route.length; j++) if (E.haversine(route[j].place, p) < 1.5) return 0.5;
      return 1;
    }
    while (slots < maxStops) {
      var best = null, covered = {};
      route.forEach(function (x) { (x.place.activities || []).forEach(function (a) { covered[a] = 1; }); });
      for (var c = 0; c < cands.length; c++) {
        var r = cands[c], p = r.place; if (chosen[p.id]) continue;
        var visit = p.duration * 60 * pace.visitScale, bi = 0, bd = Infinity;
        for (var i = 0; i <= route.length; i++) {
          var prev = i === 0 ? start : route[i - 1].place, next = i === route.length ? end : route[i].place;
          var det = tm(prev, p) + (next ? tm(p, next) - tm(prev, next) : 0);
          if (det < bd) { bd = det; bi = i; }
        }
        if (used + visit + bd > availMins) continue;
        if (slots + weight(p) > maxStops + 0.01) continue;
        var fresh = (P.interests || []).filter(function (i) { return !covered[i] && (p.activities || []).indexOf(i) >= 0; }).length;
        var detKm = bd / 60 * M.speed, rupees = detKm * M.perKm * units;
        var gain = Math.pow(r.score, 1.5) - 0.13 * (bd / 60) - 0.02 * (visit / 60) - 0.6 * rupees / budget + 0.07 * fresh + (r.pinned ? 2 : 0);
        if (!best || gain > best.ratio) best = { r: r, i: bi, cost: visit + bd, ratio: gain };
      }
      if (!best) break;
      slots += weight(best.r.place); route.splice(best.i, 0, best.r); chosen[best.r.place.id] = true; used += best.cost;
    }
    var places = E.twoOpt(start, route.map(function (r) { return r.place; }), end);
    var byId = {}; route.forEach(function (r) { byId[r.place.id] = r; });
    var tour = places.map(function (p) { return byId[p.id]; });
    tour.baselineKm = E.pathKm(start, route.slice().sort(function (a, b) { return b.score - a.score; }).map(function (r) { return r.place; })) + (end && route.length ? E.roadKm(route.slice().sort(function (a, b) { return b.score - a.score; })[route.length - 1].place, end) : 0);
    tour.optimizedKm = E.pathKm(start, places) + (end && places.length ? E.roadKm(places[places.length - 1], end) : 0);
    return tour;
  };

  /* ---------- One day: consume stops from the tour while they fit ---------- */
  function scheduleDay(o) {
    var P = o.P, mode = P.mode, pace = o.pace, date = o.date, queue = o.queue;
    var items = [], t = o.startMin, pos = o.startPos, km = 0, drive = 0, visits = [], deferred = [];
    var had = { breakfast: t > 600, lunch: t > 840, snacks: t > 1110, dinner: false };
    var sun = E.sunTimes(date, pos.lat, pos.lng), dow = E.DOW[date.getDay()];
    function meal(id, at) {
      if (had[id]) return; had[id] = true;
      var m = E.mealById(id), start = Math.max(t, at != null ? at : t);
      items.push({ type: "meal", meal: m, start: start, end: start + m.dur, pos: { lat: pos.lat, lng: pos.lng, name: pos.name },
        food: E.suggestFood(pos, id, P.food), costPP: E.MEAL_COST[o.foodTier][id], onWay: !!pos.onWay });
      t = start + m.dur;
    }
    function leg(to, label) {
      var d = E.roadKm(pos, to); if (d < 0.3) { pos = to; return; }
      var mins = E.driveMins(d, mode);
      items.push({ type: "travel", from: pos.name || "Start", to: label || to.name, km: d, mins: mins, start: t, end: t + mins,
        a: { lat: pos.lat, lng: pos.lng }, b: { lat: to.lat, lng: to.lng } });
      t += mins; km += d; drive += mins; pos = to;
    }
    function travel(to, label) {
      var d = E.roadKm(pos, to), mins = E.driveMins(d, mode), onWay = null;
      ["lunch", "snacks", "dinner"].forEach(function (id) {
        var m = E.mealById(id); if (onWay || had[id] || id === "snacks" && !had.lunch) return;
        if (mins > 75 && t < m.at && t + mins > m.at + 20) onWay = m;
      });
      if (onWay) {
        var f = clamp((onWay.at - t) / mins, 0.25, 0.75);
        var mid = { lat: pos.lat + (to.lat - pos.lat) * f, lng: pos.lng + (to.lng - pos.lng) * f }, town = E.locate(mid);
        if (town && E.haversine(mid, town) < 25) {
          leg({ lat: town.lat, lng: town.lng, name: town.town, onWay: true }, town.town + " · meal stop on the way");
          meal(onWay.id);
        }
      }
      leg(to, label);
    }

    if (!had.breakfast && t >= 360 && t <= 630) meal("breakfast", Math.max(t, 450));
    while (queue.length) {
      var r = queue[0], p = r.place;
      if (p.closedOn && p.closedOn.indexOf(dow) >= 0 && !o.isLast) { deferred.push(queue.shift()); continue; }
      var open = E.toMin(p.open || "00:00"), close = E.toMin(p.close || "23:59"), bounded = close > open;
      var arrive = t + E.driveMins(E.roadKm(pos, p), mode) + (!had.lunch && t < 780 ? 40 : 0);
      var begin = bounded ? Math.max(arrive, open) : arrive, dur = Math.round(p.duration * 60 * pace.visitScale);
      var finish = begin + (bounded ? Math.min(dur, close - begin) : dur);
      var tooLate = (bounded && begin > close - 30) || finish > pace.dayEnd + 20;
      if (o.isLast && P.returnToOrigin) tooLate = tooLate || finish + E.driveMins(E.roadKm(p, P.origin), mode) > 1290;
      if (tooLate && visits.length) break;
      if (tooLate && bounded && begin > close - 30) { if (o.isLast) { items.push({ type: "skip", place: p, reason: "Closes at " + E.fmtTime(close) + " — no time left" }); queue.shift(); continue; } break; }
      queue.shift();
      if (!had.lunch && t >= 750 && t <= 929) meal("lunch");
      if (!had.snacks && had.lunch && t >= 990 && t <= 1110) meal("snacks");
      travel(p, p.name);
      if (!had.lunch && t >= 765 && t <= 929) meal("lunch");
      if (bounded && t < open) { items.push({ type: "wait", place: p, start: t, end: open, text: "Opens at " + E.fmtTime(open) }); t = open; }
      var d2 = bounded ? Math.min(dur, close - t) : dur;
      if (p.sunset && t < sun.sunset && t + d2 < sun.sunset + 10 && sun.sunset - t < 150) d2 = Math.round(sun.sunset + 10 - t);
      items.push({ type: "visit", r: r, place: p, start: t, end: t + d2, crowd: E.predictCrowd(p, date, t),
        fee: p.fee || 0, extra: p.extraCost || 0, extraLabel: p.extraLabel || "", sunset: !!p.sunset && Math.abs(t + d2 - sun.sunset) < 40 });
      visits.push(p.id); t += d2;
    }
    for (var q = deferred.length - 1; q >= 0; q--) queue.unshift(deferred[q]);
    if (!had.lunch && t >= 690 && t <= 960) meal("lunch");
    if (!had.snacks && t >= 930 && t <= 1140) meal("snacks");

    var stay = null;
    if (!o.isLast) {
      var toward = queue.length ? queue[0].place : null;
      var st = E.suggestStays(pos, o.stayTier, 3, toward), pick = st.stays[0];
      var target = pick ? { lat: pick.stay.lat, lng: pick.stay.lng, name: pick.stay.name } : { lat: pos.lat, lng: pos.lng, name: "Hotel in " + (st.town || "town") };
      if (t >= 1170) meal("dinner");
      travel(target, target.name);
      stay = { choice: pick ? pick.stay : null, options: st, price: pick ? Math.round((pick.stay.price[0] + pick.stay.price[1]) / 2) : E.STAY_PRICE[o.stayTier], pos: target };
      items.push({ type: "stay", stay: stay, start: t, end: t });
      meal("dinner", Math.max(t, 1200));
    } else if (P.returnToOrigin && E.haversine(pos, P.origin) > 2) {
      if (t >= 1140) meal("dinner");
      travel({ lat: P.origin.lat, lng: P.origin.lng, name: P.origin.label || "Start" }, (P.origin.label || "your start point") + " (return)");
      if (!had.dinner && t >= 1170) meal("dinner");
    } else {
      meal("dinner", Math.max(t, 1170));
    }
    return { items: items, km: km, drive: drive, visits: visits, endPos: pos, stay: stay, sun: sun, endMin: t };
  }

  /* ---------- Whole trip ---------- */
  function build(P, ranked, st) {
    var pace = E.PACE[P.pace], D = P.days;
    var pool = ranked.filter(function (r) { return !st.removed[r.place.id]; });
    var pins = pool.filter(function (r) { return r.pinned; });
    pool = E.diversify(pool, Math.min(pool.length, Math.max(14, D * pace.maxStops * 3)), 0.85);
    pins.forEach(function (r) { if (pool.indexOf(r) < 0) pool.unshift(r); });
    var start = E.parseDate(P.startDate), startMin = E.toMin(P.startTime), notes = [];
    if (startMin > 1020) { start = E.addDays(start, 1); startMin = pace.dayStart; notes.push("Most monuments close by 6 PM, so your plan starts tomorrow morning."); }
    if (startMin < 360) startMin = pace.dayStart;
    var dayMins = pace.dayEnd - pace.dayStart - 140;
    var avail = Math.max(120, pace.dayEnd - startMin - 140) + (D - 1) * (dayMins - 25) + (P.returnToOrigin ? 150 : 0);
    var tour = E.buildTour(P, pool, pace, avail, Math.max(D, D * pace.maxStops - (st.cut || 0)));
    var queue = tour.slice(), days = [], pos = { lat: P.origin.lat, lng: P.origin.lng, name: P.origin.label || "Start" };
    for (var d = 0; d < D; d++) {
      var date = E.addDays(start, d);
      var res = scheduleDay({ P: P, pace: pace, date: date, startPos: pos, startMin: d === 0 ? startMin : pace.dayStart,
        queue: queue, isLast: d === D - 1, stayTier: st.stay, foodTier: st.food });
      res.index = d; res.date = E.isoDate(date); res.dateObj = date; res.label = "Day " + (d + 1);
      days.push(res); pos = res.endPos;
    }
    var plan = cost(P, days, st, notes);
    plan.route = { baselineKm: Math.round(tour.baselineKm), optimizedKm: Math.round(tour.optimizedKm),
      savedKm: Math.max(0, Math.round(tour.baselineKm - tour.optimizedKm)),
      savedPct: tour.baselineKm > 0 ? Math.max(0, Math.round((tour.baselineKm - tour.optimizedKm) / tour.baselineKm * 100)) : 0 };
    plan.later = queue.map(function (r) { return r; });
    return plan;
  }

  function cost(P, days, st, notes) {
    var mode = E.MODES[P.mode], members = P.members, veh = E.vehicles(members, P.mode), rooms = E.rooms(members, P.group);
    var c = { travel: 0, stay: 0, food: 0, tickets: 0, activities: 0 }, optional = [], km = 0, drive = 0, nVisits = 0;
    var paidActs = ["boating", "wildlife", "adventure", "family"];
    days.forEach(function (day) {
      var dc = { travel: 0, stay: 0, food: 0, tickets: 0, activities: 0 };
      day.items.forEach(function (it) {
        if (it.type === "travel") {
          var tc = mode.perPerson ? it.km * mode.perKm * members + (mode.lastMile || 0) * members : it.km * mode.perKm * veh;
          it.cost = Math.round(tc); dc.travel += tc;
        } else if (it.type === "meal") {
          it.cost = it.costPP * members; dc.food += it.cost;
        } else if (it.type === "visit") {
          it.cost = it.fee * members; dc.tickets += it.cost;
          if (it.extra > 0) {
            var wants = (it.place.activities || []).some(function (a) { return paidActs.indexOf(a) >= 0 && P.interests.indexOf(a) >= 0; });
            if (wants) { it.extraIncluded = true; it.cost += it.extra * members; dc.activities += it.extra * members; }
            else optional.push({ place: it.place, label: it.extraLabel || "Activity", cost: it.extra * members });
          }
        } else if (it.type === "stay") {
          it.cost = it.stay.price * rooms; it.rooms = rooms; dc.stay += it.cost;
        }
      });
      if (P.mode === "cab") dc.travel += mode.bataPerDay * veh;
      day.cost = Math.round(dc.travel + dc.stay + dc.food + dc.tickets + dc.activities);
      day.breakdown = dc;
      for (var k in c) c[k] += dc[k];
      km += day.km; drive += day.drive; nVisits += day.visits.length;
    });
    for (var k2 in c) c[k2] = Math.round(c[k2]);
    var total = c.travel + c.stay + c.food + c.tickets + c.activities;
    var budget = E.totalBudget(P), cap = budget + P.buffer, status = "none";
    if (budget > 0) status = total <= budget ? "within" : total <= cap ? "buffer" : "over";
    var co2 = mode.perPerson ? km * mode.co2 * members : km * mode.co2 * veh;
    var bus = E.MODES.bus, legs = 0;
    days.forEach(function (d) { d.items.forEach(function (i) { if (i.type === "travel") legs++; }); });
    return {
      profile: P, days: days, notes: notes, optional: optional, tiers: { stay: st.stay, food: st.food },
      totals: { km: Math.round(km), drive: drive, visits: nVisits, travel: c.travel, stay: c.stay, food: c.food, tickets: c.tickets, activities: c.activities, total: total, perPerson: Math.round(total / members), rooms: rooms, vehicles: veh },
      budget: { total: budget, buffer: P.buffer, cap: cap, status: status, spare: Math.max(0, budget - total), bufferUsed: status === "buffer" ? total - budget : 0, over: Math.max(0, total - cap) },
      co2: { kg: Math.round(co2), busKg: Math.round(km * bus.co2 * members), busTravel: Math.round(km * bus.perKm * members + bus.lastMile * members * legs) }
    };
  }

  E.pickTier = function (P) {
    var budget = E.totalBudget(P), ppd = budget > 0 ? budget / P.members / P.days : 3000;
    var auto = ppd < 1400 ? "budget" : ppd < 3800 ? "comfort" : "premium";
    return { stay: P.stayTier && P.stayTier !== "auto" ? P.stayTier : auto, food: auto };
  };

  E.plan = function (profile) {
    var t0 = Date.now();
    var P = E.normalizeProfile(profile);
    var ranked = E.recommend(P);
    var st = E.pickTier(P); st.removed = {};
    var plan = build(P, ranked, st), adjustments = [], guard = 0;
    while (plan.budget.status === "over" && guard++ < 14) {
      var before = plan.totals.total, msg = null;
      var ti = TIERS.indexOf(st.stay), fi = TIERS.indexOf(st.food);
      if (ti > fi && ti > 0) { st.stay = TIERS[ti - 1]; msg = "Switched stays to " + st.stay + " tier"; }
      else if (fi > 0) { st.food = TIERS[fi - 1]; msg = "Chose " + st.food + "-friendly eateries"; }
      else if (ti > 0) { st.stay = TIERS[ti - 1]; msg = "Switched stays to " + st.stay + " tier"; }
      else {
        var visits = [], M = E.MODES[P.mode], veh = E.vehicles(P.members, P.mode);
        plan.days.forEach(function (d) {
          var seq = [d.index === 0 ? P.origin : null].concat(d.items.filter(function (i) { return i.type === "visit"; }).map(function (i) { return i.place; }));
          d.items.forEach(function (it) {
            if (it.type !== "visit") return;
            var k = seq.indexOf(it.place), prev = seq[k - 1] || it.place, next = seq[k + 1] || null;
            var detKm = E.roadKm(prev, it.place) + (next ? E.roadKm(it.place, next) - E.roadKm(prev, next) : 0);
            var saving = (it.cost || 0) + Math.max(0, detKm) * M.perKm * (M.perPerson ? P.members : veh);
            visits.push({ it: it, value: saving / Math.max(0.05, it.r ? it.r.score : 0.5) });
          });
        });
        if (visits.length <= P.days) break;
        visits.sort(function (a, b) { return b.value - a.value; });
        var drop = visits[0].it.place; st.removed[drop.id] = true; st.cut = (st.cut || 0) + 1; msg = "Dropped " + drop.name;
      }
      plan = build(P, ranked, st);
      adjustments.push({ text: msg, saved: Math.max(0, before - plan.totals.total) });
    }
    plan.adjustments = adjustments;
    plan.suggestions = [];
    if (plan.budget.status === "over") plan.suggestions.push("Add about " + E.inr(plan.budget.over) + " to your budget or buffer, reduce the days, or travel by KSRTC bus.");
    if (P.mode !== "bus" && plan.co2.busTravel < plan.totals.travel * 0.7) plan.suggestions.push("KSRTC bus would cost about " + E.inr(plan.co2.busTravel) + " for travel and emit ~" + plan.co2.busKg + " kg CO₂ instead of " + plan.co2.kg + " kg.");
    plan.ranked = ranked; plan.ms = Date.now() - t0;
    return plan;
  };

  /* ---------- On-the-spot mode: "I'm here now, what should I do?" ---------- */
  E.onSpot = function (profile) {
    var now = profile.now ? new Date(profile.now) : new Date();
    var min = now.getHours() * 60 + now.getMinutes();
    var P = E.normalizeProfile(profile); P.onSpot = true; P.startDate = E.isoDate(now); P.startTime = hhmm(now);
    var ranked = E.recommend(P, { minute: min, date: now, radius: profile.radiusKm || 70 });
    var open = ranked.filter(function (r) { return r.f._open; });
    var picks = E.diversify(open.length >= 3 ? open : ranked, 8, 0.8);
    var meal = E.mealAt(min), next = null;
    for (var i = 0; i < E.MEALS.length; i++) if (E.MEALS[i].from > min) { next = E.MEALS[i]; break; }
    var tier = E.pickTier(P).stay;
    return {
      now: now, min: min, meal: meal, nextMeal: next, profile: P,
      food: meal ? E.suggestFood(P.origin, meal.id, P.food) : null,
      picks: picks, ranked: ranked, sun: E.sunTimes(now, P.origin.lat, P.origin.lng),
      sunsetSpots: ranked.filter(function (r) { return r.place.sunset && r.km < 45; }).slice(0, 2),
      stays: (min >= 1020 || min < 300) ? E.suggestStays(P.origin, tier, 3) : null,
      location: E.locate(P.origin)
    };
  };

  /* ---------- Share text (WhatsApp / copy) ---------- */
  E.planToText = function (plan) {
    var P = plan.profile, L = [];
    L.push("🛕 My Karnataka trip by Sanchara.AI");
    L.push("From " + (P.origin.label || "my location") + " · " + P.days + " day" + (P.days > 1 ? "s" : "") + " · " + P.members + " traveller" + (P.members > 1 ? "s" : ""));
    plan.days.forEach(function (d) {
      L.push(""); L.push("📅 " + d.label + " (" + d.date + ")");
      d.items.forEach(function (it) {
        if (it.type === "visit") L.push("• " + E.fmtTime(it.start) + "  " + it.place.name);
        else if (it.type === "meal") L.push("  🍽 " + E.fmtTime(it.start) + "  " + it.meal.label + (it.food.dishes[0] ? " — try " + it.food.dishes[0].name : ""));
        else if (it.type === "stay") L.push("  🛏 Stay: " + (it.stay.choice ? it.stay.choice.name : it.stay.pos.name));
      });
    });
    L.push(""); L.push("💰 Estimated total " + E.inr(plan.totals.total) + " (" + E.inr(plan.totals.perPerson) + "/person) · " + plan.totals.km + " km");
    return L.join("\n");
  };
})(typeof window !== "undefined" ? window : globalThis);
