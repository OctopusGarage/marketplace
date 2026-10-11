import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { unzipSync } from "fflate";

const root = resolve(import.meta.dirname, "..");
const catalog = JSON.parse(readFileSync(join(root, "site/catalog.json"), "utf8"));
const sampleFile = catalog.packs.find((pack) => pack.id === "noto-favorites").file;
const sample = unzipSync(readFileSync(join(root, "site", sampleFile)))["images/1f602.webp"];

function run(...args) {
  return spawnSync(process.execPath, ["--experimental-strip-types", "scripts/pack.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function sourceFolder(t) {
  const folder = mkdtempSync(join(tmpdir(), "marketplace-pack-test-"));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  mkdirSync(join(folder, "images"));
  writeFileSync(join(folder, "manifest.json"), JSON.stringify({
    format: 1,
    id: "test.roundtrip",
    version: "1.0.0",
    name: "Round trip",
    kind: "sticker",
    stickers: [{ id: "joy", label: "Joy", fallback: "😂", file: "images/joy.webp" }],
  }));
  writeFileSync(join(folder, "images/joy.webp"), sample);
  return folder;
}

test("CLI builds a minimal pack and checks the exact ZIP it wrote", (t) => {
  const source = sourceFolder(t);
  const output = join(source, "output", "pack.zip");
  writeFileSync(join(source, "notes.txt"), "Exclude this source note");
  const built = run("build", source, output);
  assert.equal(built.status, 0, built.stderr);
  const bytes = readFileSync(output);
  assert.deepEqual(Object.keys(unzipSync(bytes)).sort(), ["images/joy.webp", "manifest.json"]);
  const checked = run("check", output);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /Round trip \(sticker, v1\.0\.0, 1 images\)/);
  assert.match(checked.stdout, new RegExp(createHash("sha256").update(bytes).digest("hex")));
});

test("CLI build fails for a missing referenced image without writing an output", (t) => {
  const source = sourceFolder(t);
  const manifest = JSON.parse(readFileSync(join(source, "manifest.json"), "utf8"));
  manifest.stickers[0].file = "images/missing.webp";
  writeFileSync(join(source, "manifest.json"), JSON.stringify(manifest));
  const output = join(source, "pack.zip");
  const result = run("build", source, output);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Pack build failed/);
  assert.throws(() => readFileSync(output), { code: "ENOENT" });
});

test("CLI build rejects a symlinked image", (t) => {
  const source = sourceFolder(t);
  symlinkSync(join(source, "images/joy.webp"), join(source, "images/link.webp"));
  const manifest = JSON.parse(readFileSync(join(source, "manifest.json"), "utf8"));
  manifest.stickers[0].file = "images/link.webp";
  writeFileSync(join(source, "manifest.json"), JSON.stringify(manifest));
  const result = run("build", source, join(source, "pack.zip"));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Symlinks are not allowed/);
});

test("CLI check rejects an invalid archive and reports failure", (t) => {
  const folder = mkdtempSync(join(tmpdir(), "marketplace-pack-test-"));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const file = join(folder, "broken.zip");
  writeFileSync(file, "not a zip");
  const result = run("check", file);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Pack check failed/);
});
