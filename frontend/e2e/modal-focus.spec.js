import { expect, test } from "@playwright/test";

const game = { slug: "sudoku", name_tr: "Sudoku", name_en: "Sudoku", min_grade_level: 2 };
const space = {
  id: "theme-space",
  type: "theme",
  slot: "theme",
  name_tr: "Uzay",
  name_en: "Space",
  price: 30,
  preview: { cell: "#1b2436", ink: "#f4efe6", line: "#8ea0c0", room: "#121826" },
  owned: false,
  equipped: false,
};

async function tabUntil(page, locator) {
  for (let step = 0; step < 40; step += 1) {
    if (await locator.evaluate((node) => document.activeElement === node)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("odak hedefe ulasmadi");
}

async function cycle(page, steps, shift) {
  const seen = [];
  for (let step = 0; step < steps; step += 1) {
    await page.keyboard.press(shift ? "Shift+Tab" : "Tab");
    seen.push(await page.evaluate(() => {
      const dialog = document.querySelector("[role='dialog']");
      const active = document.activeElement;
      return {
        inside: Boolean(dialog?.contains(active)),
        name: (active?.getAttribute("aria-label") || active?.textContent || "").trim(),
      };
    }));
  }
  return seen;
}

function fitDialog() {
  const panel = document.querySelector("[role='dialog']");
  const close = panel?.querySelector("[data-dialog-close]");
  const panelRect = panel.getBoundingClientRect();
  const closeRect = close.getBoundingClientRect();
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  return {
    panelLeft: panelRect.left,
    panelRight: panelRect.right,
    panelTop: panelRect.top,
    panelBottom: panelRect.bottom,
    closeTop: closeRect.top,
    closeBottom: closeRect.bottom,
    closeLeft: closeRect.left,
    closeRight: closeRect.right,
    width,
    height,
    scroll: document.documentElement.scrollWidth,
    client: width,
    inert: document.getElementById("root")?.inert === true,
    locked: document.body.style.position === "fixed",
  };
}

test("how to play keeps keyboard focus inside and returns it", async ({ page }, info) => {
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/games")) return route.fulfill({ json: [game] });
    if (url.includes("/health")) return route.fulfill({ json: { status: "ok" } });
    return route.fulfill({ json: {} });
  });

  await page.goto("/games");
  const opener = page.getByRole("button", { name: "Nasıl oynanır" });
  await expect(opener).toBeVisible();
  await page.locator("body").click({ position: { x: 8, y: 8 } });
  await tabUntil(page, opener);
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Nasıl oynanır" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  const described = await dialog.getAttribute("aria-describedby");
  await expect(page.locator(`[id="${described}"]`)).not.toBeEmpty();

  const forward = await cycle(page, 4, false);
  expect(forward.every((step) => step.inside)).toBe(true);
  expect(forward.some((step) => step.name === "Kapatın")).toBe(true);
  const backward = await cycle(page, 4, true);
  expect(backward.every((step) => step.inside)).toBe(true);

  const trapped = await page.evaluate(() => {
    document.querySelector("#root a")?.focus();
    const node = document.querySelector("[role='dialog']");
    return node.contains(document.activeElement) || document.activeElement === node;
  });
  expect(trapped).toBe(true);

  const before = await page.evaluate(() => document.querySelector("main").getBoundingClientRect().top);
  await page.mouse.wheel(0, 900);
  const after = await page.evaluate(() => document.querySelector("main").getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThan(1);

  await page.evaluate(() => {
    const copy = document.querySelector("[role='dialog'] p");
    copy.textContent = "Uzun kural. ".repeat(80);
  });
  const view = page.viewportSize();
  await page.setViewportSize({ width: Math.round(view.width / 2), height: Math.round(view.height / 2) });
  const zoomed = await page.evaluate(fitDialog);
  expect(zoomed.inert).toBe(true);
  expect(zoomed.locked).toBe(true);
  expect(zoomed.panelLeft).toBeGreaterThanOrEqual(-1);
  expect(zoomed.panelRight).toBeLessThanOrEqual(zoomed.width + 1);
  expect(zoomed.panelTop).toBeGreaterThanOrEqual(-1);
  expect(zoomed.panelBottom).toBeLessThanOrEqual(zoomed.height + 1);
  expect(zoomed.closeTop).toBeGreaterThanOrEqual(zoomed.panelTop - 1);
  expect(zoomed.closeBottom).toBeLessThanOrEqual(zoomed.panelBottom + 1);
  expect(zoomed.closeLeft).toBeGreaterThanOrEqual(-1);
  expect(zoomed.closeRight).toBeLessThanOrEqual(zoomed.width + 1);
  expect(zoomed.scroll).toBeLessThanOrEqual(zoomed.client + 1);
  await page.screenshot({ path: `test-results/modal-how-${info.project.name}.png`, fullPage: false });

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.getElementById("root").inert)).toBe(false);
});

