/* Vercel serverless function: POST /api/assistant  → Gemini reply grounded on the trip context.
 * Set GEMINI_API_KEY in Vercel → Project → Settings → Environment Variables. */
"use strict";
const { askGemini } = require("./_gemini");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  try {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const out = await askGemini(body || {});
    res.status(200).json(out);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "error" });
  }
};
