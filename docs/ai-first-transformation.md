# AI-First Experience and Provider Setup

The root route preserves the original centered logo, Astronaut Portal and Mission Control cards, and disclaimer. A compact, single-row Crew Care AI search with microphone and send controls sits between the identity and portal choices. Voice input is optional and fills the editable question field. The search sends a free-form question, the selected astronaut, and browser-local updates to the existing Phase 5 assistant endpoint rather than creating a second model integration. The server retrieves bounded health records, deterministic Phase 3 assessment, active alerts, personal baselines, trends, anomalies, patterns, forecasts, and evidence identifiers. The page shows the validated AI summary and its evidence when available. The full historical/evidence assistant remains in the astronaut and Mission Control intelligence pages.

The provider call remains server-side and provider-independent across OpenAI-compatible endpoints. Existing `CREWCARE_AI_*` variables remain supported. Preferred variables are:

```env
LLM_PROVIDER=openai-compatible
LLM_API_KEY=your-server-side-key
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
```

Google Gemini can use its OpenAI compatibility endpoint by setting `LLM_PROVIDER=gemini`, a server-only `LLM_API_KEY`, `LLM_MODEL` to a model enabled for the account, and optionally `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`. Gemini documents this compatibility option with provider-specific feature limits; it is not the native Gemini API integration. [Google Gemini OpenAI compatibility documentation](https://ai.google.dev/gemini-api/docs/openai).

The workspace has no provider credential configured, so live model connectivity has not been tested. In that state, the API returns `AI_NOT_CONFIGURED` and the UI displays the setup error instead of a generated or canned answer. Conversation history and recommendation states remain browser-local.

## Safety and access limits

The LLM does not receive direct database access or execute arbitrary tools; the server builds a bounded context before the request, validates the output schema, and checks evidence IDs. This application still has no authenticated user identity or authorization layer, so astronaut context is restricted to the fictional roster. Do not configure real personal/medical data or expose this app operationally until server-side authorization and privacy controls are implemented.
