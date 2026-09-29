import { expect, test } from "@playwright/test";

test("wordmark follows foreground across light and dark surfaces without resizing", async ({ page }, info) => {
  await page.route(/\/api\/(?!.*\.js)/, (route) => route.fulfill({ json: {} }));
  await page.goto("/");
  const link = page.getByRole("link", { name: "Bildim", exact: true });
  const originalBox = await link.boundingBox();
  await expect(page.locator(".brand-wordmark")).toHaveCSS("fill", "rgb(41, 60, 53)");
  await expect(page.locator(".brand-logo")).toHaveCSS("filter", "none");
  await page.screenshot({ path: info.outputPath("light-surface.png"), animations: "disabled" });
  // A stylesheet-only change must work without a DOM mutation observer.
  const style = await page.addStyleTag({content: "nav.site-nav { background: #121212 !important; color: white; }"});
  await expect(page.locator("nav")).toHaveCSS("background-color", "rgb(18, 18, 18)");
  await expect(page.locator(".brand-wordmark")).toHaveCSS("fill", "rgb(255, 255, 255)");
  expect(await link.boundingBox()).toEqual(originalBox);
  await page.screenshot({ path: info.outputPath("dark-surface.png"), animations: "disabled" });
  await style.evaluate(node => node.remove());
  expect(await link.boundingBox()).toEqual(originalBox);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
