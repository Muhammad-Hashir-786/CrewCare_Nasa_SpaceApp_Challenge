import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AIServiceError, requestHealthReasoning } from "@/lib/ai/ai-provider";
import { buildLatestAstronautAIContext, buildMissionAIContext, buildGeneralAIContext } from "@/lib/ai/ai-context-builder";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { validateDemoStates } from "@/lib/ai/demo-state";
import { APP_NOW_ISO } from "@/lib/health/checkin-store";

export const maxDuration = 60;

const RequestSchema = z.object({
  scope: z.enum(["general", "astronaut", "mission"]), astronautId: z.string().max(80).optional(),
  question: z.string().trim().min(4).max(600), period: z.enum(["24h", "7d", "30d", "90d", "mission"]).default("30d"),
  conversationHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) })).max(100).default([]),
  existingRecommendations: z.array(z.string().max(120)).max(20).default([]),
  demoStates: z.unknown().optional(),
});
const limitByClient = new Map<string, { start: number; count: number }>();
const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MS = 5 * 60_000;
const inFlight = new Map<string, Promise<Awaited<ReturnType<typeof requestHealthReasoning>>>>();
const HEALTH_REFERENCES = [
  { id: "ref-nhs-cuts", kind: "reference" as const, label: "NHS · Cuts and grazes", timestamp: null, detail: "For a small cut, control bleeding, rinse with clean water, and cover it. Seek urgent help for severe or uncontrolled bleeding, a deep wound, an embedded object, numbness, or loss of movement.", url: "https://www.nhs.uk/conditions/cuts-and-grazes/" },
  { id: "ref-nhs-chest-pain", kind: "reference" as const, label: "NHS · Chest pain", timestamp: null, detail: "Sudden persistent chest pain, spreading pain, breathlessness, sweating, nausea, or lightheadedness requires emergency assessment.", url: "https://www.nhs.uk/symptoms/chest-pain/" },
  { id: "ref-nhs-stomach-ache", kind: "reference" as const, label: "NHS · Stomach ache", timestamp: null, detail: "Severe sudden abdominal pain, blood in vomit, black or bloody stool, inability to pass urine or stool, or breathing difficulty needs urgent help.", url: "https://www.nhs.uk/symptoms/stomach-ache/" },
  { id: "ref-nasa-flight-surgeons", kind: "reference" as const, label: "NASA · Flight surgeons", timestamp: null, detail: "NASA flight surgeons support astronaut health before, during, and after missions. Mission-approved procedures and flight medical support take priority.", url: "https://www.nasa.gov/directorates/esdmd/hhp/flight-surgeons/" },
];

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) return NextResponse.json({ error: "The assistant context request is too large." }, { status: 413 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local-demo";
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a question between 4 and 600 characters and a supported analysis period." }, { status: 400 });
  const input = parsed.data;
  const now = Date.now();
  const bucketKey = `${ip}:${input.scope}`;
  const bucket = limitByClient.get(bucketKey);
  if (bucket && now - bucket.start < WINDOW_MS && bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - bucket.start)) / 1000));
    return NextResponse.json({ error: "CrewCare AI is busy right now.", code: "AI_RATE_LIMITED", retryAfterSeconds }, { status: 429 });
  }
  if (limitByClient.size > 1000) for (const [key, value] of limitByClient) if (now - value.start >= WINDOW_MS) limitByClient.delete(key);
  let demoStates;
  try { demoStates = input.scope === "general" ? [] : validateDemoStates(input.demoStates, new Set(DEMO_ASTRONAUTS.map((item) => item.id))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid demo state" }, { status: 400 }); }
  if (input.scope === "astronaut" && demoStates.some((item) => item.astronautId !== input.astronautId)) return NextResponse.json({ error: "Astronaut context mismatch" }, { status: 400 });
  const selectedContext = input.scope === "astronaut" && input.astronautId
    ? buildLatestAstronautAIContext(input.astronautId, input.question, demoStates.find((item) => item.astronautId === input.astronautId))
    : null;
  const context = input.scope === "general"
    ? buildGeneralAIContext(input.question)
    : input.scope === "mission"
    ? buildMissionAIContext(input.question, input.period, demoStates)
    : selectedContext?.subjects[0]?.currentMeasurements ? selectedContext : input.scope === "astronaut" ? buildGeneralAIContext(input.question) : null;
  if (!context) return NextResponse.json({ error: "Astronaut is not part of the demo roster" }, { status: 404 });
  const contextWithReferences = { ...context, evidence: [...context.evidence, ...HEALTH_REFERENCES] };
  const requestContext = { ...contextWithReferences, conversationHistory: input.conversationHistory, existingRecommendations: input.existingRecommendations };
  const dedupeKey = `${ip}:${input.scope}:${input.astronautId ?? "crew"}:${input.period}:${input.question.toLowerCase()}:${JSON.stringify(input.conversationHistory)}:${JSON.stringify(input.existingRecommendations)}`;
  try {
    let operation = inFlight.get(dedupeKey);
    if (!operation) {
      operation = requestHealthReasoning(requestContext, contextWithReferences.evidence);
      inFlight.set(dedupeKey, operation);
    }
    const result = await operation;
    const completedAt = Date.now();
    const completedBucket = limitByClient.get(bucketKey);
    limitByClient.set(bucketKey, !completedBucket || completedAt - completedBucket.start >= WINDOW_MS
      ? { start: completedAt, count: 1 }
      : { ...completedBucket, count: completedBucket.count + 1 });
    const subjects = context.subjects;
    const criticalAlerts = input.scope === "general" ? [] : subjects.flatMap((member) => member.activeAlerts.filter((alert) => alert.severity === "CRITICAL").map((alert) => ({ ...alert, astronautId: member.id, callsign: member.callsign })));
    return NextResponse.json({ ...result, generatedAt: APP_NOW_ISO, scope: input.scope, period: input.period, isSimulated: true, deterministicAssessments: subjects.map((member) => ({ astronautId: member.id, callsign: member.callsign, assessment: member.latestAssessment })), criticalAlerts });
  } catch (error) {
    if (error instanceof AIServiceError) return NextResponse.json({ error: error.status === 429 ? "CrewCare AI is busy right now." : "CrewCare AI couldn’t complete that answer. Your question is safe to retry.", code: error.code, ...(error.status === 429 ? { retryAfterSeconds: 15 } : {}) }, { status: error.status });
    console.error("POST /api/ai/assistant error:", error);
    return NextResponse.json({ error: "CrewCare AI couldn’t complete that answer. Your question is safe to retry.", code: "AI_ANALYSIS_FAILED" }, { status: 502 });
  } finally {
    inFlight.delete(dedupeKey);
  }
}
