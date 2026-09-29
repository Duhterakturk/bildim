import { expect, test } from "@playwright/test";

test("wordmark follows its actual surface without recoloring the emblem", async ({ page }, info) => {
  await page.route(/\/api\/(?!.*\.js)/, (route) => route.fulfill({ json: {} }));
  await page.goto("/");
  const brand = page.locator("[data-brand-tone]");
  const link = page.getByRole("link", { name: "Bildim", exact: true });
  await expect(brand).toHaveAttribute("data-brand-tone", "dark");
  const originalBox = await link.boundingBox();
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--cell", "#121212");
    document.documentElement.style.setProperty("--room", "#121212");
    document.documentElement.style.setProperty("--ink", "#ffffff");
  });
  await expect(brand).toHaveAttribute("data-brand-tone", "light");
  await expect(page.locator(".brand-logo-white")).toHaveCSS("visibility", "visible");
  await expect(page.locator(".brand-logo").first()).toHaveCSS("filter", "none");
  expect(await link.boundingBox()).toEqual(originalBox);
  await page.screenshot({ path: info.outputPath("dark-surface.png"), animations: "disabled" });

  // A local surface override must win over the surrounding dark theme.
  await page.locator("nav").evaluate((nav) => { nav.style.backgroundColor = "#fffdf8"; });
  await expect(brand).toHaveAttribute("data-brand-tone", "dark");
  await page.locator("nav").evaluate((nav) => { nav.style.removeProperty("background-color"); });
  await expect(brand).toHaveAttribute("data-brand-tone", "light");

  await page.evaluate(() => {
    for (const name of ["cell", "room", "ink"]) document.documentElement.style.removeProperty(`--${name}`);
  });
  await expect(brand).toHaveAttribute("data-brand-tone", "dark");
  await expect(page.locator(".brand-logo-white")).toHaveCSS("visibility", "hidden");
  expect(await link.boundingBox()).toEqual(originalBox);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("light-surface.png"), animations: "disabled" });
});
