// Crew Care - Demo fallback data
// Used when database is not configured.
// ALL DATA IS FICTIONAL AND SIMULATED.

import type { Astronaut, Alert, HealthRecord, MoodLevel, FatigueLevel } from "@/types";
import { APP_NOW, APP_NOW_ISO } from "@/lib/health/checkin-store";

export const DEMO_MISSION = {
  name: "Horizon VII",
  code: "HORIZON-7",
  description: "Long-duration ISS expedition - 180 day mission",
};

const makeRecords = (
  userId: string,
  rows: Array<{
    hr: number; sbp: number; dbp: number; temp: number; o2: number;
    sleep: number; glucose: number; mood: string; fatigue: string; symptoms?: string;
  }>
): HealthRecord[] => {
  const now = APP_NOW;
  const first = rows[0];
  // Fill the 23 days before the hand-authored final week so demo analytics can
  // exercise 30-day baselines, trends, and repeated-deviation explanations.
  const earlier = Array.from({ length: Math.max(0, 30 - rows.length) }, (_, i) => {
    const progress = (i + 1) / Math.max(1, 30 - rows.length);
    const seed = { ...first };
    // Deterministic, small day-to-day variation keeps the illustrative history
    // from looking like repeated copied rows while preserving its overall shape.
    const wobble = ((i * 3 + userId.length * 3) % 7) - 3;
    seed.hr = Math.max(55, Math.min(100, first.hr + wobble));
    seed.sbp = Math.max(100, Math.min(135, first.sbp + wobble));
    seed.dbp = Math.max(60, Math.min(90, first.dbp + Math.round(wobble / 2)));
    seed.temp = Number((first.temp + wobble * 0.03).toFixed(1));
    seed.o2 = Math.max(95, Math.min(100, first.o2 + (wobble % 2)));
    seed.sleep = Number(Math.max(5.5, Math.min(9, first.sleep + wobble * 0.15)).toFixed(1));
    seed.glucose = Math.max(70, Math.min(120, first.glucose + wobble * 2));
    if (userId === "ast-2") seed.sleep = Number((8 - progress * 1.8).toFixed(1));
    if (userId === "ast-3") { seed.sleep = Number((7.8 - progress * 1.2).toFixed(1)); seed.mood = progress > 0.65 ? "LOW" : "GOOD"; }
    if (userId === "ast-4" && i >= 16 && i <= 18) { seed.hr = 96 + (i % 2) * 3; seed.sbp = 142; seed.dbp = 91; seed.sleep = 5.2; seed.symptoms = "Transient palpitations reported"; }
    return seed;
  });
  const history = [...earlier, ...rows];
  return history.map((r, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (history.length - 1 - i));
    return {
      id: `rec-${userId}-${i}`,
      userId,
      recordedAt: d.toISOString(),
      heartRate: r.hr,
      systolicBP: r.sbp,
      diastolicBP: r.dbp,
      bodyTemp: r.temp,
      oxygenSat: r.o2,
      sleepDuration: r.sleep,
      sleepQuality: Math.max(1, Math.min(5, Math.round(r.sleep / 2))),
      bloodGlucose: r.glucose,
      mood: r.mood as MoodLevel,
      fatigue: r.fatigue as FatigueLevel,
      stressLevel: r.mood === "VERY_LOW" || r.mood === "LOW" ? 4 : r.mood === "EXCELLENT" ? 1 : 2,
      anxietyLevel: r.mood === "VERY_LOW" || r.mood === "LOW" ? 3 : 1,
      symptoms: r.symptoms ?? null,
      symptomSeverity: r.symptoms ? "MILD" : null,
      isMeasured: true,
      isSimulated: true,
    };
  });
};

