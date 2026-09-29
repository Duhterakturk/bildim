import { expect, test } from "@playwright/test";

const roles = [
  { role: "teacher", tab: "Sınıflarım", hidden: ["Sınıfım"] },
  { role: "student", tab: "İlerlemem", hidden: ["Sınıflarım"] },
  { role: "individual", tab: "İlerlemem", hidden: ["Sınıflarım", "Sınıfım"] },
];

function userFor(role) {
  return { id: `${role}-1`, full_name: "Ada Deniz", role, star_balance: 4, classroom_id: null };
}

async function mockAccount(page, role, extras = {}) {
  const user = userFor(role);
  let joined = Boolean(extras.joined);
  await page.addInitScript((stored) => {
    localStorage.setItem("mindarena_access_token", "access");
    localStorage.setItem("mindarena_refresh_token", "refresh");
    localStorage.setItem("mindarena_user", JSON.stringify(stored));
  }, user);
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me") && route.request().method() === "PATCH") {
      return route.fulfill({ json: { ...user, full_name: "Yeni Ada" } });
    }
    if (url.includes("/auth/password")) return route.fulfill({ json: { ok: true } });
    if (url.includes("/auth/me")) {
      return route.fulfill({
        json: {
          ...user,
          classroom_id: joined ? 7 : user.classroom_id,
          classroom_name: joined ? "3-A" : null,
        },
      });
    }
    if (url.includes("/classrooms/mine")) {
      return route.fulfill({ json: [{ id: 7, name: "3-A", join_code: "KEDI42", student_count: 1 }] });
    }
    if (url.includes("/classrooms/join")) {
      if (extras.joinFails) return route.fulfill({ status: 404, json: { error: "Sınıf kodu eşleşmedi. Kodu kontrol edip yeniden deneyebilirsiniz." } });
      joined = true;
      return route.fulfill({ json: { ...user, classroom_id: 7, classroom_name: "3-A" } });
    }
    if (url.includes("/classrooms/leave")) {
      if (extras.leaveFails) return route.fulfill({ status: 500, json: { error: "Sınıftan ayrılamadınız. Yeniden deneyebilirsiniz." } });
      joined = false;
      return route.fulfill({ json: { ...user, classroom_id: null, classroom_name: null } });
    }
    if (url.includes("/progress/unlocked")) {
      return route.fulfill({ json: { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5, games: {} } });
    }
    if (url.includes("/progress/students")) return route.fulfill({ json: [] });
    if (url.includes("/progress")) {
      return route.fulfill({ json: { total_completed: 0, total_points: 0, distinct_games_completed: 0, per_game: [] } });
    }
    if (url.includes("/badges")) return route.fulfill({ json: [] });
    if (url.includes("/assignment")) {
      const pack = joined ? (extras.assignment || { assignments: [] }) : { assignments: [] };
      return route.fulfill({ json: pack });
    }
    if (url.includes("/profile")) {
      return route.fulfill({
        json: {
          stage: "chick",
          solved: 2,
          equipped: [],
          collection: { owned: 1, total: 12 },
          titles: [],
          records: [],
          next: null,
          star_balance: 4,
        },
      });
    }
    if (url.includes("/certificates")) return route.fulfill({ json: [] });
    if (url.includes("/games") && !url.includes("/puzzles") && !url.includes("/games/")) {
      return route.fulfill({ json: [{ id: 1, slug: "kakuro", name_tr: "Kakuro", name_en: "Kakuro", min_grade_level: 3 }] });
    }
    if (url.includes("/puzzles")) {
      return route.fulfill({
        json: {
          id: "p1",
          puzzle: {
            grid: [[{ type: "block" }, { type: "clue", down: 3 }], [{ type: "clue", right: 3 }, { type: "white" }]],
            size: 2,
          },
          hints: [],
        },
      });
    }
    return route.fulfill({ json: {} });
  });
}

