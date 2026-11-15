export type EmergencyType =
  | "radiation" | "decompression-sickness" | "chest-pain" | "collapsed" | "breathing-trouble" | "vision-change"
  | "heavy-bleeding" | "broken-bone" | "fever-infection" | "toxic-air" | "panic-confusion" | "choking" | "burn" | "other";
export type FirstAidStep = { title: string; instruction: string };

// The order puts the major spaceflight hazards first, ahead of general emergencies.
export const EMERGENCY_TYPES: Array<{ id: EmergencyType; label: string; symbol: string; spaceRisk?: boolean }> = [
  { id: "radiation", label: "Radiation exposure", symbol: "☢", spaceRisk: true },
  { id: "decompression-sickness", label: "Decompression sickness · the bends", symbol: "⇣", spaceRisk: true },
  { id: "chest-pain", label: "Chest pain / heart problem", symbol: "♥", spaceRisk: true },
  { id: "collapsed", label: "Collapsed / not responding · CPR", symbol: "!", spaceRisk: true },
  { id: "breathing-trouble", label: "Severe breathing trouble / low oxygen", symbol: "↗", spaceRisk: true },
  { id: "vision-change", label: "Sudden vision loss / eye change · SANS", symbol: "◉", spaceRisk: true },
  { id: "heavy-bleeding", label: "Heavy bleeding", symbol: "✚" },
  { id: "broken-bone", label: "Fracture · brittle bone", symbol: "⌁", spaceRisk: true },
  { id: "fever-infection", label: "High fever / severe infection", symbol: "°", spaceRisk: true },
  { id: "toxic-air", label: "Toxic air / smoke / bad cabin smell", symbol: "≋", spaceRisk: true },
  { id: "panic-confusion", label: "Panic, confusion or severe distress", symbol: "…", spaceRisk: true },
  { id: "choking", label: "Choking", symbol: "↗" },
  { id: "burn", label: "Burn", symbol: "≈" },
  { id: "other", label: "Unable to identify situation", symbol: "?" },
];

// Only this AHA-listed example item is configured. This is a simulated reference list,
// not an assertion about any real vehicle's medical kit inventory.
export const SAMPLE_MEDICAL_KIT = {
  status: "SIMULATED · inventory not verified for this spacecraft",
  items: [
    { id: "aspirin-81-chewable", name: "Aspirin (acetylsalicylic acid), chewable 81 mg", dose: "Adults with non-traumatic chest pain who pass the allergy, alertness, and swallow checks: 162–324 mg (2–4 × 81 mg tablets). Follow the kit label." },
    { id: "acetaminophen-500", name: "Acetaminophen 500 mg tablets", dose: "Alert adults who can swallow: 500–1000 mg once, then follow the kit label. Skip if a liver problem is known or the person cannot swallow." },
    { id: "ibuprofen-200", name: "Ibuprofen 200 mg tablets", dose: "Alert adults who can swallow, are not bleeding, and are not dehydrated: 200–400 mg with water, then follow the kit label." },
    { id: "diphenhydramine-25", name: "Diphenhydramine 25 mg tablets", dose: "Alert adults who can swallow, for itching or a mild allergic reaction without airway swelling: 25–50 mg, then follow the kit label." },
    { id: "antibiotic-ointment", name: "Antibiotic ointment", dose: "A thin layer on a small, clean surface wound only. Do not use it on deep wounds, large burns, or anything stuck to the skin." },
    { id: "ors", name: "Oral rehydration salts", dose: "Small sips if the person is alert, can swallow, and is not vomiting continuously. Follow the packet label." },
  ],
} as const;

export type EmergencyTestSpec = { id: string; label: string; placeholder: string };
export type KitMedicineAdvice = { name: string; guidance: string };
export type CustomEmergencyPlan = {
  label: string;
  summary: string;
  steps: FirstAidStep[];
  tests: EmergencyTestSpec[];
  medicines: KitMedicineAdvice[];
};

const VITALS_TEST: EmergencyTestSpec = { id: "repeat-reading", label: "Repeat the relevant reading", placeholder: "Enter the re-check result" };