test("shop preview traps focus without buying or trying a theme", async ({ page }, info) => {
  let buys = 0;
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "test-token"));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me")) {
      return route.fulfill({ json: { id: "u1", full_name: "Ada", role: "student", star_balance: 40 } });
    }
    if (url.includes("/shop") && route.request().method() === "POST") {
      buys += 1;
      return route.fulfill({ json: { star_balance: 10, items: [{ ...space, owned: true }] } });
    }
    if (url.includes("/shop")) return route.fulfill({ json: { star_balance: 40, items: [space] } });
    if (url.includes("/profile")) return route.fulfill({ json: { stage: "chick", equipped: [] } });
    if (url.includes("/health")) return route.fulfill({ json: { status: "ok" } });
    return route.fulfill({ json: {} });
  });

  await page.goto("/dukkan");
  const card = page.getByTestId("card-theme-space");
  await expect(card).toBeVisible();
  await page.locator("body").click({ position: { x: 8, y: 8 } });
  await tabUntil(page, card);
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Uzay" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  expect(buys).toBe(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.boardTheme || "")).toBe("");

  const forward = await cycle(page, 6, false);
  expect(forward.every((step) => step.inside)).toBe(true);
  expect(forward.map((step) => step.name)).toEqual(expect.arrayContaining(["Deneyin", "Satın Alın", "Kapatın"]));
  const backward = await cycle(page, 6, true);
  expect(backward.every((step) => step.inside)).toBe(true);
  expect(buys).toBe(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.boardTheme || "")).toBe("");

  const view = page.viewportSize();
  await page.setViewportSize({ width: Math.round(view.width / 2), height: Math.round(view.height / 2) });
  const zoomed = await page.evaluate(fitDialog);
  expect(zoomed.inert).toBe(true);
  expect(zoomed.locked).toBe(true);
  expect(zoomed.panelLeft).toBeGreaterThanOrEqual(-1);
  expect(zoomed.panelRight).toBeLessThanOrEqual(zoomed.width + 1);
  expect(zoomed.panelTop).toBeGreaterThanOrEqual(-1);
  expect(zoomed.panelBottom).toBeLessThanOrEqual(zoomed.height + 1);
  expect(zoomed.closeTop).toBeGreaterThanOrEqual(zoomed.panelTop - 1);
  expect(zoomed.closeBottom).toBeLessThanOrEqual(Math.min(zoomed.panelBottom, zoomed.height) + 1);
  expect(zoomed.scroll).toBeLessThanOrEqual(zoomed.client + 1);
  await page.screenshot({ path: `test-results/modal-shop-${info.project.name}.png`, fullPage: false });

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(card).toBeFocused();
  expect(buys).toBe(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.boardTheme || "")).toBe("");

  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Uzay" })).toBeVisible();
  await tabUntil(page, page.getByRole("dialog").getByRole("button", { name: "Kapatın", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toBeFocused();
  expect(buys).toBe(0);
});
