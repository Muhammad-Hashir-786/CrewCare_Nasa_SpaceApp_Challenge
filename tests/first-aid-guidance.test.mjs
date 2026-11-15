import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
import Module from "node:module";

const require = createRequire(import.meta.url);
const path = fileURLToPath(new URL("../src/lib/emergency/first-aid-guidance.ts", import.meta.url));
const source = await readFile(path, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = new Module(path, require.main);
loaded.filename = path;
loaded.paths = Module._nodeModulePaths(path);
loaded._compile(compiled, path);
const { EMERGENCY_TYPES, getFirstAidSteps, getSpaceRiskNote } = loaded.exports;

test("space emergency choices appear first in the requested order", () => {
  assert.deepEqual(EMERGENCY_TYPES.map(({ id }) => id), [
    "radiation", "decompression-sickness", "chest-pain", "collapsed", "breathing-trouble", "vision-change",
    "heavy-bleeding", "broken-bone", "fever-infection", "toxic-air", "panic-confusion", "choking", "burn", "other",
  ]);
});

test("radiation selection gives shelter and dosimeter steps immediately", () => {
  const steps = getFirstAidSteps("radiation", null);
  assert.match(steps[0].instruction, /Move to the most shielded area/);
  assert.match(steps[1].instruction, /radiation dosimeter/);
  assert.ok(steps.length >= 5 && steps.length <= 6);
  assert.ok(getSpaceRiskNote("radiation"));
});

test("collapse with unknown breathing starts with CPR instructions", () => {
  const steps = getFirstAidSteps("collapsed", null);
  assert.match(steps[0].instruction, /check for normal breathing/i);
  assert.match(steps[1].instruction, /100–120 compressions per minute/);
});

test("all scenarios have short numbered-step data and no space note is empty", () => {
  for (const { id, spaceRisk } of EMERGENCY_TYPES) {
    const steps = getFirstAidSteps(id, null);
    assert.ok(steps.length >= 5 && steps.length <= 6, `${id} has 5–6 steps`);
    assert.ok(steps.every((step) => step.title && step.instruction), `${id} has complete steps`);
    if (spaceRisk) assert.ok(getSpaceRiskNote(id), `${id} has a spaceflight context note`);
  }
});
