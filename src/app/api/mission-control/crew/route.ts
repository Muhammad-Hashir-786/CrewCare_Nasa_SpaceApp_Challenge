// GET /api/mission-control/crew — crew health summary for Mission Control

import { NextResponse } from "next/server";
import { DEMO_ASTRONAUTS, DEMO_ALERTS } from "@/lib/demo-data";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    // Return demo data summary
    const crew = DEMO_ASTRONAUTS.map((a) => {
      const latest = (a.healthRecords ?? []).slice(-1)[0];
      return {
        id: a.id,
        name: a.name,
        callsign: a.callsign,
        rank: a.rank,
        specialty: a.specialty,
        overallStatus: a.latestAssessment?.status ?? "GREEN",
        overallCategory:
          a.latestAssessment?.status === "RED" ? "WARNING"
          : a.latestAssessment?.status === "AMBER" ? "ATTENTION"
          : "NORMAL",
        latestHeartRate: latest?.heartRate ?? null,
        latestSystolicBP: latest?.systolicBP ?? null,
        latestDiastolicBP: latest?.diastolicBP ?? null,
        latestOxygenSat: latest?.oxygenSat ?? null,
        latestSleepDuration: latest?.sleepDuration ?? null,
        latestMood: latest?.mood ?? null,
        activeAlertCount: (a.activeAlerts ?? []).filter((x) => x.status === "ACTIVE").length,
        flags: a.latestAssessment?.flags ?? [],
        lastUpdated: latest?.recordedAt ?? null,
        isSimulated: true,
      };
    });

    return NextResponse.json({
      mission: { name: "Horizon VII", code: "HORIZON-7" },
      crew,
      summary: {
        total: crew.length,
        normal: crew.filter((c) => c.overallCategory === "NORMAL").length,
        attention: crew.filter((c) => c.overallCategory === "ATTENTION").length,
        warning: crew.filter((c) => c.overallCategory === "WARNING").length,
        critical: crew.filter((c) => c.overallCategory === "CRITICAL").length,
        activeAlerts: DEMO_ALERTS.filter((a) => a.status === "ACTIVE").length,
      },
      isSimulated: true,
    });
  }

  // DB path
  try {
    const { prisma } = await import("@/lib/db");
    const users = await prisma.user.findMany({
      where: { role: "ASTRONAUT" },
      include: {
        healthRecords: { orderBy: { recordedAt: "desc" }, take: 1 },
        healthAssessments: { orderBy: { assessedAt: "desc" }, take: 1 },
        assessments: { orderBy: { createdAt: "desc" }, take: 1 },
        alerts: { where: { status: "ACTIVE" } },
      },
    });

    const crew = users.map((u) => {
      const latest = u.healthRecords[0];
      const detailedAssessment = u.healthAssessments[0];
      const legacyAssessment = u.assessments[0];
      const status = detailedAssessment?.overallStatus ?? legacyAssessment?.status ?? "GREEN";
      const category = detailedAssessment?.overallCategory ?? (status === "RED" ? "WARNING" : status === "AMBER" ? "ATTENTION" : "NORMAL");
      return {
        id: u.id,
        name: u.name,
        callsign: u.callsign,
        rank: u.rank,
        specialty: u.specialty,
        overallStatus: status,
        overallCategory: category,
        latestHeartRate: latest?.heartRate ?? null,
        latestSystolicBP: latest?.systolicBP ?? null,
        latestDiastolicBP: latest?.diastolicBP ?? null,
        latestOxygenSat: latest?.oxygenSat ?? null,
        latestSleepDuration: latest?.sleepDuration ?? null,
        latestMood: latest?.mood ?? null,
        activeAlertCount: u.alerts.length,
        flags: detailedAssessment?.flags ?? legacyAssessment?.flags ?? [],
        lastUpdated: latest?.recordedAt?.toISOString() ?? null,
        isSimulated: false,
      };
    });

    const mission = await prisma.mission.findFirst({ where: { code: "HORIZON-7" } });

    return NextResponse.json({
      mission: { name: mission?.name ?? "Horizon VII", code: mission?.code ?? "HORIZON-7" },
      crew,
      summary: {
        total: crew.length,
        normal: crew.filter((c) => c.overallCategory === "NORMAL").length,
        attention: crew.filter((c) => c.overallCategory === "ATTENTION").length,
        warning: crew.filter((c) => c.overallCategory === "WARNING").length,
        critical: crew.filter((c) => c.overallCategory === "CRITICAL").length,
        activeAlerts: crew.reduce((sum, c) => sum + c.activeAlertCount, 0),
      },
      isSimulated: false,
    });
  } catch (err) {
    console.error("GET /api/mission-control/crew error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
