import { expect, test } from "@playwright/test";

const givens = Array.from({ length: 9 }, () => Array(9).fill(0));

function api(handler) {
  return async (page) => {
    await page.route(/\/api\/(?!.*\.js)/, handler);
  };
}

function unlocked() {
  return { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5 };
}

async function expectFits(page, locator) {
  const box = await locator.boundingBox();
  const fit = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(fit.client + 1);
  expect(fit.scroll).toBeLessThanOrEqual(fit.client + 1);
}

test("sudoku keeps one save in flight, then retries or leaves the board", async ({ page }, info) => {
  let puzzlePosts = 0;
  let scorePosts = 0;
  let mode = "hold";
  let releaseHold = () => {};
  const held = new Promise((resolve) => {
    releaseHold = resolve;
  });
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await api(async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/check")) return route.fulfill({ json: { correct: true } });
    if (url.includes("/puzzles") && method === "POST") {
      puzzlePosts += 1;
      return route.fulfill({
        json: { id: `s${puzzlePosts}`, slug: "sudoku", difficulty: "easy", puzzle: { givens }, hints: [], hint_balance: 3 },
      });
    }
    if (url.includes("/scores") && method === "POST") {
      scorePosts += 1;
      if (scorePosts === 1) await held;
      if (mode === "offline") return route.fulfill({ status: 500, json: { error: "busy" } });
      if (mode === "saved") return route.fulfill({ status: 201, json: { score: { points: 10 }, new_badges: [] } });
      return route.fulfill({ status: 500, json: { error: "busy" } });
    }
    if (url.includes("/progress/unlocked")) return route.fulfill({ json: unlocked() });
    return route.fulfill({ json: {} });
  })(page);

  await page.goto("/games/sudoku");
  const input = page.locator("input:not([readonly])").first();
  await expect(input).toBeVisible();
  const opened = puzzlePosts;
  await input.fill("5");
  await page.getByRole("button", { name: "Kontrol Et" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Skorunuz kaydediliyor…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Yeni Bulmaca" })).toBeDisabled();
  expect(scorePosts).toBe(1);

  mode = "offline";
  releaseHold();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Skor kaydı doğrulanamadı");
  await expect(page.getByRole("button", { name: "Yeniden Deneyin", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Kaydetmeden Devam Edin" })).toBeVisible();
  await expectFits(page, alert);
  await page.screenshot({ path: `test-results/score-sudoku-${info.project.name}.png`, fullPage: true });

  mode = "saved";
  await page.getByRole("button", { name: "Yeniden Deneyin", exact: true }).click();
  await expect(page.getByRole("button", { name: "Yeniden Deneyin", exact: true })).toHaveCount(0);
  await expect(page.getByText("Skor kaydedildi.")).toBeVisible();
  expect(scorePosts).toBe(2);
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toHaveCount(0);
  await expect.poll(() => puzzlePosts).toBeGreaterThan(opened);
  await expect(page.getByText("Skor kaydı doğrulanamadı")).toHaveCount(0);
});

test("a rejected sudoku can be left without deleting the board", async ({ page }) => {
  let puzzlePosts = 0;
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await api(async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/check")) return route.fulfill({ json: { correct: true } });
    if (url.includes("/puzzles") && method === "POST") {
      puzzlePosts += 1;
      return route.fulfill({
        json: { id: `r${puzzlePosts}`, slug: "sudoku", difficulty: "easy", puzzle: { givens }, hints: [], hint_balance: 3 },
      });
    }
    if (url.includes("/scores") && method === "POST") {
      return route.fulfill({ status: 400, json: { error: "Çözüm kurallara uymuyor", code: "grade_rules" } });
    }
    if (url.includes("/progress/unlocked")) return route.fulfill({ json: unlocked() });
    return route.fulfill({ json: {} });
  })(page);

  await page.goto("/games/sudoku");
  const input = page.locator("input:not([readonly])").first();
  await expect(input).toBeVisible();
  await input.fill("5");
  await page.getByRole("button", { name: "Kontrol Et" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Çözüm kurallara uymuyor");
  await expect(page.getByRole("button", { name: "Yeniden Deneyin", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Yeni Bulmaca" })).toBeDisabled();
  await page.getByRole("button", { name: "Kaydetmeden Devam Edin" }).click();
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toHaveCount(0);
  await expect(page.getByText("Kayıt doğrulanmadan devam ediyorsunuz. Tahta duruyor.")).toBeVisible();
  await expect(input).toHaveValue("5");
  await input.fill("6");
  await expect(input).toHaveValue("6");

  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toBeVisible();
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await expect(input).toHaveValue("6");
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toHaveCount(0);

  const opened = puzzlePosts;
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect.poll(() => puzzlePosts).toBeGreaterThan(opened);
  await expect(page.getByText("Çözüm kurallara uymuyor")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Yeni Bulmaca" })).toBeEnabled();
});

test("an already saved sudoku does not lock the next puzzle", async ({ page }) => {
  let puzzlePosts = 0;
  let scorePosts = 0;
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await api(async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/check")) return route.fulfill({ json: { correct: true } });
    if (url.includes("/puzzles") && method === "POST") {
      puzzlePosts += 1;
      return route.fulfill({
        json: { id: `a${puzzlePosts}`, slug: "sudoku", difficulty: "easy", puzzle: { givens }, hints: [], hint_balance: 3 },
      });
    }
    if (url.includes("/scores") && method === "POST") {
      scorePosts += 1;
      return route.fulfill({ status: 409, json: { error: "Bu bulmacanın skoru zaten yazıldı", code: "score_already" } });
    }
    if (url.includes("/progress/unlocked")) return route.fulfill({ json: unlocked() });
    return route.fulfill({ json: {} });
  })(page);

  await page.goto("/games/sudoku");
  const input = page.locator("input:not([readonly])").first();
  await input.fill("5");
  await page.getByRole("button", { name: "Kontrol Et" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Bu bulmacanın skoru zaten kayıtlı." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Yeniden Deneyin", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Yeni Bulmaca" })).toBeEnabled();
  const opened = puzzlePosts;
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toHaveCount(0);
  await expect.poll(() => puzzlePosts).toBeGreaterThan(opened);
  expect(scorePosts).toBe(1);
  await expect(page.getByText("Bu bulmacanın skoru zaten kayıtlı.")).toHaveCount(0);
});

test("a marked puzzle can leave a failed score and keep the mark", async ({ page }, info) => {
  let puzzlePosts = 0;
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await api(async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/check")) return route.fulfill({ json: { correct: true } });
    if (url.includes("/puzzles") && method === "POST") {
      puzzlePosts += 1;
      return route.fulfill({
        json: {
          id: `k${puzzlePosts}`,
          slug: "kare-karalamaca",
          difficulty: "easy",
          puzzle: { size: 5, rowClues: [[1], [1], [1], [1], [1]], colClues: [[1], [1], [1], [1], [1]] },
          hints: [],
          hint_balance: 3,
        },
      });
    }
    if (url.includes("/scores") && method === "POST") {
      return route.fulfill({ status: 500, json: { error: "busy" } });
    }
    if (url.includes("/progress/unlocked")) return route.fulfill({ json: unlocked() });
    return route.fulfill({ json: {} });
  })(page);

  await page.goto("/games/kare-karalamaca");
  const cell = page.getByRole("button", { name: "1, 1" });
  await expect(cell).toBeVisible();
  await cell.click();
  await expect(cell).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Kontrol Et" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Skor kaydı doğrulanamadı");
  await expect(page.getByRole("button", { name: "Yeni Bulmaca" })).toBeDisabled();
  await expectFits(page, alert);
  await page.screenshot({ path: `test-results/score-mark-${info.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: "Kaydetmeden Devam Edin" }).click();
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toHaveCount(0);
  await expect(cell).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect(page.getByText("Yeni bulmaca, tahtadaki çalışmanızı siler.")).toBeVisible();
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await expect(cell).toHaveAttribute("aria-pressed", "true");

  const opened = puzzlePosts;
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expect.poll(() => puzzlePosts).toBeGreaterThan(opened);
  await expect(page.getByText("Skor kaydı doğrulanamadı")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "1, 1" })).toHaveAttribute("aria-pressed", "false");
});
