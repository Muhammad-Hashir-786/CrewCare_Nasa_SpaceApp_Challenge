import fs from "node:fs";
import path from "node:path";
import { Module } from "node:module";
import ts from "typescript";

const filename = path.resolve("prisma/seed.ts");
const source = fs.readFileSync(filename, "utf8");
const javascript = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
});

const seedModule = new Module(filename);
seedModule.filename = filename;
seedModule.paths = Module._nodeModulePaths(path.dirname(filename));
seedModule._compile(javascript, filename);
