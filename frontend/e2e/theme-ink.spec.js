import { expect, test } from "@playwright/test";

const themes = {
  "theme-space": { cell: "#f5f3fc", ink: "#35314f", line: "#827a9e", room: "#ece9f7", file: "space.webp" },
  "theme-night": { cell: "#f4f5fc", ink: "#353e60", line: "#7e87a3", room: "#e8ecf6", file: "night.webp" },
  "bg-ink": { cell: "#faf4fa", ink: "#35314f", line: "#967b96", room: "#f3e9f2", file: "ink.webp" },
  "theme-forest": { cell: "#f4faf2", ink: "#244737", line: "#79927c", room: "#e8f1e3", file: "forest.webp" },
  "theme-candy": { cell: "#f2faf7", ink: "#2a4c49", line: "#74948b", room: "#e4f2ee", file: "aurora.webp" },
};

const meadow = { cell: "#f8faef", ink: "#40532a", line: "#879668", room: "#eef2df" };
const zeros = Array.from({ length: 9 }, () => Array(9).fill(0));
zeros[0][0] = 5;

const puzzles = {
  sudoku: { givens: zeros },
  kendoku: {
    givens: [[4, 0], [0, 0]],
    cageId: [[0, 0], [1, 1]],
    cageAnchor: [[0, 0], [1, 1]],
    cageClues: ["6+", "3"],
  },
  futoshiki: {
    givens: [[5, 0], [0, 0]],
    horizontal: [{ r: 0, c: 0, sign: "<" }],
    vertical: [{ r: 0, c: 0, sign: "v" }],
  },
  kakuro: {
    size: 3,
    grid: [
      [{ type: "block" }, { type: "clue", down: 4 }, { type: "clue", down: 3 }],
      [{ type: "clue", right: 5 }, { type: "white", given: 2 }, { type: "white" }],
      [{ type: "clue", right: 3 }, { type: "white" }, { type: "white", given: 1 }],
    ],
  },
};

function shopItems(activeId, extra = []) {
  const items = Object.entries(themes).map(([id, preview]) => ({
    id,
    type: id.startsWith("bg-") ? "background" : "theme",
    slot: id.startsWith("bg-") ? "background" : "theme",
    name_tr: id,
    name_en: id,
    price: 20,
    preview,
    owned: true,
    equipped: id === activeId,
  }));
  return [...items, ...extra];
}

async function install(page, activeId, extra = []) {
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/auth/me")) return route.fulfill({ json: { id: "u1", full_name: "Ada", role: "student" } });
    if (url.includes("/shop")) return route.fulfill({ json: { star_balance: 5, items: shopItems(activeId, extra) } });
    if (url.includes("/progress/unlocked")) {
      return route.fulfill({ json: { unlocked: { easy: true, medium: true, hard: true }, progress: { easy: 5, medium: 5, hard: 0 }, threshold: 5 } });
    }
    if (url.includes("/puzzles")) {
      let slug = "sudoku";
      try {
        slug = route.request().postDataJSON()?.slug || slug;
      } catch { /* open uses a json body */ }
      return route.fulfill({ json: { id: "p1", slug, difficulty: "easy", puzzle: puzzles[slug] || puzzles.sudoku, hints: [] } });
    }
    return route.fulfill({ json: {} });
  });
}

test("soft themes keep digits readable and the panel leaves the photo", async ({ page }, info) => {
  test.setTimeout(120000);
  const width = info.project.name === "mobile" ? 390 : 1280;
  await page.setViewportSize({ width, height: info.project.name === "mobile" ? 844 : 800 });
  for (const [id, preview] of Object.entries(themes)) {
    await install(page, id);
    for (const slug of ["sudoku", "kendoku", "futoshiki", "kakuro"]) {
      await page.goto(`/games/${slug}`);
      const sample = page.locator("input").first();
      await expect(sample).toBeVisible();
      const colors = await sample.evaluate((node) => {
        const style = getComputedStyle(node);
        return { color: style.color, background: style.backgroundColor };
      });
      expect(colors.color).not.toBe("rgb(0, 0, 0)");
      expect(colors.background).not.toBe("rgb(255, 255, 255)");
      if (slug === "futoshiki") await expect(page.getByTestId("futo-sign").first()).toBeVisible();
      if (slug === "kendoku") await expect(page.getByTestId("cage-label").first()).toBeVisible();
      await page.screenshot({ path: `test-results/ink-${id}-${slug}-${width}.png` });
      const ink = preview.ink;
      const painted = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim());
      expect(painted.toLowerCase()).toBe(ink);
    }
  }
});

test("an equipped background supplies the photo and the theme supplies the colors", async ({ page }) => {
  await install(page, "theme-space", [{
    id: "bg-meadow",
    type: "background",
    slot: "background",
    name_tr: "Çayır",
    name_en: "Meadow",
    price: 20,
    preview: meadow,
    owned: true,
    equipped: true,
  }]);
  await page.goto("/games/sudoku");
  await expect(page.getByTestId("theme-scene").locator("img")).toHaveAttribute("src", "/themes/meadow.webp");
  await expect(page.locator("body")).toHaveClass(/theme-space/);
  const ink = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim());
  expect(ink.toLowerCase()).toBe("#35314f");
  await page.screenshot({ path: "test-results/ink-space-meadow.png" });
  await page.goto("/dukkan");
  await page.getByTestId("card-theme-forest").click();
  await page.getByTestId("preview-dialog").getByRole("button", { name: "Dene" }).click();
  await expect(page.getByTestId("theme-scene").locator("img")).toHaveAttribute("src", "/themes/meadow.webp");
  const tried = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim());
  expect(tried.toLowerCase()).toBe("#244737");
});