export const DEMO_ASTRONAUTS: Astronaut[] = [
  {
    id: "ast-1",
    name: "Dr. Elena Vasquez",
    callsign: "NOVA",
    rank: "Commander",
    specialty: "Flight Medicine",
    healthRecords: makeRecords("ast-1", [
      { hr: 68, sbp: 118, dbp: 76, temp: 36.7, o2: 98, sleep: 7.5, glucose: 92, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 72, sbp: 120, dbp: 78, temp: 36.8, o2: 98, sleep: 7.0, glucose: 95, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 75, sbp: 122, dbp: 80, temp: 36.9, o2: 97, sleep: 6.5, glucose: 98, mood: "NEUTRAL", fatigue: "TIRED" },
      { hr: 70, sbp: 119, dbp: 77, temp: 36.7, o2: 98, sleep: 7.8, glucose: 90, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 69, sbp: 117, dbp: 75, temp: 36.6, o2: 99, sleep: 8.0, glucose: 88, mood: "EXCELLENT", fatigue: "REFRESHED" },
      { hr: 88, sbp: 138, dbp: 90, temp: 37.1, o2: 96, sleep: 5.5, glucose: 108, mood: "LOW", fatigue: "VERY_TIRED", symptoms: "Mild headache, slight dizziness" },
      { hr: 71, sbp: 121, dbp: 79, temp: 36.8, o2: 98, sleep: 7.2, glucose: 93, mood: "GOOD", fatigue: "MODERATE" },
    ]),
    latestAssessment: {
      id: "asmnt-1",
      userId: "ast-1",
      status: "GREEN",
      summary: "Measurements within normal range. One isolated elevated reading on Day 6.",
      details: "Overall health indicators stable. Day 6 showed elevated BP (138/90) and heart rate (88 BPM) with reported mild headache. Resolved next day.",
      guidance: "No action required. Continue daily check-ins. If symptoms return, report to medical officer.",
      flags: [],
      createdAt: APP_NOW_ISO,
    },
    activeAlerts: [],
  },
  {
    id: "ast-2",
    name: "James Okafor",
    callsign: "ATLAS",
    rank: "Mission Specialist",
    specialty: "Systems Engineering",
    healthRecords: makeRecords("ast-2", [
      { hr: 62, sbp: 112, dbp: 70, temp: 36.5, o2: 99, sleep: 8.2, glucose: 85, mood: "EXCELLENT", fatigue: "REFRESHED" },
      { hr: 65, sbp: 114, dbp: 72, temp: 36.6, o2: 99, sleep: 7.9, glucose: 87, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 63, sbp: 110, dbp: 69, temp: 36.4, o2: 99, sleep: 8.0, glucose: 84, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 67, sbp: 116, dbp: 73, temp: 36.6, o2: 98, sleep: 7.5, glucose: 89, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 64, sbp: 113, dbp: 71, temp: 36.5, o2: 99, sleep: 8.1, glucose: 86, mood: "EXCELLENT", fatigue: "REFRESHED" },
      { hr: 66, sbp: 115, dbp: 72, temp: 36.6, o2: 99, sleep: 7.8, glucose: 88, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 63, sbp: 111, dbp: 70, temp: 36.5, o2: 99, sleep: 8.3, glucose: 85, mood: "EXCELLENT", fatigue: "REFRESHED" },
    ]),
    latestAssessment: {
      id: "asmnt-2",
      userId: "ast-2",
      status: "GREEN",
      summary: "All indicators within normal ranges across all recorded days.",
      details: "Consistent sleep, heart rate, blood pressure, and oxygen saturation. No concerning patterns detected.",
      guidance: "Continue current routines. Maintain daily check-ins.",
      flags: [],
      createdAt: APP_NOW_ISO,
    },
    activeAlerts: [],
  },
  {
    id: "ast-3",
    name: "Dr. Yuki Tanaka",
    callsign: "CIPHER",
    rank: "Mission Specialist",
    specialty: "Biomedical Research",
    healthRecords: makeRecords("ast-3", [
      { hr: 74, sbp: 124, dbp: 82, temp: 36.8, o2: 97, sleep: 6.8, glucose: 97, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 78, sbp: 128, dbp: 84, temp: 36.9, o2: 97, sleep: 6.2, glucose: 100, mood: "NEUTRAL", fatigue: "TIRED" },
      { hr: 82, sbp: 132, dbp: 86, temp: 37.0, o2: 96, sleep: 5.8, glucose: 104, mood: "NEUTRAL", fatigue: "TIRED" },
      { hr: 86, sbp: 136, dbp: 88, temp: 37.1, o2: 96, sleep: 5.5, glucose: 108, mood: "LOW", fatigue: "VERY_TIRED", symptoms: "Fatigue, mild nausea" },
      { hr: 90, sbp: 140, dbp: 92, temp: 37.2, o2: 95, sleep: 5.0, glucose: 112, mood: "LOW", fatigue: "VERY_TIRED", symptoms: "Persistent fatigue, headache, reduced appetite" },
      { hr: 88, sbp: 138, dbp: 90, temp: 37.1, o2: 96, sleep: 5.5, glucose: 109, mood: "NEUTRAL", fatigue: "TIRED", symptoms: "Mild headache continuing" },
      { hr: 84, sbp: 134, dbp: 87, temp: 37.0, o2: 96, sleep: 6.0, glucose: 105, mood: "NEUTRAL", fatigue: "TIRED" },
    ]),
    latestAssessment: {
      id: "asmnt-3",
      userId: "ast-3",
      status: "AMBER",
      summary: "Upward trend in BP and heart rate over 5 days. Sleep duration declining.",
      details: "Blood pressure has increased from 124/82 to 140/92 mmHg over 5 days. Heart rate trending upward (74→90 BPM). Sleep reduced to under 6 hours for 3 consecutive days. Persistent fatigue and headache reported.",
      guidance: "Monitor closely. Consider medical consultation with Mission Control medical officer. Ensure adequate hydration and rest. Report any worsening symptoms immediately via mission protocol.",
      flags: ["BP_TREND_UP", "SLEEP_BELOW_6H", "FATIGUE_PERSISTENT"],
      createdAt: APP_NOW_ISO,
    },
    activeAlerts: [
      {
        id: "alert-1",
        userId: "ast-3",
        severity: "HIGH",
        status: "ACTIVE",
        title: "Blood Pressure Trend — Attention Required",
        message: "CIPHER's systolic BP has exceeded 135 mmHg for 3 consecutive days. Upward trend detected over 5 days.",
        metric: "systolicBP",
        value: 138,
        threshold: 135,
        createdAt: new Date("2026-11-11T12:00:00+05:00").toISOString(),
      },
      {
        id: "alert-2",
        userId: "ast-3",
        severity: "MEDIUM",
        status: "ACTIVE",
        title: "Sleep Duration Below Threshold",
        message: "CIPHER has reported less than 6 hours of sleep for 3 consecutive days.",
        metric: "sleepDuration",
        value: 5.5,
        threshold: 6.0,
        createdAt: new Date("2026-11-11T12:00:00+05:00").toISOString(),
      },
    ],
  },
  {
    id: "ast-4",
    name: "Marcos Reyes",
    callsign: "VECTOR",
    rank: "Pilot",
    specialty: "Aerospace Engineering",
    healthRecords: makeRecords("ast-4", [
      { hr: 70, sbp: 118, dbp: 76, temp: 36.7, o2: 98, sleep: 7.0, glucose: 90, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 68, sbp: 116, dbp: 74, temp: 36.6, o2: 98, sleep: 7.5, glucose: 88, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 71, sbp: 119, dbp: 77, temp: 36.7, o2: 98, sleep: 7.2, glucose: 91, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 65, sbp: 112, dbp: 70, temp: 36.5, o2: 99, sleep: 8.5, glucose: 84, mood: "EXCELLENT", fatigue: "REFRESHED" },
      { hr: 69, sbp: 117, dbp: 75, temp: 36.7, o2: 98, sleep: 7.8, glucose: 89, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 72, sbp: 120, dbp: 78, temp: 36.8, o2: 97, sleep: 7.0, glucose: 92, mood: "GOOD", fatigue: "MODERATE" },
      { hr: 70, sbp: 118, dbp: 76, temp: 36.7, o2: 98, sleep: 7.3, glucose: 90, mood: "GOOD", fatigue: "MODERATE" },
    ]),
    latestAssessment: {
      id: "asmnt-4",
      userId: "ast-4",
      status: "GREEN",
      summary: "Current measurements returned to VECTOR's earlier personal pattern after a short unusual cardiovascular period.",
      details: "The 30-day simulated history contains three elevated cardiovascular check-ins followed by a week of lower readings. This current GREEN assessment reflects only the latest check-in; it does not erase the historical episode.",
      guidance: "Continue check-ins and review the earlier repeated deviations with mission medical support if this were a real mission.",
      flags: [],
      createdAt: APP_NOW_ISO,
    },
    activeAlerts: [],
  },
];

