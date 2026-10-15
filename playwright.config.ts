import { defineConfig, devices } from "@playwright/test";

const node = process.execPath;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const serverURL = new URL(baseURL);
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    extraHTTPHeaders: { "Accept-Language": "it-IT,it;q=0.9" },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], locale: "it-IT", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], locale: "it-IT", defaultBrowserType: "chromium", viewport: { width: 390, height: 844 } } },
    { name: "small-mobile", use: { ...devices["Pixel 7"], locale: "it-IT", defaultBrowserType: "chromium", viewport: { width: 360, height: 800 } } },
  ],
  webServer: {
    command: `"${node}" node_modules/next/dist/bin/next dev --webpack --hostname ${serverURL.hostname} --port ${serverURL.port || "3000"}`,
    url: `${baseURL}/setup`,
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
