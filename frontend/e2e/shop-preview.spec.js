import { expect, test } from "@playwright/test";

const user = { id: "u1", full_name: "Ada", role: "student", star_balance: 40, active_title: null };

function catalog(ownedLittle) {
  return [
    {
      id: "theme-space",
      type: "theme",
      slot: "theme",
      name_tr: "Uzay",
      name_en: "Space",
      price: 30,
      preview: { cell: "#1b2436", ink: "#f4efe6", line: "#8ea0c0", room: "#121826" },
      owned: false,
      equipped: false,
    },
    {
      id: "owl-little",
      type: "owl",
      slot: "collection",
      name_tr: "Kukumav",
      name_en: "Little Owl",
      price: 15,
      rarity: "common",
      photo: "little.webp",
      fact_tr: "Gündüz de uyanık kalır ve ağaç kovuklarına ya da taş duvarlara yuva yapar.",
      fact_en: "It often stays awake by day and nests in holes in trees or stone walls.",
      preview: {},
      owned: ownedLittle,
      equipped: false,
    },
    {
      id: "owl-snowy",
      type: "owl",
      slot: "collection",
      name_tr: "Kar Baykuşu",
      name_en: "Snowy Owl",
      price: 80,
      rarity: "legendary",
      photo: "snowy.webp",
      fact_tr: "Kuzey kutup tundrasında yaşar ve tüyleri neredeyse bembeyazdır.",
      fact_en: "It lives on the Arctic tundra, and its feathers are nearly all white.",
      preview: {},
      owned: false,
      equipped: false,
    },
    {
      id: "bg-ink",
      type: "background",
      slot: "background",
      name_tr: "Mürekkep",
      name_en: "Ink",
      price: 20,
      preview: { cell: "#14161f", ink: "#f4efe6", line: "#a78bfa", room: "#1a1c28" },
      owned: false,
      equipped: false,
    },
  ];
}

test("unowned owl cards are gray, and buying one brings the color back", async ({ page }) => {
  let ownedLittle = false;
  await page.addInitScript(() => localStorage.setItem("mindarena_access_token", "test-token"));
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/auth/me")) return route.fulfill({ json: user });
    if (url.includes("/health")) return route.fulfill({ json: { status: "ok" } });
    if (url.includes("/certificates")) return route.fulfill({ json: [] });
    if (url.includes("/profile")) {
      return route.fulfill({
        json: {
          stage: "chick",
          equipped: [],
          full_name: "Ada",
          star_balance: ownedLittle ? 25 : 40,
          collection: { owned: ownedLittle ? 1 : 0, total: 12 },
          titles: [],
          records: [],
          solved: 10,
          next: { stage: "young", remaining: 40 },
          active_title: null,
        },
      });
    }
    if (url.includes("/shop")) {
      if (route.request().method() === "POST") ownedLittle = true;
      return route.fulfill({ json: { star_balance: ownedLittle ? 25 : 40, items: catalog(ownedLittle) } });
    }
    return route.fulfill({ json: {} });
  });

  await page.goto("/dukkan");
  const viewport = page.viewportSize();
  for (const key of ["theme", "collection", "background"]) {
    await page.getByTestId(`tab-${key}`).click();
    const box = await page.getByTestId(/^card-/).first().boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  }

  await page.getByTestId("tab-collection").click();
  const locked = page.getByTestId("card-owl-little").locator("img");
  await expect(locked).toHaveAttribute("data-owned", "0");
  await expect(locked).toHaveClass(/grayscale/);
  await expect(page.getByTestId("card-owl-little")).toContainText("Kukumav");
  await expect(page.getByTestId("card-owl-little")).not.toContainText("Little Owl");
  await expect(page.getByTestId("card-owl-little")).toContainText("Yaygın");
  await expect(page.getByTestId("card-owl-little")).toContainText("15");
  await expect(page.getByTestId("card-owl-snowy")).toHaveClass(/owl-legendary/);
  const radius = await page.locator("[data-shop-owl] img").evaluate((node) => getComputedStyle(node).borderRadius);
  expect(radius).not.toBe("0px");

  const menu = page.getByRole("button", { name: "Menüyü açın veya kapatın" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByTestId("card-owl-little")).toContainText("Little Owl");
  await expect(page.getByTestId("card-owl-little")).not.toContainText("Kukumav");
  await page.getByRole("button", { name: "TR", exact: true }).click();
  const openMenu = page.locator('nav button[aria-expanded="true"]');
  if (await openMenu.isVisible()) await openMenu.click();
  await expect(page.getByTestId("card-owl-little")).toContainText("Kukumav");

  await page.getByTestId("buy-owl-little").click();
  await expect(locked).toHaveAttribute("data-owned", "1");
  await expect(locked).not.toHaveClass(/grayscale/);

  await page.goto("/profil");
  await expect(page.getByTestId("collection-progress")).toHaveText("Koleksiyonum 1/12");
  await expect(page.getByTestId("owl")).toContainText("Yavru");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
