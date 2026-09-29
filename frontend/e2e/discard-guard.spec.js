import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const rounds = JSON.parse(readFileSync(new URL("../../backend/tests/fixtures/rounds.json", import.meta.url), "utf8"));
const kakuro = rounds.kakuro.puzzle;

function api(handler) {
  return async (page) => {
    await page.route(/\/api\/(?!.*\.js)/, handler);
  };
}

test("fill, notes, and a saved kakuro keep or drop work on purpose", async ({ page }, info) => {
  let puzzlePosts = 0;
  let releaseScore = () => {};
  const scoreHeld = new Promise((resolve) => {
    releaseScore = resolve;
  });
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await api(async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/puzzles") && method === "POST" && !url.includes("/check")) {
      puzzlePosts += 1;
      return route.fulfill({
        json: { id: `k${puzzlePosts}`, slug: "kakuro", difficulty: "easy", puzzle: kakuro, hints: [], hint_balance: 3 },
      });
    }
    if (url.includes("/check")) return route.fulfill({ json: { correct: true } });
    if (url.includes("/scores")) {
      await scoreHeld;
      return route.fulfill({ json: { points: 10, new_badges: [] } });
    }
    if (url.includes("/progress/unlocked")) {
      return route.fulfill({
        json: { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5 },
      });
    }
    return route.fulfill({ json: {} });
  })(page);

  await page.goto("/games/kakuro");
  const input = page.locator("input:not([readonly])").first();
  await expect(input).toBeVisible();
  const opened = puzzlePosts;

  await page.getByRole("button", { name: "Temizle", exact: true }).click();
  await expect(page.getByText("Tahtadaki çalışmanız silinir.")).toHaveCount(0);
  expect(puzzlePosts).toBe(opened);

  await input.fill("4");
  await page.getByRole("button", { name: "Temizle", exact: true }).click();
  await expect(page.getByText("Tahtadaki çalışmanız silinir.")).toBeVisible();
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await expect(input).toHaveValue("4");
  await expect(page.getByText("Tahtadaki çalışmanız silinir.")).toHaveCount(0);

  await page.getByRole("button", { name: "Temizle", exact: true }).click();
  await page.getByRole("button", { name: "Temizle", exact: true }).click();
  await expect(input).toHaveValue("");

  await page.getByRole("button", { name: "Not", exact: true }).click();
  await input.fill("2");
  await expect(page.locator(".cell-notes").first()).toContainText("2");
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toBeVisible();
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await expect(page.locator(".cell-notes").first()).toContainText("2");
  expect(puzzlePosts).toBe(opened);

  await input.fill("");
  await page.getByRole("button", { name: "Not açık" }).click();
  await input.fill("4");
  await page.getByRole("button", { name: "Kolay" }).click();
  await expect(page.getByText("Zorluk değişirse tahtadaki çalışmanız silinir.")).toBeVisible();
  const box = await page.getByRole("group", { name: "Zorluk değişirse tahtadaki çalışmanız silinir." }).boundingBox();
  const fit = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(fit.client + 1);
  expect(fit.scroll).toBeLessThanOrEqual(fit.client + 1);
  await page.screenshot({ path: `test-results/discard-kakuro-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await expect(input).toHaveValue("4");

  await page.getByRole("button", { name: "Kontrol Et" }).click();
  await expect(page.getByText("Skorunuz kaydediliyor…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Yeni Bulmaca" })).toBeDisabled();
  releaseScore();
  await expect(page.getByText("Skor kaydedildi.")).toBeVisible();
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toHaveCount(0);
  await expect.poll(() => puzzlePosts).toBeGreaterThan(opened);
});

test("a shaded mark stays until the new puzzle is confirmed", async ({ page }) => {
  let posts = 0;
  await api((route) => {
    const url = route.request().url();
    if (url.includes("/puzzles") && route.request().method() === "POST") {
      posts += 1;
      return route.fulfill({
        json: {
          id: `shade-${posts}`,
          slug: "kare-karalamaca",
          difficulty: "easy",
          puzzle: {
            size: 5,
            rowClues: [[1], [1], [1], [1], [1]],
            colClues: [[1], [1], [1], [1], [1]],
          },
          hints: [],
          hint_balance: 3,
        },
      });
    }
    if (url.includes("/progress/unlocked")) {
      return route.fulfill({
        json: { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5 },
      });
    }
    return route.fulfill({ json: {} });
  })(page);

  await page.goto("/games/kare-karalamaca");
  const cell = page.getByRole("button", { name: "1, 1" });
  await expect(cell).toBeVisible();
  const opened = posts;
  await page.getByRole("button", { name: "Temizle", exact: true }).click();
  await expect(page.getByText("Tahtadaki çalışmanız silinir.")).toHaveCount(0);

  await cell.click();
  await expect(cell).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toBeVisible();
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await expect(cell).toHaveAttribute("aria-pressed", "true");
  expect(posts).toBe(opened);

  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect.poll(() => posts).toBeGreaterThan(opened);
  await expect(page.getByRole("button", { name: "1, 1" })).toHaveAttribute("aria-pressed", "false");
});

test("a failed puzzle load can be tried again", async ({ page }) => {
  let allow = false;
  await api((route) => {
    const url = route.request().url();
    if (url.includes("/puzzles") && route.request().method() === "POST") {
      if (!allow) return route.fulfill({ status: 503, json: { error: "busy" } });
      return route.fulfill({
        json: { id: "k-retry", slug: "kakuro", difficulty: "easy", puzzle: kakuro, hints: [], hint_balance: 3 },
      });
    }
    if (url.includes("/progress/unlocked")) {
      return route.fulfill({
        json: { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5 },
      });
    }
    return route.fulfill({ json: {} });
  })(page);

  await page.goto("/games/kakuro");
  await expect(page.getByRole("alert")).toContainText("Bulmaca şu an açılamadı", { timeout: 15000 });
  allow = true;
  await page.getByRole("button", { name: "Yeniden Deneyin" }).click();
  await expect(page.getByRole("button", { name: "Kontrol Et" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
