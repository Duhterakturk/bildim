import { expect, test } from "@playwright/test";

const teacher = { id: "teacher-1", full_name: "Ada Deniz", role: "teacher", star_balance: 4, classroom_id: null };
const student = { id: "student-1", full_name: "Ada Deniz", role: "student", star_balance: 4, classroom_id: null };
const individual = { id: "individual-1", full_name: "Ada Deniz", role: "individual", star_balance: 4, classroom_id: null };

async function mock(page, user, { failCode = "class_name_required" } = {}) {
  await page.addInitScript((stored) => {
    localStorage.setItem("mindarena_access_token", "access");
    localStorage.setItem("mindarena_refresh_token", "refresh");
    localStorage.setItem("mindarena_user", JSON.stringify(stored));
    localStorage.setItem("mindarena_lang", "tr");
  }, user);
  await page.route(/\/api\/(?!.*\.js)/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/auth/me")) return route.fulfill({ json: user });
    if (url.includes("/classrooms/mine")) {
      return route.fulfill({ json: [{ id: 7, name: "3-A Uzun Sınıf Adı", join_code: "KEDI42", student_count: 1 }] });
    }
    if (url.includes("/classrooms") && method === "POST") {
      const body = failCode
        ? { error: "Sınıf adı gerekli.", code: failCode }
        : { error: "Sınıf adı gerekli." };
      return route.fulfill({ status: 400, json: body });
    }
    if (url.includes("/progress/students")) {
      return route.fulfill({ json: [{
        student: { id: 1, full_name: "Ada Öğrenci", grade_level: 3, active_title: null },
        total_completed: 2,
        distinct_games_completed: 1,
        total_points: 1200,
      }] });
    }
    if (url.includes("/assignment") && method === "GET") {
      return route.fulfill({ json: {
        assignments: [{
          id: 1,
          slug: "kakuro",
          name_tr: "Kakuro",
          name_en: "Kakuro",
          difficulty: "easy",
          difficulty_label: "Kolay",
          target_count: 2,
        }],
        class_total: 1,
        finished: [],
        pending_count: 1,
        sentence: "3-A bu hafta 1 bulmacayı tamamladı.",
      } });
    }
    if (url.includes("/assignments/mine")) {
      return route.fulfill({ json: {
        assignments: [{
          id: 1,
          slug: "kakuro",
          name_tr: "Kakuro",
          name_en: "Kakuro",
          difficulty: "easy",
          difficulty_label: "Kolay",
          target_count: 2,
          done_count: 0,
          finished: false,
        }],
      } });
    }
    if (url.includes("/games") && !url.includes("/games/")) {
      return route.fulfill({ json: [{ id: 1, slug: "kakuro", name_tr: "Kakuro", name_en: "Kakuro", min_grade_level: 3 }] });
    }
    if (url.includes("/progress")) return route.fulfill({ json: { total_completed: 0, total_points: 0, distinct_games_completed: 0, per_game: [] } });
    if (url.includes("/badges")) return route.fulfill({ json: [] });
    if (url.includes("/profile")) return route.fulfill({ json: { stage: "chick", equipped: [] } });
    if (url.includes("/health")) return route.fulfill({ json: { status: "ok" } });
    return route.fulfill({ json: {} });
  });
}

test("the open teacher screen switches language without a reload", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "tek kosu");
  await mock(page, teacher);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/hesabim?bolum=siniflar");
  await expect(page.getByRole("heading", { name: "Sınıflarım" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bu haftanın ödevi" })).toBeVisible();
  await expect(page.getByText("Hedef: 2 kolay Kakuro")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Öğrenciler", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/bolum=siniflar/);
  await expect(page.getByRole("heading", { name: "My classes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This week's homework" })).toBeVisible();
  await expect(page.getByText("Target: 2 easy Kakuro")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Students", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Öğrenciler", exact: true })).toHaveCount(0);
  await expect(page.getByText("Kolay")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy the code" })).toBeVisible();

  await page.getByRole("button", { name: "Create a class" }).click();
  await page.getByLabel("Class name").fill("2-B");
  await page.getByRole("button", { name: "Create class" }).click();
  await expect(page.getByRole("alert")).toHaveText("A class name is required.");
  await expect(page.getByText("Sınıf adı gerekli.")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText("Message to share with families").click();
  await expect(page.getByText("Dear families,")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: "TR", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Öğrenciler", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText("Sınıf adı gerekli.");
});

test("student and individual account text follows the selected language", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "tek kosu");
  await mock(page, student);
  await page.goto("/hesabim?bolum=sinif");
  await expect(page.getByRole("button", { name: "Katılın" })).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("button", { name: "Join" })).toBeVisible();

  await mock(page, { ...student, classroom_id: 7, classroom_name: "3-A" });
  await page.goto("/hesabim?bolum=sinif");
  await expect(page.getByText("2 kolay Kakuro")).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByText("2 easy Kakuro")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to the puzzle" })).toBeVisible();
  await expect(page.getByText("Kolay")).toHaveCount(0);

  await mock(page, individual);
  await page.goto("/hesabim?bolum=ilerleme");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your progress" })).toBeVisible();
  await expect(page.getByText("You have not finished a puzzle yet.")).toBeVisible();
  await expect(page.getByText(/account\./)).toHaveCount(0);
});
