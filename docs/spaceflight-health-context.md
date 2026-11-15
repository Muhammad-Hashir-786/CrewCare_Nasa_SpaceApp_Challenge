# Spaceflight health context for CrewCare

This is a research and product-design note, not a clinical protocol. NASA groups human-spaceflight hazards as **RIDGE**: radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments. NASA also notes that the hazards can interact. CrewCare should record mission context and evidence quality alongside symptoms and measurements; it should not infer a disease from a hazard category.

NASA's health and medical-care technical requirements describe a mission-specific, evidence-based probabilistic risk assessment process. The Integrated Medical Model (IMM) combines past mission data, models, and comparable Earth-population data, and depends on mission parameters such as duration, location, and crew characteristics. NASA describes it as a tool for clinical stakeholders, mission planners, and medical-system designers. CrewCare does not contain the IMM, its validated model inputs, or an approved clinical decision protocol, so it must not present its demo thresholds or statistical trends as equivalent.

NASA's medical-condition planning table spans routine concerns and high-consequence emergencies. Examples include sleep disruption, skin/eye injuries, space-motion sickness, respiratory infection, CO₂-related headache, acute radiation syndrome, choking/airway obstruction, decompression sickness, toxic inhalation, and vision loss. This list is useful for designing an intake taxonomy and mission-resource planning. It is not a diagnosis list or a treatment guide.

## Context worth capturing

| NASA hazard | Useful mission context to record | CrewCare boundary |
| --- | --- | --- |
| Space radiation | Mission-approved exposure/dosimeter summaries and relevant event timestamps | Do not calculate medical risk or interpret exposure without an approved model and qualified review. |
| Isolation and confinement | Sleep, workload, mood/stress check-ins, and optional crew support context | Self-reports are not a psychiatric diagnosis. |
| Distance from Earth | Mission phase, communications delay, time to medical consultation/evacuation, onboard capability | Use mission-provided values; never substitute Earth-based emergency assumptions for mission procedures. |
| Gravity fields | Mission phase and gravity environment (microgravity, partial gravity, Earth-normal), transition dates | Do not infer a condition from gravity exposure. |
| Hostile/closed environments | Mission-approved cabin/suit environmental alerts, such as air-quality or pressure events, with timestamps | Environmental sensors and medical sensors are distinct sources; preserve provenance and uncertainty. |

## Emergency context facts used by the prototype

These short facts explain why a spaceflight emergency needs mission-aware action. They are context, not diagnosis, treatment thresholds, or vehicle procedures.

| Context shown in the app | Research basis |
| --- | --- |
| Radiation exposure: solar-particle-event sheltering and dosimeter readings matter; never infer a dose or health effect from symptoms. | NASA crew-systems material describes sheltering during solar particle events and onboard radiation monitoring. [Crew Systems](https://www.nasa.gov/reference/crew-systems/) |
| Decompression sickness: suit/cabin pressure transitions can create DCS risk; NASA calls for safe, prompt EVA return when symptoms are suspected. | NASA [Risk of Decompression Sickness](https://www.nasa.gov/reference/risk-of-decompression-sickness/). Treatment and recompression remain mission-specific. |
| Vision changes: headward fluid shifts in microgravity can affect eye structures and vision; sudden vision loss is not presumed to be SANS. | NASA [Risk of Spaceflight-Associated Neuro-Ocular Syndrome](https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/). |
| Air-quality events: a spacecraft is a closed environment, and contaminants may arise from leaks, materials, or system events. | NASA [Medical Operations and Clinical Care](https://www.nasa.gov/reference/medical-operations-and-clinical-care/) and [Spaceflight Toxicology Technical Brief](https://www.nasa.gov/wp-content/uploads/2023/03/spaceflight-toxicology-technical-brief-ochmo.pdf). Follow the vehicle's environmental contingency procedure. |
| Bone injury: spaceflight can reduce bone strength over time, making injury context relevant without assuming a fracture. | NASA [Risk of Spaceflight-Induced Bone Changes](https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/). |
| Isolation, confinement, distance from Earth, gravity fields, and hostile environments can interact; these are context, not causes to infer from an individual symptom. | NASA [Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/). |

The prototype does not use the example claim that neutrons account for a specific percentage of ISS radiation: no such percentage is established in this project's research notes, and it is unnecessary to communicate the shelter/dosimeter action.

## Product rules

- Preserve units, event time, source, simulated/real status, and missingness for every observation.
- Mark user-entered sensor readings as entered by hand; do not describe them as a live device connection.
- Show personal trends as statistical observations, not diagnoses, and keep operational alerts under their existing deterministic rules.
- The emergency assistant presents locally available, simulated first-aid cards for rapid orientation while preserving the relevant mission procedure. These cards are not approved flight protocols, do not replace vehicle-specific procedures, and must not invent mission equipment, doses, exposure thresholds, or recompression steps. Human support should be alerted in parallel when possible, while immediate physical first-aid actions continue.
- Any use with real crew data requires approved access controls, secure storage, privacy/retention rules, an approved AI data-handling review, and a tested human escalation path.

## References

- NASA Human Research Program, [Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/).
- NASA Human Research Program, [Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/).
- NASA, [NASA-STD-3001 and human spaceflight standards](https://www.nasa.gov/ochmo/human-spaceflight-and-aviation-standards/).
- NASA, [Health and Medical Care technical requirements](https://www.nasa.gov/reference/3-0-health-and-medical-care/). These requirements put terrestrial and in-mission medical care under Flight Medicine and applicable medical-care standards; CrewCare is not a replacement for that authority.
