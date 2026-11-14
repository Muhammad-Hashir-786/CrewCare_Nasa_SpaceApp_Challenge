# Test and Verification Plan

## Automated test command

`npm test` starts a temporary Next.js development server on port 3217 (override with `CREWCARE_TEST_PORT`) with an isolated `.next-test` output directory, database and AI credentials disabled. This prevents the test server from colliding with a developer's normal `.next-dev` server. It runs API smoke tests using Node's built-in `node:test` and exits the server afterward. Tests use only fictional demo data and make no paid AI calls.

Coverage includes:

- Demo mode health endpoint.
- Four-member mission analytics retrieval.
- Bounded 30-day AI context and evidence catalog.
- Rejection of non-demo astronaut IDs.
- Inclusion of browser-submitted demo assessments and critical alerts in AI context.
- Rejection of cross-astronaut browser state.
- Check-in ID validation.
- Deterministic critical assessment response using a synthetic high heart-rate input.
- Clear `AI_NOT_CONFIGURED` behavior instead of a canned response.
- Root route preserves the portal cards, AI question bar, and home-screen emergency entry point.
- Emergency API immediately bypasses Gemini for urgent/unknown safety answers.
- Emergency API returns an explicit unconfigured-provider response instead of inventing a model answer.
- Deterministic safety-screen behavior across nine requested emergency simulation classes; no care protocol can be selected until approved.

## Executed results (2026-11-14)

- `npm test`: **14 passed, 0 failed**; includes emergency API and decision-support scenarios.
- `npm run lint`: **passed** (a React dependency warning found during review was fixed).
- `npx tsc --noEmit`: **passed**.
- `npx prisma validate`: **passed** against the schema using a placeholder URL; this did not connect to PostgreSQL.
- `npm run build` using isolated `.next-test`: **passed**. Next used its WASM fallback because the installed Windows SWC binary could not load; output compiled and generated all pages.

## Additional verification commands

```powershell
npm run lint
npx tsc --noEmit
$env:DATABASE_URL = 'postgresql://user:password@localhost:5432/crewcare'
npx prisma validate
npm run build
```

The placeholder URL above is for schema validation only. It does not create a database connection or run migrations.

## Manual demo checks

1. Open `/select`, choose VECTOR, and enter a deliberately out-of-range demo value such as heart rate 140. Confirm the submitted Phase 3 assessment is RED and visibly marked as demo.
2. Open Mission Control → Alerts. Confirm the critical demo alert appears; acknowledge it and reload to confirm browser-local retention.
3. Open Mission Control → AI Intel. Confirm local simulated check-ins and alerts are included in the retrieved evidence context. Asking the assistant without an AI key must return a configuration error and no generated answer.
4. Open `/select` and use **Reset browser demo data**. Confirm check-ins, local assessment state, local alerts, AI conversations, recommendation statuses, and demo profile selection reset. The reset must not delete PostgreSQL data.

## Not verified / not yet covered

- No database URL is configured, so migrations, transactions, relational constraints, query performance, and DB persistence have not been integration-tested.
- No authentication exists; authorization/security tests cannot pass and real health records must not be used.
- There is no Python/FastAPI service to test.
- No provider API key is configured; live Gemini responses, malformed model output, prompt-injection resistance, latency, rate limits, and cost behavior remain unverified.
- The smoke suite does not yet cover all assessment rule branches, analytics edge cases, full browser UI flows, responsive rendering, or all visible controls.
- Browser microphone/speech behavior, permission denial, interruption, and mobile emergency-screen behavior have not been exercised in an actual browser/device test.
- Browser-local state requires a manual browser check; the API suite cannot exercise localStorage.
