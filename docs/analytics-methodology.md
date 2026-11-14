# Phase 4 Analytics Methodology

Analytics are descriptive statistics over recorded values, not clinical limits.

- **Personal baselines:** per indicator, the TypeScript service computes mean, median, sample standard deviation, min, max, count, and rolling average. A baseline is withheld when there are fewer than five observations.
- **Trends:** available periods include 24h, 7d, 30d, 90d, and mission history. Results report available count, completeness, start/latest/mean, percentage change only when a suitable non-zero start exists, direction, and an explanation.
- **Anomalies:** records are compared with prior personal history using robust deviation and IQR methods; the service reports method, expected range, observed value, timestamp, repeated status, and explanation.
- **Patterns:** sleep/stress co-occurrence, cardiovascular/sleep co-occurrence, repeated deviations, and recovery toward prior readings are described without claiming causation.
- **Forecasts:** short-term linear regression only when sufficient points cover at least seven distinct dates; output includes a range/confidence estimate and is labeled a projection.
- **AI use:** Phase 5 receives these computed outputs as evidence and may explain them, but cannot override the Phase 3 status.

All input records in current demo mode are generated simulated values. They must not be reported as observed astronaut data or scientifically validated trend evidence.
