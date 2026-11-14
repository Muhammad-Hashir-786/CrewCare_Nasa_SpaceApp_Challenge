# Emergency Assistant: Current Behavior and Safety Boundary

The persistent Emergency control opens a full-screen, mobile-responsive assistant with a session timer, explicit microphone state, the selected astronaut's latest assessment/record timestamp/critical alerts where available, browser speech recognition, editable text, browser speech synthesis, adjustable speech speed, repeat, and stop-speaking controls. Speech recognition is activated only after the user presses Speak. Session content remains in component memory and is not sent to the LLM or persisted by this implementation.

The deterministic response immediately directs anyone who may be in danger to follow the approved mission procedure and contact mission medical support. It states that Crew Care has not contacted anyone. The assistant does not diagnose, select treatment, infer an emergency from speech, or claim a notification was delivered. If browser voice support is unavailable or denied, typed input remains available.

## Not yet operational

- No medically approved protocol library or deterministic clinical triage has been provided or integrated. This assistant therefore does **not** triage or give treatment instructions.
- No authenticated identity, medical officer directory, escalation integration, delivery receipt, or Mission Control emergency queue exists. Human support is explicitly shown as not connected.
- Emergency transcripts are not saved to a server. There is no emergency-session schema, authenticated API, audit trail, retention policy, or role-controlled review.
- Browser speech recognition and synthesis availability/processing depends on browser and device. No external speech provider has been configured or independently verified. The UI offers text fallback and warns about browser processing.
- The interface has not been tested in a browser/device matrix or validated for use under flight conditions.

## Required before operational emergency use

Obtain clinically and mission-approved protocols; define intended use and users; conduct hazard analysis, usability and software verification; implement identity/authorization, a monitored escalation channel with delivery acknowledgements, secure session persistence and audit; test network/provider failure and offline behavior; and complete the appropriate clinical/regulatory assessment. ISO 14971, IEC 62304, IEC 62366-1, and ISO 13485 are engineering references only here; this project does not claim compliance, certification, clearance, or clinical validation.
