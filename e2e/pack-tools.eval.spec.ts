import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { strToU8, unzipSync, zipSync } from "fflate";
import { parsePack } from "../src/lib/pack";

type Scenario = {
  id: string;
  prompt: string;
  surface: "build" | "verify" | "drop";
  fixture: string;
  expected: {
    badge: "Passed" | "Failed";
    title?: string;
    download?: string;
    previewCount?: number;
    messageContains?: string;
  };
};

const scenarios = JSON.parse(
  readFileSync("evals/pack-tool-scenarios.json", "utf8"),
) as Scenario[];
const catalog = JSON.parse(readFileSync("site/catalog.json", "utf8")) as {
  packs: { id: string; file: string }[];
};
const stickerZip = readFileSync(
  resolve("site", catalog.packs.find((pack) => pack.id === "noto-favorites")!.file),
);
const stickerImage = unzipSync(stickerZip)["images/1f602.webp"];
const invalidImage = strToU8("not an image");
const stickerManifest = {
  format: 1,
  id: "eval.stickers",
  version: "1.0.0",
  name: "Eval stickers",
  kind: "sticker",
  stickers: [{ id: "joy", label: "Joy", fallback: "😂", file: "images/joy.webp" }],
};
const themeManifest = {
  format: 1,
  id: "eval.theme",
  version: "1.0.0",
  name: "Eval theme",
  kind: "theme",
  base: "dark",
  colors: { primary: "170 70% 55%" },
  wallpaper: "images/nature.webp",
};

function sourceFolder(fixture: string, folder: string): void {
  mkdirSync(folder, { recursive: true });
  if (fixture === "missing-manifest-source") {
    writeFileSync(resolve(folder, "notes.txt"), "Add a manifest.json first");
    return;
  }
  const theme = fixture === "theme-source";
  writeFileSync(
    resolve(folder, "manifest.json"),
    JSON.stringify(theme ? themeManifest : stickerManifest),
  );
  writeFileSync(resolve(folder, "notes.txt"), "This is not part of the pack");
  if (fixture === "missing-image-source") return;
  mkdirSync(resolve(folder, "images"));
  writeFileSync(
    resolve(folder, theme ? "images/nature.webp" : "images/joy.webp"),
    fixture === "invalid-image-source"
      ? invalidImage
      : theme
        ? readFileSync("site/previews/nature.webp")
        : stickerImage,
  );
}

function verifyZip(fixture: string): Buffer {
  if (fixture === "oversized-zip") return Buffer.alloc(12 * 1024 * 1024 + 1);
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(stickerManifest)),
    "images/joy.webp": fixture === "invalid-image-zip" ? invalidImage : stickerImage,
  };
  if (fixture === "unreferenced-image-zip") files["images/extra.webp"] = stickerImage;
  return Buffer.from(zipSync(files));
}

test.describe("AI-assisted pack tool evals", () => {
  for (const scenario of scenarios) {
    test(`${scenario.id}: ${scenario.prompt}`, async ({ page }, testInfo) => {
      const uploads: string[] = [];
      const downloads: string[] = [];
      page.on("request", (request) => {
        if (request.method() !== "GET") uploads.push(request.url());
      });
      page.on("download", (download) => downloads.push(download.suggestedFilename()));
      await page.goto("/studio/");

      if (scenario.surface === "build") {
        const folder = testInfo.outputPath("source");
        sourceFolder(scenario.fixture, folder);
        const downloadPromise = scenario.expected.download
          ? page.waitForEvent("download")
          : undefined;
        await page.locator("#folder-input").setInputFiles(folder);
        await expect(page.locator("#result-badge")).toHaveText(scenario.expected.badge);
        if (downloadPromise) {
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toBe(scenario.expected.download);
          const path = await download.path();
          expect(path).toBeTruthy();
          const bytes = readFileSync(path!);
          const entries = unzipSync(bytes);
          expect(Object.keys(entries)).toContain("manifest.json");
          expect(entries["notes.txt"]).toBeUndefined();
          expect(parsePack(bytes).name).toBe(scenario.expected.title);
          await expect(page.locator("#result-facts")).toContainText(
            createHash("sha256").update(bytes).digest("hex"),
          );
          await page.locator("#zip-input").setInputFiles(path!);
          await expect(page.locator("#result-badge")).toHaveText("Passed");
          await expect(page.locator("#result-title")).toHaveText(scenario.expected.title!);
        }
      } else if (scenario.surface === "drop") {
        const bytes = [...verifyZip(scenario.fixture)];
        await page.locator("#drop-zone").evaluate((target, data) => {
          const transfer = new DataTransfer();
          transfer.items.add(new File([new Uint8Array(data)], "dropped.zip", { type: "application/zip" }));
          target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
        }, bytes);
        await expect(page.locator("#result-badge")).toHaveText(scenario.expected.badge);
      } else {
        await page.locator("#zip-input").setInputFiles({
          name: `${scenario.fixture}.zip`,
          mimeType: "application/zip",
          buffer: verifyZip(scenario.fixture),
        });
        await expect(page.locator("#result-badge")).toHaveText(scenario.expected.badge);
      }

      if (scenario.expected.title)
        await expect(page.locator("#result-title")).toHaveText(scenario.expected.title);
      if (scenario.expected.messageContains)
        await expect(page.locator("#result-message")).toContainText(
          scenario.expected.messageContains,
        );
      if (scenario.expected.previewCount !== undefined)
        await expect(page.locator("#preview img")).toHaveCount(
          scenario.expected.previewCount,
        );
      if (scenario.expected.badge === "Failed") {
        await expect(page.locator("#preview img")).toHaveCount(0);
        expect(downloads).toEqual([]);
      }
      expect(uploads).toEqual([]);
    });
  }
});
