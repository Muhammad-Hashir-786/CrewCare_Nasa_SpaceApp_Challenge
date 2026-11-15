import type { Astronaut, HealthRecord } from "@/types";
import { APP_TODAY_KEY, formatAppDate } from "@/lib/health/checkin-store";

export type SpaceVitalGroup = "Heart and breathing" | "Body and fluids" | "Mind and environment";
export type SpaceVital = {
  id: string;
  group: SpaceVitalGroup;
  name: string;
  value: string;
  status: string;
  frequency: "Continuous" | "Daily" | "Weekly";
  why: string;
  icon: "heart" | "activity" | "gauge" | "zap" | "scale" | "droplet" | "eye" | "brain" | "radiation" | "cloud";
  lastTested?: string;
};

const novaValues: Omit<SpaceVital, "group">[] = [
  { id: "hrv", name: "Heart rate variability", value: "52 ms", status: "+2 ms vs baseline", frequency: "Continuous", why: "Shows stress and recovery, often before resting heart rate moves.", icon: "heart" },
  { id: "respiratory-rate", name: "Respiratory rate", value: "14 /min", status: "Within baseline", frequency: "Continuous", why: "Early sign of air-quality or breathing problems.", icon: "activity" },
  { id: "orthostatic-response", name: "Orthostatic response", value: "+14 BPM on standing", status: "Within baseline", frequency: "Weekly", why: "Standing tolerance drops in microgravity and matters most on return to gravity.", icon: "gauge", lastTested: APP_TODAY_KEY },
  { id: "exercise", name: "Exercise", value: "96 min today", status: "24 min to target", frequency: "Daily", why: "Exercise is the main countermeasure for bone and muscle loss.", icon: "zap" },
  { id: "weight", name: "Body weight", value: "71.4 kg", status: "−0.6 kg vs baseline", frequency: "Daily", why: "Tracks nutrition and hydration over time.", icon: "scale" },
  { id: "hydration", name: "Hydration", value: "2.3 L intake", status: "Within baseline", frequency: "Daily", why: "Low intake adds to kidney-stone and heart-rate strain.", icon: "droplet" },
  { id: "fluid-vision", name: "Fluid shift and vision", value: "No symptoms · Acuity unchanged", status: "No symptoms", frequency: "Weekly", why: "Fluids move toward the head, and some crew develop eye changes (SANS).", icon: "eye", lastTested: APP_TODAY_KEY },
  { id: "vigilance", name: "Cognitive vigilance", value: "268 ms reaction", status: "Within baseline", frequency: "Weekly", why: "A short reaction test shows fatigue and CO₂ effects before people notice them.", icon: "brain", lastTested: APP_TODAY_KEY },
  { id: "radiation-rate", name: "Radiation dose rate", value: "1.7 mSv/day", status: "Within baseline", frequency: "Continuous", why: "Spikes can signal a solar event and a need to shelter.", icon: "radiation" },
  { id: "radiation-total", name: "Cumulative radiation", value: "312 mSv", status: "41% of mission budget", frequency: "Continuous", why: "Best shown against a mission budget, not as a lone number.", icon: "radiation" },
  { id: "co2", name: "Cabin CO₂", value: "2100 ppm", status: "Within baseline", frequency: "Continuous", why: "Gas can pool around the face in microgravity.", icon: "cloud" },
];

export function getSpaceVitalGroups(astronaut: Astronaut, latest?: HealthRecord | null) {
  const available = astronaut.id === "ast-1";
  return [
    { name: "Heart and breathing", isNew: true, items: [novaValues[0], novaValues[1], novaValues[2]] },
    { name: "Body and fluids", isNew: true, items: [novaValues[3], novaValues[4], novaValues[5], novaValues[6]] },
    { name: "Mind and environment", isNew: true, items: [novaValues[7], novaValues[8], novaValues[9], novaValues[10]] },
  ].map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const valueFromRecord = item.id === "exercise" ? latest?.exerciseMinutes : item.id === "hydration" ? latest?.fluidIntakeLitres : undefined;
      if (!available && valueFromRecord == null) return { ...item, value: "No data", status: "No data" };
      if (valueFromRecord != null) return {
        ...item,
        value: item.id === "exercise" ? `${valueFromRecord} min today` : `${valueFromRecord} L intake`,
        status: item.id === "exercise" ? `${Math.max(0, 120 - valueFromRecord)} min to target` : "Recorded today",
      };
      return item;
    }),
  }));
}

export const MISSION_RADIATION = { rate: "1.7 mSv/day", cumulative: "312 mSv", budget: "41% of mission budget" };
export const spaceVitalLastTested = (value?: string) => value ? formatAppDate(value, { day: "numeric", month: "short", year: "numeric" }) : null;

/** Only the stated current demo readings are populated; earlier days remain unrecorded. */
export function withSpaceDemoReading(records: HealthRecord[], astronautId: string): HealthRecord[] {
  if (astronautId !== "ast-1") return records;
  const latest = records.at(-1);
  if (!latest) return records;
  return records.map((record, index) => index === records.length - 1 ? {
    ...record,
    heartRateVariabilityMs: record.heartRateVariabilityMs ?? 52,
    respiratoryRatePerMin: record.respiratoryRatePerMin ?? 14,
    orthostaticResponseBpm: record.orthostaticResponseBpm ?? 14,
    exerciseMinutes: record.exerciseMinutes ?? 96,
    weightKg: record.weightKg ?? 71.4,
    fluidIntakeLitres: record.fluidIntakeLitres ?? 2.3,
    visionSymptoms: record.visionSymptoms ?? "No symptoms",
    acuityChange: record.acuityChange ?? "Unchanged",
    reactionTimeMs: record.reactionTimeMs ?? 268,
    radiationDoseRateMsvPerDay: record.radiationDoseRateMsvPerDay ?? 1.7,
    cumulativeRadiationMsv: record.cumulativeRadiationMsv ?? 312,
    cabinCo2Ppm: record.cabinCo2Ppm ?? 2100,
  } : record);
}
