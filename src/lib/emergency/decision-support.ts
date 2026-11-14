/**
 * CrewCare emergency decision support is deliberately fail-closed. No
 * clinician-approved, mission-specific protocols are currently registered.
 * This module may identify a need for human escalation from explicit answers;
 * it never diagnoses or supplies treatment instructions.
 */
export type EmergencyAnswer = "YES" | "NO" | "UNKNOWN";
export type EmergencyScreen = {
  responsive: EmergencyAnswer | "";
  breathingNormally: EmergencyAnswer | "";
  severeBleeding: EmergencyAnswer | "";
};

export type EmergencyDecision = {
  urgency: "IMMEDIATE_HUMAN_SUPPORT" | "ROUTINE_INTAKE" | "UNDETERMINED";
  escalateNow: boolean;
  reason: string;
  protocolId: null;
  instructions: string[];
};

export function evaluateEmergencyScreen(screen: EmergencyScreen): EmergencyDecision {
  const urgent = screen.responsive === "NO" || screen.breathingNormally === "NO" || screen.severeBleeding === "YES";
  const unknownCritical = screen.responsive !== "YES" && screen.responsive !== "NO"
    || screen.breathingNormally !== "YES" && screen.breathingNormally !== "NO"
    || screen.severeBleeding !== "YES" && screen.severeBleeding !== "NO";
  if (urgent) return {
    urgency: "IMMEDIATE_HUMAN_SUPPORT",
    escalateNow: true,
    reason: "An urgent concern was explicitly reported in the initial safety screen.",
    protocolId: null,
    instructions: ["Stop routine intake. Contact mission medical support now using the approved mission channel.", "Follow only the current, approved mission emergency procedure. This application has not contacted anyone."],
  };
  if (unknownCritical) return {
    urgency: "UNDETERMINED",
    escalateNow: true,
    reason: "A critical safety-screen answer is unknown or unavailable.",
    protocolId: null,
    instructions: ["Contact mission medical support now using the approved mission channel if there is any concern about immediate safety.", "This application cannot determine the situation from missing information and has not contacted anyone."],
  };
  return {
    urgency: "ROUTINE_INTAKE",
    escalateNow: false,
    reason: "No urgent condition was reported in the initial screen; this does not rule out an emergency.",
    protocolId: null,
    instructions: ["Continue gathering information and contact mission medical support for health concerns."],
  };
}

export const EMERGENCY_PROTOCOL_CATALOGUE = {
  version: "0.1.0",
  status: "NOT_APPROVED" as const,
  approvedForCare: false,
  requiredApprovals: ["credentialed clinical reviewer", "mission medical authority"],
  protocols: [] as Array<{ id: string; version: string; status: "APPROVED" | "DRAFT"; approvedAt: string | null; reviewedAt: string | null; instructions: string[] }>,
};

export function getApprovedProtocol(id: string) {
  return EMERGENCY_PROTOCOL_CATALOGUE.protocols.find((protocol) =>
    protocol.id === id && protocol.status === "APPROVED" && protocol.approvedAt && protocol.reviewedAt,
  ) ?? null;
}
