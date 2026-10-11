import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:49284",
    browserName: "chromium",
    trace: "on-first-retry",
  },
  webServer: {
    command: "python3 -m http.server 49284 --bind 127.0.0.1 --directory site",
    url: "http://127.0.0.1:49284",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
