import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:5173" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  projects: [
    { name: "webkit-phone-brand", testMatch: "brand-surface.spec.js", use: { browserName: "webkit", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "webkit-tablet-brand", testMatch: "brand-surface.spec.js", use: { browserName: "webkit", viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true } },
    { name: "firefox-brand", testMatch: "brand-surface.spec.js", use: { browserName: "firefox", viewport: { width: 1280, height: 800 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
