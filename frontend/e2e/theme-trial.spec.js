import { expect, test } from "@playwright/test";

const user = { id: "u1", full_name: "Ada", role: "student", star_balance: 5, active_title: null };
const space = {
  id: "theme-space",
  type: "theme",
  slot: "theme",
  name_tr: "Uzay",
  name_en: "Space",
  price: 30,
  preview: { cell: "#f5f3fc", ink: "#35314f", line: "#827a9e", room: "#ece9f7" },
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
  "theme-space": { cell: "#f5f3fc", ink: "#35314f", line: "#827a9e", room: "#ece9f7" },
  "theme-forest": { cell: "#f4faf2", ink: "#244737", line: "#79927c", room: "#e8f1e3" },
  "theme-sea": { cell: "#f1f9fc", ink: "#234958", line: "#738f9b", room: "#e3f0f5" },
  "theme-candy": { cell: "#f2faf7", ink: "#2a4c49", line: "#74948b", room: "#e4f2ee" },
  "theme-night": { cell: "#f4f5fc", ink: "#353e60", line: "#7e87a3", room: "#e8ecf6" },
  "bg-dawn": { cell: "#fff8f1", ink: "#684531", line: "#aa876e", room: "#f8ebdd" },
  "bg-meadow": { cell: "#f8faef", ink: "#40532a", line: "#879668", room: "#eef2df" },
  "bg-ink": { cell: "#faf4fa", ink: "#35314f", line: "#967b96", room: "#f3e9f2" },
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
    if (width < 500) await page.getByRole("button", { name: "Menüyü aç/kapat" }).click();
    await page.getByRole("link", { name: "Oyunlar" }).click();
    await page.locator('a[href="/games/kare-karalamaca"]').click();
    await page.waitForURL("**/games/kare-karalamaca");
    await expect(page.getByTestId("shade-board")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("theme-scene").locator("img")).toHaveAttribute("src", `/themes/${file}`);
    await expect(page.getByRole("heading", { name: "Kare Karalamaca" })).toBeVisible();
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: `test-results/photo-${id}-${width}.png`, fullPage: true });
    await page.goto("/dukkan");
  }
  expect(errors).toEqual([]);
});
