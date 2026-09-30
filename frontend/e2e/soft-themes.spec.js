import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Use the actual server catalogue's JSON-compatible theme entries, without a database.
const themes = readFileSync(new URL("../../backend/app/services/shop.py", import.meta.url), "utf8")
  .split("\n").map((line) => line.trim())
  .filter((line) => /^\{"id": "(?:theme-|bg-)/.test(line))
  .map((line) => JSON.parse(line.replace(/,$/, "")));

function contrast(a, b) {
  const luminance = (rgb) => {
    const channels = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

for (const theme of themes) {
  test(`${theme.name_en}: empty, shaded and crossed cells stay distinct`, async ({ page }, info) => {
    await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "test-token"));
    await page.route(/\/api\/(?!.*\.js)/, (route) => {
      const url = route.request().url();
      if (url.includes("/auth/me")) return route.fulfill({ json: { id: "soft-test", full_name: "Ada", role: "student" } });
      if (url.includes("/shop")) return route.fulfill({ json: { items: [{ ...theme, equipped: true, owned: true }] } });
      if (url.includes("/progress/unlocked")) return route.fulfill({ json: { unlocked: { easy: true, medium: true, hard: true }, progress: {}, threshold: 5 } });
      if (url.includes("/puzzles")) return route.fulfill({ json: {
        id: "soft-puzzle", puzzle: { size: 7, rowClues: Array(7).fill([3]), colClues: Array(7).fill([3]) }, hints: [],
      } });
      return route.fulfill({ json: {} });
    });
    await page.goto("/games/kare-karalamaca");
    await expect(page.locator("html")).toHaveAttribute("data-board-theme", theme.id);
    await expect(page.locator(".brand-wordmark")).toHaveCSS("color", "rgb(0, 0, 0)");
    const brand = await page.getByRole("link", { name: "Bildim", exact: true }).boundingBox();
    expect(brand.width).toBeLessThanOrEqual(225);
    expect(brand.height).toBeLessThanOrEqual(66);
    const cells = page.locator('[data-book-cell="true"]');
    await expect(cells).toHaveCount(49);
    for (const i of [0, 1, 2, 7, 9, 14, 15, 16]) await cells.nth(i).click();
    await cells.nth(3).click();
    await cells.nth(3).click();
    await expect(cells.nth(0)).toHaveAttribute("data-state", "marked");
    await expect(cells.nth(3)).toHaveText("×");
    const colors = await cells.evaluateAll((nodes) => [0, 3, 4].map((i) => {
      const s = getComputedStyle(nodes[i]);
      return { bg: s.backgroundColor, fg: s.color, border: s.borderColor };
    }));
    expect(contrast(colors[0].bg, colors[2].bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(colors[1].fg, colors[1].bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors[2].border, colors[2].bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors[2].bg, "rgb(0, 0, 0)")).toBeGreaterThanOrEqual(14);
    const pageBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const pageInk = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(contrast(pageBackground, "rgb(0, 0, 0)")).toBeGreaterThanOrEqual(7);
    expect(contrast(pageInk, pageBackground)).toBeGreaterThanOrEqual(4.5);
    const photoOpacity = await page.getByTestId("theme-scene").locator("img").evaluate((img) => Number(getComputedStyle(img).opacity));
    expect(photoOpacity).toBeGreaterThan(0.35);
    expect(photoOpacity).toBeLessThan(0.7);
    await cells.nth(3).click();
    await expect(cells.nth(3)).toHaveAttribute("data-state", "empty");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: info.outputPath(`${theme.id}.png`), fullPage: true, animations: "disabled" });
  });
}
