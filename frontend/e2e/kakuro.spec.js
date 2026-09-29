import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const rounds = JSON.parse(readFileSync(new URL("../../backend/tests/fixtures/rounds.json", import.meta.url), "utf8"));
const puzzle = rounds.kakuro.puzzle;
const answer = rounds.kakuro.answer;

test("an easy cross-sum solves and saves", async ({ page }, info) => {
  let saved = null;
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/puzzles") && route.request().method() === "POST" && !url.includes("/check")) {
      return route.fulfill({ json: { id: "k1", slug: "kakuro", difficulty: "easy", puzzle, hints: [], hint_balance: 3 } });
    }
    if (url.includes("/check")) {
      const body = route.request().postDataJSON();
      const correct = JSON.stringify(body.answer) === JSON.stringify(answer);
      return route.fulfill({ json: { correct } });
    }
    if (url.includes("/scores")) {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { points: 900, new_badges: [] } });
    }
    if (url.includes("/progress/unlocked")) return route.fulfill({ json: { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5 } });
    return route.fulfill({ json: {} });
  });

  await page.goto("/games/kakuro");
  const board = page.getByTestId("kakuro-board");
  await expect(board).toBeVisible();
  const block = board.locator("div").first();
  await expect(block).toHaveCSS("background-color", "rgb(74, 74, 74)");

  for (let r = 0; r < answer.length; r += 1) {
    for (let c = 0; c < answer[r].length; c += 1) {
      if (!answer[r][c]) continue;
      const input = page.getByLabel(`${r + 1}-${c + 1}`);
      if (await input.getAttribute("readonly") !== null) continue;
      await input.fill(String(answer[r][c]));
    }
  }
  await page.getByRole("button", { name: "Kontrol Et" }).click();
  await expect(page.getByText("Tebrikler, bulmacayı tamamladınız!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Kontrol Et" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Skoru Kaydet" })).toHaveCount(0);
  await expect(page.getByText("Skor kaydedildi.")).toBeVisible();
  expect(saved.answer).toEqual(answer);

  const clueSize = await board.locator("span").first().evaluate((node) => getComputedStyle(node).fontSize);
  expect(clueSize).toBe(info.project.name === "mobile" ? "13px" : "14px");
  const box = await board.boundingBox();
  expect(box.width).toBeLessThanOrEqual(info.project.name === "mobile" ? 390 : 1280);
  await page.screenshot({ path: `test-results/kakuro-${info.project.name}.png`, fullPage: true });
});
