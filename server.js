#!/usr/bin/env node
/* Sanchara.AI — local server (zero dependencies, Node 18+).
 *   npm start   →  http://localhost:3000
 * Serves the web app and the Gemini assistant endpoint (/api/assistant).
 * Put your key in a file named .env.local:   GEMINI_API_KEY=your-key   (git-ignored, never sent to the browser). */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = __dirname;
// ---- load .env.local / .env (simple KEY=VALUE parser) ----
[".env.local", ".env"].forEach((f) => {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, "utf8").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
});
const { askGemini } = require("./api/_gemini");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".ico": "image/x-icon", ".md": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

// tiny rate-limit for the AI endpoint (20 requests / 10 min per IP)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 600000);
  arr.push(now); hits.set(ip, arr); return arr.length > 20;
}

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "application/json", "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/health") return send(res, 200, { ok: true, gemini: !!process.env.GEMINI_API_KEY });
  if (url.pathname === "/api/assistant") {
    if (req.method !== "POST") return send(res, 405, { error: "POST only" });
    if (limited(req.socket.remoteAddress || "x")) return send(res, 429, { error: "Too many requests — try again in a few minutes." });
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 200000) req.destroy(); });
    req.on("end", async () => {
      try { const out = await askGemini(JSON.parse(raw || "{}")); send(res, 200, out); }
      catch (e) { send(res, e.status || 500, { error: e.message || "error" }); }
    });
    return;
  }
  // static files
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || /[\\/]\.(env|git)/.test(file)) return send(res, 403, "Forbidden", "text/plain");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Not found", "text/plain");
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": ext === ".html" || ext === ".js" ? "no-cache" : "public, max-age=86400" });
    fs.createReadStream(file).pipe(res);
  });
});

let port = +(process.env.PORT || 3000);
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && port < 3010) { port++; server.listen(port); }
  else { console.error(e); process.exit(1); }
});
server.on("listening", () => {
  const lan = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  console.log("\n  🛕  Sanchara.AI is running\n");
  console.log("  ➜  Open:      http://localhost:" + port);
  lan.slice(0, 2).forEach((ip) => console.log("  ➜  Same Wi-Fi: http://" + ip + ":" + port + "   (live GPS needs https or localhost)"));
  console.log("  ➜  Gemini AI: " + (process.env.GEMINI_API_KEY ? "ON (key loaded from .env.local)" : "OFF — offline assistant in use (add GEMINI_API_KEY to .env.local)"));
  console.log("\n  Press Ctrl+C to stop.\n");
});
server.listen(port);
