// POST /api/assessments — run a full Phase 3 assessment and persist it
// GET  /api/assessments?userId=xxx — fetch assessment history

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAssessment } from "@/lib/health/assessment-engine";
import { validateMeasurements } from "@/lib/health/health-validator";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { DEMO_ASTRONAUTS } from "@/lib/demo-data";
import type { RawMeasurements } from "@/lib/health/assessment-types";

const submitSchema = z.object({
  userId: z.string().min(1),
  source: z.enum(["MANUAL_ENTRY", "SIMULATED_SENSOR", "WEARABLE"]).optional(),
  heartRate:     z.number().min(20).max(300).nullable().optional(),
  systolicBP:    z.number().min(50).max(300).nullable().optional(),
  diastolicBP:   z.number().min(30).max(200).nullable().optional(),
  bodyTemp:      z.number().min(30).max(45).nullable().optional(),
  bloodGlucose:  z.number().min(20).max(600).nullable().optional(),
  oxygenSat:     z.number().min(50).max(100).nullable().optional(),
  sleepDuration: z.number().min(0).max(24).nullable().optional(),
  sleepQuality:  z.number().min(1).max(5).nullable().optional(),
  mood:          z.enum(["VERY_LOW", "LOW", "NEUTRAL", "GOOD", "EXCELLENT"]).nullable().optional(),
  stressLevel:   z.number().min(1).max(5).nullable().optional(),
  fatigueLevel:  z.enum(["EXHAUSTED", "VERY_TIRED", "TIRED", "MODERATE", "REFRESHED"]).nullable().optional(),
  anxietyLevel:  z.number().min(1).max(5).nullable().optional(),
  symptomSeverity: z.enum(["MILD", "MODERATE", "SEVERE"]).nullable().optional(),
  symptoms:      z.string().max(2000).nullable().optional(),
  notes:         z.string().max(2000).nullable().optional(),
});

