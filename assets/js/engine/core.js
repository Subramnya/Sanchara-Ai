/* Sanchara.AI — engine core: constants, geo maths, time, sun & crowd models.
 * Plain browser script (also loadable in Node for tests / ML evaluation). */
(function (root) {
  "use strict";
  var S = root.SANCHARA = root.SANCHARA || {};
  var E = S.engine = S.engine || {};

  /* ---------- Interests (ids match place.activities) ---------- */
  E.INTERESTS = [
    { id: "heritage", label: "Heritage & History", kn: "ಪರಂಪರೆ ಮತ್ತು ಇತಿಹಾಸ", icon: "temple",
      keywords: ["heritage", "history", "fort", "palace", "unesco", "chalukya", "vijayanagara", "hoysala", "architecture", "monument", "ruins", "cave", "rock-cut", "adil-shahi", "bahmani", "inscriptions", "dynasty"] },
    { id: "spiritual", label: "Temples & Spiritual", kn: "ದೇವಾಲಯ ಮತ್ತು ಆಧ್ಯಾತ್ಮ", icon: "lamp",
      keywords: ["temple", "spiritual", "pilgrimage", "jain", "sufi", "dargah", "math", "church", "gurudwara", "basadi", "shrine", "monastery", "lingayat", "devotion"] },
    { id: "nature", label: "Nature & Views", kn: "ಪ್ರಕೃತಿ ಮತ್ತು ನೋಟ", icon: "leaf",
      keywords: ["nature", "viewpoint", "sunset", "sunrise", "lake", "hill", "forest", "valley", "scenic", "greenery", "reservoir"] },
    { id: "waterfalls", label: "Waterfalls", kn: "ಜಲಪಾತಗಳು", icon: "drop",
      keywords: ["waterfall", "falls", "monsoon", "cascade", "river", "gorge"] },
    { id: "trekking", label: "Trekking & Hikes", kn: "ಚಾರಣ", icon: "mountain",
      keywords: ["trek", "trekking", "hike", "peak", "hill", "climb", "steps", "trail", "summit"] },
    { id: "wildlife", label: "Wildlife & Safari", kn: "ವನ್ಯಜೀವಿ ಸಫಾರಿ", icon: "paw",
      keywords: ["wildlife", "safari", "zoo", "birds", "elephant", "tiger", "bear", "sanctuary", "national-park", "deer", "lion"] },
    { id: "boating", label: "Boating & Water", kn: "ದೋಣಿ ವಿಹಾರ", icon: "boat",
      keywords: ["boating", "coracle", "boat", "lake", "river", "dam", "backwater", "kayaking", "island"] },
    { id: "adventure", label: "Adventure", kn: "ಸಾಹಸ", icon: "bolt",
      keywords: ["adventure", "rafting", "kayaking", "zipline", "climbing", "bouldering", "rappelling", "camping", "jungle"] },
    { id: "museums", label: "Museums & Culture", kn: "ವಸ್ತುಸಂಗ್ರಹಾಲಯ", icon: "museum",
      keywords: ["museum", "culture", "art", "gallery", "sculpture", "folk", "artefacts", "history"] },
    { id: "family", label: "Family Fun", kn: "ಕುಟುಂಬ ಮನರಂಜನೆ", icon: "family",
      keywords: ["family", "kids", "zoo", "park", "garden", "picnic", "fountain", "amusement", "toy-train"] },
    { id: "beaches", label: "Beaches", kn: "ಕಡಲತೀರಗಳು", icon: "wave",
      keywords: ["beach", "sea", "coast", "island", "sunset", "water-sports"] },
    { id: "photography", label: "Photography", kn: "ಛಾಯಾಗ್ರಹಣ", icon: "camera",
      keywords: ["photography", "sunset", "sunrise", "viewpoint", "architecture", "icon", "scenic", "golden-hour"] },
    { id: "shopping", label: "Shopping & Crafts", kn: "ಶಾಪಿಂಗ್ ಮತ್ತು ಕರಕುಶಲ", icon: "bag",
      keywords: ["shopping", "craft", "handloom", "saree", "toys", "market", "bidriware", "silk", "weaving"] },
    { id: "relaxing", label: "Relax & Unwind", kn: "ವಿಶ್ರಾಂತಿ", icon: "sun",
      keywords: ["relaxing", "garden", "lake", "beach", "park", "calm", "picnic", "sunset"] },
    { id: "food", label: "Food Trails", kn: "ಸ್ಥಳೀಯ ಆಹಾರ", icon: "food",
      keywords: ["food", "street-food", "sweets", "cuisine", "market"] }
  ];
  E.interestById = function (id) { for (var i = 0; i < E.INTERESTS.length; i++) if (E.INTERESTS[i].id === id) return E.INTERESTS[i]; return null; };

  /* ---------- Meals: time windows follow the brief (breakfast 8–11, lunch 12–3, snacks 4–7/8, dinner 8/9–11) ---------- */
  E.MEALS = [
    { id: "breakfast", label: "Breakfast", kn: "ಬೆಳಗಿನ ತಿಂಡಿ", from: 360, to: 659, at: 495, dur: 40, icon: "coffee" },
    { id: "lunch", label: "Lunch", kn: "ಮಧ್ಯಾಹ್ನದ ಊಟ", from: 690, to: 929, at: 780, dur: 60, icon: "thali" },
    { id: "snacks", label: "Evening snacks", kn: "ಸಂಜೆ ತಿಂಡಿ", from: 930, to: 1169, at: 1020, dur: 30, icon: "tea" },
    { id: "dinner", label: "Dinner", kn: "ರಾತ್ರಿ ಊಟ", from: 1170, to: 1409, at: 1230, dur: 60, icon: "moon" }
  ];
  E.MEAL_COST = { // ₹ per person per meal
    budget: { breakfast: 60, lunch: 120, snacks: 50, dinner: 130 },
    comfort: { breakfast: 120, lunch: 250, snacks: 100, dinner: 280 },
    premium: { breakfast: 250, lunch: 550, snacks: 200, dinner: 600 }
  };
  E.mealById = function (id) { for (var i = 0; i < E.MEALS.length; i++) if (E.MEALS[i].id === id) return E.MEALS[i]; return null; };
  /* Which meal fits a clock time (minutes since midnight). 11:00–11:29 counts as a tea break. */
  E.mealAt = function (min) {
    if (min >= 660 && min < 690) return E.mealById("snacks");
    for (var i = 0; i < E.MEALS.length; i++) if (min >= E.MEALS[i].from && min <= E.MEALS[i].to) return E.MEALS[i];
    return null; // late night / pre-dawn
  };

  /* ---------- Travel modes ---------- */
  E.MODES = {
    car:  { id: "car",  label: "Own car",         kn: "ಸ್ವಂತ ಕಾರು",    speed: 48, perKm: 7,   capacity: 5, co2: 0.17, perPerson: false, legPad: 5 },
    cab:  { id: "cab",  label: "Taxi / cab",      kn: "ಟ್ಯಾಕ್ಸಿ",        speed: 45, perKm: 13,  capacity: 4, co2: 0.17, perPerson: false, legPad: 5, bataPerDay: 400 },
    bike: { id: "bike", label: "Two-wheeler",     kn: "ದ್ವಿಚಕ್ರ ವಾಹನ",  speed: 40, perKm: 3,   capacity: 2, co2: 0.05, perPerson: false, legPad: 5 },
    bus:  { id: "bus",  label: "KSRTC bus + auto", kn: "ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಬಸ್", speed: 32, perKm: 1.3, capacity: 1, co2: 0.03, perPerson: true, legPad: 20, lastMile: 40 }
  };
  E.ROAD_FACTOR = 1.32; // straight-line → road distance (calibrated for Karnataka state highways)

  E.STAY_PRICE = { budget: 1200, comfort: 2800, premium: 7500 }; // ₹ per room-night default
  E.PACE = {
    relaxed:  { dayStart: 540, dayEnd: 1110, maxStops: 3, visitScale: 1.15, label: "Relaxed" },
    balanced: { dayStart: 510, dayEnd: 1140, maxStops: 4, visitScale: 1.0, label: "Balanced" },
    packed:   { dayStart: 450, dayEnd: 1170, maxStops: 6, visitScale: 0.85, label: "Packed" }
  };
  E.radiusFor = function (days, mode) {
    var r = days <= 0 ? 70 : days === 1 ? 130 : days === 2 ? 240 : days === 3 ? 340 : days === 4 ? 430 : 560;
    if (mode === "bike") r *= 0.75;
    if (mode === "bus") r *= 0.85;
    return Math.round(r);
  };

  /* Fixed-date public holidays (MM-DD) — crowd model boost. Extend with festival dates each year. */
  E.HOLIDAYS = ["01-01", "01-26", "05-01", "08-15", "10-02", "11-01", "12-25"];

  /* ---------- Geo ---------- */
  var RAD = Math.PI / 180;
  E.haversine = function (a, b) {
    var dLat = (b.lat - a.lat) * RAD, dLng = (b.lng - a.lng) * RAD;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 12742 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };
  E.roadKm = function (a, b) { var d = E.haversine(a, b); return d < 0.4 ? d : d * E.ROAD_FACTOR; };
  E.driveMins = function (km, modeId) {
    var m = E.MODES[modeId] || E.MODES.car;
    if (km < 0.8) return Math.max(5, Math.round(km * 14)); // short hop, walk
    return Math.round(km / m.speed * 60 + m.legPad);
  };
  E.bearing = function (a, b) {
    var y = Math.sin((b.lng - a.lng) * RAD) * Math.cos(b.lat * RAD);
    var x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lng - a.lng) * RAD);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  };
  E.compass = function (deg) { return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8]; };

  /* Nearest known town & district for any coordinate (works offline). */
  E.locate = function (pt) {
    var best = null, bestD = Infinity;
    (S.DISTRICTS || []).forEach(function (d) {
      (d.towns || [{ name: d.name, lat: d.lat, lng: d.lng }]).forEach(function (t) {
        var km = E.haversine(pt, t);
        if (km < bestD) { bestD = km; best = { town: t.name, district: d.name, districtKn: d.kn, lat: t.lat, lng: t.lng, km: km }; }
      });
    });
    return best;
  };
  E.districtByName = function (name) {
    var list = S.DISTRICTS || [];
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  };

  /* ---------- Time ---------- */
  E.toMin = function (hhmm) { if (!hhmm) return 0; var p = String(hhmm).split(":"); return (+p[0]) * 60 + (+p[1] || 0); };
  E.fmtTime = function (min) {
    min = Math.round(min); var h = Math.floor(min / 60) % 24, m = min % 60;
    var ap = h >= 12 ? "PM" : "AM", h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  };
  E.fmtDur = function (mins) {
    mins = Math.round(mins); if (mins < 60) return mins + " min";
    var h = Math.floor(mins / 60), m = mins % 60; return h + " h" + (m ? " " + m + " min" : "");
  };
  E.DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  E.parseDate = function (iso) { var p = String(iso).split("-"); return new Date(+p[0], (+p[1]) - 1, +p[2]); };
  E.isoDate = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
  E.addDays = function (d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
  E.isOpen = function (place, min, date) {
    if (place.closedOn && date && place.closedOn.indexOf(E.DOW[date.getDay()]) >= 0) return false;
    var o = E.toMin(place.open || "00:00"), c = E.toMin(place.close || "23:59");
    if (c <= o) return true;
    return min >= o && min <= c;
  };
  E.inr = function (n) {
    n = Math.round(n || 0); var s = String(Math.abs(n)), last3 = s.slice(-3), rest = s.slice(0, -3);
    if (rest) last3 = "," + last3;
    return (n < 0 ? "-" : "") + "₹" + rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + last3;
  };

  /* ---------- Sun (NOAA general solar position algorithm), returns IST minutes ---------- */
  E.sunTimes = function (date, lat, lng) {
    var y = date.getFullYear();
    var doy = Math.round((Date.UTC(y, date.getMonth(), date.getDate()) - Date.UTC(y, 0, 0)) / 864e5);
    var g = 2 * Math.PI / 365 * (doy - 1);
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var cosHa = Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl)) - Math.tan(lat * RAD) * Math.tan(decl);
    var ha = Math.acos(Math.max(-1, Math.min(1, cosHa))) / RAD;
    return { sunrise: 720 - 4 * (lng + ha) - eq + 330, sunset: 720 - 4 * (lng - ha) - eq + 330 };
  };

  /* ---------- Crowd prediction model ---------- */
  E.predictCrowd = function (place, date, min) {
    var f = place.crowd || 3;
    var dow = date.getDay();
    if (dow === 0 || dow === 6) f *= 1.3;
    var md = ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2);
    if (E.HOLIDAYS.indexOf(md) >= 0) f *= 1.35;
    var inSeason = (place.bestMonths || []).indexOf(date.getMonth() + 1) >= 0;
    f *= inSeason ? 1.1 : 0.85;
    var h = min / 60, curve;
    if (h < 8) curve = 0.55; else if (h < 10) curve = 0.72; else if (h < 12) curve = 0.95;
    else if (h < 15) curve = 1.1; else if (h < 17) curve = 1.02;
    else if (h < 19) curve = place.sunset ? 1.25 : 0.9; else curve = 0.6;
    f *= curve;
    var level = Math.max(1, Math.min(5, f));
    return { level: level, label: level < 2.3 ? "Low" : level < 3.6 ? "Moderate" : "High" };
  };
  E.bestVisitHour = function (place, date) {
    var o = E.toMin(place.open || "06:00"), c = E.toMin(place.close || "18:00");
    if (c <= o) { o = 360; c = 1140; }
    var best = o, bestL = Infinity;
    for (var m = o; m <= c - 45; m += 30) {
      var l = E.predictCrowd(place, date, m).level;
      if (l < bestL - 0.01) { bestL = l; best = m; }
    }
    return best;
  };

  /* ---------- Text ---------- */
  var STOP = ("a an the and or of in on at to for with by from is are was were be this that it its as into near over under " +
    "their his her your you we our they them which who whom where when what how than then also very most more just only " +
    "one two three four five here there some many any all each every famous known great best good").split(" ");
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  E.tokenize = function (text) {
    var out = [];
    String(text || "").toLowerCase().replace(/[^a-z0-9\-\s]/g, " ").split(/\s+/).forEach(function (w) {
      if (!w || w.length < 3 || STOPSET[w]) return;
      out.push(w);
      if (w.indexOf("-") > 0) w.split("-").forEach(function (p) { if (p.length > 2 && !STOPSET[p]) out.push(p); });
    });
    return out;
  };

  /* Deterministic PRNG (for reproducible experiments). */
  E.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  };
})(typeof window !== "undefined" ? window : globalThis);
