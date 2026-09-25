/* Sanchara.AI — map (Leaflet + OpenStreetMap).
 *  • Base map: OpenStreetMap tiles (fallbacks: OSM-France HOT, then CARTO) + an offline Karnataka district layer underneath.
 *  • Live location: browser GPS (watchPosition) drawn as a pulsing dot with an accuracy circle, named via OSM Nominatim,
 *    with distance to your next stop. "Locate me" and "Whole route" buttons on the map.
 *  • Routes: OSRM road geometry when online, dashed straight lines offline. */
(function (root) {
  "use strict";
  var S = root.SANCHARA, E = S.engine;
  var M = S.map = {}, LF = root.L;
  var map = null, layers = {}, tilesOk = false, token = 0, lastBounds = null, lastZoom = 13;
  var live = { watch: null, marker: null, circle: null, last: null, name: "", nameAt: null, follow: false, denied: false };
  var nextStop = null, routeNote = "";
  M.colors = ["#b4532a", "#2f6f8f", "#6d4c9c", "#3f7d4e", "#b0762a", "#9c3b64", "#4a5a7a"];

  var TILE_SOURCES = [
    { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", opts: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } },
    { url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", opts: { subdomains: "abc", maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, tiles by OSM France / HOT' } },
    { url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", opts: { subdomains: "abcd", maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' } }
  ];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function icon(html, size) { return LF.divIcon({ className: "", html: html, iconSize: size || [30, 30], iconAnchor: size ? [size[0] / 2, size[1] / 2] : [15, 30], popupAnchor: [0, -26] }); }
  function pin(n, color) { return icon('<div class="pin" style="background:' + color + '"><span>' + n + "</span></div>"); }
  function small(sym, color) { return icon('<div class="pin-sm" style="background:' + color + '"><svg class="ic"><use href="#i-' + sym + '"/></svg></div>', [24, 24]); }
  function ic(n) { return '<svg class="ic"><use href="#i-' + n + '"/></svg>'; }

  /* Status badges (bottom-left): live location line + route line */
  function paint() {
    var el = document.getElementById("mapStatus"); if (!el) return;
    var h = "";
    if (live.last) {
      var t = "You are here" + (live.name ? " · " + esc(live.name) : "") + " · ±" + Math.round(live.last.acc) + " m";
      if (nextStop) {
        var km = E.roadKm(live.last, nextStop);
        t += " · " + (km < 1 ? Math.round(km * 1000) + " m" : km.toFixed(km < 10 ? 1 : 0) + " km") + " to " + esc(nextStop.name);
      }
      h += '<span class="badge live-badge"><i class="live-dot"></i>' + t + "</span>";
    } else if (live.denied) {
      h += '<span class="badge warn">' + ic("locate") + " Allow location in the address bar to see your live position</span>";
    }
    if (routeNote) h += '<span class="badge">' + routeNote + "</span>";
    el.innerHTML = h;
  }
  function setRoute(text) { routeNote = text || ""; paint(); }

  function useTiles(i) {
    if (i >= TILE_SOURCES.length) { setRoute("Offline map · district view"); return; }
    var src = TILE_SOURCES[i], errors = 0, loaded = false;
    var opts = {}; for (var k in src.opts) opts[k] = src.opts[k];
    opts.referrerPolicy = "strict-origin-when-cross-origin";
    var layer = LF.tileLayer(src.url, opts);
    layer.on("tileload", function () {
      if (loaded) return; loaded = true; tilesOk = true;
      layers.geo.setStyle({ fillOpacity: 0.04, weight: 0.8, color: "#9c7f5a" });
      if (/Offline map/.test(routeNote)) setRoute("");
    });
    layer.on("tileerror", function () {
      if (loaded) return;
      if (++errors === 4) { map.removeLayer(layer); useTiles(i + 1); }
    });
    layer.addTo(map); layer.bringToBack(); layers.tiles = layer;
    setTimeout(function () { if (!loaded && layers.tiles === layer) { map.removeLayer(layer); useTiles(i + 1); } }, 7000);
  }

  M.init = function (el) {
    if (!LF) return null;
    if (map) { M.resize(); return map; }
    map = LF.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: true, tap: true }).setView([15.2, 76.1], 7);
    layers.geo = LF.geoJSON(S.GEO, {
      style: { color: "#b39a76", weight: 1, fillColor: "#efe2cc", fillOpacity: 0.75 },
      onEachFeature: function (f, l) { l.bindTooltip(f.properties.name === "Ballari" ? "Ballari & Vijayanagara" : f.properties.name, { sticky: true, className: "district-label" }); }
    }).addTo(map);
    useTiles(0);
    layers.route = LF.layerGroup().addTo(map);
    layers.markers = LF.layerGroup().addTo(map);
    layers.extra = LF.layerGroup().addTo(map);
    var Ctl = LF.Control.extend({
      options: { position: "topright" },
      onAdd: function () {
        var d = LF.DomUtil.create("div", "map-ctl leaflet-bar");
        d.innerHTML = '<button type="button" id="mcLocate" title="Show my live location" aria-label="Show my live location">' + ic("locate") + '</button>' +
          '<button type="button" id="mcFit" title="Show the whole route" aria-label="Show the whole route">' + ic("route") + "</button>";
        LF.DomEvent.disableClickPropagation(d);
        d.querySelector("#mcLocate").onclick = function () { M.locate(); };
        d.querySelector("#mcFit").onclick = function () { live.follow = false; if (lastBounds) map.fitBounds(lastBounds, { maxZoom: lastZoom }); };
        return d;
      }
    });
    map.addControl(new Ctl());
    map.on("dragstart", function () { live.follow = false; });
    if (location.protocol === "file:") setRoute("Run npm start for live map tiles & GPS");
    return map;
  };
  M.resize = function () { if (map) setTimeout(function () { map.invalidateSize(); if (lastBounds && !live.follow) map.fitBounds(lastBounds, { maxZoom: lastZoom }); }, 90); };

  /* ---------- Live location (GPS) ---------- */
  function onPos(p) {
    var pt = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy || 50 };
    var ll = [pt.lat, pt.lng], first = !live.last;
    live.last = pt; live.denied = false;
    if (!live.marker) {
      live.circle = LF.circle(ll, { radius: pt.acc, color: "#2f6fd6", weight: 1, fillColor: "#2f6fd6", fillOpacity: 0.12, interactive: false }).addTo(map);
      live.marker = LF.marker(ll, { icon: icon('<div class="me-dot live"></div>', [18, 18]), zIndexOffset: 2000 }).addTo(map);
    } else { live.marker.setLatLng(ll); live.circle.setLatLng(ll).setRadius(pt.acc); }
    live.marker.bindPopup("<b>You are here</b>" + (live.name ? "<br>" + esc(live.name) : "") + "<br>" + pt.lat.toFixed(5) + ", " + pt.lng.toFixed(5) + " · ±" + Math.round(pt.acc) + " m");
    if (live.follow) map.panTo(ll);
    else if (first && lastBounds && lastBounds.pad(1.5).contains(ll)) { lastBounds = lastBounds.extend(ll); }
    var near = E.locate(pt);
    live.name = live.osmName && live.nameAt && E.haversine(live.nameAt, pt) < 1 ? live.osmName : (near ? "near " + near.town : "");
    if ((!live.askedAt || E.haversine(live.askedAt, pt) > 0.5) && S.live && navigator.onLine) {
      var at = { lat: pt.lat, lng: pt.lng }; live.askedAt = at;
      S.live.placeName(pt.lat, pt.lng).then(function (n) { if (n) { live.osmName = n; live.nameAt = at; if (live.last && E.haversine(at, live.last) < 1) { live.name = n; paint(); } } });
    }
    paint();
    document.dispatchEvent(new CustomEvent("sanchara:live", { detail: pt }));
  }
  function onErr(e) {
    if (e && e.code === 1) { live.denied = true; M.stopLive(); }
    paint();
  }
  M.startLive = function () {
    if (!navigator.geolocation || live.watch !== null || !map) return;
    try { live.watch = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }); } catch (e) { live.watch = null; }
  };
  M.stopLive = function () { if (live.watch !== null && navigator.geolocation) navigator.geolocation.clearWatch(live.watch); live.watch = null; };
  M.locate = function () {
    live.denied = false;
    if (live.watch === null) M.startLive();
    live.follow = true;
    if (live.last) map.flyTo([live.last.lat, live.last.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
    else paint();
  };
  M.liveFix = function () { return live.last; };
  M._leaflet = function () { return map; };

  function originMarker(o) {
    LF.marker([o.lat, o.lng], { icon: icon('<div class="start-dot">' + ic("flag") + "</div>", [26, 26]), zIndexOffset: 1000 })
      .bindPopup("<b>Start · " + esc(o.label || "your location") + "</b><br>" + o.lat.toFixed(5) + ", " + o.lng.toFixed(5)).addTo(layers.markers);
  }
  function clear() { ["route", "markers", "extra"].forEach(function (k) { layers[k] && layers[k].clearLayers(); }); }

  M.showPlan = function (plan, dayIdx) {
    if (!map) return;
    clear(); var my = ++token, bounds = [], P = plan.profile;
    originMarker(P.origin); bounds.push([P.origin.lat, P.origin.lng]);
    var n = 0; nextStop = null;
    plan.days.forEach(function (day, di) {
      if (dayIdx != null && di !== dayIdx) { day.items.forEach(function (it) { if (it.type === "visit") n++; }); return; }
      var color = M.colors[di % M.colors.length], pts = [];
      day.items.forEach(function (it) {
        if (it.type === "travel") {
          if (!pts.length) pts.push({ lat: it.a.lat, lng: it.a.lng });
          pts.push({ lat: it.b.lat, lng: it.b.lng });
          LF.polyline([[it.a.lat, it.a.lng], [it.b.lat, it.b.lng]], { color: color, weight: 3, opacity: 0.8, dashArray: "6 8", className: "leg-" + di }).addTo(layers.route);
        } else if (it.type === "visit") {
          n++; var p = it.place;
          if (!nextStop) nextStop = { lat: p.lat, lng: p.lng, name: p.name };
          LF.marker([p.lat, p.lng], { icon: pin(n, color) }).bindPopup("<b>" + esc(p.name) + "</b><br>" + day.label + " · " + E.fmtTime(it.start) + "–" + E.fmtTime(it.end) +
            '<br><a target="_blank" rel="noopener" href="' + S.live.gmapsDir(live.last || P.origin, [p]) + '">Navigate from here</a>').addTo(layers.markers);
          bounds.push([p.lat, p.lng]);
        } else if (it.type === "meal") {
          LF.marker([it.pos.lat, it.pos.lng], { icon: small("food", "#c08a2a") }).bindPopup("<b>" + esc(it.meal.label) + "</b> · " + E.fmtTime(it.start) + "<br>" + esc((it.food.dishes[0] || {}).name || "") + " in " + esc(it.food.town || "")).addTo(layers.extra);
        } else if (it.type === "stay") {
          var sp = it.stay.pos;
          LF.marker([sp.lat, sp.lng], { icon: small("bed", "#1d2740") }).bindPopup("<b>" + esc(sp.name) + "</b><br>Night stay · " + E.inr(it.cost)).addTo(layers.extra);
          bounds.push([sp.lat, sp.lng]);
        }
      });
      if (pts.length > 1 && S.live && navigator.onLine) {
        S.live.route(pts).then(function (r) {
          if (my !== token) return;
          layers.route.eachLayer(function (l) { if (l.options && l.options.className === "leg-" + di) layers.route.removeLayer(l); });
          LF.polyline(r.coords, { color: color, weight: 5, opacity: 0.9 }).addTo(layers.route);
          setRoute("Road route (OSRM) · " + Math.round(r.km) + " km");
        }).catch(function () { setRoute("Estimated route"); });
      }
    });
    if (live.last) bounds.push([live.last.lat, live.last.lng]);
    if (bounds.length) { lastBounds = LF.latLngBounds(bounds).pad(0.18); lastZoom = 13; if (!live.follow) map.fitBounds(lastBounds, { maxZoom: 13 }); }
    paint();
    M.startLive();
  };

  M.showSpots = function (origin, list) {
    if (!map) return;
    clear(); token++;
    var bounds = [[origin.lat, origin.lng]];
    originMarker(origin);
    nextStop = list[0] ? { lat: list[0].place.lat, lng: list[0].place.lng, name: list[0].place.name } : null;
    list.forEach(function (r, i) {
      var p = r.place;
      LF.marker([p.lat, p.lng], { icon: pin(i + 1, M.colors[0]) }).bindPopup("<b>" + esc(p.name) + "</b><br>" + r.match + "% match · " + Math.round(r.km) + " km" +
        '<br><a target="_blank" rel="noopener" href="' + S.live.gmapsDir(live.last || origin, [p]) + '">Navigate</a>').addTo(layers.markers);
      bounds.push([p.lat, p.lng]);
    });
    if (live.last) bounds.push([live.last.lat, live.last.lng]);
    lastBounds = LF.latLngBounds(bounds).pad(0.2); lastZoom = 12; if (!live.follow) map.fitBounds(lastBounds, { maxZoom: 12 });
    paint();
    M.startLive();
  };

  M.addLive = function (list, kind) {
    if (!map) return;
    list.forEach(function (x) {
      LF.marker([x.lat, x.lng], { icon: small(kind === "stay" ? "hotel" : "utensils", kind === "stay" ? "#4a5a7a" : "#56734f") })
        .bindPopup("<b>" + esc(x.name) + "</b><br>" + (x.cuisine ? esc(x.cuisine) + " · " : "") + x.km.toFixed(1) + " km · live from OpenStreetMap").addTo(layers.extra);
    });
  };
  M.focus = function (lat, lng, z) { if (map) { live.follow = false; map.flyTo([lat, lng], z || 14, { duration: 0.8 }); } };
})(typeof window !== "undefined" ? window : globalThis);
