#!/usr/bin/env node
/**
 * Sanchara.AI offline dataset validator.
 * Plain Node, no dependencies. Loads the four data files as classic
 * browser scripts (they attach to window.SANCHARA), then checks
 * structure, cross-references and value ranges. Prints per-district
 * counts and a list of errors/warnings, and exits 1 if any errors.
 */

"use strict";

const path = require("path");

globalThis.window = globalThis;

const DATA_DIR = path.join(__dirname, "..", "assets", "js", "data");

require(path.join(DATA_DIR, "districts.js"));
require(path.join(DATA_DIR, "places.js"));
require(path.join(DATA_DIR, "food.js"));
require(path.join(DATA_DIR, "stays.js"));

const DISTRICTS = window.SANCHARA.DISTRICTS || [];
const PLACES = window.SANCHARA.PLACES || [];
const DISHES = window.SANCHARA.DISHES || [];
const EATERIES = window.SANCHARA.EATERIES || [];
const STAYS = window.SANCHARA.STAYS || [];

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function isNum(v) { return typeof v === "number" && !Number.isNaN(v); }
function isStr(v) { return typeof v === "string"; }
function isBool(v) { return typeof v === "boolean"; }
function isArr(v) { return Array.isArray(v); }

// ---------------------------------------------------------------------------
// Constants / allowed value lists (mirrors the spec given for the dataset)
// ---------------------------------------------------------------------------

const ALLOWED_REGIONS = ["Kittur Karnataka", "Kalyana Karnataka", "Malnad", "Coastal Karnataka", "Old Mysuru", "Central Karnataka", "Bengaluru"];

const ALLOWED_CATEGORIES = ["heritage", "temple", "fort", "palace", "cave", "museum", "waterfall", "lake", "dam", "river", "beach", "hill", "trek", "wildlife", "zoo", "park", "garden", "viewpoint", "adventure", "spiritual", "craft", "island"];

const ALLOWED_ACTIVITIES = ["heritage", "spiritual", "nature", "waterfalls", "trekking", "wildlife", "boating", "adventure", "museums", "family", "beaches", "photography", "shopping", "relaxing", "food"];

const ALLOWED_MEALS = ["breakfast", "lunch", "snacks", "dinner"];

const ALLOWED_STAY_TYPES = ["KSTDC", "JLR", "hotel", "resort", "homestay", "hostel"];
const ALLOWED_STAY_TIERS = ["budget", "comfort", "premium"];
const ALLOWED_CONFIDENCE = ["high", "medium"];
const ALLOWED_EATERY_VEG = ["veg", "nonveg", "both"];

const LAT_MIN = 11.5, LAT_MAX = 18.6;
const LNG_MIN = 74.0, LNG_MAX = 78.7;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const REQUIRED_PLACE_IDS = [
  "hampi-stone-chariot", "hampi-virupaksha-temple", "hampi-lotus-mahal", "hampi-elephant-stables",
  "hampi-matanga-hill", "hampi-hemakuta-hill", "hampi-queens-bath", "hampi-royal-enclosure",
  "hampi-archaeological-museum", "hampi-zoo-safari", "daroji-bear-sanctuary", "tungabhadra-dam",
  "hampi-coracle-ride", "badami-cave-temples", "badami-agastya-lake", "badami-north-fort",
  "banashankari-temple", "mahakuta-temples", "aihole-durga-temple", "aihole-meguti-temple",
  "pattadakal-temples", "kudalasangama", "almatti-dam", "ilkal-saree-weaving", "gol-gumbaz",
  "ibrahim-rauza", "bidar-fort", "mahmud-gawan-madrasa", "kalaburagi-fort", "sharana-basaveshwara-temple",
  "belagavi-fort", "gokak-falls", "godachinamalaki-falls", "kittur-fort", "savadatti-yellamma-temple",
  "hubballi-unkal-lake", "hubballi-chandramouleshwara", "hubballi-siddharoodha-math",
  "hubballi-indira-glass-house", "dharwad-sadhankeri-lake", "nrupatunga-betta", "lakkundi-temples",
  "magadi-bird-sanctuary", "gotagodi-rock-garden", "ballari-fort", "anjanadri-hill",
  "itagi-mahadeva-temple", "anegundi", "chitradurga-fort", "jog-falls", "sakrebailu-elephant-camp",
  "tyavarekoppa-safari", "kodachadri", "agumbe-sunset-point", "gokarna-om-beach", "murudeshwar-temple",
  "yana-rocks", "dandeli-kali-rafting", "mysuru-palace", "chamundi-hills", "belur-chennakeshava",
  "halebidu-hoysaleswara", "shravanabelagola", "mullayanagiri", "abbey-falls", "nandi-hills",
  "st-marys-island", "udupi-krishna-matha"
];

