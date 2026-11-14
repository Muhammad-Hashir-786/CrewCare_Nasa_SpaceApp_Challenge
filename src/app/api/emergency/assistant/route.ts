import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { buildAstronautAIContext } from "@/lib/ai/ai-context-builder";
import { validateDemoStates } from "@/lib/ai/demo-state";
import { generateEmergencyReply } from "@/lib/ai/emergency-chat";
import { evaluateEmergencyScreen } from "@/lib/emergency/decision-support";

const ScreenSchema = z.object({
  responsive: z.enum(["YES", "NO", "UNKNOWN"]),
  breathingNormally: z.enum(["YES", "NO", "UNKNOWN"]),
  severeBleeding: z.enum(["YES", "NO", "UNKNOWN"]),
});
const RequestSchema = z.object({
  identity: z.enum(["SELF", "OTHER_KNOWN", "UNABLE_TO_COMMUNICATE", "UNKNOWN"]),
  astronautId: z.string().max(80).optional(),
  screen: ScreenSchema,
  concern: z.string().trim().min(4).max(1200),
  conversationHistory: z.array(z.object({ role: z.enum(["crew", "assistant"]), text: z.string().max(900) })).max(12).default([]),
  demoState: z.unknown().optional(),
}).strict();

const rateLimit = new Map<string, { start: number; count: number }>();

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 200_000) return NextResponse.json({ error: "Emergency intake is too large." }, { status: 413 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local-demo";
  const now = Date.now();
  const bucket = rateLimit.get(ip);
  if (bucket && now - bucket.start < 60_000 && bucket.count >= 6) return NextResponse.json({ error: "Please pause briefly before continuing. If this may be urgent, contact mission medical support directly." }, { status: 429 });
  rateLimit.set(ip, !bucket || now - bucket.start >= 60_000 ? { start: now, count: 1 } : { ...bucket, count: bucket.count + 1 });
  if (rateLimit.size > 1000) for (const [key, value] of rateLimit) if (now - value.start >= 60_000) rateLimit.delete(key);

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a short concern and complete the immediate safety screen first." }, { status: 400 });
  const input = parsed.data;

  // Deterministic safety screening runs before the model; unknown critical answers fail safely.
  const decision = evaluateEmergencyScreen(input.screen);
  if (decision.escalateNow) return NextResponse.json({
    reply: "Stop this chat and contact mission medical support now using the approved mission channel. Follow only the current approved mission emergency procedure. This application has not contacted anyone.",
    nextQuestion: null,
    recommendedAction: "Use the mission-approved emergency procedure and contact mission medical support now.",
    urgency: decision.urgency,
    isSimulated: true,
    modelUsed: false,
  });

  let context: unknown = { recordContext: "Not available. No other person's record was retrieved." };
  let evidenceCatalog: Array<{ id: string; label: string; timestamp: string | null }> = [];
  if ((input.identity === "SELF" || input.identity === "UNABLE_TO_COMMUNICATE") && input.astronautId) {
    if (!DEMO_ASTRONAUTS.some((member) => member.id === input.astronautId)) return NextResponse.json({ error: "Selected profile is unavailable in the fictional roster." }, { status: 404 });
    let demoState;
    try { demoState = validateDemoStates(input.demoState ? [input.demoState] : [], new Set(DEMO_ASTRONAUTS.map((member) => member.id)))[0]; }
    catch { return NextResponse.json({ error: "Selected profile context is invalid." }, { status: 400 }); }
    const aiContext = buildAstronautAIContext(input.astronautId, input.concern, "mission", demoState);
    if (!aiContext) return NextResponse.json({ error: "Selected profile was not found." }, { status: 404 });
    context = aiContext;
    evidenceCatalog = aiContext.evidence.map(({ id, label, timestamp }) => ({ id, label, timestamp }));
  }

  try {
    const reply = await generateEmergencyReply({
      identity: input.identity,
      screen: input.screen,
      currentConcern: input.concern,
      conversationHistory: input.conversationHistory,
      selectedHealthContext: context,
      spaceflightHazards: ["space radiation", "isolation and confinement", "distance from Earth", "altered gravity", "hostile or closed environments"],
    }, evidenceCatalog.map((item) => item.id));
    return NextResponse.json({
      reply: reply.message,
      nextQuestion: reply.nextQuestion,
      evidenceReferences: reply.evidenceIds.map((id) => evidenceCatalog.find((item) => item.id === id)).filter(Boolean),
      recommendedAction: "Contact mission medical support for a health concern. If immediate safety becomes uncertain, use the mission-approved emergency procedure now.",
      urgency: "ROUTINE_INTAKE",
      isSimulated: true,
      modelUsed: true,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "AI_PROVIDER_ERROR";
    const status = code === "AI_NOT_CONFIGURED" || code === "AI_MODEL_NOT_CONFIGURED" ? 503 : code === "AI_RATE_LIMITED" ? 429 : 502;
    return NextResponse.json({ error: "AI follow-up is unavailable. This application has not assessed the symptoms. Contact mission medical support; if immediate safety is uncertain, use the approved mission emergency procedure now.", code }, { status });
  }
}
