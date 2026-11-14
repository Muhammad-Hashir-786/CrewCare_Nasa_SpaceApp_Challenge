import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildAstronautAIContext, buildMissionAIContext } from "@/lib/ai/ai-context-builder";
import { validateDemoStates } from "@/lib/ai/demo-state";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";

const QuerySchema = z.object({ scope: z.enum(["astronaut", "mission"]).default("astronaut"), astronautId: z.string().max(80).optional(), period: z.enum(["24h", "7d", "30d", "90d", "mission"]).default("30d") });
export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid context request" }, { status: 400 });
  const context = parsed.data.scope === "mission"
    ? buildMissionAIContext("Mission context", parsed.data.period)
    : parsed.data.astronautId ? buildAstronautAIContext(parsed.data.astronautId, "Health context", parsed.data.period) : null;
  if (!context) return NextResponse.json({ error: "Astronaut is not part of the demo roster" }, { status: 404 });
  return NextResponse.json({ context });
}

const BodySchema = z.object({ scope: z.enum(["astronaut", "mission"]), astronautId: z.string().max(80).optional(), period: z.enum(["24h", "7d", "30d", "90d", "mission"]).default("30d"), demoStates: z.unknown().optional() });
export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 512_000) return NextResponse.json({ error: "The health context request is too large." }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid context request" }, { status: 400 });
  let demoStates;
  try { demoStates = validateDemoStates(parsed.data.demoStates, new Set(DEMO_ASTRONAUTS.map((item) => item.id))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid demo state" }, { status: 400 }); }
  const context = parsed.data.scope === "mission"
    ? buildMissionAIContext("Mission context", parsed.data.period, demoStates)
    : parsed.data.astronautId ? buildAstronautAIContext(parsed.data.astronautId, "Health context", parsed.data.period, demoStates.find((item) => item.astronautId === parsed.data.astronautId)) : null;
  if (!context) return NextResponse.json({ error: "Astronaut is not part of the demo roster" }, { status: 404 });
  if (parsed.data.scope === "astronaut" && demoStates.some((item) => item.astronautId !== parsed.data.astronautId)) return NextResponse.json({ error: "Astronaut context mismatch" }, { status: 400 });
  return NextResponse.json({ context });
}
