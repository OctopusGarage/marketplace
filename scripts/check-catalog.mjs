#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parsePack } from "../src/lib/pack.ts";

const root = resolve(import.meta.dirname, "..");
const document = JSON.parse(readFileSync(resolve(root, "site/catalog.json"), "utf8"));
assert.equal(document.schemaVersion, 1, "unsupported catalog schema");
const catalog = document.packs;
assert.ok(Array.isArray(catalog) && catalog.length > 0, "empty catalog");
const ids = new Set();
for (const entry of catalog) {
  assert.match(entry.id, /^[a-z0-9][a-z0-9._-]{2,79}$/);
  assert.match(entry.version, /^\d+\.\d+\.\d+$/);
  assert.ok(!ids.has(entry.id), `duplicate pack ${entry.id}`);
  ids.add(entry.id);
  assert.deepEqual(entry.apps, ["mesh-talk"]);
  assert.ok(["documented", "pending"].includes(entry.rightsStatus));
  assert.match(entry.sha256, /^[a-f0-9]{64}$/);
  assert.equal(entry.file, `packs/${entry.id}/${entry.version}/${entry.sha256}.zip`);
  assert.match(entry.preview, new RegExp(`^previews/${entry.id}\\.(png|jpg|jpeg|webp)$`));
  assert.equal(
    createHash("sha256").update(readFileSync(resolve(root, "site", entry.preview))).digest("hex"),
    entry.previewSha256,
    `preview checksum mismatch: ${entry.id}`,
  );
  const bytes = readFileSync(resolve(root, "site", entry.file));
  assert.equal(bytes.length, entry.bytes, `size mismatch: ${entry.id}`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256);
  const pack = parsePack(new Uint8Array(bytes));
  for (const field of ["id", "name", "kind", "version"]) assert.equal(pack[field], entry[field]);
  if (pack.kind === "avatar") assert.equal(pack.category, entry.category);
}
const found = [];
function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, name.name);
    if (name.isDirectory()) walk(path);
    else if (name.name.endsWith(".zip")) found.push(path);
  }
}
walk(resolve(root, "site/packs"));
assert.equal(found.length, catalog.length, "orphan or missing ZIP");
console.log(`Validated ${catalog.length} catalog entries and ZIPs`);
