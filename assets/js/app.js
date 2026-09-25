/* Sanchara.AI — app shell: landing page, routing, run/replan, feedback learning, chat, toasts. */
(function (root) {
  "use strict";
  var S = root.SANCHARA, E = S.engine, I = S.i18n;
  var A = S.app = {};
  S.state = { input: null, plan: null, spot: null };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ic(n) { return '<svg class="ic"><use href="#i-' + n + '"/></svg>'; }

  /* ---------- Toast ---------- */
  var tt = null;
  A.toast = function (msg) { var el = $("toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { el.classList.remove("show"); }, 3200); };

  /* ---------- Landing ---------- */
  function heroSlides() {
    var box = $("heroSlides"), dots = $("heroDots"), name = $("heroName"), ids = (S.HERO || []).filter(function (id) { return E.placeById(id); });
    var ready = [], cur = -1;
    ids.forEach(function (id, i) {
      var p = E.placeById(id), slide = document.createElement("div");
      slide.className = "hero-slide"; slide.setAttribute("data-i", i);
      var img = document.createElement("img"), list = S.imageCandidates(id, 1920), k = 0;
      img.alt = p.name;
      img.onload = function () { ready.push(i); if (cur < 0) show(i); drawDots(); };
      img.onerror = function () { k++; if (k < list.length) img.src = list[k]; };
      img.src = list[0];
      slide.appendChild(img); box.appendChild(slide);
    });
    function drawDots() {
      dots.innerHTML = ready.slice().sort().map(function (i) { return '<button aria-label="Slide ' + (i + 1) + '" data-s="' + i + '" class="' + (i === cur ? "on" : "") + '"></button>'; }).join("");
      dots.querySelectorAll("button").forEach(function (b) { b.onclick = function () { show(+b.getAttribute("data-s")); }; });
    }
    function show(i) {
      cur = i;
      box.querySelectorAll(".hero-slide").forEach(function (s) { s.classList.toggle("on", +s.getAttribute("data-i") === i); });
      var p = E.placeById(ids[i]); name.textContent = p ? p.name + " · " + p.district : "";
      drawDots();
    }
    setInterval(function () {
      if (ready.length < 2 || document.hidden) return;
      var sorted = ready.slice().sort(), pos = sorted.indexOf(cur);
      show(sorted[(pos + 1) % sorted.length]);
    }, 6500);
    if (!ids.length) name.textContent = "";
  }

  var QUICK = [["Bagalkot", "Badami · Aihole · Pattadakal", "Badami"], ["Vijayanagara", "Hampi", "Hampi"], ["Vijayapura", "Gol Gumbaz", null], ["Belagavi", "Gokak · Kittur", null],
    ["Dharwad", "Hubballi–Dharwad", null], ["Ballari", "Fort · Sandur", null], ["Koppal", "Anegundi", null], ["Gadag", "Lakkundi", null], ["Kalaburagi", "Fort · Sharana Basaveshwara", null],
    ["Bidar", "Bahmani capital", null], ["Uttara Kannada", "Gokarna · Dandeli", "Gokarna"], ["Shivamogga", "Jog Falls · Safari", null], ["Mysuru", "Palace city", null], ["Hassan", "Belur · Halebidu", null]];

  function landing() {
    ["brandMark", "brandMark2", "wizMark"].forEach(function (id) { var el = $(id); if (el) el.innerHTML = S.art.brandMark(); });
    $("heroArt").innerHTML = S.art.heroScene();
    $("heroSkyline").innerHTML = S.art.skyline({ hillOpacity: 0.5 });
    $("appSkyline").innerHTML = S.art.skyline({ hillOpacity: 0.4 });
    $("storyArt").innerHTML = S.art.skyline({ hillOpacity: 0.25 });
    document.querySelectorAll(".ornament-slot").forEach(function (el) { el.innerHTML = S.art.ornament(); });
    $("statPlaces").textContent = S.PLACES.length;
    $("statDistricts").textContent = S.DISTRICTS.length;
    heroSlides();
    $("quickChips").innerHTML = QUICK.map(function (q) {
      var D = E.districtByName(q[0]); if (!D) return "";
      return '<button class="chip" data-q="' + esc(q[0]) + '">' + ic("pin") + esc(I.lang === "kn" ? D.kn : q[0]) + " <small>" + esc(q[1]) + "</small></button>";
    }).join("");
    $("quickChips").querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () {
        var q = QUICK.filter(function (x) { return x[0] === b.getAttribute("data-q"); })[0], D = E.districtByName(q[0]);
        var tw = q[2] ? D.towns.filter(function (x) { return x.name === q[2]; })[0] : null; tw = tw || D.towns[0] || D;
        S.wizard.open({ origin: { lat: tw.lat, lng: tw.lng, label: tw.name, district: D.name } });
      };
    });
    var G = ["hampi-stone-chariot", "badami-cave-temples", "pattadakal-temples", "aihole-durga-temple", "gol-gumbaz", "bidar-fort", "belagavi-fort", "gokak-falls"];
    $("gallery").innerHTML = G.map(function (id) {
      var p = E.placeById(id); if (!p) return "";
      return '<button class="g-card" data-g="' + id + '">' + S.results.photo(p) + '<div class="g-tag">' + (p.unesco ? '<span class="badge">UNESCO</span>' : '<span class="badge">' + esc(p.district) + "</span>") + '</div><div class="g-body"><h3>' + esc(p.name) + '</h3><div class="kn">' + esc(p.kn || "") + "</div><p>" + esc(p.desc) + "</p></div></button>";
    }).join("");
    $("gallery").querySelectorAll("[data-g]").forEach(function (b) {
      b.onclick = function () { var p = E.placeById(b.getAttribute("data-g")); S.wizard.open({ origin: { lat: p.lat, lng: p.lng, label: p.name, district: p.district } }); };
    });
    S.results.hydrate($("gallery"));
  }

  /* ---------- Run & replan ---------- */
  function thinking(on) {
    var el = $("thinking");
    if (!on) { el.classList.remove("open"); return Promise.resolve(); }
    $("mandala").innerHTML = S.art.mandala();
    var steps = ["t1", "t2", "t3", "t4", "t5"];
    $("thinkSteps").innerHTML = steps.map(function (k) { return "<li>" + ic("check") + "<span>" + I.t(k) + "</span></li>"; }).join("");
    el.classList.add("open"); I.apply(el);
    var lis = $("thinkSteps").querySelectorAll("li");
    return new Promise(function (resolve) {
      var i = 0;
      (function tick() { if (i < lis.length) { lis[i].classList.add("on"); i++; setTimeout(tick, 330); } else setTimeout(resolve, 250); })();
    });
  }
  function enterApp() {
    document.body.classList.add("in-app"); $("app").classList.add("open"); $("nav").classList.add("solid");
    try { if (location.hash !== "#/plan") history.pushState(null, "", "#/plan"); } catch (e) {}
    window.scrollTo(0, 0);
    S.map.init($("map"));
  }
  function exitApp() { document.body.classList.remove("in-app"); $("app").classList.remove("open"); if (S.map.stopLive) S.map.stopLive(); onScroll(); }

  function compute(input) {
    S.state.input = input;
    try { localStorage.setItem("sanchara.lastTrip", JSON.stringify(input)); } catch (e) {}
    if (input.onSpot) { S.state.spot = E.onSpot(input); S.state.plan = null; }
    else { S.state.plan = E.plan(input); S.state.spot = null; }
  }
  function draw() { if (S.state.plan) S.results.renderPlan(S.state.plan); else if (S.state.spot) S.results.renderSpot(S.state.spot); }

  A.run = function (input) {
    input.feedback = input.feedback || { liked: [], disliked: [] };
    S.results.tab = null; S.results.day = 0;
    var anim = thinking(true);
    setTimeout(function () {
      try { compute(input); } catch (e) { console.error(e); thinking(false); A.toast("Something went wrong while planning — please adjust and retry."); return; }
      anim.then(function () { thinking(false); enterApp(); draw(); });
    }, 30);
  };
  A.replan = function (msg) {
    var y = window.scrollY;
    compute(S.state.input); draw();
    window.scrollTo(0, y);
    if (msg) A.toast(msg);
  };
  A.feedback = function (id, dir) {
    var inp = S.state.input, fb = inp.feedback = inp.feedback || { liked: [], disliked: [] };
    inp.exclude = inp.exclude || []; inp.pinned = inp.pinned || [];
    var p = E.placeById(id), liked = fb.liked.indexOf(id), dis = fb.disliked.indexOf(id);
    if (dir === "up") {
      if (liked >= 0) { fb.liked.splice(liked, 1); A.replan("Removed like"); return; }
      fb.liked.push(id); if (dis >= 0) fb.disliked.splice(dis, 1);
      inp.exclude = inp.exclude.filter(function (x) { return x !== id; });
      A.replan("👍 Learned: more places like " + p.name);
    } else {
      if (dis >= 0) { fb.disliked.splice(dis, 1); inp.exclude = inp.exclude.filter(function (x) { return x !== id; }); A.replan("Restored " + p.name); return; }
      fb.disliked.push(id); if (liked >= 0) fb.liked.splice(liked, 1);
      if (inp.exclude.indexOf(id) < 0) inp.exclude.push(id);
      inp.pinned = inp.pinned.filter(function (x) { return x !== id; });
      A.replan("👎 Replaced " + p.name + " — fewer like it");
    }
  };
  A.pin = function (id) {
    var inp = S.state.input; inp.pinned = inp.pinned || [];
    if (inp.pinned.indexOf(id) < 0) inp.pinned.push(id);
    inp.exclude = (inp.exclude || []).filter(function (x) { return x !== id; });
    A.replan("Added " + E.placeById(id).name + " to your plan");
  };

  /* ---------- Chat ---------- */
  var C = S.chat = { log: [] };
  function context() {
    var st = S.state, P = st.plan ? st.plan.profile : st.spot ? st.spot.profile : null, ctx = { now: new Date().toString() };
    if (P) ctx.traveller = { start: P.origin.label, district: P.origin.district, interests: P.interests, days: P.days, members: P.members, group: P.group, mode: P.mode, food: P.food,
      budgetTotal: E.totalBudget(P), buffer: P.buffer };
    if (st.plan) {
      ctx.plan = st.plan.days.map(function (d) {
        return { day: d.label, date: d.date, items: d.items.filter(function (i) { return i.type !== "travel"; }).map(function (i) {
          return (i.start != null ? E.fmtTime(i.start) + " " : "") + (i.type === "visit" ? i.place.name : i.type === "meal" ? i.meal.label + " in " + (i.food.town || "") + " (" + i.food.dishes.map(function (x) { return x.name; }).join(", ") + ")" : i.type === "stay" ? "Stay: " + i.stay.pos.name : i.type);
        }) };
      });
      ctx.totals = st.plan.totals; ctx.budget = st.plan.budget;
    }
    var ranked = st.plan ? st.plan.ranked : st.spot ? st.spot.ranked : [];
    ctx.nearbyTopPlaces = ranked.slice(0, 12).map(function (r) { var p = r.place; return p.name + " (" + p.town + ", " + Math.round(r.km) + " km, " + r.match + "% match, ₹" + p.fee + ", " + p.open + "-" + p.close + "): " + p.desc; });
    return ctx;
  }
  function add(role, text, src) {
    C.log.push({ role: role, text: text, src: src });
    var box = $("chatLog"); if (!box) return;
    var d = document.createElement("div"); d.className = "msg " + (role === "user" ? "me" : "bot");
    d.textContent = text;
    if (src) { var s = document.createElement("span"); s.className = "src"; s.textContent = src; d.appendChild(s); }
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }
  C.send = function (q) {
    q = (q || "").trim(); if (!q) return;
    add("user", q);
    var box = $("chatLog"), typing = document.createElement("div");
    typing.className = "msg bot"; typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; box.appendChild(typing); box.scrollTop = box.scrollHeight;
    var history = C.log.slice(-10).map(function (m) { return { role: m.role === "user" ? "user" : "model", text: m.text }; });
    var st = S.state, localState = { plan: st.plan, profile: st.plan ? st.plan.profile : st.spot ? st.spot.profile : null, origin: (st.plan || st.spot) ? (st.plan ? st.plan.profile.origin : st.spot.profile.origin) : null, ranked: st.plan ? st.plan.ranked : st.spot ? st.spot.ranked : null };
    S.live.ask(history, context()).then(function (j) {
      typing.remove(); add("bot", j.reply, "✨ Gemini · grounded on your plan");
    }).catch(function () {
      setTimeout(function () { typing.remove(); add("bot", E.answer(q, localState), "⚡ Sanchara Lite · offline AI"); }, 350);
    });
  };
  C.mount = function (el) {
    if (!el) return;
    el.innerHTML = '<div class="card chat"><div class="chat-log" id="chatLog"></div><div class="chat-suggest" id="chatSug"></div>' +
      '<form class="chat-form" id="chatForm"><input class="input" id="chatIn" autocomplete="off" placeholder="' + esc(I.t("ask_placeholder")) + '"/>' +
      '<button class="icon-btn" type="button" id="chatMic" title="Speak">' + ic("mic") + '</button><button class="btn btn-primary" type="submit">' + ic("send") + "</button></form></div>";
    var box = $("chatLog");
    if (!C.log.length) C.log.push({ role: "bot", text: "Namaskara! 🙏 I'm Sanchara. Ask me about places, food for this hour, stays, sunset, crowds, distances or your budget — in English or ಕನ್ನಡ.", src: "" });
    C.log.forEach(function (m) {
      var d = document.createElement("div"); d.className = "msg " + (m.role === "user" ? "me" : "bot"); d.textContent = m.text;
      if (m.src) { var s = document.createElement("span"); s.className = "src"; s.textContent = m.src; d.appendChild(s); }
      box.appendChild(d);
    });
    var sug = ["What should I eat now?", "Best time to avoid crowds?", "Cheaper stay options?", "Sunset spots near me", "Emergency numbers", "ಇಲ್ಲಿ ಏನು ನೋಡಬೇಕು?"];
    $("chatSug").innerHTML = sug.map(function (s) { return '<button class="chip" type="button">' + esc(s) + "</button>"; }).join("");
    $("chatSug").querySelectorAll("button").forEach(function (b) { b.onclick = function () { C.send(b.textContent); }; });
    $("chatForm").onsubmit = function (e) { e.preventDefault(); var inp = $("chatIn"); C.send(inp.value); inp.value = ""; };
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    $("chatMic").onclick = function () {
      if (!SR) return A.toast("Voice input needs Chrome with internet.");
      var r = new SR(); r.lang = I.lang === "kn" ? "kn-IN" : "en-IN"; r.interimResults = false;
      r.onresult = function (ev) { C.send(ev.results[0][0].transcript); };
      r.onerror = function () { A.toast("Couldn't hear that — try typing."); };
      r.start(); A.toast("Listening…");
    };
  };

  /* ---------- Nav, language, routing ---------- */
  function onScroll() { if (!document.body.classList.contains("in-app")) $("nav").classList.toggle("solid", window.scrollY > 40); }
  function setLangBtn() { $("langBtn").textContent = I.lang === "kn" ? "English" : "ಕನ್ನಡ"; }

  document.addEventListener("DOMContentLoaded", function () {
    I.apply(); setLangBtn();
    landing();
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    document.querySelectorAll("[data-start]").forEach(function (b) { b.onclick = function () { S.wizard.open(); }; });
    $("brand").onclick = function (e) { e.preventDefault(); if (document.body.classList.contains("in-app")) { exitApp(); try { history.replaceState(null, "", "#/"); } catch (e3) {} window.scrollTo(0, 0); } else window.scrollTo(0, 0); };
    $("langBtn").onclick = function () {
      I.set(I.lang === "kn" ? "en" : "kn"); setLangBtn();
      $("quickChips").innerHTML = ""; landingChipsOnly();
      if (document.body.classList.contains("in-app")) draw();
      if ($("wizard").classList.contains("open")) S.wizard.open();
    };
    function landingChipsOnly() {
      $("quickChips").innerHTML = QUICK.map(function (q) { var D = E.districtByName(q[0]); return D ? '<button class="chip" data-q="' + esc(q[0]) + '">' + ic("pin") + esc(I.lang === "kn" ? D.kn : q[0]) + " <small>" + esc(q[1]) + "</small></button>" : ""; }).join("");
      $("quickChips").querySelectorAll("[data-q]").forEach(function (b) {
        b.onclick = function () {
          var q = QUICK.filter(function (x) { return x[0] === b.getAttribute("data-q"); })[0], D = E.districtByName(q[0]);
          var tw = q[2] ? D.towns.filter(function (x) { return x.name === q[2]; })[0] : null; tw = tw || D.towns[0] || D;
          S.wizard.open({ origin: { lat: tw.lat, lng: tw.lng, label: tw.name, district: D.name } });
        };
      });
    }
    $("demoBtn").onclick = function () {
      var h = E.placeById("hampi-virupaksha-temple"), tomorrow = E.addDays(new Date(), 1);
      A.run({ origin: { lat: h.lat, lng: h.lng, label: "Hampi", district: "Vijayanagara" }, interests: ["heritage", "boating", "wildlife", "photography"], onSpot: false, days: 2,
        startDate: E.isoDate(tomorrow), startTime: "08:00", pace: "balanced", mode: "car", returnToOrigin: true, members: 4, group: "family",
        budgetMode: "total", budget: 14000, buffer: 3000, food: "veg", stayTier: "auto", accessible: false });
    };
    $("storyBtn").onclick = function () {
      var b = E.placeById("badami-cave-temples"), tomorrow = E.addDays(new Date(), 1);
      A.run({ origin: { lat: b.lat, lng: b.lng, label: "Badami", district: "Bagalkot" }, interests: ["heritage", "photography", "nature"], onSpot: false, days: 1,
        startDate: E.isoDate(tomorrow), startTime: "08:00", pace: "balanced", mode: "car", returnToOrigin: true, members: 2, group: "couple",
        budgetMode: "total", budget: 4000, buffer: 1000, food: "any", stayTier: "auto", accessible: false });
    };
    window.addEventListener("popstate", function () { if (location.hash !== "#/plan") exitApp(); else if (S.state.plan || S.state.spot) { enterApp(); draw(); } });
    window.addEventListener("resize", function () { if (S.results.tab) S.results.show(S.results.tab); });
    if (location.hash === "#/plan") {
      try { var last = JSON.parse(localStorage.getItem("sanchara.lastTrip") || "null"); if (last) { compute(last); enterApp(); draw(); } else { try { history.replaceState(null, "", "#/"); } catch (e2) {} } } catch (e) {}
    }
    if (location.protocol === "file:") setTimeout(function () { A.toast("Tip: run npm start and open http://localhost:3000 for live GPS and OpenStreetMap tiles."); }, 1200);
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(function () {});
  });
})(typeof window !== "undefined" ? window : globalThis);
