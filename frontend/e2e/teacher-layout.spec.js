import { expect, test } from "@playwright/test";

const teacher = { id: "teacher-1", full_name: "Ada Deniz", role: "teacher", star_balance: 4, classroom_id: null };
const rooms = [
  { id: 7, name: "3-A", join_code: "KEDI42", student_count: 1 },
  { id: 8, name: "5-C", join_code: "MARTI1", student_count: 0 },
];

function student(id, name, points) {
  return {
    student: { id, full_name: name, grade_level: 3, active_title: null },
    total_completed: 1,
    distinct_games_completed: 1,
    total_points: points,
  };
}

async function mockTeacher(page) {
  await page.addInitScript((stored) => {
    localStorage.setItem("mindarena_access_token", "access");
    localStorage.setItem("mindarena_refresh_token", "refresh");
    localStorage.setItem("mindarena_user", JSON.stringify(stored));
  }, teacher);
  await page.route(/\/api\/(?!.*\.js)/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/auth/me")) return route.fulfill({ json: teacher });
    if (url.includes("/classrooms/mine")) return route.fulfill({ json: rooms });
    if (url.includes("/assignment") && method === "POST") {
      return route.fulfill({
        json: {
          assignments: [{ id: 3, slug: "kakuro", name_tr: "Kakuro", difficulty: "easy", difficulty_label: "Kolay", target_count: 1 }],
          class_total: 1,
          finished: [{ full_name: "Ada Öğrenci" }],
          pending_count: 0,
          sentence: "3-A bu hafta 1 bulmacayı tamamladı.",
        },
      });
    }
    if (url.includes("/classrooms") && method === "POST") {
      const body = route.request().postDataJSON();
      return route.fulfill({ json: { id: 11, name: body.name, join_code: "YENI11", student_count: 0 } });
    }
    if (url.includes("/progress/students")) {
      const id = new URL(url).searchParams.get("classroom_id");
      const rows = id === "8" ? [student(2, "Berk Öğrenci", 5)] : [student(1, "Ada Öğrenci", 20)];
      return route.fulfill({ json: rows });
    }
    if (url.includes("/assignment") && method === "GET") {
      const id = url.match(/classrooms\/(\d+)/)?.[1];
      if (id === "8") {
        return route.fulfill({ json: { assignments: [], class_total: 0, finished: [], pending_count: 0, sentence: "" } });
      }
      return route.fulfill({
        json: {
          assignments: [{ id: 1, slug: "kakuro", name_tr: "Kakuro", difficulty: "easy", difficulty_label: "Kolay", target_count: 2 }],
          class_total: 1,
          finished: [{ full_name: "Ada Öğrenci" }],
          pending_count: 0,
          sentence: "3-A bu hafta 1 bulmacayı tamamladı.",
        },
      });
    }
    if (url.includes("/games") && !url.includes("/games/")) {
      return route.fulfill({ json: [{ id: 1, slug: "kakuro", name_tr: "Kakuro", name_en: "Kakuro", min_grade_level: 3 }] });
    }
    if (url.includes("/profile")) return route.fulfill({ json: { stage: "chick", equipped: [] } });
    return route.fulfill({ json: {} });
  });
}

async function noOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("a teacher can run the class screen on a phone and a tablet", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "bu test 390 ve 820 genislikleri kendisi acar");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockTeacher(page);

  for (const [name, width, height] of [["phone", 390, 844], ["tablet", 820, 1180]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/hesabim?bolum=siniflar");
    await expect(page.getByRole("heading", { name: "Sınıflarım" })).toBeVisible();

    const menu = page.getByRole("button", { name: "Menüyü açın veya kapatın" });
    const phoneMenu = page.locator("nav div.border-t");
    if (width < 640) {
      await menu.click();
      await expect(phoneMenu.getByRole("link", { name: "Hesabım" })).toBeVisible();
      await menu.click();
      await expect(phoneMenu).toHaveCount(0);
    } else {
      await expect(menu).toBeHidden();
      await expect(page.getByRole("link", { name: "Hesabım" })).toBeVisible();
    }

    await page.getByRole("button", { name: "5-C (0)" }).click();
    await expect(page.getByText("MARTI1")).toBeVisible();
    await expect(page.getByText("Berk Öğrenci")).toBeVisible();
    await expect(page.getByText("Ada Öğrenci")).toHaveCount(0);

    await page.getByRole("button", { name: "3-A (1)" }).click();
    await expect(page.getByText("KEDI42")).toBeVisible();
    await expect(page.getByText("Ada Öğrenci").first()).toBeVisible();
    await expect(page.getByText("Hedef: 2 kolay Kakuro")).toBeVisible();
    await expect(page.getByText("Berk Öğrenci")).toHaveCount(0);

    await page.getByRole("button", { name: "Kodu Kopyalayın" }).click();
    await expect(page.getByRole("status")).toHaveText("Kopyalandı");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("KEDI42");

    await page.getByRole("button", { name: "Kakuro", exact: true }).click();
    await page.getByRole("button", { name: "Ödevi Kaydedin" }).click();
    await expect(page.getByText("Hedef: 1 kolay Kakuro")).toBeVisible();

    await page.getByRole("button", { name: "Yeni Sınıf Oluşturun" }).click();
    await page.getByLabel("Sınıf adı").fill("2-B");
    const dialog = page.locator("form").filter({ has: page.getByLabel("Sınıf adı") });
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "Sınıfı Oluşturun" }).click();
    await expect(page.getByText("YENI11")).toBeVisible();
    await expect(page.getByRole("button", { name: "2-B (0)" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Şifre Belirleyin" }).click();
    await expect(page.getByLabel("Yeni şifre")).toBeVisible();
    await page.getByRole("button", { name: "Vazgeç" }).click();
    await expect(page.getByLabel("Yeni şifre")).toHaveCount(0);

    await page.getByText("Velilerle Paylaşılacak Mesaj").click();
    await expect(page.getByRole("button", { name: "Notu Kopyalayın" })).toBeVisible();

    const copy = page.getByRole("button", { name: "Kodu Kopyalayın" });
    await expect(copy).toBeVisible();
    expect(await copy.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await noOverflow(page);
    await page.screenshot({ path: `test-results/teacher-layout-${name}.png`, fullPage: true, animations: "disabled" });
  }
});
