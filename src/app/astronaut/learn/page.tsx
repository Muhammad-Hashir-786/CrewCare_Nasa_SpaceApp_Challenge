import { Shield } from "lucide-react";

const risks = [
  ["SANS · Spaceflight Associated Neuro-ocular Syndrome", "Eye and brain changes in space · Watches: vision changes and eye-scan notes · Do: record changes and follow the mission eye-check procedure.", "NASA identifies SANS as a leading spaceflight health risk; it is why the eye-scan slot is included."],
  ["Altered immune system", "Immune response may change · Watches: reported illness, rash, temperature · Do: record changes and follow the medical procedure."],
  ["Sensorimotor / vestibular changes", "Balance and motion can feel different · Watches: dizziness and motion sickness · Do: report symptoms and use the mission procedure."],
  ["Cardiovascular adaptations", "The heart and circulation adapt to spaceflight · Watches: heart rate and blood pressure · Do: repeat unusual readings using the approved method."],
  ["Decompression sickness (the bends)", "Pressure changes can cause decompression sickness · Watches: joint pain, dizziness, breathing trouble, rash · Do: use the emergency guide and mission protocol."],
  ["Host–microorganism interactions", "The relationship between people and microorganisms can change · Watches: reported infection symptoms · Do: log symptoms and follow infection-control procedures."],
  ["Hypoxia", "Too little oxygen · Watches: oxygen reading and breathing symptoms · Do: follow the oxygen and emergency procedure."],
  ["Inadequate food / nutrition", "Food intake or appeal may be inadequate · Watches: appetite and nutrition notes · Do: follow the mission nutrition plan and report difficulty eating."],
  ["Spacewalk injury / fatigue", "Work outside the vehicle can involve injury and fatigue · Watches: injury, fatigue, and recovery notes · Do: report symptoms and follow the spacewalk procedure."],
  ["Reduced fitness", "Bone, muscle, and heart fitness can decline · Watches: activity, fatigue, and cardiovascular readings · Do: follow the planned exercise routine and report changes."],
  ["Bone changes", "Spaceflight can affect bone · Watches: injury and fracture reports · Do: support the injured area and follow mission medical procedures."],
  ["Behavioural / psychiatric changes", "Isolation and mission demands can affect wellbeing · Watches: mood, anxiety, stress, and sleep · Do: check in and ask a crewmate or mission support for help."],
  ["Inadequate teamwork", "Team coordination can be strained · Watches: crew-reported tension and wellbeing notes · Do: raise concerns through the crew support process."],
  ["Inadequate sleep", "Sleep can be disrupted · Watches: sleep hours, rest quality, and light exposure context · Do: protect the planned rest period and record changes."],
  ["Systems support", "Long missions have less immediate support from Earth · Watches: access to procedures and communication · Do: use the onboard procedure and send a clear situation summary when possible."],
  ["Dynamic-load injury", "Loads during mission activity can injure the body · Watches: pain and reported injury · Do: stop the activity if unsafe and follow the mission injury procedure."],
  ["Radiation-induced cancers", "Radiation exposure is linked to long-term cancer risk · Watches: dosimeter readings and exposure notes · Do: use mission shielding procedures and report the reading.", "The Canadian Space Agency says neutron radiation makes up about 30% of ISS radiation and can damage DNA and contribute to cancer risk. Its article does not state a dose limit."],
] as const;

const sources = [
  ["NASA HRP · Human spaceflight hazards", "https://www.nasa.gov/hrp/hazards/"],
  ["NASA HRP · Risks of human spaceflight", "https://www.nasa.gov/hrp/risks/"],
  ["NASA HRP · Ongoing research", "https://www.nasa.gov/hrp/ongoing-hrp-research/"],
  ["NASA Open Science Data Repository (OSDR)", "https://osdr.nasa.gov/"],
  ["Canadian Space Agency · Radi-N2", "https://www.asc-csa.gc.ca/eng/sciences/radi-n2.asp"],
];