// ---------------------------------------------------------------------------
// 1. DISTRICTS
// ---------------------------------------------------------------------------

const districtNames = new Set();
const districtIds = new Set();

if (DISTRICTS.length !== 31) {
  warn(`Expected 31 districts, found ${DISTRICTS.length}.`);
}

DISTRICTS.forEach((d, i) => {
  const where = `DISTRICTS[${i}] (${d && d.name})`;
  if (!isStr(d.id) || !d.id) err(`${where}: missing/invalid id`);
  else if (districtIds.has(d.id)) err(`${where}: duplicate district id "${d.id}"`);
  else districtIds.add(d.id);

  if (!isStr(d.name) || !d.name) err(`${where}: missing/invalid name`);
  else if (districtNames.has(d.name)) err(`${where}: duplicate district name "${d.name}"`);
  else districtNames.add(d.name);

  if (!isStr(d.kn) || !d.kn) err(`${where}: missing/invalid kn (Kannada name)`);
  if (!ALLOWED_REGIONS.includes(d.region)) err(`${where}: invalid region "${d.region}"`);
  if (!isNum(d.lat) || d.lat < LAT_MIN || d.lat > LAT_MAX) err(`${where}: lat out of range (${d.lat})`);
  if (!isNum(d.lng) || d.lng < LNG_MIN || d.lng > LNG_MAX) err(`${where}: lng out of range (${d.lng})`);
  if (!isStr(d.known) || !d.known) err(`${where}: missing known`);

  if (!isArr(d.towns) || d.towns.length < 3 || d.towns.length > 8) {
    err(`${where}: towns must be an array of 3-8 entries (found ${isArr(d.towns) ? d.towns.length : typeof d.towns})`);
  } else {
    d.towns.forEach((t, ti) => {
      const tw = `${where}.towns[${ti}]`;
      if (!isStr(t.name) || !t.name) err(`${tw}: missing/invalid name`);
      if (!isNum(t.lat) || t.lat < LAT_MIN || t.lat > LAT_MAX) err(`${tw}: lat out of range (${t.lat})`);
      if (!isNum(t.lng) || t.lng < LNG_MIN || t.lng > LNG_MAX) err(`${tw}: lng out of range (${t.lng})`);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. PLACES
// ---------------------------------------------------------------------------

const placeIds = new Set();
const perDistrictCount = {};
DISTRICTS.forEach(d => { perDistrictCount[d.name] = 0; });

function checkTimeStr(v) {
  return isStr(v) && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

function timeToMinutes(v) {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

PLACES.forEach((p, i) => {
  const where = `PLACES[${i}] (${p && p.id})`;

  if (!isStr(p.id) || !p.id) err(`${where}: missing/invalid id`);
  else if (placeIds.has(p.id)) err(`${where}: duplicate place id "${p.id}"`);
  else placeIds.add(p.id);

  ["name", "district", "town", "category", "desc", "extraLabel", "open", "close"].forEach(f => {
    if (!isStr(p[f])) err(`${where}: field "${f}" must be a string`);
  });
  if (typeof p.kn !== "string") err(`${where}: field "kn" must be a string (may be "")`);

  if (!isNum(p.lat) || p.lat < LAT_MIN || p.lat > LAT_MAX) err(`${where}: lat out of range (${p.lat})`);
  if (!isNum(p.lng) || p.lng < LNG_MIN || p.lng > LNG_MAX) err(`${where}: lng out of range (${p.lng})`);

  if (!ALLOWED_CATEGORIES.includes(p.category)) err(`${where}: invalid category "${p.category}"`);

  if (!isArr(p.tags) || p.tags.length < 4 || p.tags.length > 10) {
    err(`${where}: tags must be an array of 4-10 items (found ${isArr(p.tags) ? p.tags.length : typeof p.tags})`);
  } else {
    p.tags.forEach(t => { if (!isStr(t) || t !== t.toLowerCase()) err(`${where}: tag "${t}" must be a lowercase string`); });
  }

  if (!isArr(p.activities) || p.activities.length < 2 || p.activities.length > 5) {
    err(`${where}: activities must be an array of 2-5 items (found ${isArr(p.activities) ? p.activities.length : typeof p.activities})`);
  } else {
    p.activities.forEach(a => { if (!ALLOWED_ACTIVITIES.includes(a)) err(`${where}: invalid activity "${a}"`); });
  }

  if (!isNum(p.duration) || p.duration <= 0) err(`${where}: duration must be a positive number`);
  if (!isNum(p.fee) || p.fee < 0) err(`${where}: fee must be a non-negative number`);
  if (!isNum(p.extraCost) || p.extraCost < 0) err(`${where}: extraCost must be a non-negative number`);

  if (!checkTimeStr(p.open)) err(`${where}: open "${p.open}" is not HH:MM`);
  if (!checkTimeStr(p.close)) err(`${where}: close "${p.close}" is not HH:MM`);
  if (checkTimeStr(p.open) && checkTimeStr(p.close)) {
    const isAlwaysOpen = (p.open === "00:00" && (p.close === "23:59" || p.close === "00:00"));
    if (!isAlwaysOpen && timeToMinutes(p.open) >= timeToMinutes(p.close)) {
      err(`${where}: open (${p.open}) must be before close (${p.close})`);
    }
  }

  if (!isArr(p.closedOn)) err(`${where}: closedOn must be an array`);
  else p.closedOn.forEach(d => { if (!WEEKDAYS.includes(d)) err(`${where}: invalid closedOn day "${d}"`); });

  if (!isArr(p.bestMonths) || p.bestMonths.length === 0) err(`${where}: bestMonths must be a non-empty array`);
  else p.bestMonths.forEach(m => { if (!isNum(m) || m < 1 || m > 12) err(`${where}: invalid bestMonths value "${m}"`); });

  ["popularity", "crowd", "kid", "senior", "effort"].forEach(f => {
    if (!isNum(p[f]) || p[f] < 1 || p[f] > 5) err(`${where}: field "${f}" must be a number 1-5 (found ${p[f]})`);
  });

  ["sunset", "sunrise", "unesco", "approx"].forEach(f => {
    if (!isBool(p[f])) err(`${where}: field "${f}" must be a boolean`);
  });

  if (!isStr(p.tips) || !p.tips) err(`${where}: missing tips`);

  if (!districtNames.has(p.district)) {
    err(`${where}: district "${p.district}" does not match any DISTRICTS name`);
  } else {
    perDistrictCount[p.district]++;
  }
});

REQUIRED_PLACE_IDS.forEach(id => {
  if (!placeIds.has(id)) err(`Missing REQUIRED place id: "${id}"`);
});

// ---------------------------------------------------------------------------
// 3. DISHES
// ---------------------------------------------------------------------------

const dishIds = new Set();

DISHES.forEach((d, i) => {
  const where = `DISHES[${i}] (${d && d.id})`;

  if (!isStr(d.id) || !d.id) err(`${where}: missing/invalid id`);
  else if (dishIds.has(d.id)) err(`${where}: duplicate dish id "${d.id}"`);
  else dishIds.add(d.id);

  if (!isStr(d.name) || !d.name) err(`${where}: missing name`);
  if (typeof d.kn !== "string") err(`${where}: kn must be a string`);
  if (!isBool(d.veg)) err(`${where}: veg must be a boolean`);
  if (!isStr(d.desc) || !d.desc) err(`${where}: missing desc`);
  if (!isNum(d.cost) || d.cost < 0) err(`${where}: cost must be a non-negative number`);

  if (!isArr(d.districts) || d.districts.length === 0) {
    err(`${where}: districts must be a non-empty array`);
  } else {
    d.districts.forEach(dn => {
      if (dn !== "*" && !districtNames.has(dn)) err(`${where}: district "${dn}" does not match any DISTRICTS name`);
    });
  }

  if (!isArr(d.meals) || d.meals.length === 0) {
    err(`${where}: meals must be a non-empty array`);
  } else {
    d.meals.forEach(m => { if (!ALLOWED_MEALS.includes(m)) err(`${where}: invalid meal "${m}"`); });
  }
});

// ---------------------------------------------------------------------------
// 4. EATERIES
// ---------------------------------------------------------------------------

const eateryIds = new Set();
const eateriesPerDistrict = {};

EATERIES.forEach((e, i) => {
  const where = `EATERIES[${i}] (${e && e.id})`;

  if (!isStr(e.id) || !e.id) err(`${where}: missing/invalid id`);
  else if (eateryIds.has(e.id)) err(`${where}: duplicate eatery id "${e.id}"`);
  else eateryIds.add(e.id);

  ["name", "town", "famousFor"].forEach(f => {
    if (!isStr(e[f]) || !e[f]) err(`${where}: missing/invalid "${f}"`);
  });

  if (!isNum(e.lat) || e.lat < LAT_MIN || e.lat > LAT_MAX) err(`${where}: lat out of range (${e.lat})`);
  if (!isNum(e.lng) || e.lng < LNG_MIN || e.lng > LNG_MAX) err(`${where}: lng out of range (${e.lng})`);

  if (!districtNames.has(e.district)) err(`${where}: district "${e.district}" does not match any DISTRICTS name`);
  else eateriesPerDistrict[e.district] = (eateriesPerDistrict[e.district] || 0) + 1;

  if (!isArr(e.meals) || e.meals.length === 0) err(`${where}: meals must be a non-empty array`);
  else e.meals.forEach(m => { if (!ALLOWED_MEALS.includes(m)) err(`${where}: invalid meal "${m}"`); });

  if (!ALLOWED_EATERY_VEG.includes(e.veg)) err(`${where}: invalid veg value "${e.veg}"`);
  if (![1, 2, 3].includes(e.price)) err(`${where}: price must be 1, 2 or 3 (found ${e.price})`);
  if (!ALLOWED_CONFIDENCE.includes(e.confidence)) err(`${where}: invalid confidence "${e.confidence}"`);
});

if (EATERIES.length < 25 || EATERIES.length > 60) {
  warn(`EATERIES count ${EATERIES.length} is outside the requested 25-60 range.`);
}

// ---------------------------------------------------------------------------
// 5. STAYS
// ---------------------------------------------------------------------------

const stayIds = new Set();
const staysPerDistrict = {};

STAYS.forEach((s, i) => {
  const where = `STAYS[${i}] (${s && s.id})`;

  if (!isStr(s.id) || !s.id) err(`${where}: missing/invalid id`);
  else if (stayIds.has(s.id)) err(`${where}: duplicate stay id "${s.id}"`);
  else stayIds.add(s.id);

  ["name", "town", "note"].forEach(f => {
    if (!isStr(s[f]) || !s[f]) err(`${where}: missing/invalid "${f}"`);
  });

  if (!isNum(s.lat) || s.lat < LAT_MIN || s.lat > LAT_MAX) err(`${where}: lat out of range (${s.lat})`);
  if (!isNum(s.lng) || s.lng < LNG_MIN || s.lng > LNG_MAX) err(`${where}: lng out of range (${s.lng})`);

  if (!districtNames.has(s.district)) err(`${where}: district "${s.district}" does not match any DISTRICTS name`);
  else staysPerDistrict[s.district] = (staysPerDistrict[s.district] || 0) + 1;

  if (!ALLOWED_STAY_TYPES.includes(s.type)) err(`${where}: invalid type "${s.type}"`);
  if (!ALLOWED_STAY_TIERS.includes(s.tier)) err(`${where}: invalid tier "${s.tier}"`);
  if (!ALLOWED_CONFIDENCE.includes(s.confidence)) err(`${where}: invalid confidence "${s.confidence}"`);
  if (!isBool(s.govt)) err(`${where}: govt must be a boolean`);

  if (!isArr(s.price) || s.price.length !== 2 || !isNum(s.price[0]) || !isNum(s.price[1]) || s.price[0] <= 0 || s.price[1] < s.price[0]) {
    err(`${where}: price must be [min, max] with 0 < min <= max (found ${JSON.stringify(s.price)})`);
  }

  if ((s.type === "KSTDC" || s.type === "JLR") && s.govt !== true) {
    warn(`${where}: type "${s.type}" is usually govt:true (found govt:${s.govt})`);
  }
});

if (STAYS.length < 45 || STAYS.length > 80) {
  warn(`STAYS count ${STAYS.length} is outside the requested 45-80 range.`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log("=== Sanchara.AI dataset validation ===\n");

console.log(`Districts : ${DISTRICTS.length}`);
console.log(`Places    : ${PLACES.length}`);
console.log(`Dishes    : ${DISHES.length}`);
console.log(`Eateries  : ${EATERIES.length}`);
console.log(`Stays     : ${STAYS.length}`);

console.log("\n--- Places per district ---");
Object.keys(perDistrictCount).sort().forEach(name => {
  const flag = perDistrictCount[name] < 2 ? "  <-- below minimum of 2" : "";
  console.log(`  ${name.padEnd(22)} ${String(perDistrictCount[name]).padStart(3)}${flag}`);
});

console.log("\n--- Eateries per district (with any) ---");
Object.keys(eateriesPerDistrict).sort().forEach(name => {
  console.log(`  ${name.padEnd(22)} ${eateriesPerDistrict[name]}`);
});

console.log("\n--- Stays per district (with any) ---");
Object.keys(staysPerDistrict).sort().forEach(name => {
  console.log(`  ${name.padEnd(22)} ${staysPerDistrict[name]}`);
});

if (warnings.length) {
  console.log(`\n--- Warnings (${warnings.length}) ---`);
  warnings.forEach(w => console.log("  WARN:", w));
}

if (errors.length) {
  console.log(`\n--- Errors (${errors.length}) ---`);
  errors.forEach(e => console.log("  ERROR:", e));
  console.log(`\nFAILED: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
} else {
  console.log(`\nOK: 0 errors, ${warnings.length} warning(s).`);
  process.exit(0);
}
