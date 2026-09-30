import { expect, test } from "@playwright/test";

test("wordmark follows foreground across light and dark surfaces without resizing", async ({ page }, info) => {
  await page.route(/\/api\/(?!.*\.js)/, (route) => route.fulfill({ json: {} }));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const link = page.getByRole("link", { name: "Bildim", exact: true });
  const originalBox = await link.boundingBox();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".brand-wordmark")).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(page.locator(".brand-emblem")).toHaveCSS("filter", "none");
  await page.screenshot({ path: info.outputPath("light-surface.png"), animations: "disabled" });
  // A stylesheet-only change must work without a DOM mutation observer.
  const style = await page.addStyleTag({content: "nav.site-nav { background: #121212 !important; color: white; }"});
  await expect(page.locator("nav")).toHaveCSS("background-color", "rgb(18, 18, 18)");
  await expect(page.locator(".brand-wordmark")).toHaveCSS("color", "rgb(255, 255, 255)");
  expect(await link.boundingBox()).toEqual(originalBox);
  await page.screenshot({ path: info.outputPath("dark-surface.png"), animations: "disabled" });
  await style.evaluate(node => node.remove());
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".brand-wordmark")).toHaveCSS("color", "rgb(255, 255, 255)");
  const darkSurface = await page.locator("nav.site-nav").evaluate(node => { const css = getComputedStyle(node); return css.backgroundImage + " " + css.backgroundColor; });
  expect(darkSurface).toContain("22, 22, 22");
  expect(await link.boundingBox()).toEqual(originalBox);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
