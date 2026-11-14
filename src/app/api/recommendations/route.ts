// GET  /api/recommendations?userId=xxx — fetch active recommendations
// POST /api/recommendations/[id]/acknowledge — handled in separate file

import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ recommendations: [] });
  }

  try {
    const { prisma } = await import("@/lib/db");
    const recs = await prisma.healthRecommendation.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 20,
    });
    return NextResponse.json({ recommendations: recs });
  } catch (err) {
    console.error("GET /api/recommendations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
