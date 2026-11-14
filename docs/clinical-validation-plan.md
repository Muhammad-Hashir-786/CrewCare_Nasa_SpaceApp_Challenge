# Clinical Validation and Regulatory Readiness Plan

This plan is an engineering roadmap, not evidence of medical-device compliance, certification, clearance, or clinical validation.

## Current intended use boundary

Crew Care is being developed as a prototype for organizing astronaut-entered health measurements, showing deterministic assessment output and longitudinal statistical context, and helping a human reviewer explore the available records. It is not intended to diagnose, prescribe, decide fitness for duty, replace a clinician, or replace mission emergency procedures. The current application has no authenticated production users, clinically approved thresholds, or operational protocol library.

## Intended users to validate

- Astronaut or analog participant entering and reviewing their own measurements.
- Authorized flight surgeon/medical officer reviewing a single astronaut's data.
- Authorized Mission Control staff reviewing the crew-level status needed for their role.

Before development for operational use, define the precise user, use environment, clinical purpose, excluded use, operating conditions, and decision authority. Do not infer these from the hackathon brief.

## Preliminary hazard register

| Hazard | Potential harm | Current control | Required validation/work |
|---|---|---|---|
| Critical value omitted, delayed, or incorrectly entered | Human reviewer misses deterioration | Input validation, deterministic Phase 3 rules, alert display | Clinician-approved limits, data-source verification, alarm hazard analysis, simulated and clinical verification |
| Incorrect or stale personal history | Misleading baseline or AI explanation | Bounded evidence catalog, timestamps, synthetic-data disclosure | Provenance, freshness rules, missing-data UX, database integrity and end-to-end tests |
| AI hallucination or overconfident interpretation | Unsafe decision or false reassurance | Structured schema, evidence allow-list, prompt safety rules, Phase 3 status preserved | Model-specific V&V, adversarial testing, human factors, performance monitoring, change control |
| Cross-astronaut data exposure | Sensitive health information disclosed | Demo roster/scope validation only | Authentication, authorization, tenant/ownership checks, security testing, audit controls |
| Speech recognition error in emergency session | Incorrect understanding under stress | Editable transcript, typed fallback, immediate human escalation message | Approved protocol design, confirmation/read-back, noise/accent/accessibility testing |
| Emergency communication not delivered | Crew assumes help is on the way | UI explicitly says no human is connected and no alert was sent | Authenticated delivery integration, acknowledgement, timeout/failure handling, drills |
| Network/provider failure | Delayed or unavailable response | Provider timeout and explicit error; emergency screen does not require LLM | Offline requirements, service monitoring, failover and operational drills |

## Development and evidence gates

1. Establish intended use and user needs with qualified medical and mission stakeholders.
2. Conduct documented risk management informed by ISO 14971; derive safety requirements and trace them to tests.
3. Define software lifecycle, configuration/change control, verification and validation evidence informed by IEC 62304.
4. Validate usability and emergency workflows with representative users and environments informed by IEC 62366-1.
5. Establish quality-system and supplier controls appropriate to the eventual product, informed by ISO 13485.
6. Complete privacy/security threat modeling, clinical protocol approval, database/identity controls, accessibility validation, and independent review.
7. Obtain jurisdiction-specific regulatory advice and determine applicable classification and submission needs before any operational or clinical claims.

These standards are reference points only. The current repository contains no compliance evidence package and does not claim conformity to any standard.
