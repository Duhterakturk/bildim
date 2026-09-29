import { expect, test } from "@playwright/test";

const puzzle = {
  id: "attempt-kare",
  slug: "kare-karalamaca",
  difficulty: "easy",
  puzzle: {
    size: 5,
    rowClues: [[1], [1], [1], [1], [1]],
    colClues: [[1], [1], [1], [1], [1]],
  },
  hints: [],
  hint_balance: 3,
};

function times(part, count) {
  return Array.from({ length: count }, () => part);
}

const packs = {
  easy: [...times("solve", 1), ...times("no_hint", 1), ...times("fast", 1)],
  medium: [...times("solve", 2), ...times("no_hint", 2), ...times("fast", 2)],
  hard: [...times("solve", 3), ...times("no_hint", 3), ...times("fast", 3)],
};

async function mock(page, starsFor) {
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/auth/me")) return route.fulfill({ json: { id: "u1", full_name: "Ada", role: "student" } });
    if (url.includes("/progress/unlocked")) {
      return route.fulfill({
        json: {
          unlocked: { easy: true, medium: true, hard: true },
          progress: { easy: 5, medium: 5, hard: 0 },
          threshold: 5,
        },
      });
    }
    if (url.includes("/puzzles") && !url.includes("/check")) return route.fulfill({ json: puzzle });
    if (url.includes("/check")) {
      return route.fulfill({ json: { correct: true, stars: starsFor() } });
    }
    if (url.includes("/scores")) return route.fulfill({ json: { points: 10, new_badges: [], stars: starsFor() } });
    return route.fulfill({ json: {} });
  });
}

test("easy, medium and hard list the real star counts", async ({ page }) => {
  let difficulty = "easy";
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await mock(page, () => ({ earned: packs[difficulty].length, pieces: packs[difficulty] }));
  await page.goto("/games/kare-karalamaca");

  const expectPack = async (level, lines, total) => {
    difficulty = level;
    if (level !== "easy") {
      await page.getByRole("button", { name: level === "medium" ? "Orta" : "Zor" }).click();
    }
    await page.getByRole("button", { name: "Kontrol Et" }).click();
    const toast = page.getByTestId("star-toast");
    await expect(toast).toBeVisible();
    await expect(page.getByTestId("star-card")).toHaveCount(0);
    for (const line of lines) await expect(toast).toContainText(line);
    await expect(page.getByTestId("star-total")).toHaveText(total);
    const board = await page.getByTestId("shade-board").boundingBox();
    const buttons = await page.getByRole("button", { name: "Kontrol Et" }).boundingBox();
    const note = await toast.boundingBox();
    expect(note.y).toBeGreaterThan(board.y + board.height - 4);
    expect(note.y).toBeGreaterThan(buttons.y + buttons.height - 4);
    await page.screenshot({ path: `test-results/stars-${level}.png` });
    await expect(toast).toBeHidden({ timeout: 4000 });
  };

  await expectPack("easy", ["Çözdünüz +1", "İpucusuz +1", "Hızlı +1"], "Bu bulmacadan 3 yıldız");
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expectPack("medium", ["Çözdünüz +2", "İpucusuz +2", "Hızlı +2"], "Bu bulmacadan 6 yıldız");
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await expectPack("hard", ["Çözdünüz +3", "İpucusuz +3", "Hızlı +3"], "Bu bulmacadan 9 yıldız");
});

test("a normal solve closes the toast and a record fills the screen", async ({ page }) => {
  let record = false;
  await mock(page, () => ({
    earned: 1,
    pieces: ["solve"],
    new_record: record,
    improved_by: 4,
  }));
  await page.goto("/games/kare-karalamaca");
  await page.getByRole("button", { name: "Kontrol Et" }).click();
  const toast = page.getByTestId("star-toast");
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("Çözdünüz +1");
  await page.waitForTimeout(1000);
  await expect(toast).toBeVisible();
  await expect(toast).toBeHidden({ timeout: 3000 });

  record = true;
  await page.getByRole("button", { name: "Yeni Bulmaca" }).click();
  await page.getByRole("button", { name: "Kontrol Et" }).click();
  const card = page.getByTestId("star-card");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("confetti")).toBeVisible();
  await expect(card).toContainText("Yeni rekor");
  await page.waitForTimeout(3200);
  await expect(card).toBeVisible();
  await page.screenshot({ path: "test-results/stars-record.png" });
});
