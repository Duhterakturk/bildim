import { shuffle } from "../common/latinSquare";

// Two numbers in each row and column; zero denotes an intentionally empty cell.
export function countBoards({rowHeaders, colHeaders, puzzle: givens, maxValue}, limit = 2) {
  const n = rowHeaders.length;
  const choices = rowHeaders.map((target, r) => {
    const list = [];
    for (let a = 1; a <= maxValue; a++) {
      if (target % a) continue;
      const b = target / a;
      if (b < 1 || b > maxValue) continue;
      for (let c = 0; c < n; c++) for (let d = c + 1; d < n; d++) {
        const row = Array(n).fill(0); row[c] = a; row[d] = b;
        if (row.every((v, i) => !givens[r][i] || givens[r][i] === v)) list.push(row);
      }
    }
    return list;
  });
  const order = Array.from({length:n},(_,i)=>i).sort((a,b)=>choices[a].length-choices[b].length);
  const counts = Array(n).fill(0), products = Array(n).fill(1);
  let found = 0, nodes = 0;
  function visit(depth) {
    if (found >= limit) return;
    if (++nodes > 100000) { found = limit; return; } // Conservative: never call a timed-out search unique.
    if (depth === n) { if (counts.every((v,c)=>v===2 && products[c]===colHeaders[c])) found++; return; }
    for (const row of choices[order[depth]]) {
      if (row.some((v,c)=>v && (counts[c]===2 || colHeaders[c] % (products[c]*v) || (counts[c]===1 && products[c]*v!==colHeaders[c])))) continue;
      row.forEach((v,c)=>{if(v){counts[c]++;products[c]*=v;}});
      if (counts.every(v=>v+n-depth-1>=2)) visit(depth+1);
      row.forEach((v,c)=>{if(v){counts[c]--;products[c]/=v;}});
      if (found>=limit) break;
    }
  }
  visit(0); return found;
}

export function generate(difficulty="easy") {
  const n = {easy:4,medium:5,hard:6}[difficulty] || 4;
  const maxValue = n*2;
  const cols = shuffle(Array.from({length:n},(_,i)=>i));
  const digits = shuffle(Array.from({length:maxValue},(_,i)=>i+1));
  const solution = Array.from({length:n},()=>Array(n).fill(0));
  for(let r=0;r<n;r++){solution[r][cols[r]]=digits[2*r];solution[r][cols[(r+1)%n]]=digits[2*r+1];}
  const product = values => values.filter(Boolean).reduce((a,b)=>a*b,1);
  const rowHeaders = solution.map(product);
  const colHeaders = Array.from({length:n},(_,c)=>product(solution.map(row=>row[c])));
  const puzzle=solution.map(row=>row.slice());
  const game={variant:"two-per-line",maxValue,rowHeaders,colHeaders,puzzle,solution};
  for(const [r,c] of shuffle(solution.flatMap((row,r)=>row.flatMap((v,c)=>v?[[r,c]]:[])))) {
    const v=puzzle[r][c];puzzle[r][c]=0;
    if(countBoards(game)!==1)puzzle[r][c]=v;
  }
  return game;
}
