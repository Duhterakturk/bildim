import { expect, test } from "@playwright/test";

function mockApi(page, role) {
  return page.route(/\/api\/(?!.*\.js)/, route => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/auth/me")) return route.fulfill({ json: { id: "home-user", full_name: "Ada", role, star_balance: 0 } });
    if (path.endsWith("/games")) return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
}

test("home stays usable at narrow phone, tablet and desktop widths", async ({ page }, info) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bir bulmacayla başlayalım.");
  for (const width of [320, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const link of await page.locator(".workshop-primary, .workshop-card, .workshop-feature").all()) {
      const box = await link.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true, animations: "disabled" });
  }
  await expect(page.locator(".workshop-card")).toHaveCount(3);
  for (const slug of ["sudoku", "kare-karalamaca", "pentominolar"]) {
    await expect(page.locator(`.workshop-card[href="/games/${slug}"]`)).toBeVisible();
  }
  await page.getByRole("link", { name: "Nasıl oynanır?", exact: true }).click();
  await expect(page.locator("#home-how")).toBeInViewport();
  await page.locator(".workshop-primary").click();
  await expect(page).toHaveURL(/\/games$/);
});

for (const role of [null, "teacher", "student", "individual"]) {
  test(`classroom invitation matches ${role || "guest"} account`, async ({ page }) => {
    if (role) await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
    await mockApi(page, role);
    await page.goto("/");
    if (role) await expect(page.getByTestId("star-balance")).toBeVisible();
    const invitation = page.locator(".workshop-together a");
    if (!role || role === "teacher") {
      await expect(invitation).toHaveAttribute("href", role ? "/hesabim?bolum=siniflar" : "/register");
    } else {
      await expect(invitation).toHaveCount(0);
    }
  });
}
