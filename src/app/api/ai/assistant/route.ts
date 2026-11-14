import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AIServiceError, requestHealthReasoning } from "@/lib/ai/ai-provider";
import { buildAstronautAIContext, buildMissionAIContext } from "@/lib/ai/ai-context-builder";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { validateDemoStates } from "@/lib/ai/demo-state";

const RequestSchema = z.object({
  scope: z.enum(["astronaut", "mission"]), astronautId: z.string().max(80).optional(),
  question: z.string().trim().min(4).max(600), period: z.enum(["24h", "7d", "30d", "90d", "mission"]).default("30d"),
  conversationHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1000) })).max(8).default([]),
  existingRecommendations: z.array(z.string().max(120)).max(20).default([]),
  demoStates: z.unknown().optional(),
});
const limitByClient = new Map<string, { start: number; count: number }>();
const MAX_REQUESTS_PER_WINDOW = 8;
const WINDOW_MS = 5 * 60_000;
const inFlight = new Map<string, Promise<Awaited<ReturnType<typeof requestHealthReasoning>>>>();

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 512_000) return NextResponse.json({ error: "The assistant context request is too large." }, { status: 413 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local-demo";
  const now = Date.now();
  const bucket = limitByClient.get(ip);
  if (bucket && now - bucket.start < WINDOW_MS && bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json({ error: "Too many AI requests. Please wait a few minutes before trying again.", code: "AI_RATE_LIMITED" }, { status: 429 });
  }
  limitByClient.set(ip, !bucket || now - bucket.start >= WINDOW_MS ? { start: now, count: 1 } : { ...bucket, count: bucket.count + 1 });
  if (limitByClient.size > 1000) for (const [key, value] of limitByClient) if (now - value.start >= WINDOW_MS) limitByClient.delete(key);

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a question between 4 and 600 characters and a supported analysis period." }, { status: 400 });
  const input = parsed.data;
  let demoStates;
  try { demoStates = validateDemoStates(input.demoStates, new Set(DEMO_ASTRONAUTS.map((item) => item.id))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid demo state" }, { status: 400 }); }
  if (input.scope === "astronaut" && demoStates.some((item) => item.astronautId !== input.astronautId)) return NextResponse.json({ error: "Astronaut context mismatch" }, { status: 400 });
  const context = input.scope === "mission"
    ? buildMissionAIContext(input.question, input.period, demoStates)
    : input.astronautId ? buildAstronautAIContext(input.astronautId, input.question, input.period, demoStates.find((item) => item.astronautId === input.astronautId)) : null;
  if (!context) return NextResponse.json({ error: "Astronaut is not part of the demo roster" }, { status: 404 });
  const requestContext = { ...context, conversationHistory: input.conversationHistory, existingRecommendations: input.existingRecommendations };
  const dedupeKey = `${ip}:${input.scope}:${input.astronautId ?? "crew"}:${input.period}:${input.question.toLowerCase()}:${JSON.stringify(input.conversationHistory)}:${JSON.stringify(input.existingRecommendations)}`;
  try {
    let operation = inFlight.get(dedupeKey);
    if (!operation) {
      operation = requestHealthReasoning(requestContext, context.evidence);
      inFlight.set(dedupeKey, operation);
    }
    const result = await operation;
    const subjects = context.subjects;
    const criticalAlerts = subjects.flatMap((member) => member.activeAlerts.filter((alert) => alert.severity === "CRITICAL").map((alert) => ({ ...alert, astronautId: member.id, callsign: member.callsign })));
    return NextResponse.json({ ...result, generatedAt: new Date().toISOString(), scope: input.scope, period: input.period, isSimulated: true, deterministicAssessments: subjects.map((member) => ({ astronautId: member.id, callsign: member.callsign, assessment: member.latestAssessment })), criticalAlerts });
  } catch (error) {
    if (error instanceof AIServiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("POST /api/ai/assistant error:", error);
    return NextResponse.json({ error: "AI analysis failed. No answer was generated.", code: "AI_ANALYSIS_FAILED" }, { status: 502 });
  } finally {
    inFlight.delete(dedupeKey);
  }
}
