#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const current = JSON.parse(readFileSync(resolve(root, "site/catalog.json"), "utf8"));
function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}
let previous;
try {
  previous = JSON.parse(git("show", "origin/main:site/catalog.json"));
} catch {
  console.log("No previous published catalog on main");
  process.exit(0);
}
assert.equal(previous.schemaVersion, 1);
const byVersion = new Map(current.packs.map((entry) => [`${entry.id}@${entry.version}`, entry]));
for (const old of previous.packs) {
  const next = byVersion.get(`${old.id}@${old.version}`);
  if (next) {
    assert.equal(next.file, old.file, `Published ZIP changed without a version bump: ${old.id}`);
    assert.equal(next.sha256, old.sha256, `Published ZIP hash changed: ${old.id}`);
    assert.equal(next.bytes, old.bytes, `Published ZIP size changed: ${old.id}`);
  }
}
const published = git("ls-tree", "-r", "origin/main", "--", "site/packs")
  .split("\n")
  .filter(Boolean);
for (const line of published) {
  const match = /^(100644|100755) blob ([a-f0-9]+)\t(site\/packs\/[^\t\n]+)$/.exec(line);
  assert.ok(match, `Invalid published artifact: ${line}`);
  const [, , oldBlob, path] = match;
  const file = resolve(root, path);
  assert.ok(existsSync(file), `Published ZIP was removed: ${path}`);
  assert.equal(git("hash-object", "--no-filters", "--", file), oldBlob, `Published ZIP bytes changed: ${path}`);
}
console.log("Published artifact URLs remain immutable");
