// Crew Care - Server-side database fetching helpers
// Returns the same shapes used by demo-data.ts so components work with either source.
// All data fetched here is for authorised server-side use only.

import { prisma, isDatabaseConfigured } from "@/lib/db";
import type { Alert as DbAlert, AlertSeverity as DbAlertSeverity, Assessment as DbAssessment, AssessmentStatus as DbAssessmentStatus, FatigueLevel as DbFatigueLevel, HealthAssessment as DbHealthAssessment, HealthRecord as DbHealthRecord, MoodLevel as DbMoodLevel } from "@prisma/client";
import { DEMO_ASTRONAUTS, DEMO_ALERTS } from "@/lib/demo-data";
import type { Astronaut, Alert, Assessment, HealthRecord } from "@/types";

// Fetch all astronauts with their latest records + assessments + active alerts
export async function getAstronauts(): Promise<Astronaut[]> {
  if (!isDatabaseConfigured()) return DEMO_ASTRONAUTS.map((a) => ({ ...a, isSimulated: true }));
  try {
    const users = await prisma.user.findMany({
      where: { role: "ASTRONAUT" },
      orderBy: { callsign: "asc" },
      include: {
        healthRecords: { orderBy: { recordedAt: "desc" }, take: 180 },
        assessments: { orderBy: { createdAt: "desc" }, take: 1 },
        healthAssessments: { orderBy: { assessedAt: "desc" }, take: 1 },
        alerts: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      callsign: u.callsign,
      rank: u.rank,
      specialty: u.specialty,
      healthRecords: u.healthRecords.reverse().map(mapRecord),
      latestAssessment: u.healthAssessments[0]
        ? mapHealthAssessment(u.healthAssessments[0])
        : u.assessments[0] ? mapAssessment(u.assessments[0]) : null,
      activeAlerts: u.alerts.map(mapAlert),
      isSimulated: false,
    }));
  } catch {
    return DEMO_ASTRONAUTS.map((a) => ({ ...a, isSimulated: true }));
  }
}

// Fetch a single astronaut's full history
export async function getAstronautWithHistory(
  userId: string,
  limit = 30
): Promise<Astronaut | null> {
  if (!isDatabaseConfigured()) {
    const astronaut = DEMO_ASTRONAUTS.find((a) => a.id === userId);
    return astronaut ? { ...astronaut, isSimulated: true } : null;
  }
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, role: "ASTRONAUT" },
      include: {
        healthRecords: { orderBy: { recordedAt: "desc" }, take: limit },
        assessments: { orderBy: { createdAt: "desc" }, take: 1 },
        healthAssessments: { orderBy: { assessedAt: "desc" }, take: 1 },
        alerts: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      callsign: user.callsign,
      rank: user.rank,
      specialty: user.specialty,
      healthRecords: user.healthRecords.reverse().map(mapRecord),
      latestAssessment: user.healthAssessments[0]
        ? mapHealthAssessment(user.healthAssessments[0])
        : user.assessments[0] ? mapAssessment(user.assessments[0]) : null,
      activeAlerts: user.alerts.map(mapAlert),
      isSimulated: false,
    };
  } catch {
    const astronaut = DEMO_ASTRONAUTS.find((a) => a.id === userId);
    return astronaut ? { ...astronaut, isSimulated: true } : null;
  }
}

// Fetch all health records for a user (for history page + analytics)
export async function getHealthRecords(userId: string, limit = 30): Promise<HealthRecord[]> {
  if (!isDatabaseConfigured()) {
    const a = DEMO_ASTRONAUTS.find((x) => x.id === userId);
    return a?.healthRecords ?? [];
  }
  try {
    const records = await prisma.healthRecord.findMany({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
    return records.reverse().map(mapRecord);
  } catch {
    const a = DEMO_ASTRONAUTS.find((x) => x.id === userId);
    return a?.healthRecords ?? [];
  }
}

// Fetch all alerts (for Mission Control)
export async function getAllAlerts(): Promise<Alert[]> {
  if (!isDatabaseConfigured()) return DEMO_ALERTS;
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return alerts.map(mapAlert);
  } catch {
    return DEMO_ALERTS;
  }
}

// Save a new health record and run the assessment
export async function saveHealthRecord(data: {
  userId: string;
  measurementSource?: "MANUAL_ENTRY" | "SIMULATED_SENSOR" | "WEARABLE";
  heartRate?: number | null;
  systolicBP?: number | null;
  diastolicBP?: number | null;
  bodyTemp?: number | null;
  bloodGlucose?: number | null;
  oxygenSat?: number | null;
  sleepDuration?: number | null;
  sleepQuality?: number | null;
  mood?: DbMoodLevel | null;
  fatigue?: DbFatigueLevel | null;
  stressLevel?: number | null;
  anxietyLevel?: number | null;
  symptomSeverity?: string | null;
  symptoms?: string | null;
  notes?: string | null;
}): Promise<{ record: HealthRecord; assessmentId: string | null }> {
  if (!isDatabaseConfigured()) {
    // Return a synthetic record in demo mode
    const record: HealthRecord = {
      id: `demo-${Date.now()}`,
      userId: data.userId,
      recordedAt: new Date().toISOString(),
      heartRate: data.heartRate ?? null,
      systolicBP: data.systolicBP ?? null,
      diastolicBP: data.diastolicBP ?? null,
      bodyTemp: data.bodyTemp ?? null,
      bloodGlucose: data.bloodGlucose ?? null,
      oxygenSat: data.oxygenSat ?? null,
      sleepDuration: data.sleepDuration ?? null,
      sleepQuality: data.sleepQuality ?? null,
      mood: data.mood ?? null,
      fatigue: data.fatigue ?? null,
      stressLevel: data.stressLevel ?? null,
      anxietyLevel: data.anxietyLevel ?? null,
      symptoms: data.symptoms ?? null,
      symptomSeverity: data.symptomSeverity ?? null,
      notes: data.notes ?? null,
      isMeasured: true,
      measurementSource: data.measurementSource ?? "MANUAL_ENTRY",
      isSimulated: true,
    };
    return { record, assessmentId: null };
  }

  const record = await prisma.healthRecord.create({
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
      fatigue: data.fatigue ?? null,
      stressLevel: data.stressLevel ?? null,
      anxietyLevel: data.anxietyLevel ?? null,
      symptoms: data.symptoms ?? null,
      symptomSeverity: data.symptomSeverity ?? null,
      notes: data.notes ?? null,
      isMeasured: true,
    },
  });

  return { record: { ...mapRecord(record), measurementSource: data.measurementSource ?? "MANUAL_ENTRY" }, assessmentId: null };
}

