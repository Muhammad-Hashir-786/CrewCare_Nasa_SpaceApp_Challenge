# Crew Care Reproducible Demo

## Start

1. Run `npm install`, then `npm run dev`.
2. Open `http://localhost:3000/select`.
3. The app runs without PostgreSQL. It labels its baseline records fictional/simulated.

## Suggested 3–4 minute sequence

1. **Introduce Horizon VII:** open Mission Control and explain that the four crew records are generated examples.
2. **Stable baseline:** choose NOVA and show 30-day baselines and trend analysis in Astronaut → Trends.
3. **Sleep change:** switch to ATLAS and compare 30-day sleep history with the personal baseline.
4. **Sleep/stress pattern:** switch to CIPHER and show the Phase 4 combined pattern and the Phase 3 assessment/alerts.
5. **Cardiovascular recovery:** switch to VECTOR and show the earlier clustered deviations and later readings closer to the prior pattern. Current assessment remains separate from historical analytics.
6. **AI intelligence:** open Astronaut → AI Insights or Mission Control → AI Intel. Show retrieved evidence and explain the provider setup state. With no API key the assistant correctly refuses to fake a live answer. If a provider key has been configured, ask a history-based question and show the citation chips/details.
7. **Critical response loop:** select VECTOR, open Check-In, submit a demonstration heart rate of `140` (other sample fields may be left blank), and review the RED Phase 3 result. Open Mission Control → Alerts, inspect the locally generated CRITICAL demo alert, then acknowledge it. This only changes the browser demo state.
8. **Reset:** return to `/select`, click **Reset browser demo data**, and confirm. This removes only namespaced localStorage demo keys; it does not delete database records.

## Important distinctions for the presenter

- Precomputed Phase 3/4 results come from deterministic demo data. Do not present them as NASA measurements.
- A live AI response is only live when the server provider key is configured. Never describe the provider error/setup state as an AI result.
- AI analysis is a prototype explanation with evidence references, not a diagnosis.
- No NASA dataset is integrated and no NASA endorsement is claimed.
- If the venue requires a video, NASA data citation, or earlier local submission deadline, follow that event's instructions in addition to the global project page.
