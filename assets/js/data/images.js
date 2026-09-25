/* Sanchara.AI — heritage photos from Wikimedia Commons (free licences; author on each file page).
 * Each entry lists candidate file titles in order of preference. The UI tries:
 *   1) a local copy in assets/img/places/<id>.jpg  (created by `npm run fetch-images`)
 *   2) each Commons file in turn (needs internet)
 *   3) a built-in illustrated fallback (always works offline)
 */
window.SANCHARA = window.SANCHARA || {};
SANCHARA.IMAGES = {
  "hampi-stone-chariot":     ["Hampi chariot.jpg", "Stone Chariot in Hampi 01.jpg", "Stone Chariot at the Vitthala Temple in Hampi.jpg"],
  "hampi-virupaksha-temple": ["Main gopuram of the Virupaksha Temple in Hampi.jpg", "Hampi virupaksha temple.jpg", "Virupaksha Temple - Hampi 04.jpg"],
  "hampi-lotus-mahal":       ["Lotus Mahal, Zenana enclosure, Hampi.JPG", "Lotus Mahal Hampi, Karnataka.jpg", "Lotus Mahal, Hampi 02.jpg"],
  "badami-cave-temples":     ["Cave temple number 3 at Badami.jpg", "Cave Temple 3, Badami.JPG", "Badami cave temples, cave 1 - hamvrvb102k22 (106).jpg"],
  "badami-agastya-lake":     ["Bhutanatha temple complex in Badami with Agastya Lake.jpg", "Bhutanatha temple in Badami, Karnataka, India.jpg", "Agastya tirtha Badami Karnataka India.jpg"],
  "aihole-durga-temple":     ["Durga Temple - Aihole.jpg", "Durga temple Aihole 2.jpg", "Aihole Durga Temple.jpg"],
  "pattadakal-temples":      ["Virupaksha temple at Pattadakal.jpg", "Les temples de Pattadakal (Karnataka, Inde) (14409581543).jpg", "Pattadakal temple complex - hamvrvb102k22 (163).jpg"],
  "gol-gumbaz":              ["Gol Gumbaz, Bijapur , Karnataka, India.JPG"],
  "ibrahim-rauza":           ["Ibrahim Rauza, Bijapur, Karnataka.jpg", "Ibrahim Rauza, An Architectural Marvel.jpg", "Bijapur Ibrahim Rauza mosque.jpg"],
  "bidar-fort":              ["Bidar Fort (outside view).jpg", "Bidar Fort Karnataka.jpg", "Bidar Fort pic.jpg"],
  "belagavi-fort":           ["Kamal Basadi, Belagavi, Karnataka.jpg", "Kamal Basti, Belgaum.jpg", "Kamala basadi belagavi 1.jpg"],
  "gokak-falls":             ["Gokak Falls.jpg", "Gokak Falls 2017.jpg", "Gokak waterfalls.jpg"],
  "lakkundi-temples":        ["11th century Brahma Jinalaya temple, Lakkundi, Karnataka India - 11.jpg", "Lakkundi Temples.jpg", "Brahma jinalaya.JPG"],
  "chitradurga-fort":        ["The magnificent fort of Chitradurga.jpg", "Chitradurga Fort, Karnataka.jpg", "Chitradurga kote (fort).jpg"],
  "jog-falls":               ["Jog Falls Wide.jpg", "Jog Falls, Karnataka, India.jpg", "Jog Falls, Shimoga District, Karnataka.jpg"],
  "mysuru-palace":           ["Mysore Palace Morning.jpg", "Mysore Palace Mysore.jpg", "Mysore Palace Front View Morning.jpg"],
  "belur-chennakeshava":     ["Chennakeshava Temple at Belur.jpg", "ChennaKeshava Temple, Belur.JPG", "Chennakeshava Temple, Belur (50358426721).jpg"],
  "murudeshwar-temple":      ["Murudeshwar Shiva Statue.jpg", "Giant Shiva Statue, Murudeshwar.jpg", "Murudeshwar temple statue.JPG"]
};
SANCHARA.HERO = ["hampi-stone-chariot", "badami-agastya-lake", "gol-gumbaz", "pattadakal-temples", "jog-falls", "mysuru-palace"];

/* Candidate URLs for a place photo, best first. */
SANCHARA.imageCandidates = function (id, width) {
  var list = [];
  if (!id) return list;
  list.push("assets/img/places/" + id + ".jpg");
  (SANCHARA.IMAGES[id] || []).forEach(function (file) {
    list.push("https://commons.wikimedia.org/wiki/Special:FilePath/" +
      encodeURIComponent(file.replace(/ /g, "_")) + "?width=" + (width || 1280));
  });
  return list;
};
SANCHARA.imagePage = function (file) {
  return "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file.replace(/ /g, "_"));
};
