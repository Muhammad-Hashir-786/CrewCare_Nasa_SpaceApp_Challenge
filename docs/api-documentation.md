# API Reference (Current Prototype)

All routes are Next.js App Router handlers. No route has real user authentication because the repository has no auth provider/session. Health-record endpoints must not be exposed to real users until that is fixed.

| Method and route | Purpose | Demo behavior |
|---|---|---|
| `GET /api/health` | Liveness and database configuration/connectivity. | Returns `status: demo` without a DB; configured DB is checked with `SELECT 1`. |
| `POST /api/assessments` | Validate measurements, run Phase 3 assessment, optionally write transactionally to PostgreSQL. | Accepts only the four fictional astronaut IDs; response marks `isSimulated: true`. |
| `GET /api/assessments?userId=...` | Retrieve latest assessment history. | Empty assessment list without a database. |
| `GET /api/health-records/[userId]` | Retrieve astronaut history. | Demo/static records without a DB. |
| `GET /api/analytics/[userId]`, `POST /api/analytics/[userId]` | Calculate or save astronaut analytics. | Calculates on demo records; persistence requires PostgreSQL. |
| `GET /api/analytics/mission`, `POST /api/analytics/mission` | Crew analytics and optional report persistence. | Uses four demo astronauts. |
| `GET /api/ai/context?scope=astronaut&astronautId=ast-3&period=30d` | Retrieve bounded static demo context. | Only demo IDs accepted. |
| `POST /api/ai/context` | Retrieve context including validated browser-local demo check-ins. | JSON: `{scope, astronautId?, period, demoStates?}`. Mission scope may include up to four validated demo states. |
| `POST /api/ai/assistant` | Ask the configured AI provider against bounded demo context. | JSON includes `{scope, astronautId?, question, period, demoStates?, conversationHistory?, existingRecommendations?}`. Returns 503 `AI_NOT_CONFIGURED` until configured. |
| `GET /api/alerts` | Retrieve alerts. | Fictional alert fixtures. Browser-local demo alerts are merged by the Mission Control page. |
| `POST /api/alerts/[id]/acknowledge` | Acknowledge an alert. | Mission Control UI retains simulated acknowledgement in localStorage. |
| `GET /api/mission-control/crew` | Crew summary. | Four fictional astronauts without a database. |
| `GET /api/recommendations`, `POST /api/recommendations/[id]/acknowledge` | Recommendation retrieval/acknowledgement. | Database persistence requires PostgreSQL; demo acknowledgement is an API success stub. |

Periods: `24h`, `7d`, `30d`, `90d`, `mission`. Error responses use a JSON `error`; AI errors may include a stable `code` such as `AI_NOT_CONFIGURED`, `AI_TIMEOUT`, `AI_INVALID_EVIDENCE`, or `AI_RATE_LIMITED`.
