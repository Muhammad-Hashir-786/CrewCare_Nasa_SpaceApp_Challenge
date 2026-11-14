# AI Context and Provider Architecture

## Request path

1. The client requests context for one selected fictional astronaut or the fictional crew, and selects `24h`, `7d`, `30d`, `90d`, or mission history.
2. The client may attach its local simulated check-ins, latest assessment, and demo alerts. The server validates their shape and verifies every record/assessment/alert belongs to the requested fictional astronaut IDs.
3. `ai-context-builder.ts` merges those updates with the deterministic demo history, computes Phase 4 analytics, and caps stored history at 180 records per astronaut and emitted record evidence at the latest 30 records per selected period.
4. It assembles current measurements, Phase 3 status/guidance, active alerts, personal baselines, selected-period trends, deviations, patterns, forecasts, missing fields, and stable evidence IDs.
5. On an explicit chat submission, the API sends the structured context, question, and bounded current conversation excerpts to an OpenAI-compatible Chat Completions endpoint.
6. Zod validates the response shape; a second validation rejects any evidence ID not present in the retrieved context. Only then is the answer rendered with evidence references.

## Provider configuration and data transmission

- Preferred configuration: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, optional `LLM_BASE_URL`; legacy `CREWCARE_AI_*` aliases remain supported.
- Default endpoint: `https://api.openai.com/v1/chat/completions`. `LLM_PROVIDER=gemini` selects Google's OpenAI-compatible endpoint unless `LLM_BASE_URL` overrides it; use a model enabled for the account.
- API keys are server-only. No key is set in this workspace; live provider requests have not been verified.
- Request timeout: 25 seconds. Rate limit: eight API requests per IP header per five minutes per server process. Exact in-flight requests are deduplicated.
- Requests transmit only fictional demo data in the current product setup, but fields can include notes/symptoms and measurements. Confirm provider retention/data-use terms before any real-data use.
- If no key is configured, the API returns `AI_NOT_CONFIGURED`; there are no fixed demo answers represented as live AI.

## Safety limits

Phase 3 remains the source of deterministic assessment status and configured alerts. AI cannot mutate records or alerts. The UI independently displays active critical alerts and the AI prompt must preserve their urgency. Outputs are suggestions, not diagnoses, treatment instructions, or medical clearance. Statistical findings and projections remain uncertain.

## Persistence and scheduling

Conversation and recommendation-status history is browser-local and separated by astronaut/mission scope. It is not stored in PostgreSQL. There is no automatic or background AI scheduler; requests are user-triggered. Server-side persistence, auth, cross-device history, durable deduplication, and scheduled analysis are deferred.
# Crew Care AI Architecture

The Medical Intelligence Center and astronaut/mission intelligence pages use the same Phase 5 assistant route and context builder. The server selects the authorized (currently fictional demo roster only) subject, retrieves bounded records and Phase 3/4 outputs, constructs an evidence allow-list, calls a configured provider, validates the structured response, and rejects citations outside the evidence catalog. The model has no direct database connection or arbitrary query tool.

Configure `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, and optionally `LLM_BASE_URL` on the server. Legacy `CREWCARE_AI_*` variables remain supported. `gemini` uses Google's OpenAI-compatible API endpoint only; provider-specific feature support is limited. No credentials are configured in the current workspace, so live provider behavior is not verified.

The emergency voice workspace is isolated from normal LLM requests. Emergency statements are currently handled only by deterministic safety copy, are not interpreted as triage, and remain in component memory. See [emergency assistant safety boundary](emergency-assistant.md).

## Existing safeguards

- Zod validation for requests, provider responses, and evidence IDs.
- The provider receives a bounded server-built context, not unrestricted database access.
- System instructions treat records and conversation history as untrusted data and prohibit diagnosis, prescriptions, and overriding deterministic Phase 3 alerts.
- Provider keys are read server-side; timeouts, error responses, request bounds, process-local throttling, and duplicate in-flight request handling are implemented.

## Remaining requirements

Authentication and astronaut ownership are not implemented. Demo roster checks are not authorization. Conversation history is browser-local. The rate limiter is process-local. No model call is made for the emergency workflow. Do not provide real medical data to this application or enable it operationally until identity, authorization, privacy, clinical governance, provider review, and deployment controls are in place.
