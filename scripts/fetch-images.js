#!/usr/bin/env node
/* Downloads the heritage photos once so the demo works fully offline.
 * Usage (while online):  npm run fetch-images   (or: node scripts/fetch-images.js)
 * Saves to assets/img/places/<id>.jpg and writes assets/img/places/CREDITS.md
 */
"use strict";
const fs = require("fs");
const path = require("path");

globalThis.window = globalThis;
require(path.join(__dirname, "..", "assets", "js", "data", "images.js"));
const S = globalThis.SANCHARA;

const OUT = path.join(__dirname, "..", "assets", "img", "places");
const UA = "SancharaAI/1.0 (student tourism project; offline image cache)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 10 * 1024) throw new Error("file too small");
  return buf;
}

(async () => {
  if (typeof fetch !== "function") {
    console.error("Node 18+ is required (global fetch). Your version: " + process.version);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const credits = ["# Photo credits", "", "All photos are from Wikimedia Commons under free licences (CC BY / CC BY-SA / CC0 / public domain).",
    "Author and exact licence are listed on each file page.", "", "| Place | File | Source |", "|---|---|---|"];
  let ok = 0, skipped = 0, failed = 0;
  for (const id of Object.keys(S.IMAGES)) {
    const dest = path.join(OUT, id + ".jpg");
    const files = S.IMAGES[id];
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10 * 1024) {
      console.log("• " + id + " (already downloaded)");
      credits.push("| " + id + " | " + files[0] + " | " + S.imagePage(files[0]) + " |");
      skipped++; continue;
    }
    let saved = false;
    for (const file of files) {
      const url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file.replace(/ /g, "_")) + "?width=1280";
      for (let attempt = 1; attempt <= 3 && !saved; attempt++) {
        try {
          fs.writeFileSync(dest, await download(url));
          console.log("✓ " + id + "  ←  " + file);
          credits.push("| " + id + " | " + file + " | " + S.imagePage(file) + " |");
          saved = true;
        } catch (e) {
          if (attempt === 3) console.log("  … " + file + ": " + e.message);
          await sleep(600);
        }
      }
      if (saved) break;
    }
    if (saved) ok++; else { failed++; console.log("✗ " + id + " (the app will use its illustrated fallback)"); }
    await sleep(400);
  }
  fs.writeFileSync(path.join(OUT, "CREDITS.md"), credits.join("\n") + "\n");
  console.log("\nDone: " + ok + " downloaded, " + skipped + " already present, " + failed + " unavailable.");
})();