export function medicinesAllowed(medicines: KitMedicineAdvice[], allergies: string[] | null | undefined): KitMedicineAdvice[] {
  const blocked = (allergies ?? []).join(" ").toLowerCase();
  if (!blocked.trim()) return medicines;
  return medicines.filter((item) => {
    const name = item.name.toLowerCase();
    if (name.includes("aspirin") && blocked.includes("aspirin")) return false;
    if (name.includes("ibuprofen") && (blocked.includes("ibuprofen") || blocked.includes("nsaid"))) return false;
    if (name.includes("acetaminophen") && (blocked.includes("acetaminophen") || blocked.includes("paracetamol"))) return false;
    if (name.includes("diphenhydramine") && (blocked.includes("diphenhydramine") || blocked.includes("benadryl"))) return false;
    return true;
  });
}

function kitItem(id: string, guidance: string): KitMedicineAdvice {
  const item = SAMPLE_MEDICAL_KIT.items.find((entry) => entry.id === id);
  return { name: item?.name ?? id, guidance };
}

/** Immediate on-screen plan for a description that does not match a shortcut. AI may replace it. */
export function buildLocalCustomPlan(description: string, allergies?: string[] | null): CustomEmergencyPlan {
  const value = description.toLowerCase();
  const report = description.trim().slice(0, 180);
  let plan: CustomEmergencyPlan;
  if (/headache|head ache|migraine|head pain|head hurts/.test(value)) {
    plan = {
      label: "Headache",
      summary: "Rest, record the headache, and check for danger signs before any kit medicine.",
      steps: [
        { title: "Sit or lie down", instruction: "Help them rest in a quiet spot. Dim bright lights if that is easy, and stay with them." },
        { title: "Note what changed", instruction: `Write down when the headache started and what they reported: "${report}". Note vomiting, vision change, weakness, or confusion.` },
        { title: "Check danger signs", instruction: "A sudden worst-ever headache, new confusion, weakness, trouble speaking, or vision loss needs the urgent steps for that problem and a report to the flight surgeon." },
        { title: "Fluids only if safe", instruction: "If they are alert and not vomiting, offer small sips of water. Do not give anything by mouth if they are drowsy or confused." },
        { title: "Medicine only after checks", instruction: "If they are alert and can swallow, a listed pain tablet may be considered after allergy checks. If unsure, skip medicine and keep watching them." },
      ],
      tests: [
        VITALS_TEST,
        { id: "blood-pressure", label: "Blood pressure", placeholder: "e.g. 118/76 mmHg" },
        { id: "vision-check", label: "Vision check", placeholder: "Same as usual, blurred, or missing" },
      ],
      medicines: [kitItem("acetaminophen-500", "For an alert adult who can swallow and has no acetaminophen problem: one 500–1000 mg dose, then follow the kit label.")],
    };
  } else if (/nause|vomit|throwing up|stomach|diarrh|belly|abdominal/.test(value)) {
    plan = {
      label: "Nausea or stomach upset",
      summary: "Keep them comfortable, replace sips of fluid if they can swallow, and watch for dehydration or bleeding.",
      steps: [
        { title: "Rest upright or on their side", instruction: "If they are vomiting, keep them on their side so they do not choke. Stay with them." },
        { title: "Note the vomit or pain", instruction: "Record when it started, whether there is blood, black stool, severe belly pain, or a swollen hard abdomen." },
        { title: "Small sips if alert", instruction: "If they are alert and not vomiting continuously, give small sips of oral rehydration or water. Stop if vomiting returns." },
        { title: "Do not give solid food yet", instruction: "Wait until vomiting eases. Do not give a pain tablet for severe undiagnosed belly pain." },
        { title: "Watch and report", instruction: "Confusion, fainting, nonstop vomiting, or blood in vomit needs a prompt report to mission medical support while you stay with them." },
      ],
      tests: [
        { id: "temperature", label: "Temperature", placeholder: "Enter temperature in °C" },
        { id: "blood-pressure", label: "Blood pressure", placeholder: "e.g. 118/76 mmHg" },
        { id: "glucose", label: "Blood glucose", placeholder: "Enter blood glucose in mg/dL" },
      ],
      medicines: [kitItem("ors", "Small sips of oral rehydration if they are alert and not vomiting continuously. Follow the packet label.")],
    };
  } else if (/allerg|rash|hives|itch|swelling|swollen/.test(value)) {
    plan = {
      label: "Possible allergic reaction",
      summary: "Move them away from the trigger and watch the airway. Mild itching can use a listed antihistamine; airway swelling cannot wait on a tablet.",
      steps: [
        { title: "Stop the exposure", instruction: "Move them away from the suspected food, material, or chemical if it is safe to do so. Do not send them off alone." },
        { title: "Watch the airway", instruction: "Look for lip or tongue swelling, noisy breathing, trouble swallowing, or a spreading rash. If breathing is getting worse, use the breathing-trouble steps and report immediately." },
        { title: "Keep them sitting up", instruction: "If they are breathing, let them sit in the easiest position. If they collapse or stop breathing normally, start the CPR steps." },
        { title: "Tablet only if the airway is clear", instruction: "For itching or a mild rash in an alert person who can swallow, a listed antihistamine may be used after an allergy check. Do not rely on a tablet if the throat is swelling." },
        { title: "Report what they were exposed to", instruction: "Tell mission medical support what they touched or ate, when the rash or swelling started, and whether breathing changed." },
      ],
      tests: [
        { id: "oxygen", label: "Oxygen saturation", placeholder: "Enter SpO₂ in %" },
        { id: "breathing-check", label: "Breathing check", placeholder: "Easy, noisy, or getting worse" },
      ],
      medicines: [kitItem("diphenhydramine-25", "Only if they are alert, can swallow, and do not have airway swelling: 25–50 mg, then follow the kit label.")],
    };
  } else if (/dizzy|lightheaded|light-headed|vertigo|room spinning/.test(value)) {
    plan = {
      label: "Dizziness",
      summary: "Get them safe and still, then re-check blood pressure, glucose, and oxygen before deciding on fluids.",
      steps: [
        { title: "Sit or lie down now", instruction: "Help them down before they fall. Keep the area clear and stay beside them." },
        { title: "Check responsiveness", instruction: "If they become unresponsive or are not breathing normally, switch to the collapsed steps and start those immediately." },
        { title: "Note associated symptoms", instruction: "Ask about chest pain, bleeding, headache, vomiting, new weakness, or a recent spacewalk. Record when the dizziness started." },
        { title: "Fluids only if alert", instruction: "If they are alert, not vomiting, and not told to restrict fluids, offer small sips of water." },
        { title: "Re-check and report", instruction: "Repeat how they feel after they have been still. Report fainting, chest pain, or weakness to the flight surgeon." },
      ],
      tests: [
        { id: "blood-pressure", label: "Blood pressure", placeholder: "e.g. 118/76 mmHg" },
        { id: "glucose", label: "Blood glucose", placeholder: "Enter blood glucose in mg/dL" },
        { id: "oxygen", label: "Oxygen saturation", placeholder: "Enter SpO₂ in %" },
      ],
      medicines: [kitItem("ors", "Only if they are alert and can swallow: small sips, then follow the packet label. Skip medicine if they might faint again.")],
    };
  } else if (/cut|scrape|wound|lacerat|skin tear/.test(value)) {
    plan = {
      label: "Cut or wound",
      summary: "Control bleeding with pressure, clean a small wound, and cover it. Use ointment only on a minor surface cut.",
      steps: [
        { title: "Press on the bleeding", instruction: "Put on gloves if you have them. Press a clean cloth on the wound and do not keep lifting it to look." },
        { title: "If bleeding is heavy", instruction: "Keep pressure. If blood soaks through or will not stop, switch to the Heavy bleeding steps and keep pressing." },
        { title: "Clean a small wound", instruction: "When bleeding is controlled and the cut is small, rinse with clean water. Do not scrub a deep wound or pull out an embedded object." },
        { title: "Cover it", instruction: "Use a clean dressing. A thin layer of listed antibiotic ointment is only for a small surface cut, not a deep or dirty wound." },
        { title: "Watch and report", instruction: "Note increasing pain, redness, numbness, or bleeding that restarts. Tell mission medical support the location and when it happened." },
      ],
      tests: [
        { id: "bleeding-check", label: "Bleeding re-check", placeholder: "Stopped, oozing, or still heavy" },
        VITALS_TEST,
      ],
      medicines: [kitItem("antibiotic-ointment", "Thin layer on a small clean cut only, after bleeding is controlled. Not for deep wounds or burns.")],
    };
  } else if (/seizure|convuls|fitting|shaking uncontroll/.test(value)) {
    plan = {
      label: "Seizure",
      summary: "Protect them from injury, do not restrain them, and check breathing when the shaking stops.",
      steps: [
        { title: "Keep them safe", instruction: "Move hard objects away. Do not hold them down and do not put anything in the mouth." },
        { title: "Time the shaking", instruction: "Note when it started. Cushion the head with something soft if you can do that without restraining them." },
        { title: "When shaking stops, check breathing", instruction: "Roll them onto their side if they are breathing. If they are not breathing normally, start the CPR steps." },
        { title: "Do not give food, drink, or pills", instruction: "Wait until they are fully awake and can swallow. Stay with them while they recover." },
        { title: "Report the duration", instruction: "Tell the flight surgeon how long it lasted, whether they were injured, and whether it happened before." },
      ],
      tests: [
        { id: "glucose", label: "Blood glucose once they are safe", placeholder: "Enter blood glucose in mg/dL" },
        { id: "oxygen", label: "Oxygen saturation", placeholder: "Enter SpO₂ in %" },
      ],
      medicines: [],
    };
  } else if (/pain|hurt|sore|sprain|strain|ache/.test(value)) {
    plan = {
      label: "Pain",
      summary: "Support the painful area, check circulation, and consider a listed pain tablet only if they are alert and not bleeding.",
      steps: [
        { title: "Make them comfortable", instruction: "Help them rest in the position that eases the pain. Do not force a joint or a limb to move." },
        { title: "Look for injury", instruction: `Check the place they described: "${report}". Look for swelling, a wound, deformity, or bleeding.` },
        { title: "Support, do not straighten", instruction: "If a limb looks deformed or they cannot use it, treat it as a possible fracture: keep it still and use those steps." },
        { title: "Cold pack if it is a strain", instruction: "Wrap a cold pack in cloth for a swollen sprain. Never put ice directly on skin. Skip this if the skin is broken." },
        { title: "Pain tablet only if checks pass", instruction: "If they are alert, can swallow, and are not bleeding, a listed acetaminophen or ibuprofen dose may be used after allergy checks. Otherwise no medicine — keep supporting the area." },
      ],
      tests: [
        VITALS_TEST,
        { id: "pain-check", label: "Pain and circulation re-check", placeholder: "Better, same, or worse; skin color and feeling" },
      ],
      medicines: [
        kitItem("acetaminophen-500", "Alert adult who can swallow: 500–1000 mg once, then the kit label. Prefer this if bleeding is possible."),
        kitItem("ibuprofen-200", "Only if there is no bleeding, they are not dehydrated, and they can swallow: 200–400 mg with water."),
      ],
    };
  } else {
    plan = {
      label: "Reported problem",
      summary: "Start with safety, breathing, and bleeding, then re-check the measurement that matches what they described.",
      steps: [
        { title: "Stay with them", instruction: "Keep the person still and in a safe place. Do not leave them alone while you work out what changed." },
        { title: "Check breathing and response", instruction: "If they are unresponsive or not breathing normally, open the Collapsed steps and start them now." },
        { title: "Look for bleeding or a hazard", instruction: "Check for heavy bleeding, smoke, or a cabin alarm. If you find one, switch to that shortcut and follow it." },
        { title: "Record the report", instruction: `Write the words they used and the time: "${report}". Add anything you can see, not a guessed cause.` },
        { title: "Re-check and report", instruction: "Repeat how they look and feel. Share the description with mission medical support while you keep watching them. Do not give a medicine until the problem is clear and they can swallow." },
      ],
      tests: [
        VITALS_TEST,
        { id: "temperature", label: "Temperature", placeholder: "Enter temperature in °C" },
        { id: "oxygen", label: "Oxygen saturation", placeholder: "Enter SpO₂ in %" },
      ],
      medicines: [],
    };
  }
  return { ...plan, medicines: medicinesAllowed(plan.medicines, allergies) };
}

