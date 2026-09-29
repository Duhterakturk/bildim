import { expect, test } from "@playwright/test";

const zeros = Array.from({ length: 9 }, () => Array(9).fill(0));

test("five easy solves unlock medium without a save button", async ({ page }) => {
  let solves = 0;
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me")) return route.fulfill({ json: { id: "u1", full_name: "Ada", role: "student" } });
    if (url.includes("/puzzles") && route.request().method() === "POST" && !url.includes("/check")) {
      return route.fulfill({ json: { id: `p${solves + 1}`, slug: "sudoku", difficulty: "easy", puzzle: { givens: zeros }, hints: [] } });
    }
    if (url.includes("/check")) return route.fulfill({ json: { correct: true } });
    if (url.includes("/scores")) {
      solves += 1;
      return new Promise((resolve) => {
        setTimeout(() => resolve(route.fulfill({ json: { points: 100, new_badges: [], stars: { pieces: ["solve"] } } })), 300);
      });
    }
    if (url.includes("/progress/unlocked")) {
      return route.fulfill({
        json: {
          unlocked: { easy: true, medium: solves >= 5, hard: false },
          progress: { easy: solves, medium: 0, hard: 0 },
          threshold: 5,
        },
      });
    }
    return route.fulfill({ json: {} });
  });

  await page.goto("/games/sudoku");
  const medium = page.getByRole("button", { name: "Orta" });
  await expect(medium).toBeDisabled();

  for (let round = 0; round < 5; round += 1) {
    await page.getByRole("button", { name: "Kontrol Et" }).click();
    await expect(page.getByText("Skorunuz kaydediliyor…")).toBeVisible();
    await expect(page.getByText("Skor kaydedildi.")).toBeVisible();
    if (round === 4) {
      await expect(page.getByTestId("star-card")).toBeVisible();
      await page.getByTestId("star-card").getByRole("button", { name: "Tamam" }).click();
    } else {
      await expect(page.getByTestId("star-toast")).toBeVisible();
    }
    if (round < 4) await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  }

  await expect(page.getByTestId("level-opened")).toHaveText("Orta seviye açıldı!");
  await expect(medium).toBeEnabled();
  await expect(page.getByRole("button", { name: "Skoru Kaydet" })).toHaveCount(0);
  expect(solves).toBe(5);
});
