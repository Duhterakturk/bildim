import { expect, test } from "@playwright/test";

function fulfill(route, json, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
}

test("review screens stay readable", async ({ page }) => {
  const unlocked = [];
  await page.addInitScript(() => {
    localStorage.setItem("mindarena_access_token", "access");
    localStorage.setItem("mindarena_refresh_token", "refresh");
  });
  await page.route(/\/api\/(?!.*\.js)/, (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/progress/unlocked")) {
      unlocked.push(url);
      return fulfill(route, { unlocked: { easy: true, medium: false, hard: false }, progress: { easy: 0, medium: 0, hard: 0 }, threshold: 5 });
    }
    if (url.includes("/auth/me")) return fulfill(route, { id: 1, full_name: "Ayse Hoca", role: "teacher" });
    if (url.includes("/auth/refresh")) return fulfill(route, { access_token: "new-access" });
    if (url.includes("/games") && !url.includes("/games/")) {
      return fulfill(route, [{ slug: "sudoku", name_tr: "Kutu", name_en: "Box", min_grade_level: 3 }]);
    }
    if (url.includes("/profile")) {
      return fulfill(route, { stage: "egg", solved: 0, equipped: [] });
    }
    if (url.includes("/shop")) {
      return fulfill(route, {
        star_balance: 2,
        items: [{
          id: "theme-space",
          type: "theme",
          slot: "theme",
          name_tr: "Uzay",
          name_en: "Space",
          price: 30,
          owned: false,
          equipped: false,
          preview: { cell: "#111", ink: "#fff", line: "#333", room: "#000", accent: "#8cf" },
        }],
      });
    }
    if (url.includes("/puzzles")) {
      const body = route.request().postDataJSON?.() || {};
      if (body.slug === "yildiz-savaslari") {
        return fulfill(route, {
          id: "y1",
          puzzle: {
            size: 2,
            rowClues: [1, 1],
            colClues: [1, 1],
            regionGrid: [[0, 1], [0, 1]],
          },
          hints: [],
        });
      }
      if (body.slug === "apartman") {
        return fulfill(route, {
          id: "a1",
          puzzle: { givens: [[0, 0], [0, 0]], clues: { top: [1, 2], bottom: [2, 1], left: [1, 2], right: [2, 1] } },
          hints: [],
        });
      }
      if (body.slug === "abc-baglama") {
        return fulfill(route, {
          id: "b1",
          puzzle: { rows: 4, cols: 4, fixedCells: { "0-0": "A", "0-3": "A" } },
          hints: [],
        });
      }
      return fulfill(route, { id: "x", puzzle: { givens: [[0]] }, hints: [] });
    }
    return fulfill(route, {});
  });

  await page.goto("/hesabim");
  await expect(page.getByRole("heading", { name: "Ayse Hoca" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Sınıflarım" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profil" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Panelim" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Öğretmen Paneli" })).toHaveCount(0);

  await page.goto("/games");
  const grade = page.getByText("Önerilen en düşük sınıf düzeyi");
  await expect(grade).toBeVisible();
  const gradeColor = await grade.evaluate((node) => getComputedStyle(node).color);
  expect(gradeColor).not.toBe("rgb(244, 239, 230)");

  await page.goto("/dukkan");
  const short = page.getByText("yıldız daha lazım");
  await expect(short).toBeVisible();
  const shortColor = await short.evaluate((node) => getComputedStyle(node).color);
  expect(shortColor).toBe("rgb(87, 83, 78)");

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.goto("/games/yildiz-savaslari");
  await page.waitForTimeout(800);
  const regionInfo = await page.evaluate(() => {
    const node = document.querySelector(".bg-amber-200");
    const buttons = [...document.querySelectorAll("button")].slice(0, 6).map((b) => b.className);
    if (!node) return { missing: true, text: document.body.innerText.slice(0, 400), buttons };
    const clue = [...document.querySelectorAll("div")].find((el) => el.textContent === "1");
    return {
      border: getComputedStyle(node).borderRightWidth,
      edge: node.className.includes("border-r-[3px]"),
      clue: clue ? getComputedStyle(clue).color : "",
      buttons,
    };
  });
  const html = regionInfo.missing ? (await page.content()).slice(0, 800) : "";
  expect(regionInfo.missing, `${pageErrors.join(" | ")} ${html}`).toBeFalsy();
  expect(regionInfo.edge).toBe(true);
  expect(parseFloat(regionInfo.border)).toBeGreaterThan(2);
  expect(regionInfo.clue).toBe("rgb(41, 60, 53)");
  await page.screenshot({ path: "test-results/yildiz.png", fullPage: true });

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || /negative value/i.test(msg.text())) errors.push(msg.text());
  });
  await page.goto("/games/abc-baglama");
  await page.waitForTimeout(400);
  expect(errors.join("\n")).not.toMatch(/negative value/i);
});
