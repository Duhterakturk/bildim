import { expect, test } from "@playwright/test";

const teacher = { id: "teacher-1", full_name: "Ada Deniz", role: "teacher", star_balance: 4, classroom_id: null };
const longName = "Uzun Ada Okulu Dördüncü Sınıf Şubesi ve Bilim Atölyesi";

const rooms = [
  { id: 7, name: "3-A", join_code: "KEDI42", student_count: 1 },
  { id: 8, name: longName, join_code: "BILIM9", student_count: 12 },
  { id: 9, name: "5-C", join_code: "MARTI1", student_count: 0 },
];

function student(id, name) {
  return {
    student: { id, full_name: name, grade_level: 3, active_title: null },
    total_completed: 2,
    distinct_games_completed: 1,
    total_points: 20,
  };
}

function assignment(name) {
  return {
    assignments: [{
      id: 1,
      slug: "kakuro",
      name_tr: name,
      difficulty: "easy",
      difficulty_label: "Kolay",
      target_count: 2,
    }],
    class_total: 1,
    finished: [],
    pending_count: 1,
    sentence: `${name} ödevi bu hafta.`,
  };
}

async function mockTeacher(page, { empty = false, list = rooms, hold = null, gate = null } = {}) {
  await page.addInitScript((stored) => {
    localStorage.setItem("mindarena_access_token", "access");
    localStorage.setItem("mindarena_refresh_token", "refresh");
    localStorage.setItem("mindarena_user", JSON.stringify(stored));
  }, teacher);
  await page.route(/\/api\/(?!.*\.js)/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/auth/me")) return route.fulfill({ json: teacher });
    if (url.includes("/classrooms/mine")) return route.fulfill({ json: empty ? [] : list });
    if (url.includes("/assignment") && method === "POST") return route.fulfill({ json: assignment("Kakuro") });
    if (url.includes("/classrooms") && method === "POST") {
      const body = route.request().postDataJSON();
      return route.fulfill({ json: { id: 11, name: body.name, join_code: "YENI11", student_count: 0 } });
    }
    if (url.includes("/progress/students")) {
      const id = new URL(url).searchParams.get("classroom_id");
      if (gate?.fail && id === "7") return route.fulfill({ status: 500, json: {} });
      if (hold && id === "8") await hold.promise;
      const rows = id === "7" ? [student(1, "Ada Öğrenci")] : id === "8" ? [student(2, "Berk Öğrenci")] : [];
      return route.fulfill({ json: rows });
    }
    if (url.includes("/assignment") && method === "GET") {
      const id = url.match(/classrooms\/(\d+)/)?.[1];
      if (gate?.fail && id === "7") return route.fulfill({ status: 500, json: {} });
      if (hold && id === "8") await hold.promise;
      if (id === "7") return route.fulfill({ json: assignment("Kakuro") });
      if (id === "8") return route.fulfill({ json: assignment("Sudoku") });
      return route.fulfill({ json: { assignments: [], class_total: 0, finished: [], pending_count: 0, sentence: "" } });
    }
    if (url.includes("/games") && !url.includes("/games/")) {
      return route.fulfill({ json: [{ id: 1, slug: "kakuro", name_tr: "Kakuro", name_en: "Kakuro", min_grade_level: 3 }] });
    }
    if (url.includes("/profile")) return route.fulfill({ json: { stage: "chick", equipped: [] } });
    if (url.includes("/health")) return route.fulfill({ json: { status: "ok" } });
    return route.fulfill({ json: {} });
  });
}

async function noOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

const sizes = [
  ["desktop", 1280, 800],
  ["tablet", 768, 1024],
  ["phone", 390, 844],
  ["narrow", 360, 740],
];

