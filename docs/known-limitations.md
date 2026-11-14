# Known Limitations and Release Readiness

Crew Care is under active development. Its current local astronaut records are synthetic and its unconfigured services mean it is not yet suitable for operational astronaut health monitoring.

## Implemented and verified

- Four fictional astronaut profiles and deterministic 30-day histories.
- Browser-local check-ins and assessments, Phase 3 evaluation, critical demo alerts, acknowledgement, and scoped reset.
- Phase 4 TypeScript baseline, trend, anomaly, pattern, and projection calculations over the demo histories.
- Phase 5 provider-independent AI adapter, bounded retrieved context, structured response validation, and evidence reference checks. Browser-submitted demo state is roster checked and cannot cross astronaut scope.
- AI-first home screen on the existing assistant pipeline, provider selection aliases, and full-screen browser voice/text emergency safety workflow with a truthful record summary.
- Ten API smoke tests, lint, TypeScript, Prisma schema validation, and production build passed on 2026-11-14.

## Not implemented or not verified

- **Authentication and authorization:** no login, sessions, or role enforcement. Demo roster checks are not access control. Do not put real health information in this app.
- **PostgreSQL operation:** Prisma schema and migration exist, but no database is configured, migrations are unapplied, and transactional persistence has not been tested.
- **AI provider operation:** no provider key is configured. Live responses, provider privacy/retention, model behavior, latency, and cost have not been verified. Without a key, the API correctly reports `AI_NOT_CONFIGURED`.
- **Python/FastAPI and background processing:** neither exists in this TypeScript architecture.
- **NASA data integration:** no NASA dataset is embedded. Scientific references provide context only; local event eligibility rules must be checked.
- **Automated journey/UI coverage:** API smoke tests do not exercise full browser journeys, responsive layouts, assistive technology, or every interactive control.
- **Production operations:** no hosting, TLS endpoint, monitoring, backup, or deployed health check has been verified. Rate limiting is process-local.
- **Emergency assistance:** voice input uses browser speech APIs and varies by browser. The emergency interface does not triage, prescribe, persist a transcript, or contact human support. No clinically reviewed protocol, authenticated escalation service, delivery confirmation, or emergency-session audit system exists.
- **Clinical/scientific validation:** assessment thresholds, statistical projections, and AI explanations are not clinically or operationally validated. AI output is advisory and must not alter Phase 3 alert severity.
- **Source control:** this workspace has no Git metadata, so a repository diff and commit history could not be reviewed.

## Manual actions before submission

1. Confirm requirements with the selected Space Apps local event; integrate and cite an appropriate NASA dataset if required.
2. Run a live demo in a browser, check all four scenarios, record the presentation, and add the public URL/video.
3. Supply team identity and each member's actual contributions. Do not attribute work without team confirmation.
4. If enabling PostgreSQL or AI, add authentication/authorization and privacy controls first, then validate migrations and all integrated flows in staging.