for (const { role, tab, hidden } of roles) {
  test(`${role} account shows only its sections`, async ({ page }, info) => {
    await mockAccount(page, role);
    await page.goto("/hesabim");
    if (info.project.name === "mobile") {
      await page.getByRole("button", { name: "Menüyü açın veya kapatın" }).click();
    }
    await expect(page.getByRole("link", { name: "Hesabım", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Oyunlar", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dükkân", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profil" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Panelim" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Öğretmen Paneli" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    for (const name of hidden) {
      await expect(page.getByRole("tab", { name })).toHaveCount(0);
    }
    await expect(page.getByRole("tab", { name: "Hesap Ayarları" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Kazanımlarım" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(overflow).toBe(true);
    await page.screenshot({ path: `test-results/account-${role}-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  });
}

test("old account links land on the matching section", async ({ page }) => {
  await mockAccount(page, "teacher");
  await page.goto("/teacher?kaynak=mektup");
  await expect(page).toHaveURL(/\/hesabim\?.*bolum=siniflar/);
  await expect(page).toHaveURL(/kaynak=mektup/);
  await expect(page.getByRole("button", { name: "Yeni Sınıf Oluşturun" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kodu Kopyalayın" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Notu Kopyalayın" })).toBeHidden();

  await page.goto("/profil?ad=1");
  await expect(page).toHaveURL(/bolum=kazanimlar/);
  await expect(page).toHaveURL(/ad=1/);
  await expect(page.getByTestId("collection-progress")).toBeVisible();

  await mockAccount(page, "student");
  await page.goto("/teacher");
  await expect(page).toHaveURL(/bolum=ilerleme/);
  await expect(page.getByRole("button", { name: "Sınıfı Oluşturun" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Yeni Sınıf Oluşturun" })).toHaveCount(0);

  await mockAccount(page, "individual");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/bolum=ilerleme/);
  await expect(page.getByRole("tab", { name: "Sınıfım" })).toHaveCount(0);
});

test("student can open class join and a teacher can open a game", async ({ page }) => {
  await mockAccount(page, "student", {
    assignment: {
      assignments: [{
        id: 1,
        slug: "kakuro",
        name_tr: "Kakuro",
        difficulty_label: "Kolay",
        target_count: 2,
        done_count: 0,
        finished: false,
      }],
    },
  });
  await page.goto("/hesabim?bolum=sinif");
  await expect(page.getByRole("button", { name: "Katılın" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bulmacaya Geçin" })).toHaveCount(0);
  await page.getByPlaceholder("Sınıf kodu").fill("kedi42");
  await page.getByRole("button", { name: "Katılın" }).click();
  await expect(page.getByText("3-A sınıfındasınız.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Bulmacaya Geçin" })).toBeVisible();
  await page.getByRole("button", { name: "Sınıftan Ayrılın" }).click();
  await page.getByRole("button", { name: "Ayrılın" }).click();
  await expect(page.getByRole("link", { name: "Bulmacaya Geçin" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Katılın" })).toBeVisible();

  await mockAccount(page, "teacher");
  await page.goto("/games/kakuro");
  await expect(page.getByRole("heading", { name: "Kakuro" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kontrol Et" })).toBeVisible();
});

test("individual plays without a class and can edit the account", async ({ page }) => {
  await mockAccount(page, "individual");
  await page.goto("/games/kakuro");
  await expect(page.getByRole("heading", { name: "Kakuro" })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/hesabim?bolum=ayarlar");
  await page.getByLabel("Ad Soyad", { exact: true }).fill("Yeni Ada");
  await page.getByRole("button", { name: "Değişiklikleri Kaydet" }).click();
  await expect(page.getByRole("heading", { name: "Yeni Ada" })).toBeVisible();
  const passwordForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Şifreyi Kaydedin" }) });
  await passwordForm.getByPlaceholder("Mevcut şifre").fill("EskiSifre1");
  await passwordForm.getByPlaceholder("Yeni şifre").fill("YeniSifre1");
  await passwordForm.getByRole("button", { name: "Şifreyi Kaydedin" }).click();
  await expect(page.getByText("Şifreniz değiştirildi.")).toBeVisible();
  const menu = page.getByRole("button", { name: "Menüyü açın veya kapatın" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "Çıkış Yap" }).click();
  if (await menu.isVisible()) await menu.click();
  await expect(page.getByRole("link", { name: "Giriş Yap" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Hesabım" })).toHaveCount(0);
});

test("a failed leave keeps the current homework", async ({ page }) => {
  await mockAccount(page, "student", {
    joined: true,
    leaveFails: true,
    assignment: {
      assignments: [{
        id: 1,
        slug: "kakuro",
        name_tr: "Kakuro",
        difficulty_label: "Kolay",
        target_count: 2,
        done_count: 0,
        finished: false,
      }],
    },
  });
  await page.goto("/hesabim?bolum=sinif");
  await expect(page.getByRole("link", { name: "Bulmacaya Geçin" })).toBeVisible();
  await page.getByRole("button", { name: "Sınıftan Ayrılın" }).click();
  await page.getByRole("button", { name: "Ayrılın" }).click();
  await expect(page.getByText("Sınıftan ayrılamadınız. Yeniden deneyebilirsiniz.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Bulmacaya Geçin" })).toBeVisible();
  await expect(page.getByText("3-A sınıfındasınız.")).toBeVisible();
});

test("account survives a reload", async ({ page }) => {
  await mockAccount(page, "student");
  await page.goto("/hesabim?bolum=ayarlar");
  await expect(page.getByRole("heading", { name: "Profil adınızı düzenleyin" })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/bolum=ayarlar/);
  await expect(page.getByRole("heading", { name: "Ada Deniz" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Sınıfım" })).toBeVisible();
});
