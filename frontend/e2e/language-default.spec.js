import { expect, test } from '@playwright/test';
test('Turkish default ignores legacy English; explicit English persists', async ({ page }) => {
  await page.route(/\/api\/(?!.*\.js)/, route => route.fulfill({json:{}}));
  await page.addInitScript(() => localStorage.setItem('mindarena_lang','en'));
  await page.goto('/');
  await expect(page.getByRole('link',{name:'Oyunları keşfet',exact:true})).toBeVisible();
  const menu = page.getByRole('button',{name:'Menüyü açın veya kapatın'});
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await expect(page.getByRole('link',{name:'Explore games',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link',{name:'Explore games',exact:true})).toBeVisible();
});
