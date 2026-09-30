import { test, expect } from '@playwright/test';
test('Patika draws a continuous black path and retraces to erase', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mindarena_access_token', 'test'));
  let answer;
  await page.route(/\/api\//, route => {
    const url = route.request().url(); if (url.includes("/src/") || url.includes(".js")) return route.continue();
    if (url.includes('/auth/me')) return route.fulfill({json:{id:'u', role:'student', full_name:'Test'}});
    if (url.endsWith('/check')) { answer = route.request().postDataJSON().answer; return route.fulfill({json:{correct:false}}); }
    if (url.includes('/puzzles')) return route.fulfill({json:{id:'patika-test',slug:'patika',difficulty:'easy',puzzle:{rows:8,cols:8,blacks:['1-1']},hints:[]}});
    if (url.includes('/games/patika')) return route.fulfill({json:{slug:'patika',name_tr:'Patika',name_en:'Path'}});
    return route.fulfill({json:{items:[],unlocked:{easy:true,medium:true,hard:true},progress:{},games:{}}});
  });
  await page.goto('/games/patika');
  const board = page.getByTestId('patika-board');
  await expect(board).toBeVisible();
  await board.scrollIntoViewIfNeeded();
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  const rect = await board.boundingBox();
  const point = (r,c) => ({x:rect.x+rect.width*(c+.5)/8,y:rect.y+rect.height*(r+.5)/8});
  const a=point(0,0), b=point(0,3);
  await page.mouse.move(a.x,a.y); await page.mouse.down(); await page.mouse.move(b.x,b.y);
  await expect(board.locator('line')).toHaveCount(3);
  await expect(board.locator('line').first()).toHaveAttribute('stroke','#111');
  const back=point(0,2); await page.mouse.move(back.x,back.y);
  await expect(board.locator('line')).toHaveCount(2);
  await page.mouse.up();
  const blockStart=point(1,0), blockEnd=point(1,3);
  await page.mouse.move(blockStart.x,blockStart.y); await page.mouse.down(); await page.mouse.move(blockEnd.x,blockEnd.y); await page.mouse.up();
  await expect(board.locator('line')).toHaveCount(2);
  await page.getByRole('button',{name:'Kontrol',exact:false}).first().click();
  expect(answer.edges.sort()).toEqual(['0-0|0-1','0-1|0-2']);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await board.scrollIntoViewIfNeeded();
  const touchRect = await board.boundingBox();
  const touch = (c) => ({ x: touchRect.x + touchRect.width * (c + .5) / 8, y: touchRect.y + touchRect.height * 2.5 / 8 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch(0)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touch(3)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(board.locator('line')).toHaveCount(5);
  await board.locator('[data-cell="3-0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(board.locator('line')).toHaveCount(6);
  await page.keyboard.press('ArrowLeft');
  await expect(board.locator('line')).toHaveCount(5);
  await board.locator('[data-cell="0-0"]').scrollIntoViewIfNeeded();
  await cdp.send("Emulation.setPageScaleFactor", {pageScaleFactor: 1});
  await board.locator('[data-cell="0-0"]').evaluate(el => el.scrollIntoView({block: "center"}));
  const fresh = await board.boundingBox();
  await page.mouse.click(fresh.x + fresh.width / 8, fresh.y + fresh.height * .5 / 8);
  await expect(board.locator('[data-edge="0-0|0-1"]')).toHaveCount(0);
  await expect(board.locator('[data-edge="0-1|0-2"]')).toHaveCount(1);
  await board.locator('[data-cell="2-1"]').evaluate(el => el.scrollIntoView({block: "center"}));
  const tapRect = await board.boundingBox();
  const tap = {x: tapRect.x + tapRect.width * 2 / 8, y: tapRect.y + tapRect.height * 2.5 / 8};
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tap] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(board.locator('[data-edge="2-1|2-2"]')).toHaveCount(0);
  await expect(board.locator('line')).toHaveCount(3);
  await page.screenshot({path:`test-results/patika-drawing-${test.info().project.name}.png`});
});






