# Crew Care

**AI-first astronaut health intelligence system under development**  
NASA Space Apps Challenge 2026 — *Create Health Monitoring Software for Astronauts on Space Missions*

> All astronaut profiles and health measurements in the demo are fictional and simulated. Crew Care is not a medical device and is not endorsed or medically validated by NASA. Configured thresholds are illustrative examples, not clinical limits.

## Project overview

The root route keeps the original centered Crew Care identity and Astronaut Portal / Mission Control choices, with a compact AI health-question search between them. Submitted questions use the existing Phase 5 evidence-grounded assistant API and show cited results when a provider is configured. Crew Care combines astronaut self-check-ins, deterministic Phase 3 assessments, individual Phase 4 baselines and trends, and Phase 5 AI. Phase 3 status remains authoritative; statistical analysis and AI are supplementary.

The app responds to the Space Apps challenge by collecting example health indicators and making their status and history easier to review. It currently uses deterministic synthetic data, not NASA data or real astronaut records.

## Features

- Four fictional crew profiles with deterministic 30-day histories.
- Daily check-in form and Phase 3 rule-based assessment, guidance, and recommendations.
- Browser-local demo check-in history and Mission Control alert acknowledgement.
- Phase 4 personal baselines, trend analysis, deviations, combined patterns, and cautious projections.
- Phase 5 astronaut and crew AI intelligence views with evidence explorer and structured response validation.
- Optional server-side OpenAI-compatible provider, configured using provider-independent `LLM_*` variables (including Google's documented OpenAI compatibility endpoint). Without credentials, the service clearly returns `AI_NOT_CONFIGURED`; it does not show canned AI answers.
- Voice-capable emergency intake on the home screen and crew portal, with a deterministic initial danger screen, optional Gemini follow-up for one clarifying question at a time, and selected fictional health context. It does not provide a validated clinical triage, treatment protocol, durable emergency record, or actual dispatch.
- Manual vitals and hand-entered readings from wearable sensors have source labels. Direct device integrations require a target device and protocol.
- Repeatable browser-only demo reset that never deletes PostgreSQL data.
- Health endpoint at `/api/health`.

## Technology

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, PostgreSQL, Prisma 5.22, Zod 4, Recharts, and Lucide React. The repository currently has no Python service and no authentication provider.

## Quick start (demo mode)

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000/select` to choose a demo astronaut or `http://localhost:3000/mission-control` for Mission Control. No database or AI provider is needed to browse the fictional baseline demo. Check-ins, acknowledgements, conversations, and AI recommendation statuses are browser-local.

To run with a database, set `DATABASE_URL` in `.env.local`, then run `npm run db:migrate` and (only in a disposable demo database) `npm run db:seed`. No database is configured or migration applied in the current workspace.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string for Prisma. Leave as the example placeholder to use the static demo fixture. |
| `LLM_PROVIDER` | Optional provider selector: `openai-compatible`, `openai`, or `gemini`. |
| `LLM_API_KEY` | Optional server-only LLM API key; takes precedence over the legacy variable. |
| `LLM_BASE_URL` | Optional OpenAI-compatible API base URL. Gemini supports this compatibility mode at Google's documented endpoint. |
| `LLM_MODEL` | Optional provider model name. |
| `CREWCARE_AI_API_KEY`, `CREWCARE_AI_BASE_URL`, `CREWCARE_AI_MODEL` | Legacy aliases retained for existing deployments. |
| `NEXTAUTH_URL` | Present in the sample template but unused; no NextAuth/authentication implementation exists. |

Never use real health data until authentication, role-based authorization, provider/privacy review, and secure deployment are implemented.

## Tests and checks

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`npm test` starts a local Next dev server and exercises the demo APIs, including the simulated critical assessment and unconfigured AI path. It does not test PostgreSQL, authentication, a live paid AI provider, Python, or complete browser journeys. See [testing.md](docs/testing.md).

## Documentation

- [System overview](docs/system-overview.md)
- [Project audit and feature matrix](docs/project-audit.md)
- [Known limitations and readiness](docs/known-limitations.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database design](docs/DATABASE_DESIGN.md)
- [API reference](docs/api-documentation.md)
- [Analytics methodology](docs/analytics-methodology.md)
- [AI architecture](docs/ai-architecture.md)
- [AI-first experience and provider setup](docs/ai-first-transformation.md)
- [Emergency assistant safety boundary](docs/emergency-assistant.md)
- [Clinical validation and regulatory readiness plan](docs/clinical-validation-plan.md)
- [Security review](docs/security.md)
- [Deployment instructions](docs/deployment.md)
- [Testing and verification](docs/testing.md)
- [NASA scientific references and data provenance](docs/scientific-references.md)
- [Reproducible demo guide](docs/demo-guide.md)
- [Submission package draft](docs/submission-package.md)
- [Phase plan and known limitations](docs/IMPLEMENTATION_PLAN.md)

## NASA references and submission

NASA Human Research Program and Spaceflight Standard Measures references inform the domain context only; no NASA data is currently integrated. Review [scientific-references.md](docs/scientific-references.md) for source descriptions, relevant fields, use/license notes, and limitations. Do not claim NASA endorsement or clinical validation.

The submission package is a draft; the team still needs to supply its public demo/video/repository URLs, team details, actual individual contributions, and any dataset required by its local event. Check the official challenge page and local-event requirements before submission.
