# Deployment and Startup

No deployment has been performed or verified. This document describes the manual path for the current Next.js + Prisma application.

## Demo mode (no database)

1. Install the supported Node.js runtime and run `npm install`.
2. Copy `.env.example` to `.env.local`; leave `DATABASE_URL` as a placeholder to keep demo mode.
3. Optionally configure `CREWCARE_AI_API_KEY`, `CREWCARE_AI_BASE_URL`, and `CREWCARE_AI_MODEL` for live AI calls over fictional demo records only.
4. Run `npm run dev`; open `http://localhost:3000`.
5. Use `/select` to choose a demo astronaut or `/mission-control` for the crew view.

## Database-backed deployment (manual work required)

1. In Vercel, provision PostgreSQL through a Marketplace provider such as Neon. Vercel Postgres itself is no longer offered for new databases.
2. Configure `DATABASE_URL` in the deployment platform's server environment; never commit it or expose it as `NEXT_PUBLIC_*`.
3. Sign-in is intentionally not required for the current fictional-data stage. Configure trusted authentication and role-based authorization before importing any real health data; demo selection and ID validation are not access control.
4. Set `LLM_PROVIDER=gemini`, `LLM_API_KEY`, `LLM_MODEL`, and `LLM_BASE_URL` only in server-side environment variables. AI context may include fictional records, notes, assessments, alerts, and computed analytics. Review privacy, consent, retention, and provider data handling before any real health information is sent.
5. Run `npx prisma validate`, then apply migrations using `npm run db:migrate` in a controlled deployment step. Do not run the fictional seed against a production database.
6. Build and start with `npm run build` and `npm run start`.
7. Configure HTTPS, trusted proxy behavior, secrets management, backups, log retention, and monitoring at the hosting layer.
8. Verify `/api/health`, check application logs, and execute the demo smoke tests in a staging environment.

## Environment variables

| Name | Required when | Purpose |
|---|---|---|
| `DATABASE_URL` | PostgreSQL-backed deployment | Prisma PostgreSQL URL. |
| `LLM_PROVIDER` | Live AI enabled | `openai-compatible`, `openai`, or `gemini`; provider-independent configuration. |
| `LLM_API_KEY` | Live AI enabled | Server-only key. `CREWCARE_AI_API_KEY` remains supported as a legacy alias. |
| `LLM_BASE_URL` | Non-default provider | OpenAI-compatible API base URL. Google's Gemini compatibility endpoint is documented at `https://generativelanguage.googleapis.com/v1beta/openai`. |
| `LLM_MODEL` | Live AI enabled | Model name supported by the selected provider. Legacy `CREWCARE_AI_MODEL` is also supported. |
| Vercel Marketplace Postgres | Production or shared staging storage | Neon and other Postgres providers can be provisioned through the Vercel Marketplace; Vercel injects the database URL. |
| `CREWCARE_AI_BASE_URL` | Legacy configuration | Supported alias for `LLM_BASE_URL`; defaults to `https://api.openai.com/v1`. |
| `NEXTAUTH_URL` | Existing example only | No NextAuth implementation exists; this value is currently unused. |

## Health endpoint and troubleshooting

- `GET /api/health` returns `status: demo` if no database is configured, `status: ok` after a configured database answers `SELECT 1`, or HTTP 503 if the configured database is unreachable.
- AI calls return HTTP 503 `AI_NOT_CONFIGURED` if no server key is present; this is expected in the demo setup.
- The emergency conversation uses Gemini only after the deterministic immediate safety screen passes. Urgent or unknown critical answers bypass the model. The assistant cannot dispatch responders and provides no treatment protocol.
- Prisma migration errors usually indicate a missing or unreachable `DATABASE_URL`; validate the schema separately with a placeholder URL, but do not confuse schema validation with a database connection.
- A Windows SWC load warning has been observed in this workspace. Next.js successfully used its WASM fallback during builds.
- Development, test, and production outputs are isolated: `.next-dev`, `.next-test`, and `.next`. If a dev server was already running when this configuration changed, stop it with `Ctrl+C` and restart using `npm run dev`; this makes Next compile into the clean `.next-dev` directory. The command is `npm run dev` (not `npm run decv`).
- No CORS allow-list, inter-service Python secret, deployment manifest, domain, or production monitoring integration exists because no separate Python service or hosting target is configured.