test("a teacher sees the selected class, code, and homework together", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "goruntuler tek kosuda alinir");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  let release = () => {};
  const hold = { promise: new Promise((resolve) => { release = resolve; }) };
  await mockTeacher(page, { hold });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/hesabim?bolum=siniflar");
  await expect(page.getByRole("heading", { name: "Sınıflarım" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Yeni Sınıf Oluşturun" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Oyunlara Geçin" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Notu Kopyalayın" })).toBeHidden();
  await expect(page.getByText("Ada Öğrenci")).toBeVisible();
  await expect(page.getByText("Hedef: 2 kolay Kakuro")).toBeVisible();
  await expect(page.getByRole("button", { name: "Şifre Belirleyin" })).toBeVisible();

  const saved = page.waitForRequest((req) => req.url().includes("/assignment") && req.method() === "POST");
  await page.getByRole("button", { name: "Kakuro", exact: true }).click();
  await page.getByRole("button", { name: "Ödevi Kaydedin" }).click();
  await saved;

  await page.getByRole("button", { name: "Kodu Kopyalayın" }).click();
  await expect(page.getByRole("status")).toHaveText("Kopyalandı");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("KEDI42");

  const longButton = page.getByRole("button", { name: new RegExp(longName) });
  await longButton.click();
  await expect(page.getByText("Ada Öğrenci")).toHaveCount(0);
  await expect(page.getByText("Hedef: 2 kolay Kakuro")).toHaveCount(0);
  await expect(page.getByText("Ödevler yükleniyor.")).toBeVisible();
  await expect(page.getByText("KEDI42")).toHaveCount(0);
  release();
  await expect(page.getByText("Berk Öğrenci")).toBeVisible();
  await expect(page.getByText("Hedef: 2 kolay Sudoku")).toBeVisible();
  await expect(page.getByText("BILIM9")).toBeVisible();
  await expect(page.getByText("Ada Öğrenci")).toHaveCount(0);

  for (const [name, width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole("button", { name: "Kodu Kopyalayın" })).toBeVisible();
    const target = await page.getByRole("button", { name: "Kodu Kopyalayın" }).evaluate((node) => node.getBoundingClientRect().height);
    expect(target).toBeGreaterThanOrEqual(44);
    await noOverflow(page);
    await page.screenshot({ path: `test-results/teacher-after-${name}.png`, fullPage: true, animations: "disabled" });
  }
});

test("an empty teacher account keeps the first-class start", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "tek kosu");
  await mockTeacher(page, { empty: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/hesabim?bolum=siniflar");
  await expect(page.getByText("Henüz bir sınıf oluşturmadınız.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Yeni Sınıf Oluşturun" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/teacher-after-empty.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "İlk Sınıfınızı Oluşturun" }).click();
  await page.getByLabel("Sınıf adı").fill("2-B");
  await page.getByRole("button", { name: "Sınıfı Oluşturun" }).click();
  await expect(page.getByText("YENI11")).toBeVisible();
  await expect(page.getByRole("button", { name: "Şifre Belirleyin" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/teacher-after-created.png", fullPage: true, animations: "disabled" });
});

test("a failed request stays with the selected class", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "tek kosu");
  const gate = { fail: true };
  await mockTeacher(page, { gate });
  await page.goto("/hesabim?bolum=siniflar");
  await expect(page.getByText("KEDI42")).toBeVisible();
  await expect(page.getByText("Ödevler yüklenemedi.")).toBeVisible();
  await expect(page.getByText("Öğrenciler yüklenemedi.")).toBeVisible();
  await expect(page.getByText("Bu hafta henüz bir ödev yok.")).toHaveCount(0);
  await expect(page.getByText("Ada Öğrenci")).toHaveCount(0);
  gate.fail = false;
  const retries = page.getByRole("button", { name: "Yeniden Deneyin" });
  await retries.nth(0).click();
  await expect(retries).toHaveCount(1);
  await retries.click();
  await expect(page.getByText("Ada Öğrenci")).toBeVisible();
  await expect(page.getByText("Hedef: 2 kolay Kakuro")).toBeVisible();
});

test("one class stays compact and a failed copy is not called success", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "tek kosu");
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
    document.execCommand = () => false;
  });
  await mockTeacher(page, { list: [rooms[0]] });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/hesabim?bolum=siniflar");
  await expect(page.getByRole("button", { name: "3-A (1)" })).toBeVisible();
  await page.getByRole("button", { name: "Kodu Kopyalayın" }).click();
  await expect(page.getByRole("alert")).toHaveText("Kopyalanamadı. Yeniden deneyebilirsiniz.");
  await expect(page.getByText("Kopyalandı")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Kodu Kopyalayın" })).toBeVisible();
  await page.screenshot({ path: "test-results/teacher-after-single.png", fullPage: true, animations: "disabled" });
});
