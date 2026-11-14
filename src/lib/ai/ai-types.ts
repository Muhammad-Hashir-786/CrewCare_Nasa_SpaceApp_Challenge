import { z } from "zod";

const evidenceList = z.array(z.string().min(1)).min(1).max(12);
export const EvidenceItemSchema = z.object({
  id: z.string(), kind: z.enum(["record", "assessment", "alert", "trend", "baseline", "anomaly", "pattern", "forecast"]),
  label: z.string(), timestamp: z.string().nullable(), detail: z.string(),
});
const insightSchema = z.object({
  title: z.string().min(3).max(120), explanation: z.string().min(8).max(900),
  evidenceIds: evidenceList, confidence: z.number().min(0).max(1),
});
const recommendationSchema = z.object({
  title: z.string().min(3).max(120), description: z.string().min(8).max(900),
  priority: z.enum(["LOW", "MODERATE", "HIGH", "URGENT"]), indicators: z.array(z.string()).max(8),
  evidenceIds: evidenceList, nextStep: z.string().min(4).max(500),
});
export const AIHealthResponseSchema = z.object({
  title: z.string().min(3).max(120), summary: z.string().min(12).max(1200),
  currentInterpretation: z.string().min(8).max(1200),
  historicalObservations: z.array(insightSchema).max(8), patterns: z.array(insightSchema).max(8),
  concerns: z.array(insightSchema).max(8), recommendations: z.array(recommendationSchema).max(8),
  missingInformation: z.array(z.string().max(300)).max(12), confidence: z.number().min(0).max(1),
  limitations: z.array(z.string().max(400)).max(12), evidenceReferences: evidenceList,
});
export type AIHealthResponse = z.infer<typeof AIHealthResponseSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

