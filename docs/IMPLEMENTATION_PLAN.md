# Crew Care Implementation Plan

## Completed foundation

- Next.js App Router and TypeScript application with dark mission-control styling.
- Astronaut and Mission Control demo portals, shared navigation and status components.
- PostgreSQL/Prisma schema and fictional seed data.
- Daily check-in form, Zod validation, deterministic assessment rules, recommendation and alert records.
- Astronaut history/trend pages and Mission Control crew/alert pages.

## Phase 1–3 completion work

- Keep schema, migration history, seed, and documentation aligned.
- Ensure every check-in field is persisted and displayed consistently.
- Ensure server responses drive the check-in result and failures are visible.
- Remove permissive client-ID validation; validate target records against the database/demo roster and document that demo selection is not authentication.
- Validate Prisma schema, lint, typecheck, and production build when dependencies and database access permit.

## Phase 4

- Add a pure TypeScript historical analytics service for baselines, trends, anomalies, patterns, and cautious short-term projections.
- Persist generated analytics reports in PostgreSQL and expose server-side retrieval/recalculation.
- Integrate astronaut personal intelligence and Mission Control crew trend summaries.
- Extend deterministic simulated history and clearly mark it as simulated.

### Phase 4 implementation status (2026-11-14)

- Implemented the TypeScript analytics engine, individual and mission report APIs, report persistence models, astronaut historical intelligence view, Mission Control crew analytics view, and 30-day simulated history.
- Prisma migration SQL is generated from the current schema. It has not been applied because this workspace has no configured PostgreSQL database.
- A separate Python service was not added: this repository has no Python runtime or service deployment boundary, and these deterministic calculations fit the existing server-side TypeScript module. The Phase 4 prompt's Python service criterion remains a deliberate architectural deviation.
- Full authentication and role-based authorization remain unimplemented in the existing application. Demo roster checks are not authorization and must not be used to expose real health records.
- Automated tests and database-backed persistence checks remain outstanding; no database is configured. Run migrations, configure authentication/authorization, then verify these paths before handling real data.

## Phase 5

- Added a server-only, provider-independent OpenAI-compatible AI integration with structured Zod validation, evidence-ID validation, prompt-injection guardrails, provider timeout/error handling, per-process rate limiting, and request deduplication.
- Added bounded demo context retrieval for 24-hour, 7-day, 30-day, 90-day, and mission views. The assistant receives a selected astronaut's fictional data only in the astronaut portal and demo crew data in Mission Control.
- Added AI Intelligence pages for both portals, contextual Phase 3 and Phase 4 summaries, a browsable evidence explorer, cited findings/recommendations, critical alert preservation, and browser-local conversation history and recommendation statuses.
- Set `CREWCARE_AI_API_KEY`, `CREWCARE_AI_BASE_URL`, and `CREWCARE_AI_MODEL` in the server environment to enable live provider calls. Until configured, the endpoint returns `AI_NOT_CONFIGURED`; no canned response is presented as AI.
- Database conversation persistence and real role-based access are still deferred as requested. The demo app only uses the fictional roster, and local browser conversation/recommendation status storage is not shared or server-persisted.

## Safety and release constraints

Assessment thresholds and statistical deviations are not medically validated limits. Statistical outputs are not diagnoses or predictions of confirmed outcomes. Real health data requires a trusted authentication provider and role-based authorization before deployment.

## Phase 6 — integration, QA, and submission readiness (2026-11-14)

- Audited the repository and recorded the feature matrix in `project-audit.md`.
- Added repeatable API smoke coverage for demo health status, mission analytics, evidence retrieval, roster validation, check-in assessment, local demo state handoff, critical-alert preservation, and the unconfigured AI path.
- Integrated browser-stored check-ins, Phase 3 assessments, and simulated alerts into AI context with roster and cross-astronaut validation; capped local histories and request sizes.
- Fixed misleading connection-latency UI, clarified demo-only emergency behavior, and corrected alert/reset persistence wording.
- Added deployment, security, test, NASA reference, demo, known-limitations, and submission documentation. No NASA data, credentials, auth provider, PostgreSQL server, Python service, or deployment target were available/configured.
- Verified 10 API tests, lint, TypeScript, Prisma schema validation, and production build before the AI-first transformation. Full manual/browser journeys and database/provider integrations remain unverified; Phase 6 is not production-ready or final-submission-ready where NASA-data integration is required.

## AI-first experience and voice safety workflow (2026-11-14)

- Preserved the original centered landing structure and portal cards while adding a compact free-form AI question/search bar backed by the existing Phase 5 evidence context and chat endpoint.
- Added provider-independent `LLM_*` configuration with legacy `CREWCARE_AI_*` compatibility and a Google Gemini OpenAI-compatibility option. No live provider key is present, so LLM connectivity remains unverified.
- Replaced the emergency modal with a full-screen mobile-responsive voice/text safety workspace, speech recognition/synthesis, adjustable playback speed, interrupt/repeat, timer, ephemeral transcript, and selected-profile record/critical-alert summary.
- Emergency conversations do not use the LLM or persist transcripts. The fixed safety flow directs the astronaut to approved procedures/human support and explicitly reports no contact was made. No clinically reviewed triage protocol, authenticated emergency API/session, or human escalation integration exists yet; this is not a substitute for mission emergency procedures.
- Added `ai-first-transformation.md` and `emergency-assistant.md` to explain provider setup, data bounds, and the emergency safety boundary.
