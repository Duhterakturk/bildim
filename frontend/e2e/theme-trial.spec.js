import { expect, test } from "@playwright/test";

const user = { id: "u1", full_name: "Ada", role: "student", star_balance: 5, active_title: null };
const space = {
  id: "theme-space",
  type: "theme",
  slot: "theme",
  name_tr: "Uzay",
  name_en: "Space",
  price: 30,
  preview: { cell: "#f7f4fd", ink: "#2a2148", line: "#6a568f", room: "#b39ad4" },
  owned: false,
  equipped: false,
};

async function mock(page) {
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "test-token"));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/auth/me")) return route.fulfill({ json: user });
    if (url.includes("/profile")) return route.fulfill({ json: { stage: "chick", equipped: [], full_name: "Ada" } });
    if (url.includes("/shop")) return route.fulfill({ json: { star_balance: 5, items: [space] } });
    if (url.includes("/puzzles")) {
      return route.fulfill({
        json: {
          id: "attempt-kare",
          slug: "kare-karalamaca",
          difficulty: "easy",
          puzzle: { size: 5, rowClues: [[1], [1], [1], [1], [1]], colClues: [[1], [1], [1], [1], [1]] },
          hints: [],
        },
      });
    }
    return route.fulfill({ json: {} });
  });
}

const scenes = ["theme-space", "theme-candy", "theme-forest", "theme-sea", "theme-night", "bg-dawn", "bg-meadow", "bg-ink"];

test("each theme scene is visible on a phone", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "test-token"));
  const items = scenes.map((id) => ({
    id,
    type: id.startsWith("bg-") ? "background" : "theme",
    slot: id.startsWith("bg-") ? "background" : "theme",
    name_tr: id,
    name_en: id,
    price: 20,
    preview: { cell: "#fff", ink: "#111", line: "#333", room: "#eee" },
    owned: false,
    equipped: false,
  }));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me")) return route.fulfill({ json: user });
    if (url.includes("/profile")) return route.fulfill({ json: { stage: "egg", equipped: [] } });
    if (url.includes("/shop")) return route.fulfill({ json: { star_balance: 5, items } });
    return route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dukkan");
  for (const id of scenes) {
    await page.getByTestId(id.startsWith("bg-") ? "tab-background" : "tab-theme").click();
    const card = page.getByTestId(`card-${id}`);
    await expect(card.locator("img").first()).toBeVisible();
    await card.screenshot({ path: `test-results/theme-${id}-390.png` });
  }
});

