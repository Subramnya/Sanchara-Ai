# Sanchara.AI — ಸಂಚಾರ
### Personalised Tourism Recommendation System for Karnataka

**Theme:** AI to Redesign Tourism · Smart Technology · **Problem #3: Personalized Tourism Recommendation System**
*"Recommend places, routes, food, accommodation and activities based on tourist interests, time and budget."*

Sanchara.AI asks four simple questions (where are you, what do you love, how long, how much), then builds a complete plan:

| Requirement | What Sanchara does |
|---|---|
| **Places** | AI-ranked from 175 curated places across all 31 districts. Every pick shows a match % and the reasons for it. |
| **Routes** | An **OpenStreetMap** map in the results area showing **your live GPS position** (blue dot, accuracy ring, place name from OSM Nominatim, distance to the next stop). Also an optimised visiting order, drive times, one-tap Google Maps navigation, and live road routes from OSRM. |
| **Food** | Meals timed to the clock: breakfast (8–11), lunch (12–3), snacks (4–7), dinner (8–11). Signature local dishes, well-known eateries, **meal stops on the way**, and live nearby restaurants. |
| **Accommodation** | A night stay near your last stop each day, with KSTDC Mayura / Jungle Lodges first, plus live hotels from OpenStreetMap. |
| **Activities** | 15 interest types (trekking, boating, safari, waterfalls, heritage…) plus optional paid add-ons such as coracle rides and safaris. |
| **Time** | 1–7 day plans or **"Explore right now"** mode. Accounts for opening hours, closed days, sunset time and predicted crowds. |
| **Budget** | Per-person or total budget **plus a buffer**. A live meter shows the spend. If the plan goes over, the AI trims it until it fits. |

Also included: an English / **ಕನ್ನಡ** interface, an AI chat assistant (Gemini, with an offline fallback), 👍/👎 feedback that re-ranks instantly, WhatsApp share, a PDF itinerary, a CO₂ estimate, safety helplines, and offline-first operation.

---

## 1. Run it in VS Code (2 minutes)

