# Crew Care Architecture

Crew Care is a modular Next.js App Router application. React pages render the Astronaut and Mission Control experiences; client components are limited to interactive forms, navigation state, and Recharts visualizations. TypeScript services contain validation and deterministic health assessment logic independently of the UI.

## Data flow

1. The check-in form validates inputs for immediate feedback and submits them to `/api/assessments`.
2. The server validates the request with Zod and the health input validator, loads recent records when PostgreSQL is configured, and runs the deterministic assessment engine.
3. The server stores a health record, assessment, findings, recommendations, and applicable alerts through Prisma.
4. Read routes load records for history, dashboards, and charts. When no database is configured, the application uses clearly identified fictional demo data.

## Runtime and access model

The current MVP uses demo portal selection and has no authentication provider or server session. The role selection is for demonstration only and does not provide authorization. Never put real health data in this deployment until a trusted authentication and authorization layer is added. API handlers must validate that record IDs refer to known users; client-supplied IDs alone are not proof of permission.

## Technology

Next.js App Router, React, TypeScript, Tailwind CSS, PostgreSQL, Prisma, Zod, Recharts, and Lucide React. Health assessments are transparent deterministic TypeScript rules. Thresholds are illustrative and require medical review; outputs are not diagnoses or medical clearance.

## Future extension

Historical analytics should be a separate deterministic TypeScript service initially, consuming normalized health records and returning explainable derived results. This keeps calculations testable and avoids a second service/runtime until scale or validated analytical needs justify it.

## Phase 5 AI layer

`src/lib/ai` builds a bounded context from the selected fictional demo astronaut (or the fictional crew), Phase 3 assessment/alert state, Phase 4 analytics, and a catalog of evidence IDs. The server sends this context to an OpenAI-compatible Chat Completions endpoint using `CREWCARE_AI_API_KEY`, `CREWCARE_AI_BASE_URL`, and `CREWCARE_AI_MODEL`. The key is server-only. With no key, the API returns an explicit setup error; the UI does not invent an AI answer.

Provider JSON is parsed with Zod and all cited evidence IDs are checked against the retrieved evidence catalog before a response is shown. Provider requests time out after 25 seconds, are limited per process to eight per client in five minutes, and exact in-flight requests are deduplicated. Prior recommendations are passed as a bounded list to reduce repetition. Recommendation statuses and conversation history are local to the browser. Current recommendation: the provider receives the displayed fictional demo measurements, notes, assessment and analytics; do not configure real health data until authentication, authorization, privacy review, and retention controls are ready. Demo conversations and recommendation statuses are stored in the current browser's local storage, not PostgreSQL.
