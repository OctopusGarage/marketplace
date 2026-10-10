#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const current = JSON.parse(readFileSync(resolve(root, "site/catalog.json"), "utf8"));
const base = process.env.MARKETPLACE_BASE_REF?.trim() || "origin/main";
function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}
if (/^0{40}$/.test(base)) {
  console.log("No previous published catalog on the first push");
  process.exit(0);
}
try {
  git("rev-parse", "--verify", `${base}^{commit}`);
} catch {
  throw new Error(`Cannot inspect published baseline: ${base}`);
}
if (git("ls-tree", "-r", "--name-only", base, "--", "site/catalog.json")) {
  const previous = JSON.parse(git("show", `${base}:site/catalog.json`));
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
}
// A failed deployment may be followed by another push. Checking only the
// immediately previous commit would then forget URLs from earlier releases.
const published = new Map();
for (const commit of git("rev-list", base, "--", "site/packs").split("\n").filter(Boolean)) {
  for (const line of git("ls-tree", "-r", commit, "--", "site/packs").split("\n").filter(Boolean)) {
    const match = /^(100644|100755) blob ([a-f0-9]+)\t(site\/packs\/[a-z0-9][a-z0-9._-]{2,79}\/[0-9]+\.[0-9]+\.[0-9]+\/[a-f0-9]{64}\.zip)$/.exec(line);
    assert.ok(match, `Invalid published artifact: ${line}`);
    const [, , oldBlob, path] = match;
    const prior = published.get(path);
    assert.ok(!prior || prior === oldBlob, `Published ZIP bytes changed in history: ${path}`);
    published.set(path, oldBlob);
  }
}
for (const [path, oldBlob] of published) {
  const file = resolve(root, path);
  assert.ok(existsSync(file), `Published ZIP was removed: ${path}`);
  assert.equal(git("hash-object", "--no-filters", "--", file), oldBlob, `Published ZIP bytes changed: ${path}`);
}
console.log("Published artifact URLs remain immutable");
