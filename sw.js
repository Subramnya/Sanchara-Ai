/* Sanchara.AI service worker — network-first with offline fallback (keeps the planner usable at remote sites). */
const CACHE = "sanchara-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "assets/css/styles.css", "assets/vendor/leaflet/leaflet.js", "assets/vendor/leaflet/leaflet.css",
  "assets/js/data/districts.js", "assets/js/data/places.js", "assets/js/data/food.js", "assets/js/data/stays.js", "assets/js/data/images.js", "assets/js/data/karnataka-geo.js",
  "assets/js/engine/core.js", "assets/js/engine/model-weights.js", "assets/js/engine/recommender.js", "assets/js/engine/planner.js", "assets/js/engine/assistant-lite.js",
  "assets/js/services/live.js", "assets/js/ui/icons.js", "assets/js/ui/art.js", "assets/js/ui/i18n.js", "assets/js/ui/map.js", "assets/js/ui/wizard.js", "assets/js/ui/results.js", "assets/js/app.js"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.pathname.startsWith("/api/")) return;
  const tile = /basemaps\.cartocdn\.com|tile\.openstreetmap\.(org|fr)|commons\.wikimedia\.org|upload\.wikimedia\.org/.test(url.host);
  if (url.origin !== location.origin && !tile) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then((m) => m || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
