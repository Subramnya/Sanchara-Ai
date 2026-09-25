/* Sanchara.AI — hybrid recommender.
 * 1) Content-based: TF-IDF vectors of every place (tags, activities, category, description)
 *    vs. the tourist's interest vector (+ Rocchio relevance feedback from 👍/👎).
 * 2) Context features: distance, season, predicted crowd, group fit, budget fit, opening hours.
 * 3) Learned ranker: logistic model (weights trained in ml/train_ranker.py).
 * 4) MMR re-ranking for diversity + human-readable explanations for every pick. */
(function (root) {
  "use strict";
  var S = root.SANCHARA, E = S.engine;
  var INDEX = null;

  function add(v, t, w) { v[t] = (v[t] || 0) + w; }
  function norm(v) { var s = 0, t; for (t in v) s += v[t] * v[t]; s = Math.sqrt(s) || 1; for (t in v) v[t] /= s; return v; }
  function cosine(a, b) {
    if (!a || !b) return 0; var s = 0, t, small = a, big = b;
    if (Object.keys(a).length > Object.keys(b).length) { small = b; big = a; }
    for (t in small) if (big[t]) s += small[t] * big[t];
    return s;
  }
  E.cosine = cosine;

  function placeTokens(p) {
    var toks = [];
    (p.tags || []).forEach(function (t) { toks.push(t, t); E.tokenize(t).forEach(function (x) { if (x !== t) toks.push(x); }); });
    (p.activities || []).forEach(function (a) { toks.push(a, a, a); });
    toks.push(p.category, p.category);
    E.tokenize(p.name).forEach(function (x) { toks.push(x); });
    E.tokenize(p.desc).forEach(function (x) { toks.push(x); });
    if (p.unesco) toks.push("unesco", "unesco");
    if (p.sunset) toks.push("sunset");
    if (p.sunrise) toks.push("sunrise");
    return toks;
  }

  E.buildIndex = function () {
    var places = S.PLACES || [], df = {}, docs = places.map(placeTokens);
    docs.forEach(function (toks) { var seen = {}; toks.forEach(function (t) { if (!seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; } }); });
    var N = docs.length, idf = {}, t;
    for (t in df) idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1;
    var byId = {};
    docs.forEach(function (toks, i) {
      var tf = {}; toks.forEach(function (x) { tf[x] = (tf[x] || 0) + 1; });
      var v = {}; for (var k in tf) v[k] = (1 + Math.log(tf[k])) * idf[k];
      byId[places[i].id] = norm(v);
    });
    INDEX = { idf: idf, byId: byId, N: N };
    return INDEX;
  };
  E.index = function () { return INDEX || E.buildIndex(); };
  E.placeById = function (id) {
    var list = S.PLACES || []; if (!E._pmap) { E._pmap = {}; list.forEach(function (p) { E._pmap[p.id] = p; }); }
    return E._pmap[id] || null;
  };

  /* Interest profile vector (+ Rocchio feedback: liked pulls in, disliked pushes away). */
  E.userVector = function (interests, feedback) {
    var ix = E.index(), v = {};
    (interests || []).forEach(function (id) {
      var it = E.interestById(id); if (!it) return;
      add(v, id, 3);
      it.keywords.forEach(function (k) { add(v, k, 1); E.tokenize(k).forEach(function (p) { if (p !== k) add(v, p, 0.5); }); });
    });
    var t; for (t in v) v[t] *= (ix.idf[t] || 1);
    norm(v);
    feedback = feedback || {};
    [["liked", 0.55], ["disliked", -0.4]].forEach(function (pair) {
      var ids = (feedback[pair[0]] || []).filter(function (id) { return ix.byId[id]; });
      if (!ids.length) return;
      ids.forEach(function (id) { var pv = ix.byId[id]; for (var k in pv) add(v, k, pair[1] * pv[k] / ids.length); });
    });
    return norm(v);
  };

  function groupFit(p, group) {
    var acts = p.activities || [];
    switch (group) {
      case "family": return ((p.kid || 3) - 1) / 4;
      case "seniors": return (((p.senior || 3) - 1) / 4) * ((p.effort || 2) <= 2 ? 1 : 0.55);
      case "couple": return (p.sunset || p.sunrise) ? 0.95 : (acts.indexOf("relaxing") >= 0 || acts.indexOf("boating") >= 0 || acts.indexOf("nature") >= 0) ? 0.75 : 0.55;
      case "friends": return ((p.effort || 2) >= 3 || acts.indexOf("adventure") >= 0 || acts.indexOf("trekking") >= 0) ? 0.9 : 0.6;
      default: return 0.6 + ((p.effort || 2) >= 3 ? 0.15 : 0) + (acts.indexOf("photography") >= 0 ? 0.15 : 0);
    }
  }

  /* Build context once per query. */
  E.makeContext = function (profile, opts) {
    opts = opts || {};
    var date = opts.date || (profile.startDate ? E.parseDate(profile.startDate) : new Date());
    var members = Math.max(1, +profile.members || 1);
    var days = Math.max(1, +profile.days || 1);
    var total = profile.budgetMode === "perPerson" ? (+profile.budget || 0) * members : (+profile.budget || 0);
    return {
      origin: profile.origin, interests: profile.interests || [], group: profile.group || "solo",
      members: members, days: days, date: date,
      minute: opts.minute != null ? opts.minute : (profile.startTime ? E.toMin(profile.startTime) : 600),
      radius: opts.radius || profile.radiusKm || E.radiusFor(profile.onSpot ? 0 : days, profile.mode),
      ppBudget: total > 0 ? total / members : 5000,
      uvec: E.userVector(profile.interests || [], profile.feedback),
      accessible: !!profile.accessible, mode: profile.mode || "car", onSpot: !!profile.onSpot,
      exclude: profile.exclude || [], pinned: profile.pinned || []
    };
  };

  E.features = function (p, ctx, km) {
    var ix = E.index();
    var month = ctx.date.getMonth() + 1;
    var inSeason = (p.bestMonths || []).indexOf(month) >= 0;
    if (p.category === "waterfall" && month >= 6 && month <= 10) inSeason = true;
    var arrive = ctx.onSpot ? ctx.minute + E.driveMins(km, ctx.mode) : E.bestVisitHour(p, ctx.date);
    var crowd = E.predictCrowd(p, ctx.date, arrive);
    var costPP = (p.fee || 0) + (p.extraCost || 0);
    var share = costPP / Math.max(300, ctx.ppBudget);
    var open = ctx.onSpot ? E.isOpen(p, arrive, ctx.date) : !(p.closedOn && p.closedOn.indexOf(E.DOW[ctx.date.getDay()]) >= 0);
    var acts = p.activities || [];
    var overlap = ctx.interests.filter(function (i) { return acts.indexOf(i) >= 0; }).length;
    return {
      _cos: cosine(ctx.uvec, ix.byId[p.id]),
      _overlap: ctx.interests.length ? overlap / Math.min(ctx.interests.length, 3) : 0.5,
      proximity: Math.exp(-km / (ctx.radius * 0.45)),
      popularity: Math.min(1, ((p.popularity || 3) - 1) / 4 + (p.unesco ? 0.1 : 0)),
      season: inSeason ? 1 : 0.35,
      crowdCalm: 1 - (crowd.level - 1) / 4,
      groupFit: groupFit(p, ctx.group),
      budgetFit: share <= 0.04 ? 1 : Math.max(0, 1 - (share - 0.04) * 6),
      openFit: open ? 1 : (ctx.onSpot ? 0.1 : 0.4),
      _crowd: crowd, _arrive: arrive, _open: open
    };
  };

  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  /* Rank every reachable place for this tourist. */
  E.recommend = function (profile, opts) {
    var t0 = Date.now();
    var ctx = E.makeContext(profile, opts);
    var M = S.MODEL, W = M.weights;
    var list = [];
    (S.PLACES || []).forEach(function (p) {
      if (ctx.exclude.indexOf(p.id) >= 0) return;
      if (ctx.accessible && ((p.effort || 2) > 2 || (p.senior || 3) < 3) && (profile.pinned || []).indexOf(p.id) < 0) return;
      var km = E.roadKm(ctx.origin, p), pinned = ctx.pinned.indexOf(p.id) >= 0;
      if (km > ctx.radius && !pinned) return;
      list.push({ place: p, km: km, mins: E.driveMins(km, ctx.mode), f: E.features(p, ctx, km), pinned: pinned });
    });
    var maxCos = 0; list.forEach(function (r) { if (r.f._cos > maxCos) maxCos = r.f._cos; });
    list.forEach(function (r) {
      r.f.interest = ctx.interests.length ? 0.65 * (maxCos ? r.f._cos / maxCos : 0) + 0.35 * Math.min(1, r.f._overlap) : 0.5;
      var z = M.bias, contrib = {};
      M.features.forEach(function (k) { contrib[k] = (W[k] || 0) * r.f[k]; z += contrib[k]; });
      r.score = sigmoid(z);
      r.match = Math.round(r.score * 100);
      r.contrib = contrib;
      r.reasons = E.explain(r, ctx);
    });
    list.sort(function (a, b) { return b.score - a.score; });
    list.ctx = ctx; list.ms = Date.now() - t0;
    return list;
  };

  /* Maximal Marginal Relevance — avoids five look-alike temples in a row. */
  E.diversify = function (ranked, k, lambda) {
    var ix = E.index(); lambda = lambda == null ? 0.78 : lambda;
    var pool = ranked.slice(0, Math.max(k * 3, 12)), out = [];
    while (out.length < k && pool.length) {
      var bi = 0, bv = -Infinity;
      for (var i = 0; i < pool.length; i++) {
        var sim = 0;
        for (var j = 0; j < out.length; j++) sim = Math.max(sim, cosine(ix.byId[pool[i].place.id], ix.byId[out[j].place.id]));
        var v = lambda * pool[i].score - (1 - lambda) * sim;
        if (v > bv) { bv = v; bi = i; }
      }
      out.push(pool.splice(bi, 1)[0]);
    }
    return out;
  };

  /* Explainable AI: turn the biggest feature contributions into plain reasons. */
  E.explain = function (r, ctx) {
    var p = r.place, f = r.f, acts = p.activities || [], out = [];
    var matched = ctx.interests.filter(function (i) { return acts.indexOf(i) >= 0; })
      .map(function (i) { var it = E.interestById(i); return it ? it.label : i; });
    var items = [
      { k: "interest", icon: "spark", text: matched.length ? "Matches " + matched.slice(0, 2).join(" & ") : "Close to your interests" },
      { k: "proximity", icon: "route", text: Math.round(r.km) + " km away · ~" + E.fmtDur(r.mins) },
      { k: "popularity", icon: "star", text: p.unesco ? "UNESCO World Heritage Site" : (p.popularity >= 5 ? "Iconic must-see" : "Well-loved local favourite") },
      { k: "season", icon: "calendar", text: f.season >= 1 ? "Perfect season to visit now" : "Off-season — quieter" },
      { k: "crowdCalm", icon: "users", text: "Crowd " + f._crowd.label.toLowerCase() + " around " + E.fmtTime(f._arrive) },
      { k: "groupFit", icon: "heart", text: ctx.group === "family" ? "Kid-friendly" : ctx.group === "seniors" ? "Easy for elders" : ctx.group === "couple" ? (p.sunset ? "Romantic sunset spot" : "Great for couples") : ctx.group === "friends" ? "Fun with friends" : "Rewarding solo stop" },
      { k: "budgetFit", icon: "wallet", text: (p.fee || 0) + (p.extraCost || 0) === 0 ? "Free entry" : "Entry ₹" + (p.fee || 0) + (p.extraCost ? " · " + (p.extraLabel || "activity") + " ₹" + p.extraCost : "") },
      { k: "openFit", icon: "clock", text: f._open ? "Open " + (p.open || "") + "–" + (p.close || "") : "Closed at that time" }
    ];
    items.forEach(function (it) { it.v = r.contrib ? r.contrib[it.k] || 0 : 0; });
    items.sort(function (a, b) { return b.v - a.v; });
    for (var i = 0; i < items.length && out.length < 3; i++) out.push(items[i]);
    if (!f._open && out.indexOf(items.filter(function (x) { return x.k === "openFit"; })[0]) < 0 && ctx.onSpot) out.push(items.filter(function (x) { return x.k === "openFit"; })[0]);
    return out;
  };

  /* Keyword search across places, dishes & stays (used by the offline assistant). */
  E.search = function (query, limit) {
    var ix = E.index(), q = {};
    E.tokenize(query).forEach(function (t) { add(q, t, ix.idf[t] || 0.5); });
    norm(q);
    var res = (S.PLACES || []).map(function (p) {
      var s = cosine(q, ix.byId[p.id]);
      var name = p.name.toLowerCase(), ql = String(query).toLowerCase();
      if (ql.indexOf(name) >= 0 || name.indexOf(ql) >= 0) s += 1;
      p.name.toLowerCase().split(/[\s,&()]+/).forEach(function (w) { if (w.length > 3 && ql.indexOf(w) >= 0) s += 0.25; });
      if (p.town && ql.indexOf(p.town.toLowerCase()) >= 0) s += 0.3;
      return { place: p, s: s };
    }).filter(function (x) { return x.s > 0.05; });
    res.sort(function (a, b) { return b.s - a.s; });
    return res.slice(0, limit || 5);
  };
})(typeof window !== "undefined" ? window : globalThis);
