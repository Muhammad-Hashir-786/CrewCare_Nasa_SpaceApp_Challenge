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

function modelCandidates(config: ReturnType<typeof providerConfig>) {
  if (config.provider !== "gemini") return [config.model];
  const configuredFallbacks = (process.env.LLM_FALLBACK_MODELS || "gemini-3.7-flash,gemini-3.6-flash")
    .split(",").map((model) => model.trim()).filter(Boolean);
  return [...new Set([config.model, ...configuredFallbacks])].slice(0, 3);
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

function normalizeHomeAnswer(value: unknown, context: unknown, question: string, evidence: EvidenceItem[]): AIHealthResponse {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const general = (context as { scope?: string })?.scope === "general";
  const sanitize = (value: string) => {
    if (!general) return value;
    return value.split(/(?<=[.!?])\s+/).filter((sentence) => !(/\b(?:heart rate|blood pressure|blood glucose|oxygen saturation|oxygen level|body temperature|temperature|sleep duration)\b/i.test(sentence) && /\d/.test(sentence)))
      .join(" ").replace(/\b(?:Dr\.?\s*)?Elena Vasquez\b|\bNOVA\b|\bJames Okafor\b|\bATLAS\b|\b(?:Dr\.?\s*)?Yuki Tanaka\b|\bCIPHER\b|\bMarcos Reyes\b|\bVECTOR\b/gi, "crew member")
      .replace(/\[?rec-[a-z0-9_-]+(?:\s*[–-]\s*\d+)?\]?/gi, "").trim();
  };
  const text = (key: string, fallback: string, max = 1200) => {
    const candidate = sanitize(typeof raw[key] === "string" && raw[key].trim() ? (raw[key] as string).trim() : fallback).slice(0, max);
    return candidate.length >= 3 ? candidate : fallback;
  };
  const list = (key: string) => Array.isArray(raw[key]) ? (raw[key] as unknown[]).filter((item): item is string => typeof item === "string" && item.trim().length > 2).slice(0, 5).map((item) => sanitize(item).slice(0, 300)).filter((item) => item.length >= 3) : [];
  const normalizedQuestion = question.toLowerCase();
  const sharpInjury = /sharp|cut|lacerat|metal|bleed|wound/.test(normalizedQuestion);
  const chestConcern = /chest pain|chest tight|heart attack|shortness of breath|can't breathe|cannot breathe/.test(normalizedQuestion);
  const severeConcern = chestConcern || /uncontrolled bleeding|spurting blood|unconscious|not breathing|seizure/.test(normalizedQuestion);
  const requestedVerdict = raw.verdict;
  const verdict = severeConcern ? "ACT_NOW" : sharpInjury || /pain|ache|hurt|symptom|dizzy|nausea|fever/.test(normalizedQuestion) ? "WATCH" : requestedVerdict === "ALL_CLEAR" || requestedVerdict === "ACT_NOW" ? requestedVerdict : "ALL_CLEAR";
  const suppliedSteps = list("whatToDoNow");
  const steps = suppliedSteps.length ? suppliedSteps : chestConcern
    ? ["Stop activity and sit or rest in a safe position.", "Alert a crewmate and contact mission medical support now.", "Follow your approved mission chest-pain procedure; do not delay to continue chatting.", "If breathing worsens, fainting occurs, or pain spreads, use the approved emergency channel immediately."]
    : sharpInjury
      ? ["Move away from the sharp object and check whether the skin is broken.", "If bleeding, apply steady direct pressure with clean gauze or cloth.", "For a small superficial cut, rinse with clean water and cover it with a clean dressing.", "Contact mission medical support for a deep wound, embedded object, numbness, or bleeding that does not stop."]
      : ["Pause and move to a safe, comfortable position.", "Notice when the concern began and whether it is changing.", "Use only mission-approved health procedures and contact mission medical support if symptoms continue or worry you."];
  const suppliedFlags = list("watchOutFor");
  const flags = suppliedFlags.length ? suppliedFlags : chestConcern
    ? ["Worsening or persistent chest pain, pain spreading to the arm, jaw, back, or neck, shortness of breath, sweating, nausea, faintness, or collapse."]
    : sharpInjury ? ["Bleeding that will not stop, a deep or gaping wound, an embedded object, numbness, or trouble moving the affected area."] : ["Rapid worsening, severe new symptoms, fainting, or difficulty breathing."];
  const emergencyEnd = "contact mission medical support / the flight surgeon.";
  const when = text("whenToGetHelpImmediately", severeConcern ? `Get help immediately using the approved mission emergency procedure; ${emergencyEnd}` : `Get help immediately if symptoms become severe or any red flag appears; ${emergencyEnd}`);
  const ended = when.toLowerCase().endsWith(emergencyEnd) ? when : `${when.replace(/[.\s]+$/, "")}; ${emergencyEnd}`;
  return AIHealthResponseSchema.parse({
    verdict, whatThisCouldMean: text("whatThisCouldMean", text("currentInterpretation", text("summary", "This symptom can have several causes and cannot be identified from this chat alone.", 500), 500), 500),
    whatToDoNow: steps, watchOutFor: flags, whenToGetHelpImmediately: ended,
    title: text("title", "Health guidance", 120), summary: text("summary", "Here are safe next steps based on what you described."),
    currentInterpretation: text("currentInterpretation", text("whatThisCouldMean", "This guidance is general and cannot identify a cause.", 1200), 1200),
    historicalObservations: [], patterns: [], concerns: [], recommendations: [], missingInformation: [],
    confidence: typeof raw.confidence === "number" ? Math.min(1, Math.max(0, raw.confidence)) : 0.5,
    limitations: ["CrewCare is not a doctor and this is not a diagnosis — this is guidance to act on until professional help arrives."],
    evidenceReferences: Array.isArray(raw.evidenceReferences) ? raw.evidenceReferences.filter((item): item is string => typeof item === "string" && evidence.some((entry) => entry.id === item)).slice(0, 12) : [],
  });
}

export async function requestHealthReasoning(context: unknown, evidence: EvidenceItem[]): Promise<{ analysis: AIHealthResponse; provider: string; model: string }> {
  const config = providerConfig();
  const models = modelCandidates(config);
  let response: Response | null = null;
  let selectedModel = config.model;
  let lastFailure: "timeout" | "unavailable" = "unavailable";
  for (const [index, model] of models.entries()) {
    selectedModel = model;
    try {
      response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({
          model, temperature: 0.15, max_tokens: 1600, response_format: { type: "json_object" },
          messages: [
            { role: "system", content: HEALTH_REASONING_SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(JSON.stringify(context)) },
          ],
        }),
      });
      if (response.ok) break;
      if (response.status === 429) throw new AIServiceError("Gemini is receiving too many requests right now. Please wait a moment and try again.", 429, "AI_RATE_LIMITED");
      if (response.status < 500 || index === models.length - 1) {
        throw new AIServiceError("Crew Care couldn't get a response from its AI service just now. Please try again shortly.", 503, "AI_TEMPORARILY_UNAVAILABLE");
      }
      lastFailure = "unavailable";
    } catch (error) {
      if (error instanceof AIServiceError) throw error;
      lastFailure = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "unavailable";
      if (index === models.length - 1) {
        throw new AIServiceError(
          lastFailure === "timeout" ? "Crew Care's AI is taking longer than usual. Your question is safe to retry." : "Crew Care couldn't connect to its AI service. Please try again shortly.",
          503,
          lastFailure === "timeout" ? "AI_TIMEOUT" : "AI_PROVIDER_UNAVAILABLE",
        );
      }
    }
    response = null;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!response?.ok) throw new AIServiceError("Crew Care couldn't get a response from its AI service just now. Please try again shortly.", 503, "AI_TEMPORARILY_UNAVAILABLE");
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new AIServiceError("AI provider returned an unreadable response. No analysis was generated.", 502, "AI_INVALID_RESPONSE"); }
  const text = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new AIServiceError("AI provider returned no structured answer. No analysis was generated.", 502, "AI_INVALID_RESPONSE");
  let decoded: unknown;
  try { decoded = JSON.parse(text); }
  catch { throw new AIServiceError("AI provider returned invalid JSON. No analysis was generated.", 502, "AI_INVALID_JSON"); }
  const normalized = normalizeHomeAnswer(decoded, context, (context as { question?: string })?.question ?? "", evidence);
  return { analysis: validateEvidence(normalized, evidence), provider: config.provider === "openai-compatible" ? new URL(config.baseUrl).hostname : config.provider, model: selectedModel };
}