function Line({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 10px", padding: "12px 14px", border: "1px solid #203b37", borderRadius: 10, background: "#0b1917", color: "#d7e7e4", fontSize: 14, lineHeight: 1.55 }}>{children}</p>;
}

export default function LearnPage() {
  return <main style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 32 }}>
    <header style={{ marginBottom: 18 }}><span className="section-kicker">EDUCATION · NASA HRP &amp; CSA RESEARCH</span><h1 style={{ margin: 0, font: "700 30px Manrope", color: "#f1f8f7" }}>Data &amp; sources</h1><p style={{ margin: "7px 0 0", color: "#9ab4af", fontSize: 14 }}>Plain-language context for health checks, risks, imaging and mission support.</p></header>
    <div style={{ padding: 14, border: "1px solid #28514b", borderRadius: 11, background: "#0d201e", color: "#bed4cf", display: "flex", gap: 10, marginBottom: 22, fontSize: 13, lineHeight: 1.5 }}><Shield size={17} color="#67ded6" style={{ flex: "0 0 auto" }}/>This guide is for awareness. CrewCare is not a medical device; follow mission procedures and qualified medical guidance.</div>

    <section id="nasa-data-sources" style={{ marginBottom: 30, scrollMarginTop: 24 }}>
      <h2 style={{ font: "700 24px Manrope", color: "#f1f8f7" }}>How NASA data shapes this app</h2>
      <p style={{ color: "#9ab4af", fontSize: 14 }}>These sources shape educational topics and design. No NASA health dataset is imported into this demo, and NASA did not set its illustrative measurement ranges.</p>
      <Line><strong>NASA HRP — 5 Hazards:</strong> Set the five hazard categories used to organize this guide: space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments. Mission context includes Mars about 140 million miles away, a roughly 3-year trip, and Mars gravity at 3/8 of Earth’s. These facts inform hazard and emergency education; they do not set vital-sign thresholds.</Line>
      <Line><strong>NASA HRP — 17 Risks:</strong> HRP risk areas inform the risk topics behind alerts and eye-scan education. SANS is identified by NASA as a leading spaceflight health risk; decompression sickness informs the “bends” emergency topic, and sleep risk informs sleep tracking. The app does not calculate clinical risk from NASA records.</Line>
      <Line><strong>NASA HRP — Ongoing Research:</strong> Research summaries informed educational examples for Tempus Pro telemedicine, the thigh cuff, B-Complex, actigraphy, OCT eye imaging, and Ultrasound-2. These are references; CrewCare does not connect to those instruments or reproduce study results.</Line>
      <Line><strong>NASA OSDR — Open Science Data Repository:</strong> OSDR was reviewed as a research-data source, but no OSDR dataset or measurement was imported. It did not set CrewCare’s measurement ranges or trend values. OSDR is research data, not a live vital-signs feed — CrewCare does not pull live NASA telemetry.</Line>
      <Line><strong>Canadian Space Agency — Radiation:</strong> Radi-N2 says neutron radiation is about 30% of total radiation on the ISS and can damage DNA. This informs radiation education and emergency context; no exposure limit or dose threshold was taken from it.</Line>
      <p style={{ marginTop: 12, color: "#bed4cf", fontSize: 13, lineHeight: 1.55 }}>All displayed ranges and alert thresholds are illustrative CrewCare demo rules. Trends and forecasts use the selected astronaut’s recorded demo check-ins, not NASA data.</p>
    </section>

    <section style={{ marginBottom: 28 }}><h2 style={{ font: "700 24px Manrope", color: "#f1f8f7" }}>Hazards</h2><p style={{ color: "#9ab4af", fontSize: 14 }}>Spaceflight hazards connect and can affect one another.</p>
      <Line>Distance: Mars is about 140 million miles from Earth; a Mars trip is about 3 years, compared with a 3-day lunar trip.</Line>
      <Line>Altered gravity: on Mars, astronauts live in 3/8 of Earth’s gravity for up to two years.</Line>
      <Line>Hazards feed off each other — they do not stand alone.</Line>
      <details style={{ padding: "12px 14px", border: "1px solid #203b37", borderRadius: 10, color: "#b6cbc7", background: "#0b1917" }}><summary style={{ cursor: "pointer", color: "#67ded6", fontWeight: 700 }}>Why distance changes mission care</summary><p style={{ lineHeight: 1.6 }}>On a long mission, less help is available from Earth. CrewCare’s emergency guide puts practical steps on screen while contact with mission support is arranged.</p></details>
    </section>

    <section style={{ marginBottom: 28 }}><h2 style={{ font: "700 24px Manrope", color: "#f1f8f7" }}>Risks · 17 HRP areas</h2><p style={{ color: "#9ab4af", fontSize: 14 }}>Each line names the risk, related check-in signals, and a safe next action. SANS leads because NASA identifies it as a leading spaceflight health risk.</p>
      <div style={{ display: "grid", gap: 8 }}>{risks.map(([name, line, ...detail]) => <details key={name} style={{ padding: "12px 14px", border: "1px solid #203b37", borderRadius: 10, color: "#d7e7e4", background: "#0b1917" }}><summary style={{ cursor: "pointer", fontWeight: 650, lineHeight: 1.5 }}><span style={{ color: "#67ded6" }}>{name}</span> — {line}</summary>{detail.length > 0 && <p style={{ margin: "10px 0 0", color: "#9ab4af", fontSize: 13 }}>{detail[0]}</p>}<a href="#nasa-data-sources" style={{ display: "inline-block", marginTop: 8, color: "#67ded6", fontSize: 12 }}>Source: NASA HRP — 17 Risks · provenance</a></details>)}</div>
    </section>

    <section style={{ marginBottom: 28 }}><h2 style={{ font: "700 24px Manrope", color: "#f1f8f7" }}>Imaging</h2><p style={{ color: "#9ab4af", fontSize: 14 }}>The interface’s image slots are educational examples, not connected instruments.</p>
      <Line><strong>Ultrasound · Ultrasound-2:</strong> NASA uses this on the ISS.</Line>
      <Line><strong>Eye scan · OCT camera / fundoscope:</strong> astronauts image their own eyes in orbit.</Line>
      <Line><strong>X-ray:</strong> imaging slot shown for mission medical context.</Line>
      <Line><strong>Wound photo:</strong> imaging slot for documenting a visible injury.</Line>
    </section>

    <section style={{ marginBottom: 28 }}><h2 style={{ font: "700 24px Manrope", color: "#f1f8f7" }}>What NASA is testing now</h2>
      <Line><strong>Tempus Pro:</strong> a telemedicine device NASA is testing to collect health data and enable near real-time diagnosis.</Line>
      <Line><strong>Thigh Cuff:</strong> a SANS countermeasure.</Line>
      <Line><strong>B-Complex vitamin:</strong> tested against brain / eye (SANS) changes.</Line>
      <Line><strong>Actigraphy wrist device:</strong> measures motion, sleep patterns and light exposure.</Line>
      <Line><strong>Space gardening:</strong> growing fresh vegetables to ease isolation.</Line>
    </section>

    <section style={{ marginBottom: 28 }}><h2 style={{ font: "700 24px Manrope", color: "#f1f8f7" }}>Sleep, wellbeing &amp; nutrition</h2>
      <Line><strong>Sleep tracking:</strong> sleep hours and rest quality are check-in factors; light exposure is another factor measured by actigraphy alongside motion and sleep patterns. This demo does not collect an actigraphy signal.</Line>
      <Line><strong>Mood and mental health:</strong> check-ins can consider isolation, radiation, distance from Earth, sleep loss and team tension. These are context factors, not a diagnosis.</Line>
      <Line><strong>Nutrition:</strong> an enhanced diet helps astronauts adapt to space; low food appeal on long missions is itself a researched risk.</Line>
    </section>

    <section><h2 style={{ font: "700 24px Manrope", color: "#f1f8f7" }}>Sources</h2><Line>HRP uses research to develop methods to protect the health and performance of astronauts in space.</Line><Line><strong>Identify · characterize · mitigate.</strong></Line>
      <blockquote style={{ margin: "10px 0", padding: "12px 15px", borderLeft: "3px solid #67ded6", background: "#0b1917", color: "#d7e7e4", lineHeight: 1.5 }}>“NASA is testing Tempus Pro, a telemedicine device that collects health data and enables near real-time diagnosis.”</blockquote>
      <blockquote style={{ margin: "10px 0", padding: "12px 15px", borderLeft: "3px solid #67ded6", background: "#0b1917", color: "#d7e7e4", lineHeight: 1.5 }}>“SANS is NASA’s leading spaceflight health risk, and astronauts image their own eyes in orbit.”</blockquote>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{sources.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" style={{ color: "#73e1d8", padding: "11px 13px", border: "1px solid #203b37", borderRadius: 9, background: "#0b1917", textDecoration: "none" }}>{label} ↗</a>)}</div>
    </section>
  </main>;
}
