import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "..");
const covers = JSON.parse(readFileSync(resolve(root, "assets/preview-covers.json"), "utf8"));
const catalog = JSON.parse(readFileSync(resolve(root, "site/catalog.json"), "utf8"));

for (const [packId, source] of Object.entries(covers)) {
  test(`${packId} preview matches requested cover artwork`, () => {
    const entry = catalog.packs.find((pack) => pack.id === packId);
    assert.ok(entry, `Pack missing from catalog: ${packId}`);
    const sourcePath = extname(source) === ".svg"
      ? resolve(root, "assets/rendered", `${createHash("sha256").update(source).digest("hex").slice(0, 16)}.png`)
      : resolve(root, "assets", source);
    const expected = readFileSync(sourcePath);
    const preview = readFileSync(resolve(root, "site", entry.preview));
    const expectedHash = createHash("sha256").update(expected).digest("hex");
    const previewHash = createHash("sha256").update(preview).digest("hex");
    assert.equal(previewHash, expectedHash);
    assert.equal(previewHash, entry.previewSha256);
  });
}
