import {test,expect} from '@playwright/test';
test('new unlock advances once and manual easy remains selected',async({page})=>{
 let medium=false,hard=false; const issued=[];
 await page.addInitScript(()=>localStorage.setItem('mindarena_access_token','test'));
 await page.route(/\/api\/(?!.*\.js)/,route=>{
  const u=route.request().url();
  if(u.includes('/auth/me')) return route.fulfill({json:{id:1,role:'student',full_name:'Test'}});
  if(u.includes('/progress/unlocked/')) return route.fulfill({json:{unlocked:{easy:true,medium,hard},progress:{easy:medium?5:4,medium:hard?5:0,hard:0},threshold:5}});
  if(u.includes('/puzzles')) { const difficulty=route.request().postDataJSON().difficulty; issued.push(difficulty); return route.fulfill({json:{id:'test-'+issued.length,puzzle:{givens:Array.from({length:4},()=>[0,0,0,0]),clues:{top:[1,2,3,4],bottom:[4,3,2,1],left:[1,2,3,4],right:[4,3,2,1]}}}}); }
  if(u.includes('/games')) return route.fulfill({json:[{id:5,slug:'apartman',name_tr:'Apartman'}]});
  return route.fulfill({json:{}});
 });
 await page.goto('/games/apartman');
 await expect(page.getByRole('button',{name:'Orta',exact:true})).toBeDisabled();
 medium=true;
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mindarena:score-saved')));
 await expect.poll(()=>issued.at(-1)).toBe('medium');
 hard=true;
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mindarena:score-saved')));
 await expect.poll(()=>issued.at(-1)).toBe('hard');
 await page.getByRole('button',{name:'Kolay',exact:true}).click();
 await expect.poll(()=>issued.at(-1)).toBe('easy');
 const count=issued.length;
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mindarena:score-saved')));
 await page.waitForTimeout(1800);
 expect(issued.length).toBe(count);
});
