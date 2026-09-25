/* Sanchara.AI — results views: itinerary, top picks, map, budget, eat & stay, AI chat, on-the-spot mode. */
(function (root) {
  "use strict";
  var S = root.SANCHARA, E = S.engine, I = S.i18n;
  var R = S.results = { tab: null, day: 0 };
  function $(id) { return document.getElementById(id); }
  function t(k) { return I.t(k); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ic(n) { return '<svg class="ic"><use href="#i-' + n + '"/></svg>'; }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dateLabel(d) { return E.DOW[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()]; }
  function pname(p) { return I.lang === "kn" && p.kn ? p.kn : p.name; }

  /* ---------- Photos with graceful fallback ---------- */
  R.photo = function (p) {
    var has = S.IMAGES && S.IMAGES[p.id];
    return '<div class="ph"><div class="ph-fallback">' + S.art.placeArt(p) + "</div>" + (has ? '<img alt="' + esc(p.name) + '" loading="lazy" data-pid="' + esc(p.id) + '"/>' : "") + "</div>";
  };
  R.hydrate = function (scope) {
    (scope || document).querySelectorAll("img[data-pid]:not([data-h])").forEach(function (img) {
      img.setAttribute("data-h", "1");
      var list = S.imageCandidates(img.getAttribute("data-pid"), 1280), i = 0;
      img.onload = function () { img.classList.add("ok"); };
      img.onerror = function () { i++; if (i < list.length) img.src = list[i]; else img.remove(); };
      img.src = list[0];
    });
  };

  /* ---------- Shared bits ---------- */
  function themeTitle(P) {
    var map = { heritage: "heritage trail", spiritual: "temple trail", nature: "nature escape", waterfalls: "waterfall chase", trekking: "trekking adventure", wildlife: "wildlife escape",
      boating: "lakes & rivers trip", adventure: "adventure run", museums: "culture trail", family: "family holiday", beaches: "coastal getaway", photography: "photo walk", shopping: "crafts & markets trail", relaxing: "slow getaway", food: "food trail" };
    return map[P.interests[0]] || "Karnataka journey";
  }
  function crowdBadge(c) { var cls = c.label === "Low" ? "ok" : c.label === "Moderate" ? "warn" : "bad"; return '<span class="badge ' + cls + '">' + ic("users") + c.label + " crowd</span>"; }
  function feeText(p) { return (p.fee ? "₹" + p.fee : "Free") + (p.extraCost ? " · " + esc(p.extraLabel || "activity") + " ₹" + p.extraCost : ""); }
  function dishHtml(d) {
    return '<div class="dish"><span class="' + (d.veg ? "veg-dot" : "nv-dot") + '" title="' + (d.veg ? "Veg" : "Non-veg") + '"></span><div><b>' + esc(d.name) + "</b>" + (d.kn ? ' <span class="kn" style="color:var(--muted);font-size:.8rem">' + esc(d.kn) + "</span>" : "") +
      " <span style=\"color:var(--muted);font-size:.8rem\">~₹" + d.cost + "</span><p>" + esc(d.desc) + "</p></div></div>";
  }
  function foodBlock(f, key) {
    var h = '<div class="dish-list">' + (f.dishes.length ? f.dishes.map(dishHtml).join("") : '<div class="dish">Local favourites vary — try the nearest busy khanavali.</div>') + "</div>";
    if (f.eateries.length) h += '<div class="eateries">' + f.eateries.map(function (e) { return '<span class="eatery">' + ic("star") + " " + esc(e.eatery.name) + " · " + (e.km < 1 ? "nearby" : Math.round(e.km) + " km") + "</span>"; }).join("") + "</div>";
    h += '<div class="row" style="margin-top:10px;gap:8px"><button class="btn btn-ghost btn-sm" data-live="food" data-lat="' + f.pos.lat + '" data-lng="' + f.pos.lng + '" data-key="' + key + '">' + ic("utensils") + " " + t("live_food") + '</button><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + f.mapsUrl + '">' + ic("external") + " " + t("more_maps") + '</a></div><div class="live-list" id="live-' + key + '"></div>';
    return h;
  }
  function stayBlock(st, key) {
    var o = st.options, h = "";
    if (st.choice) {
      var c = st.choice;
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b style="font-size:1.02rem">' + esc(c.name) + "</b>" + (c.govt ? '<span class="badge sage">' + ic("shield") + " Govt · " + esc(c.type) + "</span>" : '<span class="badge">' + esc(c.type) + "</span>") + '<span class="badge gold">' + esc(c.tier) + "</span></div>";
      h += '<p style="margin:6px 0;color:var(--muted);font-size:.86rem">' + esc(c.note || "") + " · ₹" + c.price[0].toLocaleString("en-IN") + "–" + c.price[1].toLocaleString("en-IN") + " per room/night (approx.)</p>";
    } else {
      h += "<b>" + esc(st.pos.name) + '</b><p style="margin:6px 0;color:var(--muted);font-size:.86rem">No verified listing here yet — use live hotels below. Budgeted at ' + E.inr(st.price) + " per room.</p>";
    }
    if (o && o.stays.length > 1) h += '<div style="margin-top:6px">' + o.stays.slice(1).map(function (x) { return '<div class="stay-opt"><span>' + esc(x.stay.name) + " · " + esc(x.stay.tier) + "</span><span>" + Math.round(x.km) + " km · ₹" + x.stay.price[0].toLocaleString("en-IN") + "+</span></div>"; }).join("") + "</div>";
    h += '<div class="row" style="margin-top:10px;gap:8px"><button class="btn btn-ghost btn-sm" data-live="stay" data-lat="' + st.pos.lat + '" data-lng="' + st.pos.lng + '" data-key="' + key + '">' + ic("hotel") + " " + t("live_stay") + '</button><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + (o ? o.mapsUrl : "#") + '">' + ic("external") + " " + t("more_maps") + '</a></div><div class="live-list" id="live-' + key + '"></div>';
    return h;
  }

  /* ---------- Tabs ---------- */
  function tabs(list) {
    $("tabs").innerHTML = list.map(function (x) { return '<button class="tab' + (x[0] === "map" ? " tab-map" : "") + '" role="tab" data-tab="' + x[0] + '">' + ic(x[2]) + " " + x[1] + "</button>"; }).join("");
    $("panels").innerHTML = list.map(function (x) { return '<div class="panel" id="panel-' + x[0] + '" role="tabpanel"></div>'; }).join("");
    $("tabs").querySelectorAll(".tab").forEach(function (b) { b.onclick = function () { R.show(b.getAttribute("data-tab")); }; });
  }
  R.show = function (name) {
    R.tab = name;
    document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === name); });
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("on", p.id === "panel-" + name); });
    var wide = window.matchMedia("(min-width: 1040px)").matches;
    S.map.resize();
    if (name === "ask") { var inp = $("chatIn"); if (inp && wide) inp.focus(); }
  };
  function mobileMapCss() {}

  function dayNavUrl(plan, di) {
    var d = plan.days[di], pts = [], start = di === 0 ? plan.profile.origin : (plan.days[di - 1].endPos || plan.profile.origin);
    d.items.forEach(function (it) { if (it.type === "visit") pts.push(it.place); else if (it.type === "stay") pts.push(it.stay.pos); });
    if (di === plan.days.length - 1 && plan.profile.returnToOrigin) pts.push(plan.profile.origin);
    return S.live.gmapsDir(start, pts) || S.live.gmapsDir(start, [start]);
  }

  /* ---------- Plan view ---------- */
  R.renderPlan = function (plan) {
    mobileMapCss();
    var P = plan.profile, T = plan.totals, B = plan.budget;
    var title = P.days + "-day " + themeTitle(P) + " from " + (P.origin.label || "your location");
    var h = '<span class="eyebrow">' + ic("spark") + " AI plan · " + esc(P.origin.district || "") + "</span><h1>" + esc(title) + "</h1>";
    h += '<div class="meta"><span class="badge">' + ic("calendar") + " " + dateLabel(plan.days[0].dateObj) + "</span><span class=\"badge\">" + ic("users") + " " + P.members + " · " + P.group + "</span><span class=\"badge\">" + ic(P.mode === "bus" ? "bus" : P.mode === "bike" ? "bike" : "car") + " " + E.MODES[P.mode].label + "</span>" +
      P.interests.slice(0, 4).map(function (i) { return '<span class="badge">' + esc(I.label(E.interestById(i))) + "</span>"; }).join("") + "</div>";
    var statusTxt = B.status === "within" ? t("within") : B.status === "buffer" ? t("buffer_used") : B.status === "over" ? t("over") : t("no_budget");
    h += '<div class="kpis"><div class="kpi"><small>Places</small><b>' + T.visits + '</b></div><div class="kpi"><small>Distance</small><b>' + T.km + ' km</b></div><div class="kpi"><small>Est. cost</small><b>' + E.inr(T.total) +
      '</b></div><div class="kpi"><small>Budget</small><b>' + statusTxt + "</b></div></div>";
    h += '<div class="app-actions"><a class="btn btn-gold" id="actNav" target="_blank" rel="noopener" href="' + dayNavUrl(plan, R.day) + '">' + ic("nav") + " " + t("navigate") + " Day " + (R.day + 1) + '</a><a class="btn btn-glass" id="actShare" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(E.planToText(plan)) + '">' + ic("chat") + " " + t("share") +
      '</a><button class="btn btn-glass" id="actCopy">' + ic("copy") + " " + t("copy") + '</button><button class="btn btn-glass" id="actPdf">' + ic("download") + " " + t("pdf") + '</button><button class="btn btn-glass" id="actEdit">' + ic("edit") + " " + t("edit") + "</button></div>";
    $("appHero").innerHTML = h;
    tabs([["plan", t("tab_plan"), "list"], ["picks", t("tab_picks"), "star"], ["budget", t("tab_budget"), "wallet"], ["food", t("tab_food"), "food"], ["ask", t("tab_ask"), "chat"]]);
    if (R.day >= plan.days.length) R.day = 0;
    renderItinerary(plan); renderPicks(plan.ranked, P, plan); renderBudget(plan); renderFood(plan); S.chat.mount($("panel-ask"));
    $("mapLegend").innerHTML = plan.days.map(function (d, i) { return '<span><i style="background:' + S.map.colors[i % 7] + '"></i>' + d.label + "</span>"; }).join("") + '<span><i style="background:#c08a2a"></i>Meal</span><span><i style="background:#1d2740"></i>Stay</span>';
    R.show(R.tab && $("panel-" + R.tab) ? R.tab : "plan");
    S.map.showPlan(plan, null);
    bindActions(plan);
    R.hydrate($("app"));
    loadWeather(P.origin);
  };

  function renderItinerary(plan) {
    var el = $("panel-plan"), P = plan.profile, h = "";
    if (plan.notes.length) h += plan.notes.map(function (n) { return '<div class="adj">' + ic("info") + esc(n) + "</div>"; }).join("");
    h += '<div class="day-tabs">' + plan.days.map(function (d, i) {
      return '<button class="day-tab' + (i === R.day ? " on" : "") + '" data-day="' + i + '"><b>' + d.label + "</b><small>" + dateLabel(d.dateObj) + " · " + E.inr(d.cost) + "</small></button>";
    }).join("") + "</div>";
    var n = 0;
    plan.days.forEach(function (d, di) {
      var dayNums = [];
      d.items.forEach(function (it) { if (it.type === "visit") { n++; dayNums.push(n); } });
      h += '<div class="day-block" data-dayblock="' + di + '" style="' + (di === R.day ? "" : "display:none") + '">';
      h += '<div class="day-sum"><span class="badge acc">' + ic("pin") + " " + d.visits.length + " places</span><span class=\"badge\">" + ic("route") + " " + Math.round(d.km) + " km · " + E.fmtDur(d.drive) + ' drive</span><span class="badge gold">' + ic("wallet") + " " + E.inr(d.cost) +
        '</span><span class="sunset-pill">' + ic("sunset") + " " + t("sunset") + " " + E.fmtTime(d.sun.sunset) + '</span><span class="badge" id="wx-' + di + '" style="display:none"></span></div>';
      h += '<div class="timeline">';
      var k = 0, prevPt = di === 0 ? P.origin : null;
      d.items.forEach(function (it, ii) {
        var key = di + "-" + ii;
        if (it.type === "travel") {
          h += '<div class="travel">' + ic(P.mode === "bus" ? "bus" : P.mode === "bike" ? "bike" : "car") + "<span><b>" + Math.round(it.km * 10) / 10 + " km</b> · " + E.fmtDur(it.mins) + " → " + esc(it.to) + '</span><a target="_blank" rel="noopener" href="' + S.live.gmapsDir(it.a, [it.b]) + '">' + t("navigate") + " " + ic("external") + "</a></div>";
        } else if (it.type === "visit") {
          var p = it.place, r = it.r || { match: 0, reasons: [] }, num = dayNums[k++];
          var liked = (P.feedback.liked || []).indexOf(p.id) >= 0, disliked = (P.feedback.disliked || []).indexOf(p.id) >= 0;
          h += '<div class="tl-item"><div class="tl-time">' + E.fmtTime(it.start) + "<small>" + E.fmtDur(it.end - it.start) + '</small></div><div class="tl-card card visit">' +
            '<div class="thumb">' + R.photo(p) + '<span class="num" style="background:' + S.map.colors[di % 7] + '">' + num + "</span></div>" +
            '<div class="vb"><h3>' + esc(pname(p)) + "</h3><div class=\"sub\">" + esc(p.town) + ", " + esc(p.district) + " · " + feeText(p) + (p.unesco ? ' · <span class="badge gold">UNESCO</span>' : "") + "</div>" +
            '<div class="reasons">' + (r.reasons || []).map(function (x) { return "<span>" + ic(x.icon) + esc(x.text) + "</span>"; }).join("") + "</div>" +
            (it.sunset ? '<span class="sunset-pill">' + ic("sunset") + " Stay for sunset at " + E.fmtTime(d.sun.sunset) + "</span>" : "") +
            '<div class="foot"><span class="match" title="AI match score">' + r.match + '% <i style="--w:' + r.match + '%"></i></span>' + crowdBadge(it.crowd) + '<span class="spacer"></span>' +
            '<button class="fb' + (liked ? " on-up" : "") + '" data-fb="up" data-id="' + p.id + '" title="More like this">' + ic("up") + '</button><button class="fb' + (disliked ? " on-down" : "") + '" data-fb="down" data-id="' + p.id + '" title="Not for me — replace">' + ic("down") + "</button>" +
            '<button class="fb" data-say="' + p.id + '" title="Listen">' + ic("volume") + '</button><a class="fb" target="_blank" rel="noopener" title="Google Maps" href="' + S.live.gmapsPlace(p) + '">' + ic("pin") + "</a></div>" +
            '<p style="margin:8px 0 0;font-size:.8rem;color:var(--muted)">' + ic("info") + " " + esc(p.tips || "") + "</p></div></div></div>";
        } else if (it.type === "meal") {
          it.food.pos = it.pos;
          h += '<div class="tl-item"><div class="tl-time">' + E.fmtTime(it.start) + '</div><div class="tl-card card meal"><div class="meal-h">' + ic(it.meal.icon === "thali" ? "thali" : it.meal.icon === "moon" ? "moon" : it.meal.icon === "tea" ? "tea" : "coffee") + " " + esc(I.label(it.meal)) +
            " <small>· " + (it.onWay ? "on the way at " : "in ") + esc(it.food.town || "") + " · ~" + E.inr(it.cost) + " for " + P.members + "</small></div>" + foodBlock(it.food, "m" + key) + "</div></div>";
        } else if (it.type === "stay") {
          h += '<div class="tl-item"><div class="tl-time">' + E.fmtTime(it.start) + '</div><div class="tl-card card stay-card"><div class="meal-h">' + ic("bed") + " " + t("stay") + " <small>· night " + (di + 1) + " · " + it.rooms + " room" + (it.rooms > 1 ? "s" : "") + " · ~" + E.inr(it.cost) + "</small></div>" + stayBlock(it.stay, "s" + key) + "</div></div>";
        } else if (it.type === "wait") {
          h += '<div class="wait">' + ic("hourglass") + " " + esc(it.text) + " — " + esc(it.place.name) + "</div>";
        } else if (it.type === "skip") {
          h += '<div class="skip">' + ic("alert") + " Skipped " + esc(it.place.name) + ": " + esc(it.reason) + "</div>";
        }
      });
      h += "</div></div>";
    });
    if (plan.later && plan.later.length) {
      h += '<h3 class="h-sec">' + ic("hourglass") + ' If you have more time</h3><div class="later">' + plan.later.slice(0, 6).map(function (r) { return '<span class="chip">' + esc(r.place.name) + " · " + r.match + "%</span>"; }).join("") + "</div>";
    }
    if (plan.optional.length) {
      h += '<h3 class="h-sec">' + ic("ticket") + ' Optional add-ons</h3><div class="later">' + plan.optional.map(function (o) { return '<span class="chip">' + esc(o.label) + " at " + esc(o.place.name) + " · " + E.inr(o.cost) + "</span>"; }).join("") + "</div>";
    }
    el.innerHTML = h;
    el.querySelectorAll("[data-day]").forEach(function (b) {
      b.onclick = function () {
        R.day = +b.getAttribute("data-day");
        el.querySelectorAll(".day-tab").forEach(function (x) { x.classList.toggle("on", x === b); });
        el.querySelectorAll("[data-dayblock]").forEach(function (x) { x.style.display = +x.getAttribute("data-dayblock") === R.day ? "" : "none"; });
        S.map.showPlan(plan, R.day);
        var nav = $("actNav"); if (nav) { nav.innerHTML = ic("nav") + " " + t("navigate") + " Day " + (R.day + 1); nav.href = dayNavUrl(plan, R.day); }
      };
    });
    bindCommon(el);
  }

  function renderPicks(ranked, P, plan) {
    var el = $("panel-picks"), list = E.diversify(ranked, Math.min(12, ranked.length), 0.8);
    var inPlan = {};
    if (plan) plan.days.forEach(function (d) { d.visits.forEach(function (id) { inPlan[id] = 1; }); });
    var h = '<p style="color:var(--muted);margin:0 0 14px">Ranked by the AI model from ' + ranked.length + " reachable places · 👍 / 👎 re-ranks instantly.</p><div class=\"picks\">";
    list.forEach(function (r) {
      var p = r.place, liked = (P.feedback.liked || []).indexOf(p.id) >= 0, disliked = (P.feedback.disliked || []).indexOf(p.id) >= 0;
      h += '<div class="card pick"><div class="top">' + R.photo(p) + '<span class="badge">' + esc(p.category) + '</span><div class="ring" style="--v:' + r.match + '"><b>' + r.match + "%</b></div></div>" +
        '<div class="pb"><h3>' + esc(pname(p)) + "</h3><p>" + esc(p.town) + " · " + Math.round(r.km) + " km · " + E.fmtDur(r.mins) + " · " + feeText(p) + "</p>" +
        '<div class="reasons" style="display:flex;flex-wrap:wrap;gap:6px">' + r.reasons.map(function (x) { return '<span class="badge">' + ic(x.icon) + esc(x.text) + "</span>"; }).join("") + "</div>" +
        '<div class="row-b">' + (inPlan[p.id] ? '<span class="badge ok">' + ic("check") + " In your plan</span>" : plan ? '<button class="btn btn-ghost btn-sm" data-add="' + p.id + '">' + ic("plus") + " Add to plan</button>" : "") +
        '<span style="flex:1"></span><button class="fb' + (liked ? " on-up" : "") + '" data-fb="up" data-id="' + p.id + '">' + ic("up") + '</button><button class="fb' + (disliked ? " on-down" : "") + '" data-fb="down" data-id="' + p.id + '">' + ic("down") + '</button><a class="fb" target="_blank" rel="noopener" href="' + S.live.gmapsDir(P.origin, [p]) + '" title="Navigate">' + ic("nav") + "</a></div></div></div>";
    });
    el.innerHTML = h + "</div>";
    bindCommon(el);
  }

  function donut(parts) {
    var total = parts.reduce(function (s, p) { return s + p.v; }, 0) || 1, a = -Math.PI / 2, out = "";
    parts.forEach(function (p) {
      if (p.v <= 0) return;
      var frac = p.v / total, a2 = a + frac * Math.PI * 2, large = frac > 0.5 ? 1 : 0;
      var x1 = 75 + 60 * Math.cos(a), y1 = 75 + 60 * Math.sin(a), x2 = 75 + 60 * Math.cos(a2 - 0.0001), y2 = 75 + 60 * Math.sin(a2 - 0.0001);
      out += '<path d="M' + x1 + " " + y1 + "A60 60 0 " + large + " 1 " + x2 + " " + y2 + '" stroke="' + p.c + '" stroke-width="22" fill="none"/>';
      a = a2;
    });
    return '<svg viewBox="0 0 150 150" width="150" height="150" role="img" aria-label="Cost split">' + out + '<text x="75" y="72" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">Total</text><text x="75" y="90" text-anchor="middle" font-size="15" font-weight="800" fill="currentColor">' + E.inr(total) + "</text></svg>";
  }

  function renderBudget(plan) {
    var el = $("panel-budget"), T = plan.totals, B = plan.budget, P = plan.profile;
    var msg = B.status === "within" ? [t("within"), "You have " + E.inr(B.spare) + " to spare — your buffer of " + E.inr(B.buffer) + " is untouched."] :
      B.status === "buffer" ? [t("buffer_used"), "Plan is " + E.inr(B.bufferUsed) + " above the budget but inside your buffer (" + E.inr(B.buffer) + ")."] :
      B.status === "over" ? [t("over"), "Still " + E.inr(B.over) + " above budget + buffer after AI adjustments."] : [t("no_budget"), "Add a budget in Edit trip to get a spending guard."];
    var h = '<div class="card budget-card"><div class="status ' + B.status + '">' + ic(B.status === "within" ? "check" : B.status === "none" ? "info" : "alert") + "<div>" + msg[0] + "<small>" + msg[1] + "</small></div></div>";
    if (B.total > 0) {
      var cap = Math.max(B.cap, T.total), pct = Math.min(100, T.total / cap * 100), bpos = B.total / cap * 100;
      h += '<div class="meter"><div class="fill ' + (B.status === "buffer" ? "buffer" : B.status === "over" ? "over" : "") + '" style="width:' + pct + '%"></div><div class="mark" style="left:' + bpos + '%"></div></div>' +
        '<div class="meter-legend"><span>Planned ' + E.inr(T.total) + "</span><span>Budget " + E.inr(B.total) + "</span><span>+ Buffer " + E.inr(B.buffer) + " = " + E.inr(B.cap) + "</span></div>";
    }
    var parts = [{ k: "Travel", v: T.travel, c: "#2f6f8f" }, { k: "Stay", v: T.stay, c: "#1d2740" }, { k: "Food", v: T.food, c: "#c08a2a" }, { k: "Tickets", v: T.tickets, c: "#b4532a" }, { k: "Activities", v: T.activities, c: "#56734f" }];
    h += '<div class="donut-wrap">' + donut(parts) + '<div class="legend">' + parts.map(function (p) { return "<div><i style=\"background:" + p.c + '"></i>' + p.k + "<b>" + E.inr(p.v) + "</b></div>"; }).join("") +
      "<div style=\"border-top:1px solid var(--line);padding-top:8px\"><span>Per person</span><b>" + E.inr(T.perPerson) + "</b></div></div></div></div>";
    if (plan.adjustments.length) {
      h += '<h3 class="h-sec">' + ic("brain") + " How the AI fitted your budget</h3>" + plan.adjustments.map(function (a) { return '<div class="adj">' + ic("spark") + "<span>" + esc(a.text) + "</span><b style=\"margin-left:auto\">−" + E.inr(a.saved) + "</b></div>"; }).join("");
    }
    h += '<h3 class="h-sec">' + ic("leaf") + ' Smart & sustainable</h3><div class="grid-2">';
    h += '<div class="card" style="padding:14px"><b>' + ic("route") + " Route optimiser</b><p style=\"margin:6px 0 0;color:var(--muted);font-size:.88rem\">2-opt ordering saves <b>" + plan.route.savedKm + " km (" + plan.route.savedPct + "%)</b> versus visiting in ranked order.</p></div>";
    h += '<div class="card" style="padding:14px"><b>' + ic("sprout") + " Carbon estimate</b><p style=\"margin:6px 0 0;color:var(--muted);font-size:.88rem\">~" + plan.co2.kg + " kg CO₂ by " + E.MODES[P.mode].label.toLowerCase() + (P.mode !== "bus" ? " · ~" + plan.co2.busKg + " kg by KSRTC bus" : "") + ".</p></div>";
    h += '<div class="card" style="padding:14px"><b>' + ic("bed") + " Rooms & vehicles</b><p style=\"margin:6px 0 0;color:var(--muted);font-size:.88rem\">" + T.rooms + " room(s) · " + (E.MODES[P.mode].perPerson ? P.members + " bus seats" : T.vehicles + " vehicle(s)") + " · stays: " + plan.tiers.stay + " · food: " + plan.tiers.food + "</p></div>";
    h += '<div class="card" style="padding:14px"><b>' + ic("gauge") + " Model</b><p style=\"margin:6px 0 0;color:var(--muted);font-size:.88rem\">Scored " + plan.ranked.length + " reachable places and built the plan in " + plan.ms + " ms, on-device. Ranker: " + esc(S.MODEL.version) + ".</p></div></div>";
    if (plan.suggestions.length) h += plan.suggestions.map(function (s) { return '<div class="adj">' + ic("info") + esc(s) + "</div>"; }).join("");
    h += '<p style="font-size:.78rem;color:var(--muted);margin-top:14px">Costs are estimates: fuel ₹' + E.MODES.car.perKm + "/km (car), taxi ₹" + E.MODES.cab.perKm + "/km + driver bata, KSRTC ≈ ₹" + E.MODES.bus.perKm + "/km/person, meals by tier, entry fees as published. Confirm locally.</p>";
    el.innerHTML = h;
  }

  function helplines() {
    return '<h3 class="h-sec">' + ic("shield") + ' Safety & helplines</h3><div class="helpline">' +
      [["112", "All emergencies"], ["108", "Ambulance"], ["1091", "Women's helpline"], ["1363", "Tourist helpline"]].map(function (x) { return '<a href="tel:' + x[0] + '">' + ic("phone") + "<span>" + x[0] + "<small>" + x[1] + "</small></span></a>"; }).join("") + "</div>";
  }

  function renderFood(plan) {
    var el = $("panel-food"), P = plan.profile, now = new Date(), min = now.getHours() * 60 + now.getMinutes(), m = E.mealAt(min);
    var h = "";
    var f = E.suggestFood(P.origin, (m || E.MEALS[3]).id, P.food); f.pos = P.origin;
    h += '<div class="now-card"><span class="eyebrow">' + ic("clock") + " Right now · " + E.fmtTime(min) + "</span><h3>" + (m ? esc(I.label(m)) + " near " + esc(f.town) : "Late night — most kitchens are closed") + "</h3>" + foodBlock(f, "now") + "</div>";
    h += '<h3 class="h-sec">' + ic("food") + " Meals on your route</h3>";
    plan.days.forEach(function (d) {
      d.items.forEach(function (it) {
        if (it.type !== "meal") return;
        h += '<div class="adj">' + ic("utensils") + "<span><b>" + d.label + " · " + E.fmtTime(it.start) + "</b> " + esc(I.label(it.meal)) + (it.onWay ? " on the way" : "") + " in " + esc(it.food.town || "") + " — " + esc(it.food.dishes.map(function (x) { return x.name; }).slice(0, 2).join(", ")) + "</span></div>";
      });
    });
    var nights = [];
    plan.days.forEach(function (d, di) { d.items.forEach(function (it, ii) { if (it.type === "stay") nights.push([d, it, di + "-" + ii]); }); });
    h += '<h3 class="h-sec">' + ic("bed") + " Where you'll stay</h3>";
    if (!nights.length) {
      var st = E.suggestStays(P.origin, plan.tiers.stay, 3);
      h += '<p style="color:var(--muted)">This is a day trip — no stay needed. If you decide to stay the night, good options near ' + esc(st.town) + ":</p>" +
        '<div class="card stay-card">' + stayBlock({ choice: st.stays[0] ? st.stays[0].stay : null, options: st, pos: { lat: P.origin.lat, lng: P.origin.lng, name: "Hotels in " + st.town }, price: E.STAY_PRICE[plan.tiers.stay] }, "daytrip") + "</div>";
    } else nights.forEach(function (n) { h += '<div class="card stay-card" style="margin-bottom:10px"><div class="meal-h">' + ic("moon") + " " + n[0].label + " night</div>" + stayBlock(n[1].stay, "fs" + n[2]) + "</div>"; });
    h += helplines();
    el.innerHTML = h;
    bindCommon(el);
  }

  /* ---------- On-the-spot view ---------- */
  R.renderSpot = function (spot) {
    mobileMapCss();
    var P = spot.profile, loc = spot.location || {};
    var h = '<span class="eyebrow">' + ic("compass") + " Right now · " + E.fmtTime(spot.min) + "</span><h1>Explore around " + esc(P.origin.label || loc.town) + "</h1>" +
      '<div class="meta"><span class="badge">' + ic("pin") + " " + esc(loc.district || "") + " district</span><span class=\"badge\">" + ic("sunset") + " Sunset " + E.fmtTime(spot.sun.sunset) + "</span>" +
      (spot.meal ? '<span class="badge">' + ic("food") + " " + esc(I.label(spot.meal)) + " time</span>" : "") + '<span class="badge" id="wx-now" style="display:none"></span></div>' +
      '<div class="app-actions"><button class="btn btn-gold" id="actPlanFull">' + ic("calendar") + ' Turn this into a full-day plan</button><button class="btn btn-glass" id="actEdit">' + ic("edit") + " " + t("edit") + "</button></div>";
    $("appHero").innerHTML = h;
    tabs([["now", t("tab_now"), "clock"], ["picks", t("tab_picks"), "star"], ["ask", t("tab_ask"), "chat"]]);
    var el = $("panel-now"), b = "";
    if (spot.food) { spot.food.pos = P.origin; b += '<div class="now-card"><span class="eyebrow">' + ic("utensils") + " " + esc(I.label(spot.meal)) + " · " + E.fmtTime(spot.min) + "</span><h3>What to eat near " + esc(spot.food.town) + "</h3>" + foodBlock(spot.food, "spot") + "</div>"; }
    else b += '<div class="now-card"><h3>Late night</h3><p>Most kitchens are closed — highway dhabas and hotel restaurants are your best bet. Next meal: ' + (spot.nextMeal ? I.label(spot.nextMeal) + " from " + E.fmtTime(spot.nextMeal.from) : "breakfast") + ".</p></div>";
    b += '<h3 class="h-sec">' + ic("star") + " Open now, near you</h3>";
    spot.picks.slice(0, 6).forEach(function (r, i) {
      var p = r.place;
      b += '<div class="card visit" style="margin-bottom:10px"><div class="thumb">' + R.photo(p) + '<span class="num">' + (i + 1) + '</span></div><div class="vb"><h3>' + esc(pname(p)) + '</h3><div class="sub">' + Math.round(r.km) + " km · " + E.fmtDur(r.mins) + " · " + feeText(p) + " · open till " + esc(p.close) + "</div>" +
        '<div class="reasons">' + r.reasons.map(function (x) { return "<span>" + ic(x.icon) + esc(x.text) + "</span>"; }).join("") + '</div><div class="foot"><span class="match">' + r.match + '% <i style="--w:' + r.match + '%"></i></span>' + crowdBadge(r.f._crowd) +
        '<span class="spacer"></span><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + S.live.gmapsDir(P.origin, [p]) + '">' + ic("nav") + " " + t("navigate") + "</a></div></div></div>";
    });
    if (spot.sunsetSpots.length) b += '<h3 class="h-sec">' + ic("sunset") + " Sunset at " + E.fmtTime(spot.sun.sunset) + '</h3><div class="later">' + spot.sunsetSpots.map(function (r) { return '<span class="chip">' + esc(r.place.name) + " · " + Math.round(r.km) + " km</span>"; }).join("") + "</div>";
    if (spot.stays) b += '<h3 class="h-sec">' + ic("bed") + ' Tonight\'s stay</h3><div class="card stay-card">' + stayBlock({ choice: spot.stays.stays[0] ? spot.stays.stays[0].stay : null, options: spot.stays, pos: { lat: P.origin.lat, lng: P.origin.lng, name: "Hotels in " + spot.stays.town }, price: 0 }, "spotstay") + "</div>";
    b += helplines();
    el.innerHTML = b;
    renderPicks(spot.ranked, P, null);
    S.chat.mount($("panel-ask"));
    $("mapLegend").innerHTML = '<span><i style="background:#2f6fd6"></i>You</span><span><i style="background:' + S.map.colors[0] + '"></i>Open now</span>';
    R.show(R.tab && $("panel-" + R.tab) ? R.tab : "now");
    S.map.showSpots(P.origin, spot.picks.slice(0, 6));
    bindCommon(el);
    $("actPlanFull").onclick = function () { var p = JSON.parse(JSON.stringify(S.state.input)); p.onSpot = false; p.days = 1; S.app.run(p); };
    $("actEdit").onclick = function () { S.wizard.open(S.state.input); };
    R.hydrate($("app"));
    loadWeather(P.origin, true);
  };

  /* ---------- Behaviour ---------- */
  function bindCommon(el) {
    el.querySelectorAll("[data-fb]").forEach(function (b) {
      b.onclick = function () { S.app.feedback(b.getAttribute("data-id"), b.getAttribute("data-fb")); };
    });
    el.querySelectorAll("[data-add]").forEach(function (b) { b.onclick = function () { S.app.pin(b.getAttribute("data-add")); }; });
    el.querySelectorAll("[data-say]").forEach(function (b) {
      b.onclick = function () {
        var p = E.placeById(b.getAttribute("data-say")); if (!p || !window.speechSynthesis) return S.app.toast("Voice not supported on this browser.");
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(p.name + ". " + p.desc + " Tip: " + p.tips); u.lang = "en-IN"; u.rate = 0.98; speechSynthesis.speak(u);
      };
    });
    el.querySelectorAll("[data-live]").forEach(function (b) {
      b.onclick = function () {
        var kind = b.getAttribute("data-live"), lat = +b.getAttribute("data-lat"), lng = +b.getAttribute("data-lng"), box = $("live-" + b.getAttribute("data-key"));
        box.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
        S.live.nearby(lat, lng, kind).then(function (list) {
          if (!list.length) { box.innerHTML = "<div>No live listings found on OpenStreetMap here — try Google Maps.</div>"; return; }
          box.innerHTML = list.slice(0, 6).map(function (x) {
            return '<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(x.name + " " + x.lat + "," + x.lng) + '">' + ic(kind === "stay" ? "hotel" : "utensils") + " " + esc(x.name) + "</a> <span style=\"color:var(--muted)\">" + (x.cuisine ? esc(x.cuisine) + " · " : "") + x.km.toFixed(1) + " km" + (x.veg ? " · veg" : "") + "</span>";
          }).map(function (s) { return "<div>" + s + "</div>"; }).join("") + '<div style="color:var(--muted);font-size:.74rem">Live from OpenStreetMap</div>';
          S.map.addLive(list, kind);
        }).catch(function () { box.innerHTML = "<div>Live data needs internet — showing curated suggestions only.</div>"; });
      };
    });
  }

  function bindActions(plan) {
    $("actCopy").onclick = function () {
      var txt = E.planToText(plan);
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { S.app.toast("Itinerary copied."); }, function () { S.app.toast("Copy not allowed here."); });
    };
    $("actPdf").onclick = function () {
      document.querySelectorAll("[data-dayblock]").forEach(function (x) { x.style.display = ""; });
      window.print();
      document.querySelectorAll("[data-dayblock]").forEach(function (x) { x.style.display = +x.getAttribute("data-dayblock") === R.day ? "" : "none"; });
    };
    $("actEdit").onclick = function () { S.wizard.open(S.state.input); };
  }

  function loadWeather(o, spot) {
    if (!navigator.onLine) return;
    S.live.weather(o.lat, o.lng).then(function (w) {
      var cur = w.current, wt = S.live.weatherText(cur.weather_code);
      var txt = Math.round(cur.temperature_2m) + "° " + wt[0];
      var el = $(spot ? "wx-now" : "wx-0"); if (el) { el.style.display = ""; el.innerHTML = ic(wt[1]) + " " + txt; }
      if (!spot && S.state.plan) S.state.plan.days.forEach(function (d, i) {
        var idx = w.daily.time.indexOf(d.date), e2 = $("wx-" + i);
        if (idx >= 0 && e2) { var dt = S.live.weatherText(w.daily.weather_code[idx]); e2.style.display = ""; e2.innerHTML = ic(dt[1]) + " " + Math.round(w.daily.temperature_2m_max[idx]) + "° · " + dt[0] + (w.daily.precipitation_probability_max[idx] > 50 ? " · carry an umbrella" : ""); }
      });
    }).catch(function () {});
  }
})(typeof window !== "undefined" ? window : globalThis);
