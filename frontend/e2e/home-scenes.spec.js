import { expect, test } from "@playwright/test";

const user = { id: "u1", full_name: "Ada", role: "student", star_balance: 40 };

const scenes = {
  "theme-space": { type: "theme", cell: "#f7f4fd", ink: "#2a2148", line: "#6a568f", room: "#b39ad4" },
  "theme-forest": { type: "theme", cell: "#f4faf1", ink: "#143226", line: "#2f6a48", room: "#7fbf86" },
  "theme-sea": { type: "theme", cell: "#f3fafd", ink: "#0e3044", line: "#1f6f90", room: "#6eb4d4" },
  "theme-candy": { type: "theme", cell: "#f3fbf8", ink: "#123832", line: "#2f7a6c", room: "#7ed0c0" },
  "theme-night": { type: "theme", cell: "#f4f6fd", ink: "#1c2748", line: "#4d6294", room: "#8aa0d4" },
  "bg-dawn": { type: "background", cell: "#fff8f2", ink: "#4a2812", line: "#c45a28", room: "#f0b07a" },
  "bg-meadow": { type: "background", cell: "#f8fbef", ink: "#24340e", line: "#4f7420", room: "#b6d36a" },
  "bg-ink": { type: "background", cell: "#fbf6fb", ink: "#3a2044", line: "#8a4e8c", room: "#d7a6dc" },
};

function channels(color) {
  const parts = color.match(/[\d.]+/g).map(Number);
  const raw = parts.slice(0, 3);
  return raw.map((value) => (value <= 1 ? value : value / 255));
}

function lum(color) {
  const lin = channels(color).map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(fg, bg) {
  const [lighter, darker] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("home headline stays readable on every scene", async ({ page }, info) => {
  const tag = info.project.name;
  let active = "theme-forest";
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/auth/me")) return route.fulfill({ json: user });
    const scene = scenes[active];
    if (url.includes("/shop") || url.includes("/profile")) {
      return route.fulfill({
        json: {
          star_balance: 40,
          stage: "chick",
          equipped: [active],
          items: [{
            id: active,
            type: scene.type,
            slot: scene.type,
            name_tr: active,
            name_en: active,
            price: 30,
            owned: true,
            equipped: true,
            preview: { cell: scene.cell, ink: scene.ink, line: scene.line, room: scene.room },
          }],
        },
      });
    }
    return route.fulfill({ json: {} });
  });

  for (const id of Object.keys(scenes)) {
    active = id;
    await page.goto("/");
    const line = page.getByRole("heading", { name: "Bir bulmacayla başlayalım." });
    await expect(line).toBeVisible();
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    await expect(page.getByTestId("theme-scene").locator("img")).toBeVisible();
    const box = await line.evaluate((node) => {
      const style = getComputedStyle(node);
      const root = document.documentElement;
      return {
        radius: parseFloat(style.borderRadius),
        width: node.getBoundingClientRect().width,
        page: root.scrollWidth > root.clientWidth + 1,
        ink: style.color,
        surface: getComputedStyle(node.closest(".home-workshop")).backgroundColor,
      };
    });
    await page.screenshot({ path: `test-results/home-${id}-${tag}.png`, fullPage: true, animations: "disabled" });
    expect(box.page, id).toBe(false);
    expect(box.width, id).toBeLessThan(tag === "mobile" ? 360 : 520);
    expect(box.radius, id).toBeLessThan(20);
    expect(contrast(box.ink, box.surface), `${id} ${box.ink} on ${box.surface}`).toBeGreaterThanOrEqual(4.5);
  }
});

test("shop, game list, and boards keep the longer text inside", async ({ page }, info) => {
  const tag = info.project.name;
  const zeros = Array.from({ length: 9 }, () => Array(9).fill(0));
  zeros[0][0] = 5;
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "access"));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/auth/me")) return route.fulfill({ json: user });
    if (url.includes("/profile")) return route.fulfill({ json: { stage: "chick", equipped: ["theme-forest"], full_name: "Ada" } });
    if (url.includes("/shop")) {
      return route.fulfill({
        json: {
          star_balance: 40,
          items: [
            {
              id: "theme-forest",
              type: "theme",
              slot: "theme",
              name_tr: "Orman",
              name_en: "Forest",
              price: 30,
              owned: true,
              equipped: false,
              preview: scenes["theme-forest"],
            },
            {
              id: "bg-meadow",
              type: "background",
              slot: "background",
              name_tr: "Çayır",
              name_en: "Meadow",
              price: 20,
              owned: true,
              equipped: false,
              preview: scenes["bg-meadow"],
            },
            {
              id: "theme-sea",
              type: "theme",
              slot: "theme",
              name_tr: "Deniz",
              name_en: "Sea",
              price: 30,
              owned: false,
              equipped: false,
              preview: scenes["theme-sea"],
            },
          ],
        },
      });
    }
    if (url.includes("/games") && !url.includes("/puzzles") && !url.includes("/games/")) {
      return route.fulfill({
        json: [
          { id: 1, slug: "kare-karalamaca", name_tr: "Kare Karalamaca", name_en: "Square Shading", min_grade_level: 3 },
          { id: 2, slug: "sudoku", name_tr: "Sudoku", name_en: "Sudoku", min_grade_level: 3 },
        ],
      });
    }
    if (url.includes("/progress/unlocked")) {
      return route.fulfill({ json: { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5, games: {} } });
    }
    if (url.includes("/puzzles")) {
      const body = route.request().postDataJSON?.() || {};
      const puzzle = body.slug === "sudoku"
        ? { givens: zeros }
        : { size: 5, rowClues: [[1], [1], [1], [1], [1]], colClues: [[1], [1], [1], [1], [1]] };
      return route.fulfill({ json: { id: "p1", slug: body.slug, difficulty: "easy", puzzle, hints: [] } });
    }
    return route.fulfill({ json: {} });
  });

  await page.goto("/dukkan");
  await expect(page.getByRole("button", { name: "Satın Alın" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kullanın" })).toBeVisible();
  await page.screenshot({ path: `test-results/copy-shop-${tag}.png`, fullPage: true });

  await page.goto("/games");
  await expect(page.getByText("Önerilen en düşük sınıf düzeyi").first()).toBeVisible();
  await page.screenshot({ path: `test-results/copy-games-${tag}.png`, fullPage: true });

  await page.goto("/games/kare-karalamaca");
  await expect(page.getByRole("heading", { name: "Kare Karalamaca" })).toBeVisible();
  await expect(page.getByTestId("shade-board")).toBeVisible();
  await page.screenshot({ path: `test-results/copy-nonogram-${tag}.png` });

  await page.goto("/games/sudoku");
  await expect(page.getByRole("heading", { name: "Sudoku" })).toBeVisible();
  await page.screenshot({ path: `test-results/copy-sudoku-${tag}.png` });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});
