/* Sanchara.AI — offline assistant ("Sanchara Lite").
 * Intent detection + retrieval over the curated knowledge base (places, dishes, stays) and the current plan.
 * Used when Gemini is not configured or there is no internet. */
(function (root) {
  "use strict";
  var S = root.SANCHARA, E = S.engine;

  function has(q, words) { for (var i = 0; i < words.length; i++) if (q.indexOf(words[i]) >= 0) return true; return false; }
  function placeLine(p) { return "• " + p.name + " (" + p.town + ") — " + p.desc + (p.fee ? " Entry ₹" + p.fee + "." : " Free entry.") + " Open " + p.open + "–" + p.close + "."; }

  E.answer = function (question, st) {
    st = st || {};
    var q = String(question || "").toLowerCase(), now = new Date(), min = now.getHours() * 60 + now.getMinutes();
    var origin = st.origin || (st.plan && st.plan.profile.origin) || { lat: 15.9149, lng: 75.6764, label: "Badami" };
    var loc = E.locate(origin) || {}, pref = (st.profile && st.profile.food) || "any";
    var found = E.search(question, 3).filter(function (x) { return x.s > 0.6; });
    var named = found.length ? found[0].place : null;

    if (has(q, ["emergency", "help", "police", "ambulance", "hospital", "safety", "unsafe", "ಸಹಾಯ", "ತುರ್ತು"])) {
      return "Emergency numbers in Karnataka:\n• 112 — all emergencies (police, fire, ambulance)\n• 108 — ambulance\n• 1091 — women's helpline\n• 1363 — India tourist helpline (24×7)\nShare your live location with family and prefer well-lit, busy routes after dark.";
    }
    if (has(q, ["eat", "food", "hungry", "breakfast", "lunch", "dinner", "snack", "restaurant", "hotel to eat", "ಊಟ", "ತಿಂಡಿ", "ಆಹಾರ"])) {
      var mealId = has(q, ["breakfast", "ತಿಂಡಿ"]) ? "breakfast" : has(q, ["lunch"]) ? "lunch" : has(q, ["dinner", "night"]) ? "dinner" : has(q, ["snack", "evening"]) ? "snacks" : (E.mealAt(min) || E.MEALS[3]).id;
      var pt = named || origin, f = E.suggestFood(pt, mealId, pref, 4);
      var out = "It's " + E.fmtTime(min) + ". For " + f.meal.label.toLowerCase() + " near " + (f.town || loc.town) + ", try:\n" +
        f.dishes.map(function (d) { return "• " + d.name + (d.veg ? " (veg)" : "") + " — " + d.desc + " (~₹" + d.cost + ")"; }).join("\n");
      if (f.eateries.length) out += "\n\nWell-known places: " + f.eateries.map(function (e) { return e.eatery.name + " (" + Math.round(e.km) + " km)"; }).join(", ");
      return out + "\n\nOpen the Eat & stay tab for live restaurants around you.";
    }
    if (has(q, ["stay", "room", "lodge", "night", "accommodation", "resort", "hotel", "ವಸತಿ"])) {
      var sp = named || origin, tier = has(q, ["cheap", "budget", "low"]) ? "budget" : has(q, ["luxury", "premium", "best"]) ? "premium" : "comfort";
      var s = E.suggestStays(sp, tier, 4);
      if (!s.stays.length) return "I don't have verified stays near " + s.town + " yet — open the Eat & stay tab for live hotels from OpenStreetMap, or search Google Maps: " + s.mapsUrl;
      return "Stays near " + s.town + ":\n" + s.stays.map(function (x) { var st2 = x.stay; return "• " + st2.name + " — " + (st2.govt ? "Govt. (" + st2.type + ") · " : "") + st2.tier + " · ₹" + st2.price[0] + "–" + st2.price[1] + "/night · " + Math.round(x.km) + " km"; }).join("\n") + "\nTariffs are approximate — confirm before booking.";
    }
    if (has(q, ["sunset", "sunrise", "ಸೂರ್ಯಾಸ್ತ"])) {
      var sun = E.sunTimes(now, origin.lat, origin.lng);
      var spots = (S.PLACES || []).filter(function (p) { return p.sunset || p.sunrise; }).map(function (p) { return { p: p, km: E.roadKm(origin, p) }; }).sort(function (a, b) { return a.km - b.km; }).slice(0, 3);
      return "Today near " + loc.town + ": sunrise " + E.fmtTime(sun.sunrise) + ", sunset " + E.fmtTime(sun.sunset) + ".\nBest spots nearby:\n" + spots.map(function (x) { return "• " + x.p.name + " (" + Math.round(x.km) + " km)" + (x.p.sunset ? " — sunset" : " — sunrise"); }).join("\n");
    }
    if (named && has(q, ["crowd", "busy", "rush", "best time", "when to", "timing", "open", "close"])) {
      var best = E.bestVisitHour(named, now), c = E.predictCrowd(named, now, min);
      return named.name + " is open " + named.open + "–" + named.close + (named.closedOn && named.closedOn.length ? " (closed " + named.closedOn.join(", ") + ")" : "") + ".\nPredicted crowd right now: " + c.label + ". Best time today: around " + E.fmtTime(best) + ".\nBest months: " + (named.bestMonths || []).map(function (m) { return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]; }).join(", ") + ".";
    }
    if (named && has(q, ["how far", "distance", "reach", "route", "get to", "go to", "km"])) {
      var km = E.roadKm(origin, named);
      return named.name + " is about " + Math.round(km) + " km from " + (origin.label || loc.town) + " — roughly " + E.fmtDur(E.driveMins(km, "car")) + " by car or " + E.fmtDur(E.driveMins(km, "bus")) + " by KSRTC bus + auto.\nNavigate: " + S.live.gmapsDir(origin, [named]);
    }
    if (has(q, ["budget", "cost", "cheap", "expensive", "money", "spend", "price", "ಬಜೆಟ್", "ಖರ್ಚು"]) && st.plan) {
      var T = st.plan.totals, B = st.plan.budget;
      return "Your plan costs about " + E.inr(T.total) + " (" + E.inr(T.perPerson) + " per person): travel " + E.inr(T.travel) + ", stay " + E.inr(T.stay) + ", food " + E.inr(T.food) + ", tickets " + E.inr(T.tickets) + ", activities " + E.inr(T.activities) + "." +
        (B.status === "within" ? "\nYou're within budget with " + E.inr(B.spare) + " to spare." : B.status === "buffer" ? "\nIt uses " + E.inr(B.bufferUsed) + " of your buffer." : B.status === "over" ? "\nIt's " + E.inr(B.over) + " over your budget + buffer — try bus travel or fewer days." : "") +
        "\nMoney savers: KSTDC Mayura stays, KSRTC buses, and North Karnataka khanavalis (₹80–150 meals).";
    }
    if (named) {
      return named.name + (named.kn ? " (" + named.kn + ")" : "") + " — " + named.district + " district.\n" + named.desc + "\nTip: " + named.tips + "\nEntry " + (named.fee ? "₹" + named.fee : "free") + (named.extraCost ? " · " + named.extraLabel + " ₹" + named.extraCost : "") + " · open " + named.open + "–" + named.close + " · about " + named.duration + " h needed.";
    }
    if (has(q, ["what", "where", "suggest", "recommend", "visit", "see", "places", "near", "best", "ಏನು", "ಎಲ್ಲಿ"])) {
      var ranked = st.ranked || E.recommend(E.normalizeProfile({ origin: origin, interests: (st.profile && st.profile.interests) || ["heritage", "nature"], days: 1 }));
      return "Top picks near " + (origin.label || loc.town) + ":\n" + ranked.slice(0, 5).map(function (r) { return "• " + r.place.name + " — " + r.match + "% match, " + Math.round(r.km) + " km"; }).join("\n");
    }
    var hits = E.search(question, 3);
    if (hits.length) return "Here's what I found:\n" + hits.map(function (h) { return placeLine(h.place); }).join("\n");
    return "I can help with places to visit, food for any time of day, stays, sunset times, crowds, distances and your budget. Try: \"What should I eat for lunch near Badami?\" or \"Best time to visit Gol Gumbaz?\"";
  };
})(typeof window !== "undefined" ? window : globalThis);
