# Crew Care System Overview

Crew Care is a web prototype for astronaut self-check-ins and mission health awareness during long missions. It demonstrates current check-in assessment, personal historical baselines and trends, and evidence-referenced AI interpretation. It addresses the NASA Space Apps 2026 astronaut health-monitoring challenge by letting a crew member enter indicators, inspect status and history, and providing a Mission Control view.

## Users and workflow

- Astronaut demo user: selects a fictional profile, completes a daily check-in, sees the Phase 3 result and recommendations, explores health history/analytics, and can ask questions in AI Intelligence.
- Mission Control demo user: views four fictional crew profiles, alerts, crew analytics, and crew AI context; simulated alert acknowledgements persist in the current browser.

## Data and architecture

Next.js App Router hosts React UI and server API routes. TypeScript modules implement measurement validation, rule assessments, statistical historical analytics, and provider context. Prisma maps the PostgreSQL schema; no database is currently configured. When the database is absent, deterministic fictional records support the demo. Browser-local check-ins, AI conversations, and recommendation statuses are explicitly demo-only.

No NASA dataset, NASA login, medical-device integration, wearables, or live spacecraft system is connected. The NASA scientific references document the domain only. See the project audit, security review, demo guide, and known limitations before using this prototype.
