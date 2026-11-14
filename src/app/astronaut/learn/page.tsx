import { Shield } from "lucide-react";

const TOPICS = [
  {
    icon: "🩸",
    title: "Cardiovascular Changes",
    summary: "In microgravity, the heart and blood vessels adapt to the absence of gravity. Fluid shifts toward the head, and the cardiovascular system may decondition over time. Regular monitoring helps track these natural adaptations.",
    tags: ["Heart Rate", "Blood Pressure"],
    color: "rgba(241,140,131,0.1)",
    tc: "#f18c83",
  },
  {
    icon: "🫁",
    title: "Oxygen and Respiration",
    summary: "Oxygen saturation (SpO₂) reflects how well blood carries oxygen. Spaceflight environments require tight atmospheric control. Monitoring SpO₂ supports awareness of respiratory function during the mission.",
    tags: ["SpO₂"],
    color: "rgba(96,217,208,0.1)",
    tc: "#60d9d0",
  },
  {
    icon: "😴",
    title: "Sleep in Space",
    summary: "Without natural day/night cycles, sleep schedules can shift. Poor sleep affects cognitive performance, mood and overall health. Maintaining consistent sleep routines is an important part of crew wellbeing.",
    tags: ["Sleep", "Fatigue"],
    color: "rgba(169,160,244,0.1)",
    tc: "#a9a0f4",
  },
  {
    icon: "🧠",
    title: "Mental Health Awareness",
    summary: "Prolonged isolation, confinement and high workload can affect mood and mental resilience. Recognizing mood changes early enables timely crew support. Daily self-reporting helps track emotional wellbeing.",
    tags: ["Mood", "Fatigue"],
    color: "rgba(237,195,124,0.1)",
    tc: "#edc37c",
  },
  {
    icon: "🌡️",
    title: "Body Temperature",
    summary: "Normal body temperature varies slightly by person and time of day. Deviations may indicate infections or environmental stress. Temperature readings are one indicator among many in a comprehensive health assessment.",
    tags: ["Temperature"],
    color: "rgba(103,222,214,0.1)",
    tc: "var(--teal)",
  },
  {
    icon: "⚠️",
    title: "About This System",
    summary: "Crew Care uses transparent, rule-based logic to flag measurements that exceed configurable thresholds. It does not diagnose illness, provide medical clearance or replace evaluation by a qualified medical professional. All thresholds are demonstration values.",
    tags: ["System Info"],
    color: "rgba(245,158,11,0.08)",
    tc: "#f59e0b",
  },
];

export default function LearnPage() {
  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <span className="section-kicker">EDUCATION</span>
        <h1 style={{ margin: 0, font: "500 24px Manrope" }}>Health Education</h1>
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
          Spaceflight health indicators — informational only
        </p>
      </div>

      <div style={{ padding: "10px 14px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 7, fontSize: 11, color: "#526b68", marginBottom: 24, display: "flex", gap: 8 }}>
        <Shield size={14} strokeWidth={1.7} style={{ color: "#6d9fdf", flexShrink: 0, marginTop: 1 }} />
        This content is for general awareness only. It is not medical advice. For health concerns, follow your mission medical protocol and consult your flight surgeon.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {TOPICS.map((t) => (
          <article key={t.title} className="card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 10, background: t.color, fontSize: 20, marginBottom: 14 }}>
              {t.icon}
            </div>
            <h3 style={{ margin: "0 0 10px", font: "600 14px Manrope", color: "#edf8f8" }}>{t.title}</h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#779390", lineHeight: 1.65 }}>{t.summary}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {t.tags.map((tag) => (
                <span key={tag} style={{
                  padding: "2px 8px", borderRadius: 4,
                  background: t.color, border: `1px solid ${t.tc}30`,
                  fontSize: 10, color: t.tc,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
