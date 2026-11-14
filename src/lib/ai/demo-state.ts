import { z } from "zod";

export const DemoStateSchema = z.object({
  astronautId: z.string().min(1).max(80),
  records: z.array(z.object({
    id: z.string().min(1).max(160), userId: z.string().min(1).max(80), recordedAt: z.string().datetime(),
    heartRate: z.number().nullable().optional(), systolicBP: z.number().nullable().optional(), diastolicBP: z.number().nullable().optional(),
    bodyTemp: z.number().nullable().optional(), bloodGlucose: z.number().nullable().optional(), oxygenSat: z.number().nullable().optional(),
    sleepDuration: z.number().nullable().optional(), sleepQuality: z.number().nullable().optional(), mood: z.enum(["VERY_LOW","LOW","NEUTRAL","GOOD","EXCELLENT"]).nullable().optional(),
    fatigue: z.enum(["EXHAUSTED","VERY_TIRED","TIRED","MODERATE","REFRESHED"]).nullable().optional(), stressLevel: z.number().nullable().optional(), anxietyLevel: z.number().nullable().optional(),
    symptoms: z.string().max(2000).nullable().optional(), symptomSeverity: z.string().max(40).nullable().optional(), notes: z.string().max(2000).nullable().optional(), measurementSource: z.enum(["MANUAL_ENTRY", "SIMULATED_SENSOR", "WEARABLE"]).optional(), isMeasured: z.boolean().default(true), isSimulated: z.boolean().default(true),
  }).strict()).max(180).default([]),
  latestAssessment: z.object({
    id: z.string().min(1).max(160), userId: z.string().min(1).max(80), status: z.enum(["GREEN","AMBER","RED"]),
    summary: z.string().max(1200), details: z.string().max(3000).nullable().optional(), guidance: z.string().max(1600).nullable().optional(),
    flags: z.array(z.string().max(120)).max(40), createdAt: z.string().datetime(),
  }).strict().nullable().optional(),
  activeAlerts: z.array(z.object({
    id: z.string().min(1).max(160), userId: z.string().min(1).max(80), severity: z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]),
    status: z.enum(["ACTIVE","ACKNOWLEDGED","RESOLVED"]), title: z.string().max(300), message: z.string().max(2000),
    metric: z.string().max(120).nullable().optional(), value: z.number().nullable().optional(), threshold: z.number().nullable().optional(), createdAt: z.string().datetime(),
    acknowledgedAt: z.string().datetime().nullable().optional(), acknowledgedBy: z.string().max(160).nullable().optional(),
  }).strict()).max(50).default([]),
}).strict();

export const DemoStatesSchema = z.array(DemoStateSchema).max(4).default([]);
export type DemoState = z.infer<typeof DemoStateSchema>;

export function validateDemoStates(value: unknown, allowedIds: Set<string>): DemoState[] {
  const parsed = DemoStatesSchema.safeParse(value ?? []);
  if (!parsed.success) throw new Error("Invalid simulated mission context");
  for (const state of parsed.data) {
    if (!allowedIds.has(state.astronautId) || state.records.some((record) => record.userId !== state.astronautId) || (state.latestAssessment && state.latestAssessment.userId !== state.astronautId) || state.activeAlerts.some((alert) => alert.userId !== state.astronautId)) {
      throw new Error("Demo health context does not match the selected astronaut.");
    }
  }
  return parsed.data;
}

