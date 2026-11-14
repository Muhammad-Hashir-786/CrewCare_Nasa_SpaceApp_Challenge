# NASA Space Apps Submission Package (Draft)

## Project title

Crew Care — Historical Health Awareness for Long-Duration Missions

## Project description

Long-duration space missions place responsibility on crew members and mission teams to notice changes in wellbeing and health indicators over time. Crew Care is a prototype that brings daily self-reported check-ins, deterministic assessment explanations, personal historical baselines, trends, statistical deviations, and a Mission Control overview into one workflow. Its goal is to make changes easier to inspect and discuss with qualified mission medical support.

The current build demonstrates the workflow using four fictional astronaut profiles and deterministic simulated histories. It does not contain actual astronaut records, clinical thresholds, or a NASA data feed. Phase 3 rules remain deterministic and separate from the Phase 4 analytics and optional Phase 5 AI explanation.

## Target users and expected impact

- Astronauts: review their own check-ins and personal patterns.
- Mission Control: scan crew summaries, inspect alerts, and review supporting evidence.
- Expected prototype impact: make historical changes and missing context visible for human review. Operational impact is untested.

## Technical architecture and innovation

Next.js App Router and TypeScript provide the UI, API, deterministic assessment, statistical historical analysis, and evidence retrieval. Prisma/PostgreSQL models support a future database-backed deployment. An optional server-side OpenAI-compatible provider can produce structured, evidence-cited explanations. A Zod schema and evidence-ID allow-list reject malformed answers and fabricated references. The application currently runs as a simulated-data prototype; database deployment, login/roles, and provider credentials remain external setup tasks.

The innovation is the staged interpretation: deterministic current assessment, per-person historical baseline, explainable statistical patterns/projections, then optional AI explanation grounded in the retrieved records. The system does not produce a single “health score” or treat correlation as causation.

## Limitations and disclosure

- All app health data is simulated; no NASA dataset is integrated.
- Phase 3 thresholds and Phase 4 statistics have not been clinically validated.
- AI is provider-dependent, can be unavailable, and must remain under human review.
- Database migrations are not applied; login and authorization are not implemented.
- Conversation/recommendation status persistence is browser-local in demo mode.
- No NASA endorsement or medical validation is claimed.
- AI tools used: a server-side configurable LLM can be used for answer generation when a key is configured; this project documentation and code were also developed with AI assistance. Team should disclose actual tools used in its work and video.

## NASA data and references

The project is framed against the official [2026 astronaut health-monitoring challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/). NASA Human Research Program and Spaceflight Standard Measures references informed the domain discussion only; they are not integrated measurements or a validation source for the app's thresholds. See [scientific-references.md](scientific-references.md) for source, field relevance, and usage notes.

## Demo deliverables to fill in before submission

- Public project/demo URL: **team to add after deployment and access check**
- Demonstration video link: **team to record and add**
- Repository link: **team to add if public**
- NASA data source actually used: **none currently integrated; check local/global eligibility requirements**
- Team name and member list: **team to provide**
- Individual contributions: **each team member to provide their actual work; do not infer attribution from this repository**

## Presentation outline

1. Problem and user: noticing health changes during long missions.
2. Show fictional daily check-in and Phase 3 explanation.
3. Compare sleep and wellbeing with personal history.
4. Show evidence links and uncertainty in Phase 4/optional Phase 5.
5. Review a simulated critical alert in Mission Control and acknowledge it.
6. Close with simulated-data, privacy, clinical-validation, and NASA-data limitations.

## Submission checklist

- Confirm official account/team/challenge selection and required Project Tab fields.
- Check local event instructions; they may have earlier deadlines, additional forms, or a video requirement.
- If the chosen event requires NASA data use, integrate and cite an appropriate licensed source or clarify eligibility with the event lead; this current build uses none.
- Upload the demo video to an accessible host, test it in a private window, and provide correct sharing permission.
- Disclose AI tools and external services accurately; do not claim NASA partnership/endorsement.
- Verify the submitted project page actually shows “submitted.” No submission was made by this development task.
