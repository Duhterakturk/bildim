import { expect, test } from "@playwright/test";

const kendoku = {
  id: "k1",
  puzzle: {
    givens: [[0, 0], [0, 0]],
    cageId: [[0, 0], [1, 1]],
    cageAnchor: [[0, 0], [1, 1]],
    cageClues: ["6+", "3"],
  },
  hints: [],
};

const futoshiki = {
  id: "f1",
  puzzle: {
    givens: [[0, 0], [0, 0]],
    horizontal: [{ r: 0, c: 0, sign: "<" }],
    vertical: [{ r: 0, c: 0, sign: "v" }],
  },
  hints: [],
};

async function hit(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  return page.evaluate(({ x, y }) => {
    const node = document.elementFromPoint(x, y);
    return node?.getAttribute("data-testid") || node?.textContent || "";
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
}

test("cage labels and comparison signs are the top element", async ({ page }) => {
  const unlocked = [];
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/progress/unlocked")) {
      unlocked.push(url);
      return route.fulfill({ json: {} });
    }
    if (url.includes("/puzzles")) {
      const body = route.request().postDataJSON?.() || {};
      return route.fulfill({ json: body.slug === "futoshiki" ? futoshiki : kendoku });
    }
    if (url.includes("/health")) return route.fulfill({ json: { status: "ok" } });
    return route.continue();
  });

  await page.goto("/games/kendoku");
  const label = page.getByTestId("cage-label").first();
  await expect(label).toBeVisible();
  await expect(label).toContainText("6+");
  expect(await hit(page, label)).toBe("cage-label");
  await page.screenshot({ path: "test-results/kendoku.png", fullPage: true });

  await page.goto("/games/futoshiki");
  const signs = page.getByTestId("futo-sign");
  await expect(signs).toHaveCount(2);
  await expect(signs.nth(0)).toHaveText("<");
  await expect(signs.nth(1)).toHaveText("∨");
  expect(await hit(page, signs.nth(0))).toBe("futo-sign");
  expect(await hit(page, signs.nth(1))).toBe("futo-sign");
  await page.screenshot({ path: "test-results/futoshiki.png", fullPage: true });
  expect(unlocked).toEqual([]);
});
