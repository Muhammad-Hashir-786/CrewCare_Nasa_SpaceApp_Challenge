// GET /api/health-records/[userId] — fetch a user's health records

import { NextRequest, NextResponse } from "next/server";
import { getHealthRecords } from "@/lib/db-data";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { prisma, isDatabaseConfigured } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const configured = isDatabaseConfigured();
  if (configured) {
    const astronaut = await prisma.user.findFirst({ where: { id: userId, role: "ASTRONAUT" }, select: { id: true } });
    if (!astronaut) return NextResponse.json({ error: "Astronaut not found" }, { status: 404 });
  } else if (!DEMO_ASTRONAUTS.some((a) => a.id === userId)) {
    return NextResponse.json({ error: "Astronaut not found" }, { status: 404 });
  }

  try {
    const records = await getHealthRecords(userId, 30);
    return NextResponse.json({ records });
  } catch (err) {
    console.error("GET /api/health-records/[userId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
