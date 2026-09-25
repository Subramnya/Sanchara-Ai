/* Sanchara.AI — "Get Started" wizard: location → interests → trip → group & budget → review. */
(function (root) {
  "use strict";
  var S = root.SANCHARA, E = S.engine, I = S.i18n;
  var W = S.wizard = { step: 0, data: null };
  var STEPS = 5;
  function $(id) { return document.getElementById(id); }
  function t(k) { return I.t(k); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ic(n) { return '<svg class="ic"><use href="#i-' + n + '"/></svg>'; }
  function pad(n) { return ("0" + n).slice(-2); }

  W.defaults = function () {
    var now = new Date(), m = now.getMinutes();
    var start = new Date(now.getTime()); start.setMinutes(m < 30 ? 30 : 60, 0, 0);
    return {
      origin: null, interests: ["heritage", "photography"], onSpot: false, days: 2,
      startDate: E.isoDate(now), startTime: pad(start.getHours()) + ":" + pad(start.getMinutes()),
      pace: "balanced", mode: "car", returnToOrigin: true, members: 2, group: "couple",
      budgetMode: "total", budget: 8000, buffer: 2000, food: "any", stayTier: "auto", accessible: false
    };
  };

  W.open = function (preset) {
    W.data = W.data || W.defaults();
    if (preset) for (var k in preset) W.data[k] = preset[k];
    W.step = preset && preset.origin ? 1 : 0;
    $("wizard").classList.add("open"); document.body.classList.add("lock");
    render();
  };
  W.close = function () { $("wizard").classList.remove("open"); document.body.classList.remove("lock"); };

  function setOrigin(o) { W.data.origin = o; render(); }

  function render() {
    var d = W.data, body = $("wizBody");
    $("wizProgress").innerHTML = Array.apply(null, Array(STEPS)).map(function (_, i) { return '<i class="' + (i <= W.step ? "on" : "") + '"></i>'; }).join("");
    $("wizBack").style.visibility = W.step === 0 ? "hidden" : "visible";
    var last = W.step === STEPS - 1;
    $("wizNext").innerHTML = last ? ic("spark") + " <span>" + t("generate") + "</span>" : "<span>" + t("next") + "</span> " + ic("chevR");
    var h = "";
    if (W.step === 0) h = stepLocation(d);
    else if (W.step === 1) h = stepInterests(d);
    else if (W.step === 2) h = stepTrip(d);
    else if (W.step === 3) h = stepBudget(d);
    else h = stepReview(d);
    body.innerHTML = h; body.scrollTop = 0;
    bind(body);
  }

  function stepLocation(d) {
    var o = d.origin, h = '<h2 class="q-title">' + t("w1_q") + '</h2><p class="q-sub">' + t("w1_sub") + "</p>";
    h += '<div class="loc-card' + (o ? " found" : "") + '"><div class="li">' + ic(o ? "check" : "pin") + "</div><div><b>" + (o ? esc(o.label) : "Location not set") +
      "</b><small>" + (o ? esc(o.district + " district" + (o.gps ? " · live GPS" : "")) : "Use GPS or pick a place below") + "</small></div></div>";
    h += '<div style="margin-top:12px"><button class="btn btn-primary" id="gpsBtn" style="width:100%">' + ic("locate") + " " + t("use_location") + "</button></div>";
    h += '<div class="divider-or">' + t("or_pick") + "</div>";
    h += '<div class="field"><input class="input" id="placeSearch" autocomplete="off" placeholder="' + esc(t("search_place")) + '"/><div class="chips" id="searchHits" style="margin-top:10px"></div></div>';
    var cur = o ? o.district : "Bagalkot";
    h += '<div class="field"><label for="distSel">' + t("district") + '</label><select class="select" id="distSel">' +
      S.DISTRICTS.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (x) {
        return '<option value="' + esc(x.name) + '"' + (x.name === cur ? " selected" : "") + ">" + esc(x.name) + " · " + esc(x.kn) + "</option>";
      }).join("") + "</select></div>";
    var D = E.districtByName(cur);
    h += '<div class="field"><span class="label">' + t("town") + '</span><div class="chips" id="townChips">' + townChips(D, o) + "</div></div>";
    return h;
  }
  function townChips(D, o) {
    if (!D) return "";
    var h = D.towns.map(function (tw) {
      return '<button class="chip' + (o && o.label === tw.name ? " on" : "") + '" data-town="' + esc(tw.name) + '">' + ic("pin") + esc(tw.name) + "</button>";
    }).join("");
    var landmarks = S.PLACES.filter(function (p) { return p.district === D.name && p.popularity >= 5; }).slice(0, 4);
    h += landmarks.map(function (p) { return '<button class="chip' + (o && o.label === p.name ? " on" : "") + '" data-place="' + esc(p.id) + '">' + ic("temple") + esc(p.name) + "</button>"; }).join("");
    return h;
  }

  function stepInterests(d) {
    var h = '<h2 class="q-title">' + t("w2_q") + '</h2><p class="q-sub">' + t("w2_sub") + '</p><div class="interest-grid">';
    E.INTERESTS.forEach(function (it) {
      var on = d.interests.indexOf(it.id) >= 0;
      h += '<button class="int' + (on ? " on" : "") + '" data-int="' + it.id + '" aria-pressed="' + on + '">' + ic(it.icon) + "<span>" + esc(I.lang === "kn" ? it.kn : it.label) + "<small>" + esc(I.lang === "kn" ? it.label : it.kn) + "</small></span></button>";
    });
    return h + "</div>";
  }

  function seg(name, opts, val) {
    return '<div class="seg" data-seg="' + name + '">' + opts.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '" class="' + (String(val) === String(o[0]) ? "on" : "") + '">' + (o[2] ? ic(o[2]) : "") + esc(o[1]) + "</button>";
    }).join("") + "</div>";
  }

  function stepTrip(d) {
    var h = '<h2 class="q-title">' + t("w3_q") + '</h2><p class="q-sub">' + t("w3_sub") + "</p>";
    h += '<div class="mode-cards"><button class="mode-card' + (d.onSpot ? " on" : "") + '" data-onspot="1"><b>' + ic("compass") + t("mode_now") + "</b><p>" + t("mode_now_d") + "</p></button>" +
      '<button class="mode-card' + (!d.onSpot ? " on" : "") + '" data-onspot="0"><b>' + ic("calendar") + t("mode_plan") + "</b><p>" + t("mode_plan_d") + "</p></button></div>";
    if (!d.onSpot) {
      h += '<div class="field"><span class="label">' + t("days") + '</span><div class="chips">' + [1, 2, 3, 4, 5, 6, 7].map(function (n) {
        return '<button class="chip' + (d.days === n ? " on" : "") + '" data-days="' + n + '">' + n + (n === 1 ? " day" : " days") + "</button>";
      }).join("") + "</div></div>";
      h += '<div class="row"><div class="field"><label for="sDate">' + t("start_date") + '</label><input class="input" type="date" id="sDate" value="' + d.startDate + '"/></div>' +
        '<div class="field"><label for="sTime">' + t("start_time") + '</label><input class="input" type="time" id="sTime" value="' + d.startTime + '"/></div></div>';
      h += '<div class="field"><span class="label">' + t("pace") + "</span>" + seg("pace", [["relaxed", "Relaxed", "coffee"], ["balanced", "Balanced", "gauge"], ["packed", "Packed", "bolt"]], d.pace) + "</div>";
    }
    h += '<div class="field"><span class="label">' + t("travel_by") + "</span>" + seg("mode", [["car", "Own car", "car"], ["cab", "Taxi", "taxi"], ["bike", "Two-wheeler", "bike"], ["bus", "KSRTC bus", "bus"]], d.mode) + "</div>";
    if (!d.onSpot) h += '<label class="toggle"><span>' + t("return_home") + '<small>Adds the drive back to your start point</small></span><input type="checkbox" id="retTgl"' + (d.returnToOrigin ? " checked" : "") + "/></label>";
    return h;
  }

  function stepBudget(d) {
    var total = d.budgetMode === "perPerson" ? d.budget * d.members : d.budget;
    var h = '<h2 class="q-title">' + t("w4_q") + '</h2><p class="q-sub">' + t("w4_sub") + "</p>";
    h += '<div class="row"><div class="field"><span class="label">' + t("members") + '</span><div class="stepper"><button type="button" data-mem="-1" aria-label="Fewer">' + ic("minus") + "</button><output id=\"memOut\">" + d.members + '</output><button type="button" data-mem="1" aria-label="More">' + ic("plus") + "</button></div></div>";
    h += '<div class="field"><span class="label">' + t("group") + "</span>" + seg("group", [["solo", "Solo"], ["couple", "Couple"], ["family", "Family + kids"], ["friends", "Friends"], ["seniors", "Seniors"]], d.group) + "</div></div>";
    h += '<div class="field"><span class="label">' + t("budget") + "</span>" + seg("budgetMode", [["total", t("budget_total")], ["perPerson", t("budget_pp")]], d.budgetMode) +
      '<div class="input-money" style="margin-top:10px"><span>₹</span><input class="input" id="budgetIn" inputmode="numeric" value="' + (d.budget || "") + '"/></div>' +
      '<div class="chips" style="margin-top:8px">' + [2000, 5000, 10000, 20000, 50000].map(function (v) { return '<button class="chip" data-bud="' + v + '">' + E.inr(v) + "</button>"; }).join("") + "</div>" +
      '<div class="hint" id="budHint">' + (d.budgetMode === "perPerson" ? "Group total " + E.inr(total) : "≈ " + E.inr(total / Math.max(1, d.members)) + " per person") + "</div></div>";
    h += '<div class="field"><span class="label">' + t("buffer") + '</span><div class="input-money"><span>₹</span><input class="input" id="bufferIn" inputmode="numeric" value="' + (d.buffer || "") + '"/></div>' +
      '<div class="chips" style="margin-top:8px">' + [1000, 2000, 3000, 5000].map(function (v) { return '<button class="chip" data-buf="' + v + '">+' + E.inr(v) + "</button>"; }).join("") +
      '<button class="chip" data-bufpct="10">+10%</button></div><div class="hint">You can spend up to ' + E.inr(total + (+d.buffer || 0)) + " in total.</div></div>";
    h += '<div class="row"><div class="field"><span class="label">' + t("food_pref") + "</span>" + seg("food", [["veg", "Veg"], ["nonveg", "Non-veg"], ["any", "Both"]], d.food) + "</div>";
    h += '<div class="field"><span class="label">' + t("stay_pref") + "</span>" + seg("stayTier", [["auto", "Auto"], ["budget", "Budget"], ["comfort", "Comfort"], ["premium", "Premium"]], d.stayTier) + "</div></div>";
    h += '<label class="toggle"><span>' + t("accessible") + '<small>Low-effort, senior-friendly sites only</small></span><input type="checkbox" id="accTgl"' + (d.accessible ? " checked" : "") + "/></label>";
    return h;
  }

  function stepReview(d) {
    var total = d.budgetMode === "perPerson" ? d.budget * d.members : d.budget;
    var rows = [
      ["Start", d.origin ? d.origin.label + ", " + d.origin.district : "—"],
      ["Interests", d.interests.map(function (i) { return I.label(E.interestById(i)); }).join(", ")],
      ["Trip", d.onSpot ? "Explore right now" : d.days + " day" + (d.days > 1 ? "s" : "") + " from " + d.startDate + " · " + d.startTime + " · " + d.pace],
      ["Travel", E.MODES[d.mode].label + (d.onSpot ? "" : d.returnToOrigin ? " · return to start" : " · one way")],
      ["Group", d.members + " · " + d.group],
      ["Budget", total ? E.inr(total) + " total (" + E.inr(total / d.members) + "/person) + " + E.inr(d.buffer) + " buffer" : "Not set"],
      ["Food / stay", d.food + " · " + d.stayTier + (d.accessible ? " · accessible only" : "")]
    ];
    return '<h2 class="q-title">' + t("w5_q") + '</h2><p class="q-sub">' + t("w5_sub") + '</p><div class="summary-list">' +
      rows.map(function (r) { return "<div><span>" + r[0] + "</span><b>" + esc(r[1]) + "</b></div>"; }).join("") + "</div>";
  }

  function bind(body) {
    var d = W.data;
    var gps = body.querySelector("#gpsBtn");
    if (gps) gps.onclick = function () {
      gps.disabled = true; gps.innerHTML = ic("locate") + " " + t("locating");
      S.live.position().then(function (p) {
        var near = E.locate(p);
        var o = { lat: p.lat, lng: p.lng, label: near ? near.town : "My location", district: near ? near.district : "", gps: true };
        setOrigin(o);
        S.live.placeName(p.lat, p.lng).then(function (name) { if (name && W.data.origin === o) { o.label = name + (near && name !== near.town ? ", near " + near.town : ""); render(); } });
      }).catch(function (e) {
        gps.disabled = false; gps.innerHTML = ic("locate") + " " + t("use_location");
        S.app.toast(e && e.code === 1 ? "Location permission denied — please pick a place below." : "Couldn't get your location — pick a place below.");
      });
    };
    var sel = body.querySelector("#distSel");
    if (sel) sel.onchange = function () { $("townChips").innerHTML = townChips(E.districtByName(sel.value), d.origin); bindTowns(); };
    function bindTowns() {
      body.querySelectorAll("[data-town]").forEach(function (b) {
        b.onclick = function () {
          var D = E.districtByName(sel.value), tw = D.towns.filter(function (x) { return x.name === b.getAttribute("data-town"); })[0];
          setOrigin({ lat: tw.lat, lng: tw.lng, label: tw.name, district: D.name });
        };
      });
      body.querySelectorAll("[data-place]").forEach(function (b) {
        b.onclick = function () { var p = E.placeById(b.getAttribute("data-place")); setOrigin({ lat: p.lat, lng: p.lng, label: p.name, district: p.district }); };
      });
    }
    bindTowns();
    var search = body.querySelector("#placeSearch");
    if (search) search.oninput = function () {
      var q = search.value.trim().toLowerCase(), hits = [];
      if (q.length >= 2) {
        S.DISTRICTS.forEach(function (D) { D.towns.forEach(function (tw) { if (tw.name.toLowerCase().indexOf(q) >= 0) hits.push({ label: tw.name, sub: D.name, lat: tw.lat, lng: tw.lng, district: D.name }); }); });
        S.PLACES.forEach(function (p) { if (p.name.toLowerCase().indexOf(q) >= 0 || (p.town || "").toLowerCase().indexOf(q) >= 0) hits.push({ label: p.name, sub: p.town, lat: p.lat, lng: p.lng, district: p.district }); });
      }
      $("searchHits").innerHTML = hits.slice(0, 8).map(function (hh, i) { return '<button class="chip" data-hit="' + i + '">' + ic("pin") + esc(hh.label) + " <small>" + esc(hh.sub) + "</small></button>"; }).join("");
      $("searchHits").querySelectorAll("[data-hit]").forEach(function (b) {
        b.onclick = function () { var hh = hits[+b.getAttribute("data-hit")]; setOrigin({ lat: hh.lat, lng: hh.lng, label: hh.label, district: hh.district }); };
      });
    };
    body.querySelectorAll("[data-int]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-int"), i = d.interests.indexOf(id);
        if (i >= 0) d.interests.splice(i, 1); else d.interests.push(id);
        b.classList.toggle("on"); b.setAttribute("aria-pressed", i < 0);
      };
    });
    body.querySelectorAll("[data-onspot]").forEach(function (b) { b.onclick = function () { d.onSpot = b.getAttribute("data-onspot") === "1"; render(); }; });
    body.querySelectorAll("[data-days]").forEach(function (b) { b.onclick = function () { d.days = +b.getAttribute("data-days"); render(); }; });
    body.querySelectorAll("[data-seg]").forEach(function (g) {
      g.querySelectorAll("button").forEach(function (b) {
        b.onclick = function () {
          var k = g.getAttribute("data-seg"); d[k] = b.getAttribute("data-v");
          if (k === "budgetMode") render(); else { g.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); }); }
        };
      });
    });
    var sd = body.querySelector("#sDate"); if (sd) sd.onchange = function () { d.startDate = sd.value || d.startDate; };
    var stt = body.querySelector("#sTime"); if (stt) stt.onchange = function () { d.startTime = stt.value || d.startTime; };
    var ret = body.querySelector("#retTgl"); if (ret) ret.onchange = function () { d.returnToOrigin = ret.checked; };
    var acc = body.querySelector("#accTgl"); if (acc) acc.onchange = function () { d.accessible = acc.checked; };
    body.querySelectorAll("[data-mem]").forEach(function (b) {
      b.onclick = function () {
        d.members = Math.max(1, Math.min(30, d.members + (+b.getAttribute("data-mem"))));
        if (d.members === 1) d.group = "solo"; else if (d.group === "solo") d.group = d.members === 2 ? "couple" : "friends";
        render();
      };
    });
    var bi = body.querySelector("#budgetIn");
    if (bi) bi.oninput = function () { d.budget = +bi.value.replace(/[^\d]/g, "") || 0; var tot = d.budgetMode === "perPerson" ? d.budget * d.members : d.budget; $("budHint").textContent = d.budgetMode === "perPerson" ? "Group total " + E.inr(tot) : "≈ " + E.inr(tot / Math.max(1, d.members)) + " per person"; };
    var bf = body.querySelector("#bufferIn");
    if (bf) bf.oninput = function () { d.buffer = +bf.value.replace(/[^\d]/g, "") || 0; };
    body.querySelectorAll("[data-bud]").forEach(function (b) { b.onclick = function () { d.budget = +b.getAttribute("data-bud"); render(); }; });
    body.querySelectorAll("[data-buf]").forEach(function (b) { b.onclick = function () { d.buffer = +b.getAttribute("data-buf"); render(); }; });
    body.querySelectorAll("[data-bufpct]").forEach(function (b) { b.onclick = function () { var tot = d.budgetMode === "perPerson" ? d.budget * d.members : d.budget; d.buffer = Math.round(tot * 0.1 / 100) * 100; render(); }; });
  }

  W.next = function () {
    var d = W.data;
    if (W.step === 0 && !d.origin) { S.app.toast("Please share your location or pick a place."); return; }
    if (W.step === 1 && !d.interests.length) { S.app.toast("Pick at least one interest."); return; }
    if (W.step === STEPS - 1) { W.close(); S.app.run(JSON.parse(JSON.stringify(d))); return; }
    W.step++; render();
  };
  W.back = function () { if (W.step > 0) { W.step--; render(); } };

  document.addEventListener("DOMContentLoaded", function () {
    $("wizNext").onclick = W.next; $("wizBack").onclick = W.back; $("wizClose").onclick = W.close;
    $("wizard").addEventListener("click", function (e) { if (e.target.id === "wizard") W.close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("wizard").classList.contains("open")) W.close(); });
  });
})(typeof window !== "undefined" ? window : globalThis);