export const DEMO_ALERTS: Alert[] = [
  ...DEMO_ASTRONAUTS.flatMap((a) => a.activeAlerts ?? []),
  {
    id: "alert-3",
    userId: "ast-1",
    severity: "LOW",
    status: "ACKNOWLEDGED",
    title: "Elevated BP — Single Reading",
    message: "NOVA recorded BP 138/90 mmHg on a single occasion. Resolved next day.",
    metric: "systolicBP",
    value: 138,
    threshold: 135,
      acknowledgedAt: APP_NOW_ISO,
    acknowledgedBy: "Mission Control",
      createdAt: new Date("2026-11-13T12:00:00+05:00").toISOString(),
  },
  {
    id: "alert-vector-history",
    userId: "ast-4",
    severity: "HIGH",
    status: "ACKNOWLEDGED",
    title: "Repeated cardiovascular deviation — reviewed",
    message: "Fictional demonstration history: three elevated heart-rate and blood-pressure readings were followed by seven days of readings closer to VECTOR's personal pattern. Historical observation only; current assessment remains separate.",
    metric: "heartRate+systolicBP",
    value: 98,
    acknowledgedAt: new Date("2026-11-08T12:00:00+05:00").toISOString(),
    acknowledgedBy: "Mission Control (Demo)",
    createdAt: new Date("2026-11-02T12:00:00+05:00").toISOString(),
  },
];