export function getSpaceRiskNote(type: EmergencyType): string | null {
  switch (type) {
    case "radiation": return "Solar particle events can raise radiation quickly; NASA describes sheltering and onboard dosimeter alerts as protections. This app cannot interpret dose or predict health effects.";
    case "decompression-sickness": return "Spacewalk suits operate at lower pressure than the cabin, so pressure changes can create decompression risk. NASA says suspected symptoms during EVA require a safe, rapid return to the pressurized spacecraft.";
    case "vision-change": return "In microgravity, headward fluid shifts can change eye and brain structures and affect vision. Sudden vision loss needs prompt flight-surgeon assessment; do not assume it is SANS.";
    case "breathing-trouble": return "The spacecraft is a closed environment where breathable air depends on monitored life-support systems; a low-oxygen or air-quality alarm needs the mission procedure.";
    case "toxic-air": return "Contaminants can come from system or payload leaks and materials in a closed cabin; rely on onboard air-quality alarms and designated protective procedures.";
    case "broken-bone": return "Spaceflight can reduce bone strength over time, so an injury may be more consequential. Support the person and report the event; this is not a fracture diagnosis.";
    case "fever-infection": return "A confined spacecraft makes infection-control and mission medical monitoring important. Fever and confusion can also have other causes and need assessment.";
    case "panic-confusion": return "Isolation and confinement plus distance from Earth can complicate support, and confusion may also signal a physical emergency. Keep the person safe and check immediate needs.";
    case "chest-pain": return "Spaceflight changes cardiovascular physiology, and chest pain can have many causes. Treat new chest pain as urgent without trying to diagnose it here.";
    case "collapsed": return "NASA groups distance from Earth and hostile environments among spaceflight hazards. Start immediate first aid while another crew member uses the mission communication procedure.";
    case "heavy-bleeding": return "Distance from Earth can delay outside medical help, so begin direct pressure while another crew member prepares to report the situation.";
    case "choking": return "Distance from Earth is a recognized spaceflight hazard; start the first-aid actions while another crew member reports the emergency.";
    case "burn": return "Distance from Earth is a recognized spaceflight hazard; begin cooling and protecting the area while another crew member reports the injury.";
    case "other": return "When the cause is unclear, focus on immediate safety and observable changes. Do not guess the cause; use the crew's approved emergency procedure.";
  }
}

