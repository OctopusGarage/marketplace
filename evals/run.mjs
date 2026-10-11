import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const scenarios = JSON.parse(readFileSync(new URL("./pack-tool-scenarios.json", import.meta.url), "utf8"));
const build = spawnSync("npm", ["run", "build:studio"], { encoding: "utf8" });
if (build.status !== 0) {
  process.stderr.write(build.stdout + build.stderr);
  process.exit(build.status ?? 1);
}

const run = spawnSync("npx", ["playwright", "test", "e2e/pack-tools.eval.spec.ts", "--reporter=json"], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  process.stderr.write(run.stdout + run.stderr);
  process.exit(1);
}

function specs(suites) {
  return suites.flatMap((suite) => [...(suite.specs ?? []), ...specs(suite.suites ?? [])]);
}

const results = specs(report.suites);
const passed = results.filter((spec) => spec.tests.every((test) => test.results.some((result) => result.status === "passed")));
const expectedIds = new Set(scenarios.map((scenario) => scenario.id));
const actualIds = results.map((spec) => spec.title.split(":", 1)[0]);
for (const spec of results) {
  const id = spec.title.split(":", 1)[0];
  process.stdout.write(`${passed.includes(spec) ? "PASS" : "FAIL"} ${id}\n`);
}
process.stdout.write(`Pack tool eval score: ${passed.length}/${scenarios.length}\n`);
if (
  run.status !== 0 ||
  results.length !== scenarios.length ||
  passed.length !== scenarios.length ||
  new Set(actualIds).size !== expectedIds.size ||
  actualIds.some((id) => !expectedIds.has(id))
) {
  process.stderr.write(run.stderr);
  process.exit(1);
}
