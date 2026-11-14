import { AIHealthResponseSchema, type AIHealthResponse, type EvidenceItem } from "./ai-types";
import { buildUserPrompt, HEALTH_REASONING_SYSTEM_PROMPT } from "./ai-prompts";

export class AIServiceError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); }
}

function providerConfig() {
  const provider = (process.env.LLM_PROVIDER || "openai-compatible").trim().toLowerCase();
  const apiKey = process.env.LLM_API_KEY || process.env.CREWCARE_AI_API_KEY;
  if (!apiKey) throw new AIServiceError("AI provider is not configured. Set the server-side LLM_API_KEY (or legacy CREWCARE_AI_API_KEY) to enable live analysis.", 503, "AI_NOT_CONFIGURED");
  if (!["openai-compatible", "openai", "gemini"].includes(provider)) throw new AIServiceError("Unsupported LLM_PROVIDER. Use openai-compatible, openai, or gemini.", 503, "AI_PROVIDER_NOT_SUPPORTED");
  const model = process.env.LLM_MODEL || process.env.CREWCARE_AI_MODEL || (provider === "gemini" ? "" : "gpt-4o-mini");
  if (!model) throw new AIServiceError("Set LLM_MODEL to a model supported by the configured Gemini account.", 503, "AI_MODEL_NOT_CONFIGURED");
  return {
    provider,
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL || (provider === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/openai" : process.env.CREWCARE_AI_BASE_URL || "https://api.openai.com/v1")).replace(/\/$/, ""),
    model,
  };
}

function validateEvidence(response: AIHealthResponse, evidence: EvidenceItem[]): AIHealthResponse {
  const valid = new Set(evidence.map((item) => item.id));
  const references = [
    ...response.evidenceReferences,
    ...response.historicalObservations.flatMap((item) => item.evidenceIds),
    ...response.patterns.flatMap((item) => item.evidenceIds),
    ...response.concerns.flatMap((item) => item.evidenceIds),
    ...response.recommendations.flatMap((item) => item.evidenceIds),
  ];
  const invalid = references.filter((id) => !valid.has(id));
  if (invalid.length) throw new AIServiceError("AI returned an evidence reference that was not present in retrieved health data. Please retry the analysis.", 502, "AI_INVALID_EVIDENCE");
  return response;
}

export async function requestHealthReasoning(context: unknown, evidence: EvidenceItem[]): Promise<{ analysis: AIHealthResponse; provider: string; model: string }> {
  const config = providerConfig();
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: config.model, temperature: 0.15, max_tokens: 2500, response_format: { type: "json_object" },
        messages: [
          { role: "system", content: HEALTH_REASONING_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(JSON.stringify(context)) },
        ],
      }),
    });
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new AIServiceError(timedOut ? "AI provider timed out. Try again shortly." : "AI provider could not be reached. Check server configuration and provider availability.", 502, timedOut ? "AI_TIMEOUT" : "AI_PROVIDER_UNAVAILABLE");
  }
  if (!response.ok) {
    const status = response.status === 429 ? 429 : response.status >= 500 ? 502 : 502;
    throw new AIServiceError(response.status === 429 ? "AI provider rate limit reached. Wait briefly before trying again." : `AI provider returned an error (${response.status}). No analysis was generated.`, status, response.status === 429 ? "AI_RATE_LIMITED" : "AI_PROVIDER_ERROR");
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new AIServiceError("AI provider returned an unreadable response. No analysis was generated.", 502, "AI_INVALID_RESPONSE"); }
  const text = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new AIServiceError("AI provider returned no structured answer. No analysis was generated.", 502, "AI_INVALID_RESPONSE");
  let decoded: unknown;
  try { decoded = JSON.parse(text); }
  catch { throw new AIServiceError("AI provider returned invalid JSON. No analysis was generated.", 502, "AI_INVALID_JSON"); }
  const parsed = AIHealthResponseSchema.safeParse(decoded);
  if (!parsed.success) throw new AIServiceError("AI answer did not pass Crew Care's structured response validation. No analysis was generated.", 502, "AI_SCHEMA_INVALID");
  return { analysis: validateEvidence(parsed.data, evidence), provider: config.provider === "openai-compatible" ? new URL(config.baseUrl).hostname : config.provider, model: config.model };
}

