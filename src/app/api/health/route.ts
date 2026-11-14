import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/db";

const isLLMConfigured = () => Boolean(process.env.LLM_API_KEY || process.env.CREWCARE_AI_API_KEY);

export async function GET() {
  const databaseConfigured = isDatabaseConfigured();
  if (!databaseConfigured) return NextResponse.json({ status: "demo", database: "not_configured", aiProvider: isLLMConfigured() ? "configured" : "not_configured", simulatedData: true, timestamp: new Date().toISOString() });
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "connected", aiProvider: isLLMConfigured() ? "configured" : "not_configured", simulatedData: false, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable", aiProvider: isLLMConfigured() ? "configured" : "not_configured", simulatedData: false, timestamp: new Date().toISOString() }, { status: 503 });
  }
}