function isValidAstronautId(userId: string): boolean {
  return DEMO_ASTRONAUTS.some((a) => a.id === userId);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (!isDatabaseConfigured() && !isValidAstronautId(data.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (isDatabaseConfigured()) {
      const user = await prisma.user.findFirst({ where: { id: data.userId, role: "ASTRONAUT" }, select: { id: true } });
      if (!user) return NextResponse.json({ error: "Astronaut not found" }, { status: 404 });
    }

    const raw: RawMeasurements = {
      userId: data.userId,
      recordedAt: new Date().toISOString(),
      source: data.source ?? "MANUAL_ENTRY",
      heartRate: data.heartRate ?? null,
      systolicBP: data.systolicBP ?? null,
      diastolicBP: data.diastolicBP ?? null,
      bodyTemp: data.bodyTemp ?? null,
      bloodGlucose: data.bloodGlucose ?? null,
      oxygenSat: data.oxygenSat ?? null,
      sleepDuration: data.sleepDuration ?? null,
      sleepQuality: data.sleepQuality ?? null,
      mood: data.mood ?? null,
      stressLevel: data.stressLevel ?? null,
      fatigueLevel: data.fatigueLevel ?? null,
      anxietyLevel: data.anxietyLevel ?? null,
      symptoms: data.symptoms ?? null,
      symptomSeverity: data.symptomSeverity ?? null,
      notes: data.notes ?? null,
    };

    // Validate
    const { valid, errors } = validateMeasurements(raw);
    if (!valid) {
      return NextResponse.json({ error: "Validation failed", issues: errors }, { status: 400 });
    }

    // Fetch recent history for trend analysis
    let history: RawMeasurements[] = [];
    if (isDatabaseConfigured()) {
      try {
        const recent = await prisma.healthRecord.findMany({
          where: { userId: data.userId },
          orderBy: { recordedAt: "desc" },
          take: 14,
        });
        history = recent.reverse().map((r) => ({
          userId: r.userId,
          heartRate: r.heartRate ?? null,
          systolicBP: r.systolicBP ?? null,
          diastolicBP: r.diastolicBP ?? null,
          bodyTemp: r.bodyTemp ?? null,
          bloodGlucose: r.bloodGlucose ?? null,
          oxygenSat: r.oxygenSat ?? null,
          sleepDuration: r.sleepDuration ?? null,
          sleepQuality: r.sleepQuality ?? null,
          mood: r.mood ?? null,
          fatigueLevel: r.fatigue ?? null,
          stressLevel: r.stressLevel ?? null,
          anxietyLevel: r.anxietyLevel ?? null,
        }));
      } catch { /* fall through to demo history */ }
    }
    if (history.length === 0) {
      const demoAstro = DEMO_ASTRONAUTS.find((a) => a.id === data.userId);
      history = (demoAstro?.healthRecords ?? []).map((r) => ({
        userId: r.userId,
        heartRate: r.heartRate ?? null,
        systolicBP: r.systolicBP ?? null,
        diastolicBP: r.diastolicBP ?? null,
        bodyTemp: r.bodyTemp ?? null,
        bloodGlucose: r.bloodGlucose ?? null,
        oxygenSat: r.oxygenSat ?? null,
        sleepDuration: r.sleepDuration ?? null,
          sleepQuality: r.sleepQuality ?? null,
        mood: r.mood ?? null,
        fatigueLevel: r.fatigue ?? null,
          stressLevel: r.stressLevel ?? null,
          anxietyLevel: r.anxietyLevel ?? null,
      }));
    }

    // Run the Phase 3 engine
    const result = runAssessment(raw, history);

    // Persist if database is available
    let assessmentId = "demo-" + Date.now();
    let savedRecord: Record<string, unknown> | null = null;
    if (isDatabaseConfigured()) {
      try {
        const persisted = await prisma.$transaction(async (tx) => {
        const ha = await tx.healthAssessment.create({
          data: {
            userId: data.userId,
            overallCategory: result.overallCategory,
            overallStatus: result.overallStatus,
            summary: result.summary,
            details: result.details,
            guidance: result.guidance,
            flags: result.flags,
            hasEmergency: result.hasEmergency,
            dataCompleteness: result.dataCompleteness,
            confidence: result.confidence,
            findings: {
              create: result.findings.map((f) => ({
                indicator: f.indicator,
                category: f.category,
                ruleKey: f.ruleKey,
                value: f.value ?? null,
                unit: f.unit ?? null,
                threshold: f.threshold ?? null,
                explanation: f.explanation,
              })),
            },
            recommendations: {
              create: result.recommendations.map((r) => ({
                userId: data.userId,
                title: r.title,
                description: r.description,
                priority: r.priority,
                indicator: r.indicator ?? null,
                reason: r.reason,
                suggestedAction: r.suggestedAction,
              })),
            },
          },
        });
        // Also save as HealthRecord for backward compatibility
        const record = await tx.healthRecord.create({
          data: {
            userId: data.userId,
            heartRate: data.heartRate ?? null,
            systolicBP: data.systolicBP ?? null,
            diastolicBP: data.diastolicBP ?? null,
            bodyTemp: data.bodyTemp ?? null,
            bloodGlucose: data.bloodGlucose ?? null,
            oxygenSat: data.oxygenSat ?? null,
            sleepDuration: data.sleepDuration ?? null,
            sleepQuality: data.sleepQuality ?? null,
            mood: data.mood ?? null,
            fatigue: data.fatigueLevel ?? null,
            stressLevel: data.stressLevel ?? null,
            anxietyLevel: data.anxietyLevel ?? null,
            symptoms: data.symptoms ?? null,
            symptomSeverity: data.symptomSeverity ?? null,
            notes: data.notes ?? null,
            isMeasured: true,
          },
        });

        const measurementRows = [
          ["heartRate", data.heartRate, "BPM"], ["systolicBP", data.systolicBP, "mmHg"],
          ["diastolicBP", data.diastolicBP, "mmHg"], ["bodyTemp", data.bodyTemp, "°C"],
          ["bloodGlucose", data.bloodGlucose, "mg/dL"], ["oxygenSat", data.oxygenSat, "%"],
          ["sleepDuration", data.sleepDuration, "hours"], ["sleepQuality", data.sleepQuality, "/5"],
          ["stressLevel", data.stressLevel, "/5"], ["anxietyLevel", data.anxietyLevel, "/5"],
        ] as const;
        const measurements = measurementRows.filter(([, value]) => value != null).map(([indicator, value, unit]) => ({
          userId: data.userId,
          healthAssessmentId: ha.id,
          indicator,
          value: value as number,
          unit,
          source: data.source ?? "MANUAL_ENTRY",
        }));
        if (measurements.length) await tx.healthMeasurement.createMany({ data: measurements });

        if (data.mood || data.fatigueLevel || data.sleepDuration != null || data.sleepQuality != null || data.stressLevel != null || data.anxietyLevel != null) {
          const moodScore: Record<string, number> = { VERY_LOW: 1, LOW: 2, NEUTRAL: 3, GOOD: 4, EXCELLENT: 5 };
          await tx.dailyCheckIn.create({
            data: {
              userId: data.userId,
              mood: data.mood ?? null,
              fatigue: data.fatigueLevel ?? null,
              sleepDuration: data.sleepDuration ?? null,
              sleepQuality: data.sleepQuality ?? null,
              stressLevel: data.stressLevel ?? null,
              anxietyLevel: data.anxietyLevel ?? null,
              symptoms: data.symptoms ?? null,
              symptomSeverity: data.symptomSeverity ?? null,
              notes: data.notes ?? null,
              overallFeeling: data.mood ? moodScore[data.mood] : null,
            },
          });
        }
        await tx.activityLog.create({ data: { userId: data.userId, action: "HEALTH_CHECK_IN_SUBMITTED", details: `Assessment ${ha.id}` } });

        // Create alerts for HIGH/CRITICAL findings
        for (const f of result.findings) {
          if (f.category === "CRITICAL" || f.category === "WARNING") {
            const existing = await tx.alert.findFirst({
              where: {
                userId: data.userId,
                metric: f.indicator,
                status: "ACTIVE",
                title: { contains: f.label },
              },
            });
            if (!existing) {
              await tx.alert.create({
                data: {
                  userId: data.userId,
                  severity: f.category === "CRITICAL" ? "CRITICAL" : "HIGH",
                  status: "ACTIVE",
                  title: f.label,
                  message: f.explanation,
                  metric: f.indicator,
                  value: f.value ?? null,
                  threshold: f.threshold ?? null,
                },
              });
            }
          }
        }
        return { assessmentId: ha.id, record };
        });
        assessmentId = persisted.assessmentId;
        savedRecord = persisted.record as unknown as Record<string, unknown>;
      } catch (dbErr) {
        console.error("DB persist error:", dbErr);
        return NextResponse.json({ error: "Assessment could not be saved. Please try again." }, { status: 503 });
      }
    }

    if (!savedRecord) {
      savedRecord = {
        id: assessmentId.replace("demo-", "demo-record-"),
        userId: data.userId,
        recordedAt: raw.recordedAt,
        heartRate: data.heartRate ?? null,
        systolicBP: data.systolicBP ?? null,
        diastolicBP: data.diastolicBP ?? null,
        bodyTemp: data.bodyTemp ?? null,
        bloodGlucose: data.bloodGlucose ?? null,
        oxygenSat: data.oxygenSat ?? null,
        sleepDuration: data.sleepDuration ?? null,
        sleepQuality: data.sleepQuality ?? null,
        mood: data.mood ?? null,
        fatigue: data.fatigueLevel ?? null,
        stressLevel: data.stressLevel ?? null,
        anxietyLevel: data.anxietyLevel ?? null,
        symptoms: data.symptoms ?? null,
        symptomSeverity: data.symptomSeverity ?? null,
        notes: data.notes ?? null,
        isMeasured: true,
        measurementSource: data.source ?? "MANUAL_ENTRY",
      };
    }
    return NextResponse.json({ assessmentId, result, record: { ...savedRecord, measurementSource: data.source ?? "MANUAL_ENTRY" }, isSimulated: !isDatabaseConfigured() });
  } catch (err) {
    console.error("POST /api/assessments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ assessments: [] });
  }

  try {
    const validUser = await prisma.user.findFirst({ where: { id: userId, role: "ASTRONAUT" }, select: { id: true } });
    if (!validUser) return NextResponse.json({ error: "Astronaut not found" }, { status: 404 });
    const assessments = await prisma.healthAssessment.findMany({
      where: { userId },
      orderBy: { assessedAt: "desc" },
      take: 20,
      include: { findings: true, recommendations: true },
    });
    return NextResponse.json({ assessments });
  } catch (err) {
    console.error("GET /api/assessments error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
