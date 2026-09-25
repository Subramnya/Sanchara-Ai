/* Sanchara.AI — live services (all free, no API keys in the browser):
 *  • Browser Geolocation (GPS)            • OpenStreetMap Nominatim (place name)
 *  • OSRM (real road routes & times)       • Overpass API (live restaurants / hotels from OpenStreetMap)
 *  • Open-Meteo (weather forecast)         • /api/assistant (Gemini via our own server — key stays server-side)
 * Every call has a timeout and an offline fallback, so the demo never breaks. */
(function (root) {
  "use strict";
  var S = root.SANCHARA, E = S.engine;
  var L = S.live = { online: typeof navigator === "undefined" ? true : navigator.onLine };
  var cache = {};

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("timeout")); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function getJSON(url, ms, opts) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return withTimeout(fetch(url, opts || {}), ms || 8000).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (j) { cache[url] = j; return j; });
  }

  L.position = function () {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(function (p) {
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
      }, function (err) { reject(err); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
  };

  L.placeName = function (lat, lng) {
    var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=en&lat=" + lat.toFixed(5) + "&lon=" + lng.toFixed(5);
    return getJSON(url, 6000).then(function (j) {
      var a = j.address || {};
      return a.suburb || a.village || a.town || a.city || a.hamlet || a.county || null;
    }).catch(function () { return null; });
  };

  /* Real road route through several points. Returns {km, mins, coords:[[lat,lng]...]} */
  L.route = function (points) {
    if (!points || points.length < 2) return Promise.reject(new Error("need 2 points"));
    var path = points.map(function (p) { return p.lng.toFixed(5) + "," + p.lat.toFixed(5); }).join(";");
    var url = "https://router.project-osrm.org/route/v1/driving/" + path + "?overview=simplified&geometries=geojson";
    return getJSON(url, 9000).then(function (j) {
      if (!j.routes || !j.routes.length) throw new Error("no route");
      var r = j.routes[0];
      return { km: r.distance / 1000, mins: r.duration / 60, coords: r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }),
        legs: (r.legs || []).map(function (l) { return { km: l.distance / 1000, mins: l.duration / 60 }; }) };
    });
  };

  /* Live POIs from OpenStreetMap around a point. kind: "food" | "stay" */
  L.nearby = function (lat, lng, kind, radius) {
    radius = radius || (kind === "stay" ? 6000 : 3000);
    var filter = kind === "stay" ? '["tourism"~"hotel|guest_house|hostel|motel|resort"]' : '["amenity"~"restaurant|cafe|fast_food|food_court"]';
    var q = "[out:json][timeout:15];(node" + filter + "(around:" + radius + "," + lat + "," + lng + ");way" + filter + "(around:" + radius + "," + lat + "," + lng + "););out center 40;";
    var mirrors = ["https://overpass-api.de/api/interpreter?data=", "https://overpass.kumi.systems/api/interpreter?data="];
    function tryAt(i) {
      return getJSON(mirrors[i] + encodeURIComponent(q), 12000).catch(function (e) { if (i + 1 < mirrors.length) return tryAt(i + 1); throw e; });
    }
    return tryAt(0).then(function (j) {
      return (j.elements || []).map(function (el) {
        var t = el.tags || {}, la = el.lat || (el.center && el.center.lat), lo = el.lon || (el.center && el.center.lon);
        if (!t.name || la == null) return null;
        return { name: t.name, lat: la, lng: lo, cuisine: (t.cuisine || "").replace(/_/g, " ").replace(/;/g, ", "), kind: t.amenity || t.tourism,
          veg: t["diet:vegetarian"] === "only" || t["diet:vegetarian"] === "yes", phone: t.phone || t["contact:phone"] || "",
          km: E.haversine({ lat: lat, lng: lng }, { lat: la, lng: lo }) };
      }).filter(Boolean).sort(function (a, b) { return a.km - b.km; }).slice(0, 12);
    });
  };

  L.weather = function (lat, lng) {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(3) + "&longitude=" + lng.toFixed(3) +
      "&current=temperature_2m,weather_code,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FKolkata&forecast_days=7";
    return getJSON(url, 7000);
  };
  L.weatherText = function (code) {
    if (code === 0) return ["Clear sky", "sun"]; if (code <= 3) return ["Partly cloudy", "cloud"]; if (code <= 48) return ["Foggy", "cloud"];
    if (code <= 67) return ["Rain", "rain"]; if (code <= 77) return ["Snow", "cloud"]; if (code <= 82) return ["Rain showers", "rain"]; return ["Thunderstorm", "rain"];
  };

  /* Gemini assistant through our server (/api/assistant). Rejects → caller uses the offline assistant. */
  L.ask = function (messages, context) {
    if (location.protocol === "file:") return Promise.reject(new Error("no server"));
    return withTimeout(fetch("api/assistant", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages, context: context, lang: S.i18n ? S.i18n.lang : "en" })
    }), 25000).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (j) { if (!j || !j.reply) throw new Error(j && j.error || "empty"); return j; });
  };

  /* Deep links (work everywhere, no key). */
  L.gmapsDir = function (origin, stops) {
    if (!stops.length) return null;
    var dest = stops[stops.length - 1], way = stops.slice(0, -1).slice(0, 8);
    return "https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=" + origin.lat.toFixed(5) + "," + origin.lng.toFixed(5) +
      "&destination=" + dest.lat.toFixed(5) + "," + dest.lng.toFixed(5) +
      (way.length ? "&waypoints=" + way.map(function (p) { return p.lat.toFixed(5) + "," + p.lng.toFixed(5); }).join("%7C") : "");
  };
  L.gmapsPlace = function (p) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.name + ", " + (p.town || "") + ", Karnataka"); };

  if (typeof window !== "undefined") {
    window.addEventListener("online", function () { L.online = true; document.dispatchEvent(new CustomEvent("sanchara:online")); });
    window.addEventListener("offline", function () { L.online = false; document.dispatchEvent(new CustomEvent("sanchara:offline")); });
  }
})(typeof window !== "undefined" ? window : globalThis);
