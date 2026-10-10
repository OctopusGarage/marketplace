#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const current = JSON.parse(readFileSync(resolve(root, "site/catalog.json"), "utf8"));
let previous;
try {
  previous = JSON.parse(execFileSync("git", ["show", "origin/main:site/catalog.json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
} catch {
  console.log("No previous published catalog on main");
  process.exit(0);
}
assert.equal(previous.schemaVersion, 1);
const byVersion = new Map(current.packs.map((entry) => [`${entry.id}@${entry.version}`, entry]));
for (const old of previous.packs) {
  const next = byVersion.get(`${old.id}@${old.version}`);
  if (!next) continue;
  assert.equal(next.file, old.file, `Published ZIP changed without a version bump: ${old.id}`);
  assert.equal(next.sha256, old.sha256, `Published ZIP hash changed: ${old.id}`);
  assert.equal(next.bytes, old.bytes, `Published ZIP size changed: ${old.id}`);
}
console.log("Published artifact URLs remain immutable");
