// Crew Care Seed Script
// ALL DATA IS FICTIONAL AND SIMULATED FOR DEMO PURPOSES ONLY

import { PrismaClient, Role, AlertSeverity, AlertStatus, AssessmentStatus, MoodLevel, FatigueLevel } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding Crew Care demo data (all fictional)...");

  // Mission
  const mission = await prisma.mission.upsert({
    where: { code: "HORIZON-7" },
    update: {},
    create: {
      name: "Horizon VII",
      code: "HORIZON-7",
      description: "Long-duration ISS expedition - 180 day mission. ALL DATA SIMULATED.",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-10-28"),
    },
  });

  // Astronauts
  const astronauts = await Promise.all([
    prisma.user.upsert({
      where: { email: "elena.vasquez@crewcare.demo" },
      update: {},
      create: {
        name: "Dr. Elena Vasquez",
        callsign: "NOVA",
        email: "elena.vasquez@crewcare.demo",
        role: Role.ASTRONAUT,
        rank: "Commander",
        specialty: "Flight Medicine",
        missionId: mission.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "james.okafor@crewcare.demo" },
      update: {},
      create: {
        name: "James Okafor",
        callsign: "ATLAS",
        email: "james.okafor@crewcare.demo",
        role: Role.ASTRONAUT,
        rank: "Mission Specialist",
        specialty: "Systems Engineering",
        missionId: mission.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "yuki.tanaka@crewcare.demo" },
      update: {},
      create: {
        name: "Dr. Yuki Tanaka",
        callsign: "CIPHER",
        email: "yuki.tanaka@crewcare.demo",
        role: Role.ASTRONAUT,
        rank: "Mission Specialist",
        specialty: "Biomedical Research",
        missionId: mission.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "marcos.reyes@crewcare.demo" },
      update: {},
      create: {
        name: "Marcos Reyes",
        callsign: "VECTOR",
        email: "marcos.reyes@crewcare.demo",
        role: Role.ASTRONAUT,
        rank: "Pilot",
        specialty: "Aerospace Engineering",
        missionId: mission.id,
      },
    }),
  ]);

  // Mission Control
  await prisma.user.upsert({
    where: { email: "sarah.chen@crewcare.demo" },
    update: {},
    create: {
      name: "Dr. Sarah Chen",
      callsign: "CONTROL-1",
      email: "sarah.chen@crewcare.demo",
      role: Role.MISSION_CONTROL,
      rank: "Flight Director",
      specialty: "Mission Operations",
    },
  });

  // Health records - 7 days for each astronaut
  const now = new Date();
  const days = 30;

  const healthData: Array<Array<{
    hr: number; sbp: number; dbp: number; temp: number; o2: number; sleep: number; glucose: number;
    mood: MoodLevel; fatigue: FatigueLevel; symptoms?: string;
  }>> = [
    // Elena - mostly normal, one amber day
    [
      { hr: 68, sbp: 118, dbp: 76, temp: 36.7, o2: 98, sleep: 7.5, glucose: 92, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 72, sbp: 120, dbp: 78, temp: 36.8, o2: 98, sleep: 7.0, glucose: 95, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 75, sbp: 122, dbp: 80, temp: 36.9, o2: 97, sleep: 6.5, glucose: 98, mood: MoodLevel.NEUTRAL, fatigue: FatigueLevel.TIRED },
      { hr: 70, sbp: 119, dbp: 77, temp: 36.7, o2: 98, sleep: 7.8, glucose: 90, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 69, sbp: 117, dbp: 75, temp: 36.6, o2: 99, sleep: 8.0, glucose: 88, mood: MoodLevel.EXCELLENT, fatigue: FatigueLevel.REFRESHED },
      { hr: 88, sbp: 138, dbp: 90, temp: 37.1, o2: 96, sleep: 5.5, glucose: 108, mood: MoodLevel.LOW, fatigue: FatigueLevel.VERY_TIRED, symptoms: "Mild headache, slight dizziness" },
      { hr: 71, sbp: 121, dbp: 79, temp: 36.8, o2: 98, sleep: 7.2, glucose: 93, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
    ],
    // James - good throughout
    [
      { hr: 62, sbp: 112, dbp: 70, temp: 36.5, o2: 99, sleep: 8.2, glucose: 85, mood: MoodLevel.EXCELLENT, fatigue: FatigueLevel.REFRESHED },
      { hr: 65, sbp: 114, dbp: 72, temp: 36.6, o2: 99, sleep: 7.9, glucose: 87, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 63, sbp: 110, dbp: 69, temp: 36.4, o2: 99, sleep: 8.0, glucose: 84, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 67, sbp: 116, dbp: 73, temp: 36.6, o2: 98, sleep: 7.5, glucose: 89, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 64, sbp: 113, dbp: 71, temp: 36.5, o2: 99, sleep: 8.1, glucose: 86, mood: MoodLevel.EXCELLENT, fatigue: FatigueLevel.REFRESHED },
      { hr: 66, sbp: 115, dbp: 72, temp: 36.6, o2: 99, sleep: 7.8, glucose: 88, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 63, sbp: 111, dbp: 70, temp: 36.5, o2: 99, sleep: 8.3, glucose: 85, mood: MoodLevel.EXCELLENT, fatigue: FatigueLevel.REFRESHED },
    ],
    // Yuki - concerning trend, amber/red
    [
      { hr: 74, sbp: 124, dbp: 82, temp: 36.8, o2: 97, sleep: 6.8, glucose: 97, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 78, sbp: 128, dbp: 84, temp: 36.9, o2: 97, sleep: 6.2, glucose: 100, mood: MoodLevel.NEUTRAL, fatigue: FatigueLevel.TIRED },
      { hr: 82, sbp: 132, dbp: 86, temp: 37.0, o2: 96, sleep: 5.8, glucose: 104, mood: MoodLevel.NEUTRAL, fatigue: FatigueLevel.TIRED },
      { hr: 86, sbp: 136, dbp: 88, temp: 37.1, o2: 96, sleep: 5.5, glucose: 108, mood: MoodLevel.LOW, fatigue: FatigueLevel.VERY_TIRED, symptoms: "Fatigue, mild nausea" },
      { hr: 90, sbp: 140, dbp: 92, temp: 37.2, o2: 95, sleep: 5.0, glucose: 112, mood: MoodLevel.LOW, fatigue: FatigueLevel.VERY_TIRED, symptoms: "Persistent fatigue, headache, reduced appetite" },
      { hr: 88, sbp: 138, dbp: 90, temp: 37.1, o2: 96, sleep: 5.5, glucose: 109, mood: MoodLevel.NEUTRAL, fatigue: FatigueLevel.TIRED, symptoms: "Mild headache continuing" },
      { hr: 84, sbp: 134, dbp: 87, temp: 37.0, o2: 96, sleep: 6.0, glucose: 105, mood: MoodLevel.NEUTRAL, fatigue: FatigueLevel.TIRED },
    ],
    // Marcos - good with one very good day
    [
      { hr: 70, sbp: 118, dbp: 76, temp: 36.7, o2: 98, sleep: 7.0, glucose: 90, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 68, sbp: 116, dbp: 74, temp: 36.6, o2: 98, sleep: 7.5, glucose: 88, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 71, sbp: 119, dbp: 77, temp: 36.7, o2: 98, sleep: 7.2, glucose: 91, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 65, sbp: 112, dbp: 70, temp: 36.5, o2: 99, sleep: 8.5, glucose: 84, mood: MoodLevel.EXCELLENT, fatigue: FatigueLevel.REFRESHED },
      { hr: 69, sbp: 117, dbp: 75, temp: 36.7, o2: 98, sleep: 7.8, glucose: 89, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 72, sbp: 120, dbp: 78, temp: 36.8, o2: 97, sleep: 7.0, glucose: 92, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
      { hr: 70, sbp: 118, dbp: 76, temp: 36.7, o2: 98, sleep: 7.3, glucose: 90, mood: MoodLevel.GOOD, fatigue: FatigueLevel.MODERATE },
    ],
  ];

  for (let ai = 0; ai < astronauts.length; ai++) {
    const astro = astronauts[ai];
    const data = healthData[ai];
    const existingRows = await prisma.healthRecord.count({ where: { userId: astro.id } });
    if (existingRows > 0) continue;
    for (let d = 0; d < days; d++) {
      const recordDate = new Date(now);
      recordDate.setDate(now.getDate() - (days - 1 - d));
      const row = data[Math.floor((d * data.length) / days)];
      await prisma.healthRecord.create({
        data: {
          userId: astro.id,
          recordedAt: recordDate,
          heartRate: row.hr,
          systolicBP: row.sbp,
          diastolicBP: row.dbp,
          bodyTemp: row.temp,
          oxygenSat: row.o2,
          sleepDuration: row.sleep,
          sleepQuality: Math.max(1, Math.min(5, Math.round(row.sleep / 2))),
          bloodGlucose: row.glucose,
          mood: row.mood,
          fatigue: row.fatigue,
          stressLevel: ai === 2 ? Math.min(5, 1 + d * 0.5) : ai === 1 ? 1.5 : 2,
          anxietyLevel: ai === 2 ? Math.min(5, 1 + d * 0.4) : 1.5,
          symptoms: row.symptoms ?? null,
          symptomSeverity: row.symptoms ? "MILD" : null,
          isMeasured: true,
          isSimulated: true,
        },
      });
    }
  }

  // Assessments
  const yukiId = astronauts[2].id;
  const elenaId = astronauts[0].id;

  const yukiSummary = "Upward trend in BP and heart rate over 5 days. Sleep duration declining.";
  if (!(await prisma.assessment.findFirst({ where: { userId: yukiId, summary: yukiSummary } }))) {
    await prisma.assessment.create({
      data: {
      userId: yukiId,
      status: AssessmentStatus.AMBER,
      summary: yukiSummary,
      details: "Blood pressure has increased from 124/82 to 140/92 mmHg over 5 days. Heart rate trending upward (74→90 BPM). Sleep reduced to under 6 hours for 3 consecutive days. Persistent fatigue and headache reported.",
      guidance: "Monitor closely. Consider medical consultation with Mission Control medical officer. Ensure adequate hydration and rest. Report any worsening symptoms immediately.",
      flags: ["BP_TREND_UP", "SLEEP_BELOW_6H", "FATIGUE_PERSISTENT"],
      },
    });
  }

  const elenaSummary = "Measurements within normal range. One isolated elevated reading on Day 6.";
  if (!(await prisma.assessment.findFirst({ where: { userId: elenaId, summary: elenaSummary } }))) {
    await prisma.assessment.create({
      data: {
      userId: elenaId,
      status: AssessmentStatus.GREEN,
      summary: elenaSummary,
      details: "Overall health indicators stable. Day 6 showed elevated BP (138/90) and heart rate (88 BPM) with reported mild headache and dizziness. Single-day deviation, resolved next day.",
      guidance: "No action required. Continue daily check-ins. If symptoms return, report to medical officer.",
      flags: [],
      },
    });
  }

  // Alerts
  const alertSeed = [
      {
        userId: yukiId,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        title: "Blood Pressure Trend - Attention Required",
        message: "CIPHER's systolic BP has exceeded 135 mmHg for 3 consecutive days. Upward trend detected over 5 days.",
        metric: "systolicBP",
        value: 140,
        threshold: 135,
      },
      {
        userId: yukiId,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: "Sleep Duration Below Threshold",
        message: "CIPHER has reported less than 6 hours of sleep for 3 consecutive days.",
        metric: "sleepDuration",
        value: 5.0,
        threshold: 6.0,
      },
      {
        userId: elenaId,
        severity: AlertSeverity.LOW,
        status: AlertStatus.ACKNOWLEDGED,
        title: "Elevated BP - Single Reading",
        message: "NOVA recorded BP 138/90 mmHg on a single occasion. Resolved next day.",
        metric: "systolicBP",
        value: 138,
        threshold: 135,
        acknowledgedAt: new Date(),
        acknowledgedBy: "Mission Control",
      },
    ];
  for (const alert of alertSeed) {
    const found = await prisma.alert.findFirst({ where: { userId: alert.userId, title: alert.title } });
    if (!found) await prisma.alert.create({ data: alert });
  }

  console.log("✅ Seed complete. Demo data inserted.");
  console.log("   Mission: Horizon VII (fictional)");
  console.log("   Astronauts: Elena Vasquez (NOVA), James Okafor (ATLAS), Yuki Tanaka (CIPHER), Marcos Reyes (VECTOR)");
  console.log("   7 days of health records per astronaut.");
  console.log("   All data is simulated and not medically validated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
