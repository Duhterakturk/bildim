import { expect, test } from "@playwright/test";

async function setup(page, { signedIn = true, cached = true, delayed = false } = {}) {
  let user = { id: "teacher-test", full_name: "Test Teacher", role: "teacher", star_balance: 0 };
  await page.addInitScript(({ signedIn, cached, user }) => {
    localStorage.setItem("i18nextLng", "tr");
    if (signedIn) {
      localStorage.setItem("mindarena_access_token", "test-access");
      if (cached) localStorage.setItem("mindarena_user", JSON.stringify(user));
    }
  }, { signedIn, cached, user });
  await page.route(/\/api\/(?!.*\.js)/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/me")) {
      if (route.request().method() === "PATCH") {
        user = { ...user, full_name: route.request().postDataJSON().full_name };
      } else if (delayed) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return route.fulfill({ json: user });
    }
    if (/\/auth\/(login|register)$/.test(url.pathname)) {
      return route.fulfill({ json: { user, access_token: "test-access", refresh_token: "test-refresh" } });
    }
    return route.fulfill({ json: url.pathname.endsWith("/games") ? [] : {} });
  });
}

for (const path of ["/register", "/login"]) {
  test(`restored session visiting ${path} goes home`, async ({ page }) => {
    await setup(page);
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });
}

test("session restoration does not flash a registration form", async ({ page }) => {
  await setup(page, { cached: false, delayed: true });
  await page.goto("/register");
  await expect(page.locator('#full-name')).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});

test("guest can register and lands at home", async ({ page }) => {
  await setup(page, { signedIn: false });
  await page.goto("/register");
  await expect(page.locator('#full-name')).toHaveAttribute("autocomplete", "name");
  await page.getByLabel("Ad Soyad", { exact: true }).fill("Test Teacher");
  await page.locator('#email').fill("teacher@example.com");
  await page.locator('#password').fill("Example1234");
  await page.locator('#reminder').fill("school");
  await page.getByRole("button", { name: "Kayıt Ol", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("guest login lands at home", async ({ page }) => {
  await setup(page, { signedIn: false });
  await page.goto("/login");
  await page.getByLabel("E-posta", { exact: true }).fill("teacher@example.com");
  await page.getByLabel("Şifre", { exact: true }).fill("Example1234");
  await page.getByRole("button", { name: "Giriş Yap", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("profile name edit persists through reload", async ({ page }, testInfo) => {
  await setup(page);
  await page.goto("/profil");
  await page.getByLabel("Ad Soyad", { exact: true }).fill("Deniz Kaya");
  await page.getByRole("button", { name: "Değişiklikleri Kaydet", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Deniz Kaya", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Profil adınız güncellendi.");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Deniz Kaya", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("profile.png"), fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
