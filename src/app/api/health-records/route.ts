// POST /api/health-records — submit a new health check-in

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getHealthRecords, saveHealthRecord, saveAssessment, saveAlert } from "@/lib/db-data";
import { assessHealth, deriveAlerts } from "@/services/health-assessment";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import { isDatabaseConfigured } from "@/lib/db";

const schema = z.object({
  userId: z.string().min(1),
  source: z.enum(["MANUAL_ENTRY", "SIMULATED_SENSOR", "WEARABLE"]).optional(),
  heartRate:     z.number().min(20).max(300).nullable().optional(),
  systolicBP:    z.number().min(50).max(300).nullable().optional(),
  diastolicBP:   z.number().min(30).max(200).nullable().optional(),
  bodyTemp:      z.number().min(30).max(45).nullable().optional(),
  bloodGlucose:  z.number().min(20).max(600).nullable().optional(),
  oxygenSat:     z.number().min(50).max(100).nullable().optional(),
  sleepDuration: z.number().min(0).max(24).nullable().optional(),
  sleepQuality: z.number().min(1).max(5).nullable().optional(),
  stressLevel: z.number().min(1).max(5).nullable().optional(),
  anxietyLevel: z.number().min(1).max(5).nullable().optional(),
  mood:          z.enum(["VERY_LOW", "LOW", "NEUTRAL", "GOOD", "EXCELLENT"]).nullable().optional(),
  fatigue:       z.enum(["EXHAUSTED", "VERY_TIRED", "TIRED", "MODERATE", "REFRESHED"]).nullable().optional(),
  symptomSeverity: z.enum(["MILD", "MODERATE", "SEVERE"]).nullable().optional(),
  symptoms:      z.string().max(2000).nullable().optional(),
  notes:         z.string().max(2000).nullable().optional(),
});

// Verify userId is a known astronaut (server-side, not trusting client)
function isValidAstronautId(userId: string): boolean {
  return DEMO_ASTRONAUTS.some((a) => a.id === userId);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Authorization check
    if (!isDatabaseConfigured() && !isValidAstronautId(data.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (isDatabaseConfigured()) {
      const { prisma } = await import("@/lib/db");
      const astronaut = await prisma.user.findFirst({ where: { id: data.userId, role: "ASTRONAUT" }, select: { id: true } });
      if (!astronaut) return NextResponse.json({ error: "Astronaut not found" }, { status: 404 });
    }

    // Capture prior records before adding this submission so comparison is not self-referential.
    const history = await getHealthRecords(data.userId, 14);

    // Save record
    const { record } = await saveHealthRecord({
      userId: data.userId,
      measurementSource: data.source ?? "MANUAL_ENTRY",
      heartRate: data.heartRate ?? null,
      systolicBP: data.systolicBP ?? null,
      diastolicBP: data.diastolicBP ?? null,
      bodyTemp: data.bodyTemp ?? null,
      bloodGlucose: data.bloodGlucose ?? null,
      oxygenSat: data.oxygenSat ?? null,
      sleepDuration: data.sleepDuration ?? null,
      sleepQuality: data.sleepQuality ?? null,
      stressLevel: data.stressLevel ?? null,
      anxietyLevel: data.anxietyLevel ?? null,
      mood: data.mood ?? null,
      fatigue: data.fatigue ?? null,
      symptomSeverity: data.symptomSeverity ?? null,
      symptoms: data.symptoms ?? null,
      notes: data.notes ?? null,
    });

    // Run assessment
    const result = assessHealth(record, history);

    // Save assessment
    const assessmentId = await saveAssessment({
      userId: data.userId,
      healthRecordId: record.id,
      status: result.status,
      summary: result.summary,
      details: result.details,
      guidance: result.guidance,
      flags: result.flags,
    });

    // Create alerts for significant conditions
    const alertSpecs = deriveAlerts(result, record);
    for (const spec of alertSpecs) {
      await saveAlert({ userId: data.userId, ...spec });
    }

    return NextResponse.json({
      record,
      assessment: {
        id: assessmentId,
        ...result,
      },
    });
  } catch (err) {
    console.error("POST /api/health-records error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
