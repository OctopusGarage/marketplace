import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

test("published ZIPs survive catalog updates without changing bytes", () => {
  const root = mkdtempSync(join(tmpdir(), "marketplace-immutability-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  const write = (path, value) => {
    const destination = join(root, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, value);
  };
  const archive = (version, contents) => {
    const bytes = Buffer.from(contents);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const file = `site/packs/example/${version}/${sha256}.zip`;
    write(file, bytes);
    return { id: "example", version, file: file.slice(5), sha256, bytes: bytes.length };
  };
  const catalog = (packs) => write("site/catalog.json", JSON.stringify({ schemaVersion: 1, packs }));
  const check = () => spawnSync(process.execPath, [join(root, "scripts/check-immutability.mjs")], { cwd: root, encoding: "utf8" });

  try {
    git("init", "-q", "-b", "main");
    mkdirSync(join(root, "scripts"), { recursive: true });
    copyFileSync(new URL("check-immutability.mjs", import.meta.url), join(root, "scripts/check-immutability.mjs"));
    const first = archive("1.0.0", "first ZIP bytes");
    catalog([first]);
    git("add", ".");
    execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "publish v1"], { cwd: root });
    git("update-ref", "refs/remotes/origin/main", "HEAD");

    const second = archive("2.0.0", "second ZIP bytes");
    catalog([second]);
    assert.equal(check().status, 0, "a retained older ZIP should remain valid");

    rmSync(join(root, first.file.replace(/^/, "site/")));
    let result = check();
    assert.equal(result.status, 1, "a removed older ZIP must fail");
    assert.match(result.stderr, /Published ZIP was removed/);

    write(`site/${first.file}`, "modified ZIP bytes");
    result = check();
    assert.equal(result.status, 1, "changed bytes at a published URL must fail");
    assert.match(result.stderr, /Published ZIP bytes changed/);

    write(`site/${first.file}`, "first ZIP bytes");
    catalog([{ ...first, sha256: second.sha256, file: second.file }]);
    result = check();
    assert.equal(result.status, 1, "replacing a listed version must fail");
    assert.match(result.stderr, /Published ZIP changed without a version bump/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
