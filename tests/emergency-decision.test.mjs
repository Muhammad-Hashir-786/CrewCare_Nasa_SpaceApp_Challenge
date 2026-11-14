import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(fileURLToPath(new URL("../src/lib/emergency/decision-support.ts", import.meta.url)), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports });
const { evaluateEmergencyScreen, getApprovedProtocol, EMERGENCY_PROTOCOL_CATALOGUE } = exports;

const screen = (responsive, breathingNormally, severeBleeding) => ({ responsive, breathingNormally, severeBleeding });

test("emergency decision support stays fail-closed across the nine V2 simulation classes", () => {
  const cases = [
    ["cardiac arrest signal", screen("NO", "NO", "UNKNOWN"), true],
    ["chest discomfort with stable initial answers", screen("YES", "YES", "NO"), false],
    ["breathing concern", screen("YES", "NO", "NO"), true],
    ["unconscious person", screen("NO", "UNKNOWN", "UNKNOWN"), true],
    ["minor injury screen", screen("YES", "YES", "NO"), false],
    ["missing context", screen("", "", ""), true],
    ["unknown answers", screen("UNKNOWN", "UNKNOWN", "UNKNOWN"), true],
    ["LLM unavailable", screen("YES", "YES", "NO"), false],
    ["voice unavailable", screen("YES", "YES", "NO"), false],
  ];
  for (const [scenario, answers, expectedEscalation] of cases) {
    const result = evaluateEmergencyScreen(answers);
    assert.equal(result.escalateNow, expectedEscalation, scenario);
    assert.equal(result.protocolId, null, `${scenario} must not invent an active protocol`);
    assert.ok(result.instructions.every((line) => !/CPR|medication|treatment|drink|hydrate/i.test(line)), `${scenario} must not supply treatment`);
  }
});

test("no care protocol can be selected until approved and reviewed", () => {
  assert.equal(EMERGENCY_PROTOCOL_CATALOGUE.approvedForCare, false);
  assert.equal(getApprovedProtocol("any-protocol"), null);
});
