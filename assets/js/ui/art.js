/* Sanchara.AI — original SVG artwork: Karnataka monument skyline, brand mark, ornaments and
 * illustrated fallbacks for places without a photo (so the app looks complete even offline). */
(function (root) {
  "use strict";
  var S = root.SANCHARA = root.SANCHARA || {};
  var A = S.art = {};

  function rect(x, y, w, h) { return "M" + x + " " + y + "h" + w + "v" + h + "h" + (-w) + "z"; }
  function circle(cx, cy, r) { return "M" + (cx - r) + " " + cy + "a" + r + " " + r + " 0 1 0 " + (2 * r) + " 0a" + r + " " + r + " 0 1 0 " + (-2 * r) + " 0z"; }
  function arch(x, y, w, h) { var r = w / 2; return "M" + x + " " + (y + h) + "V" + (y + r) + "a" + r + " " + r + " 0 0 1 " + w + " 0V" + (y + h) + "z"; }

  /* Individual monuments (baseline y = 150). Each returns path data. */
  A.gopuram = function (x, w) {
    w = w || 80; var d = rect(x, 118, w, 32), y = 118, tiers = 8;
    for (var i = 0; i < tiers; i++) { var tw = w - (i + 1) * (w * 0.09), tx = x + (w - tw) / 2; y -= 10; d += rect(tx, y, tw, 10.5); }
    var vw = w * 0.34, vx = x + (w - vw) / 2; d += "M" + vx + " " + y + "q" + vw / 2 + " -16 " + vw + " 0z";
    [0.2, 0.5, 0.8].forEach(function (f) { d += circle(vx + vw * f, y - 10 + (f === 0.5 ? -4 : 0), 2.4); });
    d += arch(x + w / 2 - 7, 128, 14, 22);
    return d;
  };
  A.chariot = function (x) {
    var d = rect(x, 136, 96, 14) + rect(x + 16, 106, 64, 30);
    d += rect(x + 22, 92, 52, 14) + rect(x + 28, 80, 40, 12) + rect(x + 34, 70, 28, 10);
    d += "M" + (x + 38) + " 70q10 -18 20 0z" + circle(x + 48, 50, 2.6);
    d += circle(x + 30, 138, 13) + circle(x + 30, 138, 5) + circle(x + 66, 138, 13) + circle(x + 66, 138, 5);
    d += "M" + (x - 26) + " 150v-16q0 -14 14 -16h10q10 2 10 14v18h-6v-10h-4v10h-10v-10h-4v10z";
    return d;
  };
  A.golGumbaz = function (x) {
    var d = rect(x + 16, 92, 150, 58);
    d += "M" + (x + 28) + " 92a63 63 0 0 1 126 0z" + rect(x + 88, 20, 6, 12) + circle(x + 91, 18, 4);
    [x, x + 150].forEach(function (tx) {
      d += rect(tx, 58, 18, 92) + "M" + tx + " 58a9 9 0 0 1 18 0z" + circle(tx + 9, 44, 2.5);
      d += rect(tx + 4, 70, 10, 5) + rect(tx + 4, 90, 10, 5) + rect(tx + 4, 110, 10, 5);
    });
    for (var i = 0; i < 5; i++) d += arch(x + 36 + i * 24, 112, 14, 38);
    return d;
  };
  A.caves = function (x) {
    var d = "M" + x + " 150V96l18 -14l22 6l20 -22l28 4l18 -16l30 10l22 -4l24 18l20 -2l18 20V150z";
    for (var i = 0; i < 4; i++) d += arch(x + 30 + i * 46, 114, 26, 36);
    return d;
  };
  A.shikhara = function (x) {
    var d = rect(x, 116, 44, 34) + rect(x - 4, 112, 52, 6);
    d += "M" + (x + 34) + " 150C" + (x + 38) + " 110 " + (x + 48) + " 76 " + (x + 62) + " 58C" + (x + 76) + " 76 " + (x + 86) + " 110 " + (x + 90) + " 150z";
    d += "M" + (x + 50) + " 58a12 5 0 0 1 24 0a12 5 0 0 1 -24 0z" + rect(x + 60, 40, 4, 12) + circle(x + 62, 38, 3);
    for (var i = 0; i < 3; i++) d += arch(x + 6 + i * 13, 124, 8, 26);
    return d;
  };
  A.palace = function (x) {
    var d = rect(x, 108, 250, 42) + rect(x + 96, 70, 58, 38);
    d += "M" + (x + 100) + " 70c0 -26 25 -26 25 -46c0 20 25 20 25 46z" + rect(x + 123, 14, 4, 12);
    [x + 8, x + 60, x + 176, x + 226].forEach(function (tx) { d += rect(tx, 86, 16, 22) + "M" + tx + " 86c0 -12 8 -12 8 -20c0 8 8 8 8 20z"; });
    for (var i = 0; i < 9; i++) d += arch(x + 12 + i * 27, 122, 14, 28);
    return d;
  };
  A.boulders = function (x) {
    return circle(x + 30, 128, 24) + circle(x + 70, 124, 28) + circle(x + 52, 92, 20) + circle(x + 110, 132, 20) + circle(x + 138, 118, 26) + circle(x + 120, 88, 16) + rect(x + 4, 140, 170, 10);
  };
  A.tree = function (x, s) { s = s || 1; return rect(x - 2 * s, 128, 4 * s, 22) + circle(x, 120, 14 * s) + circle(x - 10 * s, 128, 9 * s) + circle(x + 10 * s, 128, 9 * s); };
  A.palm = function (x) { return "M" + x + " 150q2 -30 8 -56l3 1q-5 26 -7 55z" + "M" + (x + 9) + " 94q-20 -6 -30 6q14 -12 30 -3zM" + (x + 9) + " 94q20 -8 30 4q-14 -10 -30 -1zM" + (x + 9) + " 94q-6 -16 -22 -18q16 6 21 18zM" + (x + 9) + " 94q8 -16 24 -16q-16 4 -23 16z"; };

  A.skyline = function (opts) {
    opts = opts || {};
    var d = rect(0, 148, 1440, 12);
    d += A.caves(20) + A.tree(290, 0.9) + A.gopuram(318, 84) + A.palm(420) + A.chariot(470) + A.tree(600, 1.1);
    d += A.golGumbaz(640) + A.palm(842) + A.shikhara(880) + A.tree(1000, 0.8) + A.palace(1030) + A.boulders(1286);
    var hills = "M0 150C120 118 220 128 320 136S560 110 700 130S980 112 1120 132S1340 116 1440 128V160H0z";
    return '<svg viewBox="0 0 1440 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="' + hills + '" fill="' + (opts.hill || "currentColor") + '" opacity="' + (opts.hillOpacity || 0.35) + '"/>' +
      '<path fill-rule="evenodd" d="' + d + '" fill="' + (opts.fill || "currentColor") + '"/></svg>';
  };

  A.brandMark = function () {
    return '<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3c877"/><stop offset="1" stop-color="#c0602a"/></linearGradient></defs>' +
      '<circle cx="24" cy="24" r="22" fill="none" stroke="url(#bm)" stroke-width="2"/>' +
      '<path fill="url(#bm)" d="M14 36h20v-3H14zM16 33h16l-2-4H18zM18 29h12l-1.6-4h-8.8zM19.8 25h8.4l-1.3-4h-5.8zM21.2 21h5.6c0-3-1.2-5-2.8-7-1.6 2-2.8 4-2.8 7z"/>' +
      '<circle cx="24" cy="11.5" r="1.6" fill="#f3c877"/></svg>';
  };
  A.ornament = function () {
    return '<svg class="ornament" viewBox="0 0 150 18" aria-hidden="true"><path d="M0 9h55M95 9h55" stroke="currentColor" stroke-width="1.2"/><path d="M75 1c4 4 8 6 12 8-4 2-8 4-12 8-4-4-8-6-12-8 4-2 8-4 12-8z" fill="currentColor"/><circle cx="58" cy="9" r="2" fill="currentColor"/><circle cx="92" cy="9" r="2" fill="currentColor"/></svg>';
  };
  A.mandala = function () {
    var petals = "";
    for (var i = 0; i < 16; i++) petals += '<ellipse cx="60" cy="24" rx="7" ry="20" transform="rotate(' + (i * 22.5) + ' 60 60)" fill="none" stroke="currentColor" stroke-width="1.4"/>';
    return '<svg class="mandala" viewBox="0 0 120 120" aria-hidden="true">' + petals + '<circle cx="60" cy="60" r="14" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="60" cy="60" r="5" fill="currentColor"/><circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 5"/></svg>';
  };

  /* Illustrated fallback for a place card. */
  var PALETTES = {
    stone: ["#f2c983", "#c56a34", "#4a2415"],
    water: ["#b9e2d8", "#2f6f8f", "#1b2740"],
    green: ["#d8e7b0", "#5c7f50", "#1e3220"],
    craft: ["#f3c98b", "#9c3b64", "#3b1424"]
  };
  function paletteFor(cat) {
    if (["waterfall", "lake", "dam", "river", "beach", "island"].indexOf(cat) >= 0) return PALETTES.water;
    if (["hill", "trek", "viewpoint", "wildlife", "zoo", "park", "garden", "adventure"].indexOf(cat) >= 0) return PALETTES.green;
    if (cat === "craft") return PALETTES.craft;
    return PALETTES.stone;
  }
  function motif(cat) {
    switch (cat) {
      case "fort": return A.palace(-55);
      case "palace": return A.palace(-55);
      case "cave": return A.caves(-10);
      case "museum": return A.golGumbaz(-20);
      case "spiritual": return A.gopuram(40, 70) + A.shikhara(120);
      case "temple": case "heritage": return A.gopuram(20, 76) + A.shikhara(110) + A.tree(210, 0.8);
      case "waterfall": return "M40 150V70l30-20 40 6 30 -16 30 10v100z" + rect(96, 56, 10, 94) + rect(112, 60, 6, 90) + rect(124, 58, 8, 92);
      case "lake": case "dam": case "river": case "beach": case "island":
        return "M0 118q25 -10 50 0t50 0t50 0t50 0t50 0v4q-25 -10 -50 0t-50 0t-50 0t-50 0t-50 0zM0 134q25 -10 50 0t50 0t50 0t50 0t50 0v16H0z";
      case "hill": case "trek": case "viewpoint":
        return "M0 150L60 70l30 34 40 -58 60 76 30 -26 30 54z";
      case "wildlife": case "zoo": case "park": case "garden": case "adventure":
        return A.tree(50, 1.3) + A.tree(110, 1.6) + A.tree(170, 1.1) + A.palm(210) + rect(0, 148, 250, 2);
      case "craft": return rect(40, 70, 170, 8) + rect(40, 140, 170, 8) + rect(50, 78, 4, 62) + rect(70, 78, 4, 62) + rect(90, 78, 4, 62) + rect(110, 78, 4, 62) + rect(130, 78, 4, 62) + rect(150, 78, 4, 62) + rect(170, 78, 4, 62) + rect(190, 78, 4, 62);
      default: return A.gopuram(80, 80);
    }
  }
  A.placeArt = function (place) {
    var cat = (place && place.category) || "heritage", p = paletteFor(cat), id = "g" + Math.random().toString(36).slice(2, 8);
    return '<svg viewBox="0 0 250 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset=".62" stop-color="' + p[1] + '"/><stop offset="1" stop-color="' + p[2] + '"/></linearGradient></defs>' +
      '<rect width="250" height="160" fill="url(#' + id + ')"/>' +
      '<circle cx="190" cy="46" r="22" fill="#fff" opacity=".18"/>' +
      '<path fill-rule="evenodd" d="' + motif(cat) + '" fill="' + p[2] + '" opacity=".78"/></svg>';
  };

  /* Scenic hero fallback (used until/unless photos load). */
  A.heroScene = function () {
    return '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="hs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f1a3a"/><stop offset=".45" stop-color="#9b4a2c"/><stop offset=".72" stop-color="#e9a05a"/><stop offset="1" stop-color="#f4cf8a"/></linearGradient>' +
      '<radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff3cf"/><stop offset="1" stop-color="#fff3cf" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="1440" height="900" fill="url(#hs)"/><circle cx="1040" cy="560" r="220" fill="url(#sun)"/><circle cx="1040" cy="560" r="70" fill="#fff1c9" opacity=".9"/>' +
      '<g transform="translate(0 560) scale(1 2.1)" fill="#2a160c" opacity=".55">' + A.skyline({ fill: "#2a160c", hill: "#2a160c", hillOpacity: 0.5 }).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "") + '</g></svg>';
  };
})(typeof window !== "undefined" ? window : globalThis);
