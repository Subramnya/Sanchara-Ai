# Sanchara.AI — Demo script (5-minute slot: about 2 minutes of PPT, 3 minutes of live demo)

## The night before (checklist)
- [ ] `npm start` works on the demo laptop and http://localhost:3000 opens.
- [ ] Run `npm run fetch-images` once while online. Hero photos are then saved on the laptop, so they work offline too.
- [ ] Optional: put `GEMINI_API_KEY` in `.env.local` and restart. The terminal should say **Gemini AI: ON**.
- [ ] In Chrome, set Location to **Allow** for localhost (click the 🔒 icon in the address bar).
- [ ] Charge the laptop and a phone. Set up a phone hotspot as backup internet.
- [ ] Open a second tab with the PPT. Keep VS Code open on `assets/js/engine/recommender.js` in case judges ask to see the code.
- [ ] Test once with Wi-Fi OFF. The planner, meals, stays and budget should all still work, and the chat shows "offline AI".

## Live demo flow (about 3 minutes)
1. **Landing page (15 s):** "Sanchara — Kannada for *travel*. This is Karnataka's heritage: Hampi, Badami, Gol Gumbaz." Toggle **ಕನ್ನಡ** once, then switch back.
2. **Get Started → Use my live location (20 s):** it detects *Bagalkot*, because we're at BEC. "Live GPS. It also works if you type any town or monument."
3. **Interests (10 s):** tap *Heritage*, *Photography*, *Boating*. "Fifteen interest types, and the AI blends them."
4. **Trip (15 s):** *Plan a trip* → **2 days**, tomorrow, 8:00 AM, own car, return to start.
5. **Budget (20 s):** **4 members**, *Family*, **₹15,000 total** plus a **₹3,000 buffer**. "Per person or total, plus a buffer. That's how real families plan."
6. **Generate (10 s):** point out the AI steps on screen: scoring, route, meals and stays, budget.
7. **Itinerary (45 s):**
   - The match % with the *reasons* on each place: "Explainable AI. It tells you *why*."
   - The **breakfast / lunch / snacks / dinner** cards at the right clock times, with local dishes (jolada rotti oota), plus the *meal stop on the way*.
   - The **night stay**: KSTDC Mayura first, because it's a government property.
   - **Navigate Day 1** opens Google Maps with every stop in order.
8. **Budget tab (20 s):** "₹13,000 of ₹15,000, and the buffer is untouched. If we go over, the AI trims the plan to fit and shows what it changed." Mention the route optimiser (%) and the CO₂ estimate.
9. **Learning from you (20 s):** 👎 a temple. The plan re-ranks instantly: "Rocchio feedback. It learns what you like."
10. **Ask AI (20 s):** "What should I eat now near Badami?" → Gemini (or offline AI) answers from *our plan*.
11. **Close (10 s):** "One app covers places, routes, food, stays, activities, time and budget. It runs offline, in Kannada, for ₹0."

### Backup scenario (if GPS or internet fails)
- Click **"Try: I'm at Hampi"** on the landing page. It generates a full 2-day family plan instantly.
- Or use the **Explore right now** mode for an on-the-spot demo: open-now places, food for this hour, and tonight's stay.

## Talking points for each marking criterion (50 marks)
| Criterion | Marks | Say this |
|---|---|---|
| Problem & relevance | 8 | Tourists at North Karnataka heritage sites juggle 6+ apps and still miss places, meal times and budget. Built for Bagalkot, Hampi and Belagavi first. |
| AI innovation | 10 | Hybrid recommender (TF-IDF + learned ranker), explainable reasons, 👍/👎 online learning, orienteering route planner, meal-time AI, budget optimiser, Gemini assistant grounded on the plan. |
| Technology | 7 | Curated 175-place dataset, logistic-regression ranker trained in Python, JS inference on the device, APIs: GPS, OSRM, Overpass/OSM, Open-Meteo, Nominatim, Gemini. Offline-first PWA. |
| Prototype & demo | 12 | Fully working, live GPS, full EN/ಕನ್ನಡ interface, WhatsApp share, PDF, navigation deep links. |
| Results & impact | 8 | NDCG@10 is 0.65 vs 0.52 for the best simple baseline (+26%). Routes are 28% shorter. 99% of plans fit within budget + buffer. Meals are 100% on time. About 40 ms per plan. |
| Presentation & Q&A | 5 | See `JUDGE_QA.md`. |
