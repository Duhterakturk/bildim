import { test, expect } from '@playwright/test';
import { generate as products } from '../src/games/carpmaca/puzzles.js';
import { generate as colours } from '../src/games/colours/puzzles.js';
import { generate as numbers } from '../src/games/numbers/puzzles.js';
for (const slug of ['carpmaca','colours','numbers']) {
 test(`${slug}: booklet board and tournament answer`, async ({page})=>{
  const generated = slug==='carpmaca'?products():slug==='colours'?colours():numbers();
  const {solution,puzzle,...publicPuzzle}=generated;
  if(puzzle) publicPuzzle.givens=puzzle;
  let issuedMode, submitted;
  await page.route(/\/api\/(?!.*\.js)/,route=>{
   const url=route.request().url();
   if(url.includes('/src/'))return route.continue();
   if(url.endsWith('/check')) {submitted=route.request().postDataJSON().answer;return route.fulfill({json:{correct:false,correct_option:1}});}
   if(url.endsWith('/puzzles')) {
    issuedMode=route.request().postDataJSON().mode;
    return route.fulfill({json:{id:'tournament-test',slug,difficulty:'easy',puzzle:{...publicPuzzle,...(issuedMode==='tournament'?{tournament:{rows:3,cols:3,cells:[[0,0],[1,1]],text:{tr:'İşaretli karelerin toplamı kaçtır?',en:'What is the sum?'},options:[{tr:'10',en:'10'},{tr:'12',en:'12'},{tr:'14',en:'14'},{tr:'16',en:'16'}]}}:{})},hints:[]}});
   }
   return route.fulfill({json:{items:[],games:{},unlocked:{easy:true,medium:true,hard:true},progress:{}}});
  });
  await page.goto(`/games/${slug}?mode=turnuva`);
  const question=page.getByRole('region',{name:'Turnuva Modu'});
  await expect(question).toBeVisible();expect(issuedMode).toBe('tournament');
  await expect(page.locator('[data-normal-check]')).toBeHidden();
  await question.getByRole('button',{name:'A) 10',exact:true}).click();
  await question.getByRole('button',{name:'Cevabı gönder'}).click();
  await expect(question.getByRole('status')).toContainText('12');expect(submitted).toEqual({option:0});
  await expect(question.getByRole('button',{name:'Cevabı gönder'})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`test-results/booklet-${slug}-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole('link',{name:'Normal oyuna dön'}).click();
  await expect(question).toHaveCount(0);
  await expect(page.locator('[data-normal-check]')).toBeVisible();
  expect(issuedMode).toBeUndefined();
 });
}
