// POST /api/recommendations/[id]/acknowledge

import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, demo: true });
  }

  try {
    const { prisma } = await import("@/lib/db");
    await prisma.healthRecommendation.update({
      where: { id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/recommendations/[id]/acknowledge error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