**You need:** [VS Code](https://code.visualstudio.com/) and [Node.js 18 or newer](https://nodejs.org/) (choose the "LTS" version).
To check Node, open a terminal and run `node -v`. It should print v18 or higher.

1. **Unzip** `sanchara-ai.zip` anywhere, for example `Documents/sanchara-ai`.
2. In VS Code: **File → Open Folder… → select the `sanchara-ai` folder**. Click "Yes, I trust the authors" if asked.
3. Open the terminal: **Terminal → New Terminal** (or <kbd>Ctrl</kbd>+<kbd>`</kbd>).
4. Type:
   ```bash
   npm start
   ```
   You don't need `npm install`. The project has **zero dependencies**.
5. Open **http://localhost:3000** in Chrome or Edge. Click **Get Started**, then **Use my live location** and allow access.

Shortcut: press **F5** in VS Code and choose "🚀 Run Sanchara (server + Chrome)". To stop the server, press <kbd>Ctrl</kbd>+<kbd>C</kbd> in the terminal.

### Other ways to run (no Node needed)
- **Live Server extension:** install "Live Server" (VS Code suggests it). Right-click `index.html` and choose **Open with Live Server**. Everything works; the chat uses the offline AI.
- **Python:** run `python -m http.server 8000`, then open http://localhost:8000.
- **Double-click `index.html`:** the planner still works. Some browsers block GPS on files opened this way, so pick your place from the list instead.

---

## 2. Turn on Gemini AI chat (optional, free)

1. Get a free key at **https://aistudio.google.com/apikey** (sign in with Google, then click *Create API key*).
2. In the project folder, copy `.env.example` to a new file named **`.env.local`** and paste your key:
   ```
   GEMINI_API_KEY=AIza...your key...
   ```
3. Stop the server (<kbd>Ctrl</kbd>+<kbd>C</kbd>) and run `npm start` again. The terminal should show `Gemini AI: ON`.
4. Chat replies are now tagged **✨ Gemini · grounded on your plan**. Without a key or without internet, the chat answers with **⚡ Sanchara Lite · offline AI**.

The key stays on the server only (`.env.local` is git-ignored). It is never sent to the browser.

## 3. Make photos work offline (recommended before the demo)
While you're online, run this once:
```bash
npm run fetch-images
```
It downloads the heritage photos (Wikimedia Commons, free licences) into `assets/img/places/` and writes `CREDITS.md`. After that, the landing page shows real photos even without internet. If a photo is missing, the app shows its own illustrated artwork instead.

## 4. Deploy free on Vercel (for a phone demo with HTTPS GPS)
1. Push this folder to a GitHub repository. `.env.local` is git-ignored, so your key stays private.
2. On https://vercel.com, click **Add New → Project → Import** your repo. For Framework, choose **Other**. Leave build settings empty.
3. Go to **Settings → Environment Variables**, add `GEMINI_API_KEY`, then click **Redeploy**.
4. Open the `https://…vercel.app` link on your phone. Live GPS works because the site uses HTTPS.
   No card is needed. The Vercel Hobby plan is free.

---

## 5. Folder structure
```
sanchara-ai/
├── index.html                  ← the whole app (landing, wizard, results)
├── server.js                   ← zero-dependency Node server (npm start) + /api/assistant
├── api/
│   ├── assistant.js            ← Vercel serverless function (Gemini)
│   └── _gemini.js              ← shared Gemini client (key read from server env only)
├── assets/
│   ├── css/styles.css          ← Karnataka-heritage design system (light + dark, mobile-first)
│   ├── js/
│   │   ├── data/               ← curated knowledge base
│   │   │   ├── districts.js    (31 districts, towns, coordinates)
│   │   │   ├── places.js       (175 attractions: tags, fees, hours, seasons, crowd, effort…)
│   │   │   ├── food.js         (60 regional dishes + trusted eateries)
│   │   │   ├── stays.js        (49 stays — KSTDC, Jungle Lodges, hotels)
│   │   │   ├── images.js       (Wikimedia Commons photo references)
│   │   │   └── karnataka-geo.js(district boundaries for the offline map)
│   │   ├── engine/             ← the AI
│   │   │   ├── core.js         (geo maths, meal windows, travel modes, sun & crowd models)
│   │   │   ├── model-weights.js(learned ranking weights — produced by ml/train_ranker.py)
│   │   │   ├── recommender.js  (TF-IDF + learned ranker + MMR diversity + explanations)
│   │   │   ├── planner.js      (orienteering tour, 2-opt, day scheduling, meals, stays, budget optimiser)
│   │   │   └── assistant-lite.js (offline chat assistant)
│   │   ├── services/live.js    ← GPS, Nominatim, OSRM routes, Overpass POIs, Open-Meteo, Gemini
│   │   ├── ui/                 ← map.js, wizard.js, results.js, i18n.js (EN/ಕನ್ನಡ), art.js, icons.js
│   │   └── app.js              ← app shell, routing, feedback learning, chat
│   ├── vendor/leaflet/         ← map library (bundled — no CDN needed)
│   ├── fonts/                  ← Cormorant Garamond, Manrope, Noto Kannada (bundled)
│   └── img/                    ← icons (+ photos after npm run fetch-images)
├── ml/                         ← Python ML lab: train & evaluate the ranker, export weights, charts
├── scripts/                    ← fetch-images, validate-data, smoke-test (npm test)
├── docs/                       ← demo script, judges' Q&A, architecture
├── sw.js, manifest.webmanifest ← installable PWA + offline cache
├── vercel.json, package.json, .env.example, .vscode/
```

## 6. How the AI works (one paragraph for the judges)
1. The recommender turns every place into a **TF-IDF vector** built from its tags, activities and description. It compares that vector with your interest profile using **cosine similarity**. 👍/👎 feedback updates the profile with **Rocchio relevance feedback**.
2. It adds context features: distance, season, predicted crowd at the planned hour, fit for your group, fit for your budget, and opening hours.
3. A **logistic learning-to-rank model** combines all of these into one score. The model is trained in `ml/train_ranker.py` and evaluated with Precision@5 and NDCG@5.
4. **MMR re-ranking** keeps the picks diverse, and every pick is explained in plain words.
5. The planner solves a small **orienteering problem**: it greedily inserts places in the cheapest spot, polishes the route with **2-opt**, then schedules each day. Scheduling handles opening hours, meals at the right clock time (including stops on long drives), sunset and the night stay.
6. A **budget optimiser** downgrades stay and food tiers first. If that isn't enough, it drops the stop that saves the most money for the least loss in relevance, until the plan fits your budget plus buffer.

Plans are built on the device in about 50 ms, so the planner works even at remote heritage sites with no signal.

## 7. Useful commands
| Command | What it does |
|---|---|
| `npm start` | Run the app at http://localhost:3000 |
| `npm test` | Engine smoke test (8 trip scenarios + meal windows + assistant) |
| `npm run validate` | Check the dataset (ids, districts, coordinates, hours) |
| `npm run fetch-images` | Download photos for offline use |
| `cd ml && pip install -r requirements.txt && python train_ranker.py` | Retrain and evaluate the ranker, and regenerate charts |

## 8. Troubleshooting
- **`npm` is not recognised:** Node.js isn't installed. Install the LTS version from nodejs.org and reopen VS Code.
- **Port 3000 is busy:** the server moves to 3001, 3002… automatically. Check the terminal for the address.
- **"Location permission denied":** click the 🔒 icon in the address bar, set Location to *Allow*, and reload. You can also search for or pick your town in the wizard.
- **The map shows only district outlines:** either you're offline, or `index.html` was opened by double-clicking it. Run `npm start` and open **http://localhost:3000**. OpenStreetMap tiles and the live location need a web address (localhost or https) and internet. Tap the ◎ button on the map to centre on your live position.
- **The chat says "offline AI":** add `GEMINI_API_KEY` to `.env.local` and restart `npm start`. Also check your internet connection.

## 9. Data & credits
Maps © OpenStreetMap contributors (tiles by CARTO). Routing by OSRM. Weather by Open-Meteo. Photos from Wikimedia Commons (free licences; see `assets/img/places/CREDITS.md`). Icons by Lucide (ISC licence). Fonts from Google Fonts (OFL licence). District boundaries: udit-001/india-maps-data (Census 2011 base).
Fees, timings and tariffs are indicative. Always confirm locally.

**Team name:** ____________ · **Institution:** ____________ · **Members:** ____________
