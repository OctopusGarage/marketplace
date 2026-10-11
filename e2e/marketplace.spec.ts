import { expect, test } from "@playwright/test";

test("marketplace filters packs and clears an empty search", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#packs article")).toHaveCount(15);
  await page.getByRole("button", { name: "Themes" }).click();
  await expect(page.locator("#packs article")).toHaveCount(5);
  await page.getByRole("searchbox", { name: "Search libraries" }).fill("no-such-pack");
  await expect(page.getByRole("status")).toContainText("No libraries found");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("#packs article")).toHaveCount(15);
  await expect(page.getByRole("searchbox", { name: "Search libraries" })).toHaveValue("");
});

test("marketplace can retry a failed catalog request", async ({ page }) => {
  let requests = 0;
  await page.route("**/catalog.json", async (route) => {
    requests += 1;
    if (requests === 1) await route.fulfill({ status: 503, body: "Unavailable" });
    else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Could not load the catalog");
  await page.getByRole("button", { name: "Themes" }).click();
  await expect(page.getByRole("status")).toContainText("Could not load the catalog");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("#packs article")).toHaveCount(5);
  expect(requests).toBe(2);
});

test("marketplace and studio expose the same browser icon", async ({ page, request }) => {
  for (const path of ["/", "/studio/"]) {
    await page.goto(path);
    const icon = await page.locator('link[rel="icon"]').getAttribute("href");
    expect(icon).toBeTruthy();
    const response = await request.get(new URL(icon!, page.url()).toString());
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
  }
});
