# Crew Care Database Design

PostgreSQL is accessed only from server-side code through Prisma. The checked-in Prisma schema is the source of truth; migrations preserve the schema history and must be applied before running against a database.

## Core entities

- `Mission` has many crew `User` records.
- `User` represents an astronaut or mission-control demo account.
- `HealthRecord` stores a submitted check-in's measurements and self-reported information, with nullable values for unavailable measurements.
- `DailyCheckIn` stores daily self-reported recovery and wellbeing entries.
- `HealthAssessment` stores a deterministic assessment run; `AssessmentFinding` records its explanations, and `HealthRecommendation` stores follow-up guidance.
- `HealthMeasurement` stores typed measurement observations linked to an astronaut and optionally to an assessment.
- `Alert` stores workflow state and acknowledgement details.
- `ActivityLog` records user-associated actions.

## Units and data quality

Numeric `HealthRecord` columns use the units defined by the corresponding form and API (BPM, mmHg, Celsius, mg/dL, percent, hours, and 1–5 self-report scales). Nullable fields mean no observation was supplied; they must not be interpreted as zero. All seed records and assessments are fictional and simulated.

## Data access

Foreign keys connect user-owned health data to `User`. Indices support user and timestamp lookups and status filtering. The current demo has no authentication/session layer, so the schema's role field is not sufficient to authorize access. Add server-side ownership checks tied to a trusted session before storing or exposing real health information.
