# Likely judges' questions, with crisp answers

**1. Where exactly is the AI? Isn't this just filtering?**
There are three learned or optimising components. (1) A **content-based recommender**: every place becomes a TF-IDF vector of its tags, activities and description, and your interests become a query vector, compared by cosine similarity. (2) A **logistic-regression learning-to-rank model** that combines 8 context features: interest match, proximity, popularity, season, predicted crowd, group fit, budget fit and opening hours. It's trained in Python and runs in the browser. (3) An **optimiser** that builds the route (orienteering heuristic + 2-opt), schedules meals and stays, and trims the plan to the budget. On top of that: MMR diversity, Rocchio feedback learning from 👍/👎, a crowd-prediction model, and a Gemini assistant grounded on the plan.

**2. What data did you train on? Do you have real users?**
We haven't had real users yet, so we trained on **1,200 simulated tourists**. Each one has *hidden* preferences: how much they like each interest, secret tag likes, distance aversion, and taste noise. The model only sees the 8 observable features, just like in real use. We split by tourist, 80% train and 20% unseen. On those unseen tourists, **NDCG@10 is 0.65 vs 0.52** for the best simple baseline. Next step: log real 👍/👎 feedback and retrain with the same script (`ml/train_ranker.py`).

**3. How accurate is it?**
On 240 unseen simulated tourists: Precision@5 = 0.71, NDCG@10 = 0.65, AUC = 0.81. That's +26% NDCG over "nearest first" and +14% over our hand-tuned weights. Across 300 random trips, the planner cut driving by 28%, kept 99% of plans within budget + buffer, put 100% of meals inside the correct time window, and gave 100% of nights a stay.

**4. Where does the place data come from? Is it reliable?**
We curated 175 attractions across all 31 districts. For each one: coordinates, fees, opening hours, closed days, best months, crowd level, effort, kid and senior suitability. We also have 60 regional dishes and 49 stays, with KSTDC and Jungle Lodges prioritised. Live data comes from OpenStreetMap (restaurants and hotels via Overpass), OSRM (roads) and Open-Meteo (weather). Fees and tariffs are marked as indicative, and the Tourism Department's official data can replace our JSON directly.

**5. How do you pick food by time?**
Meal windows follow the brief: breakfast 8–11, lunch 12–3, snacks 4–7, dinner 8–11. The scheduler inserts each meal when the clock enters its window. If a long drive crosses lunch time, it adds a **meal stop in the town halfway** along the route. Dishes are matched to the district (jolada rotti in North Karnataka, neer dosa on the coast) and filtered for veg / non-veg.

**6. How does the budget and buffer work?**
The total is travel (per-km cost by mode, taxi driver allowance, bus fare per person), plus stays (rooms × nights × tier), plus food (meals × members × tier), plus tickets and activities. If the plan is over budget + buffer, the AI steps down stay and food tiers first. If that's not enough, it drops the stop that saves the most rupees for the least loss in relevance. Every change is listed on screen with the amount it saved.

**7. How are routes optimised?**
It's a small **orienteering problem**: maximise relevance within your time. Places are inserted greedily at their cheapest position, weighing relevance against the extra minutes and rupees. The tour is then polished with **2-opt** and split into days using opening hours and your pace. Online, OSRM draws the real road route, and "Navigate" opens Google Maps with all the stops.

**8. What if there's no internet at Aihole or Pattadakal?**
The whole AI runs on the device, with no server call. Plans take about 40 ms. The map falls back to an offline district map, and the chat falls back to "Sanchara Lite". It's an installable PWA with an offline cache.

**9. Why not just use ChatGPT or Gemini to plan?**
LLMs make up timings, prices and distances. Our planner is deterministic: real coordinates, opening hours, meal windows and budget arithmetic. Gemini is used only where it's good, for friendly conversation **grounded on our computed plan**, and the prompt forbids inventing prices or businesses.

**10. Is the API key safe?**
Yes. The Gemini key lives only on the server, in `.env.local` locally or a Vercel environment variable, and the browser calls `/api/assistant`. The key is never in the client code or the Git repo.

**11. Cost to run?**
₹0. The code has zero dependencies, OSM, OSRM and Open-Meteo are free, Gemini's free tier covers it, and Vercel Hobby hosting is free. At state scale, the same code can run on KSTDC or Karnataka Tourism servers.

**12. How does it help local tourism and communities?**
It routes tourists to lesser-known sites like Aihole, Lakkundi and Itagi, not only Hampi, which spreads the crowds. It recommends government stays (KSTDC, JLR), local khanavalis and artisan crafts (Ilkal sarees, Bidriware), promotes off-peak visiting times, and shows the CO₂ saving of KSRTC buses.

**13. Accessibility and safety?**
There's an "Elderly / wheelchair friendly" filter (low-effort sites only), a Seniors group type, a full Kannada interface, a voice read-out for places, voice input for the chat, and one-tap helplines: 112, 108, 1091 (women) and 1363 (tourist).

**14. How is crowd predicted?**
It uses the place's base crowd level adjusted for weekend, public holiday, season and time-of-day curves (sunset spots peak in the evening). The app shows Low / Moderate / High and the best hour to visit. With footfall data from the Tourism Department, the same function can become a trained regression model.

**15. Scalability / future scope?**
Next steps: real footfall and ticketing data, a feedback-trained model per region, a multilingual voice guide (Kannada, Hindi, English), AR monument recognition with the phone camera, KSTDC booking APIs, a local artisan marketplace, and crowd forecasting for the Hampi Utsav and Dasara seasons.

**16. What did each team member do?** *(fill in)* ______________________

**17. Show us the code for the AI.**
Open `assets/js/engine/recommender.js` (TF-IDF, ranker, MMR, explanations), `planner.js` (tour, 2-opt, meals, stays, budget) and `ml/train_ranker.py` (training and evaluation).

**18. Why logistic regression and not deep learning?**
It fits the data size, trains in seconds, is **explainable** (every weight has a meaning, and we show reasons to the user) and runs in under a millisecond on any phone without a GPU. A deep model can be swapped in when there's real interaction data.
