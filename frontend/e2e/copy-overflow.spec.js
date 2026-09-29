import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const rounds = JSON.parse(readFileSync(new URL("../../backend/tests/fixtures/rounds.json", import.meta.url), "utf8"));
const kakuro = rounds.kakuro.puzzle;

function fulfill(route, json) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
}

async function overflows(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const pageOverflow = root.scrollWidth > root.clientWidth + 1;
    const nodes = [...document.querySelectorAll("h1, h2, p, button, label, a")];
    const clipped = nodes
      .filter((node) => node.scrollWidth > node.clientWidth + 2)
      .map((node) => (node.innerText || node.value || node.getAttribute("aria-label") || "").trim().slice(0, 80))
      .filter(Boolean);
    return { pageOverflow, clipped };
  });
}

test("register, profile, teacher, and game messages stay inside the screen", async ({ page }, info) => {
  const tag = info.project.name;
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Kayıt Ol" })).toBeVisible();
  await expect(page.getByText("Şifrenizi unutursanız bu kelime sorulur.")).toBeVisible();
  await page.screenshot({ path: `test-results/copy-register-${tag}.png`, fullPage: true });
  const register = await overflows(page);
  expect(register.pageOverflow, register.clipped.join(" | ")).toBe(false);

  await page.addInitScript(() => {
    localStorage.setItem("mindarena_access_token", "access");
    localStorage.setItem("mindarena_refresh_token", "refresh");
  });
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/auth/me")) return fulfill(route, { id: 1, full_name: "Ayse Hoca", role: "teacher" });
    if (url.includes("/auth/refresh")) return fulfill(route, { access_token: "new-access" });
    if (url.includes("/classrooms/mine")) {
      return fulfill(route, [{ id: 7, name: "3-A", join_code: "KEDI42", student_count: 1 }]);
    }
    if (url.includes("/progress/students")) {
      return fulfill(route, [{
        student: { id: 3, full_name: "Ali Demir", grade_level: 3 },
        total_completed: 2,
        distinct_games_completed: 1,
        total_points: 12,
      }]);
    }
    if (url.includes("/assignment")) return fulfill(route, { assignments: [] });
    if (url.includes("/games") && !url.includes("/games/")) {
      return fulfill(route, [{ slug: "kakuro", name_tr: "Kakuro", name_en: "Kakuro", min_grade_level: 3 }]);
    }
    if (url.includes("/certificates")) return fulfill(route, []);
    if (url.includes("/puzzles") && route.request().method() === "POST") {
      return fulfill(route, { id: "k1", slug: "kakuro", difficulty: "easy", puzzle: kakuro, hints: [], hint_balance: 3 });
    }
    if (url.includes("/check")) return fulfill(route, { correct: false });
    if (url.includes("/progress/unlocked")) {
      return fulfill(route, { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5 });
    }
    return fulfill(route, {});
  });

  await page.goto("/profil");
  await expect(page.getByRole("heading", { name: "Profil adınızı düzenleyin" })).toBeVisible();
  await expect(page.getByText("Lütfen bu alana şifrenizi yazmayınız.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Değişiklikleri Kaydet" })).toBeVisible();
  await page.screenshot({ path: `test-results/copy-profile-${tag}.png`, fullPage: true });
  const profile = await overflows(page);
  expect(profile.pageOverflow, profile.clipped.join(" | ")).toBe(false);

  await page.goto("/teacher");
  await expect(page.getByRole("heading", { name: "Öğretmen Paneli" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sınıfı Oluşturun" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Notu Kopyalayın" })).toBeVisible();
  await page.screenshot({ path: `test-results/copy-teacher-${tag}.png`, fullPage: true });
  const teacher = await overflows(page);
  expect(teacher.pageOverflow, teacher.clipped.join(" | ")).toBe(false);

  await page.goto("/games/kakuro");
  await page.getByRole("button", { name: "Kontrol Et" }).click();
  const note = page.getByText("Bazı kareler henüz yerinde değil. Çözümünüzü yeniden kontrol edebilirsiniz.");
  await expect(note).toBeVisible();
  await page.screenshot({ path: `test-results/copy-kakuro-${tag}.png`, fullPage: true });
  const game = await overflows(page);
  expect(game.pageOverflow, game.clipped.join(" | ")).toBe(false);
  const noteBox = await note.evaluate((node) => ({
    scroll: node.scrollWidth,
    client: node.clientWidth,
  }));
  expect(noteBox.scroll).toBeLessThanOrEqual(noteBox.client + 2);
});
