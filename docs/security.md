# Security Review and Remaining Risks

Review date: 2026-11-14. This review covers source-level behavior; it is not a penetration test.

## Implemented safeguards

- Zod validation is used for health check-ins, AI requests, simulated AI context, and structured provider responses.
- Astronaut and Mission Control AI context is restricted to the hard-coded fictional four-member roster. Personal context is scoped to one selected demo astronaut; mission context is explicitly crew-wide demo data.
- AI responses must cite IDs from the retrieved evidence catalog. Unknown evidence IDs reject the entire answer.
- AI provider keys are read only on the server from `CREWCARE_AI_API_KEY`; frontend bundles do not read that environment variable.
- Provider requests have a timeout, bounded context, response validation, request body limit, per-process rate limit, and in-flight request deduplication.
- Prompts treat retrieved notes and prior user text as untrusted, preserve Phase 3 status/alerts, and prohibit diagnosis and treatment instructions.
- The demo reset removes only namespaced browser localStorage keys; it never invokes a database delete.

## Critical gaps before real data

- **No authentication or authorization.** The astronaut picker is a demo switch, and APIs with demo IDs are not proof of identity. Mission Control pages are not protected.
- **Database is not configured.** No DB connectivity, migration application, transaction behavior, or data retention policy has been verified.
- **AI sends health context to an external provider when configured.** This includes simulated measurements, notes, assessments, alerts, baselines, trends, and question text. Do not use real or identifiable health data until privacy/legal review and authorization are in place.
- **Conversation and AI recommendation statuses use localStorage.** Browser storage is editable, device-local, and not suitable as an authoritative workflow record.
- **Rate limiting is in-memory and keyed from request headers.** It does not coordinate across instances and is not a production abuse control.
- **CSRF/session protections are not applicable yet because there is no session implementation.** Add appropriate protections with authentication and deployment topology.
- **No Python service exists**, so internal service authentication, CORS, and service-to-service secret handling do not apply yet.
- Health content may be returned in API errors only as generic messages, but production logging/observability still requires privacy review.

## Release boundary

Keep the application in fictional demo mode until a trusted identity provider, server-enforced roles, astronaut ownership checks, secure database deployment, provider/privacy review, logging policy, and security tests are implemented and verified. Crew Care is not NASA-endorsed, clinically validated, or a medical device.
