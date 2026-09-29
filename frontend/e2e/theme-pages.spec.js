import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const themes = readFileSync(new URL("../../backend/app/services/shop.py", import.meta.url), "utf8")
  .split("\n").map((line) => line.trim())
  .filter((line) => /^\{"id": "(?:theme-|bg-)/.test(line))
  .map((line) => JSON.parse(line.replace(/,$/, "")));

const games = [
  { id: 1, slug: "kare-karalamaca", name_tr: "Kare Karalamaca", name_en: "Square Shading", min_grade_level: 3 },
  { id: 2, slug: "sudoku", name_tr: "Sudoku", name_en: "Sudoku", min_grade_level: 3 },
];

test("general pages keep each theme's photo", async ({ page }, info) => {
  test.setTimeout(180000);
  const width = info.project.name === "mobile" ? 390 : 1280;
  const height = info.project.name === "mobile" ? 844 : 800;
  await page.setViewportSize({ width, height });
  for (const theme of themes) {
    await page.unroute(/\/api\/(?!.*\.js)/).catch(() => {});
    await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "test-token"));
    await page.route(/\/api\/(?!.*\.js)/, (route) => {
      const url = route.request().url();
      if (url.includes("/auth/me")) return route.fulfill({ json: { id: "look", full_name: "Ada", role: "student", star_balance: 12 } });
      if (url.includes("/shop")) return route.fulfill({ json: { star_balance: 12, items: themes.map((item) => ({ ...item, owned: true, equipped: item.id === theme.id })) } });
      if (url.includes("/profile")) return route.fulfill({ json: { stage: "chick", equipped: [], full_name: "Ada", collection: { owned: 2, total: 12 }, titles: [], records: [], solved: 12, next: null, active_title: null } });
      if (url.includes("/certificates")) return route.fulfill({ json: [] });
      if (url.includes("/games")) return route.fulfill({ json: games });
      if (url.includes("/progress/unlocked")) return route.fulfill({ json: { unlocked: { easy: true, medium: true, hard: false }, progress: { easy: 2, medium: 0, hard: 0 }, threshold: 5, games: {} } });
      return route.fulfill({ json: {} });
    });
    for (const path of ["/", "/games", "/dukkan", "/profil"]) {
      await page.goto(path);
      await expect(page.getByTestId("theme-scene").locator("img")).toBeVisible();
      const opacity = await page.getByTestId("theme-scene").locator("img").evaluate((img) => Number(getComputedStyle(img).opacity));
      expect(opacity).toBeGreaterThanOrEqual(0.8);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
      const shot = path === "/" ? "home" : path.slice(1);
      await page.screenshot({ path: `test-results/page-${theme.id}-${shot}-${width}.png`, animations: "disabled" });
    }
  }
});
