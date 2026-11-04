import { defineConfig } from "@playwright/test";
const production = process.env.KEYBOUND_E2E_PRODUCTION === "1";
const port = production ? 3018 : 3017;
export default defineConfig({
  workers: production ? 1 : undefined,
  testDir: "./tests/e2e",
  timeout: 90000,
  fullyParallel: false,
  use: {
    baseURL: `http://localhost:${port}`,
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1100 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: production
      ? "npm run start -- --port 3018"
      : "npm run dev -- --port 3017",
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
  },
  reporter: "list",
});
