// POST /api/alerts/[id]/acknowledge — acknowledge an alert

import { NextRequest, NextResponse } from "next/server";
import { acknowledgeAlert } from "@/lib/db-data";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing alert id" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const by = typeof body.acknowledgedBy === "string" ? body.acknowledgedBy : "Mission Control";
    await acknowledgeAlert(id, by);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/alerts/[id]/acknowledge error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
