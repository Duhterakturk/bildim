import { describe, it, expect } from 'vitest';
import { generate, countBoards } from './puzzles';
describe('booklet multiplication puzzle',()=>{
 it('has exactly two factors per line and one solution for each difficulty',()=>{
  for(const difficulty of ['easy','medium','hard']) for(let i=0;i<30;i++){
   const p=generate(difficulty),n=p.solution.length;
   expect(countBoards(p)).toBe(1);
   for(let r=0;r<n;r++){
    const row=p.solution[r].filter(Boolean),col=p.solution.map(line=>line[r]).filter(Boolean);
    expect(row).toHaveLength(2);expect(col).toHaveLength(2);
    expect(row[0]*row[1]).toBe(p.rowHeaders[r]);expect(col[0]*col[1]).toBe(p.colHeaders[r]);
   }
  }
 },20000);
});