test("trying a theme is temporary", async ({ page }) => {
  await mock(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dukkan");
  await page.getByTestId("card-theme-space").click();
  await page.getByTestId("preview-dialog").getByRole("button", { name: "Dene" }).click();
  await expect(page.locator("body")).toHaveClass(/theme-space/);
  await expect(page.getByTestId("theme-trial")).toContainText("30 yıldız daha lazım");
  await page.screenshot({ path: "test-results/theme-space-390.png", fullPage: true });
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await expect(page.locator("body")).not.toHaveClass(/theme-space/);
  await page.getByTestId("card-theme-space").click();
  await page.getByTestId("preview-dialog").getByRole("button", { name: "Dene" }).click();
  await page.evaluate(() => {
    window.history.pushState({}, "", "/games/kare-karalamaca");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.locator("body")).toHaveClass(/theme-space/);
  await page.reload();
  await expect(page.locator("body")).not.toHaveClass(/theme-space/);
});

const previews = {
  "theme-space": { cell: "#f7f4fd", ink: "#2a2148", line: "#6a568f", room: "#b39ad4" },
  "theme-forest": { cell: "#f4faf1", ink: "#143226", line: "#2f6a48", room: "#7fbf86" },
  "theme-sea": { cell: "#f3fafd", ink: "#0e3044", line: "#1f6f90", room: "#6eb4d4" },
  "theme-candy": { cell: "#f3fbf8", ink: "#123832", line: "#2f7a6c", room: "#7ed0c0" },
  "theme-night": { cell: "#f4f6fd", ink: "#1c2748", line: "#4d6294", room: "#8aa0d4" },
  "bg-dawn": { cell: "#fff8f2", ink: "#4a2812", line: "#c45a28", room: "#f0b07a" },
  "bg-meadow": { cell: "#f8fbef", ink: "#24340e", line: "#4f7420", room: "#b6d36a" },
  "bg-ink": { cell: "#fbf6fb", ink: "#3a2044", line: "#8a4e8c", room: "#d7a6dc" },
};

const photos = {
  "theme-space": "space.webp",
  "theme-forest": "forest.webp",
  "theme-sea": "sea.webp",
  "theme-candy": "aurora.webp",
  "theme-night": "night.webp",
  "bg-dawn": "dawn.webp",
  "bg-meadow": "meadow.webp",
  "bg-ink": "ink.webp",
};

test("each photo theme keeps the board and titles readable", async ({ page }, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const items = Object.keys(photos).map((id) => ({
    id,
    type: id.startsWith("bg-") ? "background" : "theme",
    slot: id.startsWith("bg-") ? "background" : "theme",
    name_tr: id === "theme-candy" ? "Kutup Işıkları" : id,
    name_en: id === "theme-candy" ? "Northern Lights" : id,
    price: 20,
    preview: previews[id],
    owned: false,
    equipped: false,
  }));
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "test-token"));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me")) return route.fulfill({ json: user });
    if (url.includes("/profile")) return route.fulfill({ json: { stage: "egg", equipped: [] } });
    if (url.includes("/shop")) return route.fulfill({ json: { star_balance: 5, items } });
    if (url.includes("/games") && !url.includes("/puzzles")) {
      return route.fulfill({ json: [{ id: 1, slug: "kare-karalamaca", name_tr: "Kare Karalamaca", name_en: "Square Shading", min_grade_level: 3 }] });
    }
    if (url.includes("/progress/unlocked")) {
      return route.fulfill({ json: { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5 } });
    }
    if (url.includes("/puzzles")) {
      return route.fulfill({
        json: {
          id: "p1",
          slug: "kare-karalamaca",
          difficulty: "easy",
          puzzle: { size: 5, rowClues: [[1], [1], [1], [1], [1]], colClues: [[1], [1], [1], [1], [1]] },
          hints: [],
        },
      });
    }
    return route.fulfill({ json: {} });
  });
  const width = info.project.name === "mobile" ? 390 : 1280;
  await page.setViewportSize({ width, height: info.project.name === "mobile" ? 844 : 800 });
  await page.goto("/dukkan");
  for (const [id, file] of Object.entries(photos)) {
    await page.getByTestId(id.startsWith("bg-") ? "tab-background" : "tab-theme").click();
    await page.getByTestId(`card-${id}`).click();
    await page.getByTestId("preview-dialog").getByRole("button", { name: "Dene" }).click();
    const lively = await page.getByTestId("theme-scene").locator("img").evaluate((img) => Number(getComputedStyle(img).opacity));
    expect(lively).toBeGreaterThanOrEqual(0.8);
    if (width < 500) await page.getByRole("button", { name: "Menüyü aç/kapat" }).click();
    await page.getByRole("link", { name: "Oyunlar" }).click();
    await page.locator('a[href="/games/kare-karalamaca"]').click();
    await page.waitForURL("**/games/kare-karalamaca");
    await expect(page.getByTestId("shade-board")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("theme-scene").locator("img")).toHaveAttribute("src", `/themes/${file}`);
    const calm = await page.getByTestId("theme-scene").locator("img").evaluate((img) => Number(getComputedStyle(img).opacity));
    expect(calm).toBeGreaterThan(0.35);
    expect(calm).toBeLessThan(0.7);
    await expect(page.getByRole("heading", { name: "Kare Karalamaca" })).toBeVisible();
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: `test-results/photo-${id}-${width}.png`, fullPage: true });
    await page.goto("/dukkan");
  }
  expect(errors).toEqual([]);
});