// Save an assessment result
export async function saveAssessment(data: {
  userId: string;
  healthRecordId: string;
  status: DbAssessmentStatus;
  summary: string;
  details: string;
  guidance: string;
  flags: string[];
}): Promise<string> {
  if (!isDatabaseConfigured()) return "demo-assessment";
  const a = await prisma.assessment.create({
    data: {
      userId: data.userId,
      healthRecordId: data.healthRecordId,
      status: data.status,
      summary: data.summary,
      details: data.details,
      guidance: data.guidance,
      flags: data.flags,
    },
  });
  return a.id;
}

// Save an alert
export async function saveAlert(data: {
  userId: string;
  severity: DbAlertSeverity;
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  // Avoid duplicate active alerts for the same metric
  const existing = await prisma.alert.findFirst({
    where: {
      userId: data.userId,
      metric: data.metric ?? null,
      status: "ACTIVE",
      title: data.title,
    },
  });
  if (existing) return;
  await prisma.alert.create({
    data: {
      userId: data.userId,
      severity: data.severity,
      status: "ACTIVE",
      title: data.title,
      message: data.message,
      metric: data.metric ?? null,
      value: data.value ?? null,
      threshold: data.threshold ?? null,
    },
  });
}

// Acknowledge an alert
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await prisma.alert.update({
    where: { id: alertId },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      acknowledgedBy,
    },
  });
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapRecord(r: DbHealthRecord): HealthRecord {
  return {
    id: r.id,
    userId: r.userId,
    recordedAt: r.recordedAt instanceof Date ? r.recordedAt.toISOString() : r.recordedAt,
    heartRate: r.heartRate ?? null,
    systolicBP: r.systolicBP ?? null,
    diastolicBP: r.diastolicBP ?? null,
    bodyTemp: r.bodyTemp ?? null,
    bloodGlucose: r.bloodGlucose ?? null,
    oxygenSat: r.oxygenSat ?? null,
    sleepDuration: r.sleepDuration ?? null,
    sleepQuality: r.sleepQuality ?? null,
    mood: r.mood ?? null,
    fatigue: r.fatigue ?? null,
    stressLevel: r.stressLevel ?? null,
    anxietyLevel: r.anxietyLevel ?? null,
    symptoms: r.symptoms ?? null,
    symptomSeverity: r.symptomSeverity ?? null,
    notes: r.notes ?? null,
    isMeasured: r.isMeasured ?? true,
    isSimulated: r.isSimulated ?? false,
  };
}

function mapAssessment(a: DbAssessment): Assessment {
  return {
    id: a.id,
    userId: a.userId,
    status: a.status,
    summary: a.summary,
    details: a.details ?? null,
    guidance: a.guidance ?? null,
    flags: a.flags ?? [],
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}

function mapHealthAssessment(a: DbHealthAssessment): Assessment {
  return {
    id: a.id,
    userId: a.userId,
    status: a.overallStatus as Assessment["status"],
    summary: a.summary,
    details: a.details ?? null,
    guidance: a.guidance ?? null,
    flags: a.flags ?? [],
    createdAt: a.assessedAt instanceof Date ? a.assessedAt.toISOString() : a.assessedAt,
  };
}

function mapAlert(a: DbAlert): Alert {
  return {
    id: a.id,
    userId: a.userId,
    severity: a.severity,
    status: a.status,
    title: a.title,
    message: a.message,
    metric: a.metric ?? null,
    value: a.value ?? null,
    threshold: a.threshold ?? null,
    acknowledgedAt: a.acknowledgedAt instanceof Date ? a.acknowledgedAt.toISOString() : (a.acknowledgedAt ?? null),
    acknowledgedBy: a.acknowledgedBy ?? null,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}