export function getFirstAidSteps(type: EmergencyType, breathing: "YES" | "NO" | null): FirstAidStep[] {
  switch (type) {
    case "radiation": return [
      { title: "Shelter now", instruction: "Move to the most shielded area named by your spacecraft's solar-particle-event procedure. If the procedure specifies it, use onboard stowage or water as shielding; do not improvise a new shelter." },
      { title: "Read the dosimeter", instruction: "Check the onboard radiation dosimeter / alarm and write down the displayed value and units exactly. Do not interpret the number using this app." },
      { title: "Record the time", instruction: "Note when the alarm or exposure started, the current mission time, and where the crew member was." },
      { title: "Watch for changes", instruction: "Watch for nausea, vomiting, headache, unusual tiredness, or confusion. These symptoms do not measure radiation dose; record when they began." },
      { title: "Pause EVA and report", instruction: "Do not start or continue a spacewalk. If someone is already outside, follow the approved EVA return procedure. Alert mission control with the exact dosimeter value, units, and event time." },
    ];
    case "decompression-sickness": return [
      { title: "End EVA safely", instruction: "If the person is outside the spacecraft, follow the EVA emergency-return procedure and return to the pressurized cabin safely and promptly. Do not attempt another spacewalk." },
      { title: "Keep still and warm", instruction: "Once in a safe pressurized area, have them rest lying flat if comfortable, keep them warm, and avoid exertion." },
      { title: "Use oxygen only per procedure", instruction: "If a medical oxygen system is actually available, use it only as the mission procedure and its training specify. NASA's DCS treatment is mission-specific; do not change cabin or suit pressure yourself." },
      { title: "Record symptoms and time", instruction: "Note when symptoms began and whether there is joint pain, dizziness, breathing trouble, weakness, numbness, confusion, or a skin rash. Monitor breathing and responsiveness." },
      { title: "Keep pressure stable and report", instruction: "Do not expose them to lower pressure again. Recompression requires the mission DCS protocol. Alert mission control / the flight surgeon with the EVA timeline and symptoms." },
    ];
    case "chest-pain": return [
      { title: "Rest comfortably", instruction: "Help them sit or lie in the position that feels easiest. Loosen tight clothing, keep them still and calm, and stay with them." },
      { title: "Check allergy, alertness, and kit", instruction: "Only consider aspirin for an alert adult with non-traumatic chest pain who can chew and swallow, has no known aspirin allergy, and has not been told by a health professional to avoid it. If uncertain, skip it." },
      { title: "Use only a confirmed kit item", instruction: "If every safety check passes and the exact 81 mg chewable aspirin item is physically confirmed in the kit, the adult first-aid reference dose is 162–324 mg (2–4 tablets). Follow the kit label and mission procedure; otherwise no medicine—do the physical steps." },
      { title: "Watch closely", instruction: "Watch breathing and responsiveness. If they collapse or stop breathing normally, switch to the collapsed / not responding steps immediately." },
      { title: "Report while care continues", instruction: "If another crew member is available, have them alert mission control / the flight surgeon while you stay with the person and continue these steps." },
    ];
    case "collapsed": return breathing === "YES" ? [
      { title: "Keep them safe and still", instruction: "Keep them lying flat if safe, loosen tight clothing, and stay with them. Do not give food, drink, or pills." },
      { title: "Keep checking breathing", instruction: "Watch for normal breathing continuously. If breathing becomes absent, irregular, or only gasping, begin chest compressions immediately." },
      { title: "Get the emergency kit", instruction: "Ask another crew member to alert mission control and bring the AED / medical kit. Follow the AED voice prompts if available." },
      { title: "If breathing stops", instruction: "Lay them flat on a firm surface if safe, expose the chest without delaying care, and start CPR: heel of one hand in the centre of the chest, other hand on top; push hard and fast at 100–120 per minute. Count out loud." },
      { title: "Continue and report", instruction: "Continue CPR until they show clear signs of life, you cannot continue, or trained help takes over. Alert mission control / contact the flight surgeon as soon as another crew member can." },
    ] : [
      { title: "Lay flat and check breathing", instruction: "Lay them flat on their back on a firm surface if safe. Open or loosen the shirt enough to see the chest. Check for normal breathing for no more than 10 seconds; gasping is not normal breathing." },
      { title: "If not breathing normally, start CPR now", instruction: "Put the heel of one hand in the centre of the chest, the other hand on top, arms straight. Push hard and fast at 100–120 compressions per minute. Count out loud. If breathing normally, do not do compressions; keep watching them." },
      { title: "Keep the pace", instruction: "Aim for about 2 pushes each second. Use the on-screen 110/min pace cue. Let the chest rise between pushes and keep pauses as short as possible." },
      { title: "Use an AED if available", instruction: "Ask a crewmate to bring the AED and follow its spoken prompts. Do not stop compressions longer than the device requires." },
      { title: "Continue and report", instruction: "Continue CPR until they show clear signs of life, you cannot continue, or trained help takes over. Alert mission control / contact the flight surgeon as soon as another crew member can." },
    ];
    case "breathing-trouble": return [
      { title: "Help them sit up", instruction: "Let them sit upright or in the position that makes breathing easiest. Keep them still, calm, and with a crewmate." },
      { title: "Check breathing and appearance", instruction: "Count breaths for one full minute if it does not delay care. Note severe effort, blue or gray lips/face, confusion, or worsening symptoms." },
      { title: "Use oxygen only if prescribed by mission procedure", instruction: "If the approved medical oxygen system is available, use it only as the onboard instructions and crew training specify. Do not improvise a flow or dose." },
      { title: "Check the cabin alarm", instruction: "If there is a low-oxygen, pressure, smoke, or air-quality alarm, follow that specific life-support emergency procedure and move only by the designated safe route." },
      { title: "Report while staying with them", instruction: "Have another crewmate alert mission control / the flight surgeon. Keep watching consciousness and breathing; if breathing stops normally, start the CPR steps." },
    ];
    case "vision-change": return [
      { title: "Sit or lie down safely", instruction: "Help them settle in a safe position and stay calm. Do not let them move around unassisted if vision is impaired." },
      { title: "Check each eye separately", instruction: "Without pressing on the eyes, ask what changed and when. Cover one eye at a time and note whether vision is blurred, dim, missing, doubled, or distorted." },
      { title: "Check other symptoms", instruction: "Ask about headache, pressure behind the eyes, nausea, weakness, confusion, or pain. Record the start time and whether symptoms are worsening." },
      { title: "Use the eye tool only if available", instruction: "If the mission eye-imaging tool is available and the crew member is stable, take the image using its instructions. Do not rub or press on the eyes." },
      { title: "Report urgently", instruction: "Sudden vision loss or a major change needs prompt flight-surgeon / mission-control assessment. Do not assume it is SANS or wait for an image before reporting." },
    ];
    case "heavy-bleeding": return [
      { title: "Protect yourself", instruction: "If available, put on gloves. Find the bleeding source and press firmly with clean gauze or cloth." },
      { title: "Keep steady pressure", instruction: "Press hard and continuously. Do not lift the cloth to check. If blood comes through, add more cloth on top and keep pressing." },
      { title: "Raise only if safe", instruction: "If the bleeding limb has no suspected fracture and can be raised without worsening pain, raise it while keeping pressure." },
      { title: "Use kit items only as trained", instruction: "If bleeding is life-threatening from an arm or leg and the kit has a tourniquet, use it only according to its label / mission training. Do not loosen it." },
      { title: "Keep pressure and report", instruction: "Keep pressure until bleeding stops or help takes over. Have another crew member alert mission control / the flight surgeon while you continue." },
    ];
    case "broken-bone": return [
      { title: "Do not move or straighten it", instruction: "Keep the person and injured area still in the position found. Do not try to push a bone back or test movement." },
      { title: "Support it gently", instruction: "Use folded cloth or soft padding to support the area where it is. Do not press directly on a wound or obvious deformity." },
      { title: "Cold pack if available", instruction: "Wrap a cold pack in cloth and place it near the injury briefly; never put ice directly on skin. Stop if pain or numbness worsens." },
      { title: "Check for danger signs", instruction: "Heavy bleeding, numbness, pale or blue skin beyond the injury, severe pain, or an open wound needs urgent help. For bleeding, use the heavy-bleeding steps." },
      { title: "No pain medicine is configured", instruction: "No medicine in the sample kit for this — do the physical steps. Do not use an unlisted pill or dose." },
      { title: "Report and stay still", instruction: "Keep them still and warm. Ask another crew member to alert mission control / the flight surgeon." },
    ];
    case "fever-infection": return [
      { title: "Take and record temperature", instruction: "Use the available thermometer as instructed. Write down the reading, unit, time, and how it was measured; do not use this app to diagnose the cause." },
      { title: "Check for danger signs", instruction: "Note rash, breathing difficulty, confusion, fainting, severe weakness, or worsening symptoms. New confusion or breathing trouble is urgent." },
      { title: "Offer fluids only if safe", instruction: "If the person is alert, able to swallow, and not vomiting, offer small sips of clean drinking water. Do not give anything by mouth if they are confused or drowsy." },
      { title: "Reduce spread", instruction: "Keep them with a crewmate and use the mission infection-control / isolation procedure if infection could spread. Do not isolate them in a way that prevents monitoring." },
      { title: "No fever medicine configured", instruction: "No medicine in the sample kit for this — do the physical steps. Do not invent a drug or dose; report the temperature and symptoms." },
      { title: "Report promptly", instruction: "Alert mission control / the flight surgeon with the temperature, time, rash or confusion, and symptom changes." },
    ];
    case "toxic-air": return [
      { title: "Use the cabin alarm procedure", instruction: "Treat a bad smell, smoke, or air-quality alarm as a possible cabin hazard. Do not try to identify the chemical by smell." },
      { title: "Protect and move safely", instruction: "Use only the mission-approved protective mask / PPE. Move by the designated safe route to the specified safe module; keep crew together if possible." },
      { title: "Do not change ventilation yourself", instruction: "Ventilate or isolate a module only if the specific environmental-contingency procedure directs you to do so." },
      { title: "Check people for symptoms", instruction: "Watch for coughing, breathing trouble, headache, dizziness, nausea, or confusion. Move anyone with symptoms away from the suspected source using the approved route." },
      { title: "Report the alarm and readings", instruction: "Tell mission control the alarm, location, time, affected crew, and any cabin monitor readings. Follow the spacecraft's air-quality emergency procedure." },
    ];
    case "panic-confusion": return [
      { title: "Make the immediate area safe", instruction: "Stay with the person, reduce nearby hazards, and keep them seated or lying safely if needed." },
      { title: "Speak calmly and simply", instruction: "Use a calm voice, short sentences, and one instruction at a time. Give them time to respond; do not argue or crowd them." },
      { title: "Keep a crewmate nearby", instruction: "Do not leave them alone. Ask a trusted crewmate to stay while another checks the environment and available health information." },
      { title: "Check for physical danger", instruction: "Check whether they are breathing normally, injured, exposed to smoke/chemical smell, or newly confused. Sudden confusion may have a physical cause and needs prompt assessment." },
      { title: "Report and keep monitoring", instruction: "Alert mission control / the flight surgeon. Note when the change began and any triggers; keep monitoring safety and breathing." },
    ];
    case "choking": return [
      { title: "Check if it is severe", instruction: "If they can cough forcefully or speak, encourage coughing and watch closely. If they cannot speak, breathe, or cough effectively, act now." },
      { title: "Give 5 back blows", instruction: "Lean them forward and give 5 firm blows with the heel of your hand between the shoulder blades." },
      { title: "Give 5 thrusts", instruction: "Give 5 abdominal thrusts. If they are pregnant or you cannot reach around the abdomen, give 5 chest thrusts instead." },
      { title: "Repeat cycles", instruction: "Repeat 5 back blows then 5 thrusts until the object comes out or they become unresponsive. If they become unresponsive, lay them down and start CPR; remove an object only if you can see it." },
      { title: "Report while care continues", instruction: "Have another crew member alert mission control / the flight surgeon while you continue first aid." },
    ];
    case "burn": return [
      { title: "Cool the burn", instruction: "Cool the area with clean, cool running water for at least 10 minutes; 20 minutes is preferred when available. Do not use ice." },
      { title: "Remove tight items", instruction: "Remove jewelry or loose clothing near the burn before swelling starts. Do not pull off anything stuck to the skin." },
      { title: "Cover loosely", instruction: "Cover with a clean, loose, non-fluffy dressing or cloth. Do not pop blisters or apply creams, butter, or ointment." },
      { title: "Watch breathing and size", instruction: "Smoke inhalation, trouble breathing, a large/deep burn, or burns to the face, hands, feet, or genitals need urgent assessment." },
      { title: "Report while cooling", instruction: "Keep the person warm and comfortable while cooling. Have another crew member alert mission control / the flight surgeon." },
    ];
    case "other": return [
      { title: "Make the area safe", instruction: "Avoid any immediate hazard and move to a safe place only if the approved procedure allows. Keep the person still and stay with them." },
      { title: "Check responsiveness and breathing", instruction: "Ask the quick Yes/No questions on this screen. If they are unresponsive or not breathing normally, switch to Collapsed / not responding and begin those steps immediately." },
      { title: "Check for heavy bleeding", instruction: "Look for visible heavy bleeding. If present, select Heavy bleeding and press firmly with a clean cloth; do not delay pressure to identify the cause." },
      { title: "Do not guess or give anything by mouth", instruction: "Describe only what you can see and when it began. Do not give food, drink, or medicine if the person is confused, unconscious, or unable to swallow." },
      { title: "Keep watching and report", instruction: "Watch for changes in breathing, responsiveness, bleeding, or symptoms. Alert mission control / the flight surgeon as soon as the channel allows." },
    ];
  }
}
