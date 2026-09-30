import { test, expect } from '@playwright/test';

test('sculpture loads and entry light respects reduced motion', async ({page}, info) => {
  await page.route(/\/api\/(?!.*\.js)/, route => route.fulfill({json:{}}));
  await page.goto('/');
  const art = page.locator('.workshop-sculpture');
  await expect(art).toBeVisible();
  await art.evaluate(img => img.decode());
  expect(await art.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  const effect = () => page.locator('.workshop-light-pass').evaluate(node => {
    const css=getComputedStyle(node,'::after'); return {name:css.animationName, count:css.animationIterationCount};
  });
  expect((await effect()).name).toBe('bildim-light-pass');
  expect((await effect()).count).toBe('1');
  await page.emulateMedia({reducedMotion:'reduce'});
  expect((await effect()).name).toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:info.outputPath('refined-home.png'),fullPage:true});
});
