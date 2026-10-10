#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { parsePack } from "../src/lib/pack.ts";

const root = resolve(import.meta.dirname, "..");
const document = JSON.parse(readFileSync(resolve(root, "site/catalog.json"), "utf8"));
assert.equal(document.schemaVersion, 1, "unsupported catalog schema");
const catalog = document.packs;
assert.ok(Array.isArray(catalog) && catalog.length > 0, "empty catalog");
const ids = new Set();
const currentFiles = new Map();
for (const entry of catalog) {
  assert.match(entry.id, /^[a-z0-9][a-z0-9._-]{2,79}$/);
  assert.match(entry.version, /^\d+\.\d+\.\d+$/);
  assert.ok(!ids.has(entry.id), `duplicate pack ${entry.id}`);
  ids.add(entry.id);
  assert.ok(Array.isArray(entry.apps) && entry.apps.length > 0, `missing app targets: ${entry.id}`);
  for (const app of entry.apps) assert.match(app, /^[a-z0-9][a-z0-9-]{2,79}$/);
  assert.equal(new Set(entry.apps).size, entry.apps.length, `duplicate app target: ${entry.id}`);
  assert.ok(["documented", "pending"].includes(entry.rightsStatus));
  assert.match(entry.sha256, /^[a-f0-9]{64}$/);
  assert.equal(entry.file, `packs/${entry.id}/${entry.version}/${entry.sha256}.zip`);
  currentFiles.set(entry.file, entry);
  assert.match(entry.preview, new RegExp(`^previews/${entry.id}\\.(png|jpg|jpeg|webp)$`));
  assert.equal(
    createHash("sha256").update(readFileSync(resolve(root, "site", entry.preview))).digest("hex"),
    entry.previewSha256,
    `preview checksum mismatch: ${entry.id}`,
  );
}
const found = new Set();
const versions = new Set();
function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, name.name);
    if (name.isDirectory()) walk(path);
    else {
      assert.ok(name.isFile(), `unsupported pack artifact: ${path}`);
      const file = relative(resolve(root, "site"), path).split(sep).join("/");
      const match = /^packs\/([a-z0-9][a-z0-9._-]{2,79})\/(\d+\.\d+\.\d+)\/([a-f0-9]{64})\.zip$/.exec(file);
      assert.ok(match, `invalid pack artifact path: ${file}`);
      const [, id, version, expectedHash] = match;
      const versionKey = `${id}@${version}`;
      assert.ok(!versions.has(versionKey), `duplicate published pack version: ${versionKey}`);
      versions.add(versionKey);
      const bytes = readFileSync(path);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedHash, `ZIP hash mismatch: ${file}`);
      const pack = parsePack(new Uint8Array(bytes));
      assert.equal(pack.id, id, `ZIP ID mismatch: ${file}`);
      assert.equal(pack.version, version, `ZIP version mismatch: ${file}`);
      const entry = currentFiles.get(file);
      if (entry) {
        assert.equal(bytes.length, entry.bytes, `size mismatch: ${entry.id}`);
        for (const field of ["id", "name", "kind", "version"]) assert.equal(pack[field], entry[field]);
        if (pack.kind === "avatar") assert.equal(pack.category, entry.category);
      }
      found.add(file);
    }
  }
}
walk(resolve(root, "site/packs"));
for (const file of currentFiles.keys()) assert.ok(found.has(file), `missing catalog ZIP: ${file}`);
console.log(`Validated ${catalog.length} current packs and ${found.size - catalog.length} historical ZIPs`);
