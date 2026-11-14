import { NextResponse } from "next/server";
import { getAllAlerts } from "@/lib/db-data";

export async function GET() {
  try {
    return NextResponse.json({ alerts: await getAllAlerts() });
  } catch {
    return NextResponse.json({ error: "Unable to load alerts" }, { status: 500 });
  }
}
