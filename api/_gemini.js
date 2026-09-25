/* Sanchara.AI — Gemini helper shared by server.js (local) and api/assistant.js (Vercel).
 * The API key is read from the server environment only (never sent to the browser). */
"use strict";

const MODELS = [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"].filter(Boolean);
let workingModel = null;

const SYSTEM = [
  "You are Sanchara, a warm, precise AI travel assistant for Karnataka, India, inside the Sanchara.AI trip planner.",
  "Ground every answer in the JSON context you receive (the traveller, their current plan, nearby places with fees and timings).",
  "Never invent prices, opening hours, phone numbers or businesses that are not in the context; if unsure, say so and suggest verifying locally or on Google Maps.",
  "Be practical: timings, distances, what to eat at this hour (breakfast 8–11, lunch 12–3, snacks 4–7, dinner 8–11), where to stay, crowd-avoiding tips, budget advice.",
  "Promote local culture respectfully: North Karnataka food (jolada rotti oota, Dharwad peda, girmit), KSTDC and Jungle Lodges stays, local artisans (Ilkal sarees, Kinnal toys, Bidriware).",
  "For safety questions always include: 112 emergency, 108 ambulance, 1091 women's helpline, 1363 tourist helpline.",
  "Reply in Kannada if the user writes in Kannada or the UI language is 'kn'; otherwise English. Keep replies under 140 words, use short lines or bullets, no markdown headings."
].join(" ");

async function callModel(model, key, body) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 18000);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body), signal: ctrl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.error && j.error.message) || "HTTP " + r.status); e.status = r.status; throw e; }
    const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    const text = parts.map((p) => p.text || "").join("").trim();
    if (!text) throw new Error("Empty reply");
    return text;
  } finally { clearTimeout(timer); }
}

async function askGemini(payload) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { const e = new Error("not_configured"); e.status = 503; throw e; }
  const messages = Array.isArray(payload.messages) ? payload.messages.slice(-10) : [];
  const ctx = JSON.stringify(payload.context || {}).slice(0, 12000);
  const contents = messages.map((m) => ({ role: m.role === "model" ? "model" : "user", parts: [{ text: String(m.text || "").slice(0, 2000) }] }));
  if (!contents.length || contents[contents.length - 1].role !== "user") { const e = new Error("no question"); e.status = 400; throw e; }
  contents[contents.length - 1].parts[0].text = "Context (JSON): " + ctx + "\nUI language: " + (payload.lang || "en") + "\n\nQuestion: " + contents[contents.length - 1].parts[0].text;
  while (contents.length && contents[0].role !== "user") contents.shift();
  const body = { systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: { temperature: 0.55, maxOutputTokens: 600 } };
  const order = workingModel ? [workingModel].concat(MODELS.filter((m) => m !== workingModel)) : MODELS;
  let lastErr = null;
  for (const model of order.slice(0, 4)) {
    try { const reply = await callModel(model, key, body); workingModel = model; return { reply, model }; }
    catch (e) { lastErr = e; if (e.status && ![404, 400, 429, 500, 503].includes(e.status)) break; }
  }
  throw lastErr || new Error("Gemini unavailable");
}

module.exports = { askGemini };
