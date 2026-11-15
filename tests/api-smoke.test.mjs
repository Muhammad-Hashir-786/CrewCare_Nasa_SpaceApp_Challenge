import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = Number(process.env.CREWCARE_TEST_PORT ?? 3217);
const origin = `http://127.0.0.1:${port}`;
let server;

before(async () => {
  const cli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
  server = spawn(process.execPath, [cli, "dev", "--webpack", "--port", String(port)], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, DATABASE_URL: "", CREWCARE_AI_API_KEY: "", LLM_API_KEY: "", CREWCARE_NEXT_DIST_DIR: ".next-test" },
    stdio: "ignore",
  });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode != null) throw new Error(`Next dev server exited with code ${server.exitCode}`);
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch { /* Server is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  server.kill();
  throw new Error("Next dev server did not become ready within 60 seconds");
});

after(() => { if (server && server.exitCode == null) server.kill(); });

test("demo health endpoint clearly reports simulated mode", async () => {
  const response = await fetch(`${origin}/api/health`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.status, "demo");
  assert.equal(data.database, "not_configured");
  assert.equal(data.simulatedData, true);
});

test("home route presents the doctor agent, AI search, emergency action, and original portals", async () => {
  const response = await fetch(`${origin}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /ASK CREWCARE AI/);
  assert.match(html, /landing-search-form/);
  assert.match(html, /Astronaut Portal/);
  assert.match(html, /Mission Control/);
  assert.match(html, /landing-brand-name/);
  assert.match(html, /doctor-agent/);
  assert.match(html, /Astronaut Health Assessment &amp; Monitoring/);
  assert.match(html, /General advice — no crew member selected/);
  assert.match(html, /Need help now\?/);
  assert.match(html, /Open the safety intake and contact mission medical support/);
});

test("historical analytics endpoint returns four demo crew members", async () => {
  const response = await fetch(`${origin}/api/analytics/mission`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.isSimulated, true);
  assert.equal(data.report.crewCount, 4);
});

test("astronaut AI context is bounded and evidence linked", async () => {
  const response = await fetch(`${origin}/api/ai/context?scope=astronaut&astronautId=ast-3&period=30d`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.context.healthDataIsSimulated, true);
  assert.equal(data.context.subjects[0].callsign, "CIPHER");
  assert.equal(data.context.subjects[0].recordsInPeriod, 30);
  assert.ok(data.context.evidence.length > 30);
});

test("AI context rejects IDs outside the fictional roster", async () => {
  const response = await fetch(`${origin}/api/ai/context?scope=astronaut&astronautId=somebody-else&period=30d`);
  assert.equal(response.status, 404);
});

test("AI context includes a new browser demo assessment and critical alert", async () => {
  const now = new Date().toISOString();
  const response = await fetch(`${origin}/api/ai/context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: "astronaut", astronautId: "ast-4", period: "30d",
      demoStates: [{
        astronautId: "ast-4",
        records: [{ id: "local-critical-record", userId: "ast-4", recordedAt: now, heartRate: 140, isSimulated: true }],
        latestAssessment: { id: "local-critical-assessment", userId: "ast-4", status: "RED", summary: "Simulated critical finding", flags: ["HEART_RATE_CRITICAL"], createdAt: now },
        activeAlerts: [{ id: "local-critical-alert", userId: "ast-4", severity: "CRITICAL", status: "ACTIVE", title: "Critical demo assessment", message: "Review the simulated finding", createdAt: now }],
      }],
    }),
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.context.subjects[0].latestAssessment.status, "RED");
  assert.ok(data.context.subjects[0].activeAlerts.some((alert) => alert.id === "local-critical-alert"));
  assert.ok(data.context.evidence.some((item) => item.id === "local-critical-alert"));
});

test("AI context rejects cross-astronaut browser state", async () => {
  const response = await fetch(`${origin}/api/ai/context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope: "astronaut", astronautId: "ast-4", period: "30d", demoStates: [{ astronautId: "ast-3", records: [], activeAlerts: [] }] }),
  });
  assert.equal(response.status, 400);
});

test("check-in API rejects unknown astronaut IDs", async () => {
  const response = await fetch(`${origin}/api/assessments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "someone-else", heartRate: 80 }) });
  assert.equal(response.status, 403);
});

test("check-in API returns a simulated critical assessment for the demo emergency scenario", async () => {
  const response = await fetch(`${origin}/api/assessments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "ast-4", heartRate: 140, oxygenSat: 98, systolicBP: 120, diastolicBP: 80 }) });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.isSimulated, true);
  assert.equal(data.result.overallStatus, "RED");
  assert.ok(data.result.findings.some((finding) => finding.category === "CRITICAL"));
});

test("unconfigured AI provider reports an explicit setup error instead of mock output", async () => {
  const response = await fetch(`${origin}/api/ai/assistant`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "astronaut", astronautId: "ast-3", question: "How has my sleep changed?", period: "30d" }) });
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.equal(data.code, "AI_NOT_CONFIGURED");
  assert.equal(data.analysis, undefined);
});

test("urgent emergency follow-up does not short-circuit to contact-only text", async () => {
  const response = await fetch(`${origin}/api/emergency/assistant`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: "UNKNOWN", screen: { responsive: "NO", breathingNormally: "UNKNOWN", severeBleeding: "UNKNOWN" },
      concern: "Person is unresponsive", conversationHistory: [],
    }),
  });
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.match(data.error, /Continue the numbered first-aid steps already shown/i);
  assert.doesNotMatch(data.error, /^Contact mission medical support/i);
});

test("emergency API fails safely when Gemini is not configured", async () => {
  const response = await fetch(`${origin}/api/emergency/assistant`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: "UNKNOWN", screen: { responsive: "YES", breathingNormally: "YES", severeBleeding: "NO" },
      concern: "I have a headache today", conversationHistory: [],
    }),
  });
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.match(data.error, /Continue the numbered first-aid steps already shown/i);
});

test("a selected crew member is accepted for emergency context lookup", async () => {
  const response = await fetch(`${origin}/api/emergency/assistant`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: "OTHER_KNOWN", astronautId: "ast-1",
      screen: { responsive: "UNKNOWN", breathingNormally: "UNKNOWN", severeBleeding: "UNKNOWN" },
      concern: "Radiation exposure. Patient: Dr. Elena Vasquez. First-aid steps are already shown.",
      conversationHistory: [],
      demoState: { astronautId: "ast-1", records: [], activeAlerts: [] },
    }),
  });
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.equal(data.code, "AI_NOT_CONFIGURED");
  assert.match(data.error, /Continue the numbered first-aid steps already shown/i);
});

