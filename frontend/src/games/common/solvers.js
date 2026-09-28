// Bulmacanın birden fazla çözümü olup olmadığını sayar. Üreticiler 1 dönen
// sonucu saklar; sunucu da aynı kuralla skoru kabul eder.

function digitsOk(grid, n) {
  for (let r = 0; r < n; r++) {
    const seen = new Set();
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (v < 1 || v > n || seen.has(v)) return false;
      seen.add(v);
    }
  }
  for (let c = 0; c < n; c++) {
    const seen = new Set();
    for (let r = 0; r < n; r++) {
      const v = grid[r][c];
      if (seen.has(v)) return false;
      seen.add(v);
    }
  }
  return true;
}

export function countSudoku(puzzle, limit = 2) {
  const grid = puzzle.map((row) => [...row]);
  let count = 0;
  const rows = Array.from({ length: 9 }, () => Array(10).fill(false));
  const cols = Array.from({ length: 9 }, () => Array(10).fill(false));
  const boxes = Array.from({ length: 9 }, () => Array(10).fill(false));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (!v) continue;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (rows[r][v] || cols[c][v] || boxes[b][v]) return 0;
      rows[r][v] = cols[c][v] = boxes[b][v] = true;
    }
  }

  function open() {
    let best = null;
    let bestN = 10;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c]) continue;
        const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        let n = 0;
        for (let v = 1; v <= 9; v++) if (!rows[r][v] && !cols[c][v] && !boxes[b][v]) n++;
        if (n < bestN) {
          bestN = n;
          best = [r, c, b];
          if (n === 0) return best;
        }
      }
    }
    return best;
  }

  function search() {
    if (count >= limit) return;
    const cell = open();
    if (!cell) {
      count++;
      return;
    }
    const [r, c, b] = cell;
    for (let v = 1; v <= 9; v++) {
      if (rows[r][v] || cols[c][v] || boxes[b][v]) continue;
      rows[r][v] = cols[c][v] = boxes[b][v] = true;
      grid[r][c] = v;
      search();
      grid[r][c] = 0;
      rows[r][v] = cols[c][v] = boxes[b][v] = false;
      if (count >= limit) return;
    }
  }
  search();
  return count;
}

export function countLatin(puzzle, limit = 2, extra) {
  const n = puzzle.length;
  const grid = puzzle.map((row) => [...row]);
  let count = 0;
  const rows = Array.from({ length: n }, () => Array(n + 1).fill(false));
  const cols = Array.from({ length: n }, () => Array(n + 1).fill(false));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (!v) continue;
      if (v < 1 || v > n || rows[r][v] || cols[c][v]) return 0;
      rows[r][v] = cols[c][v] = true;
    }
  }

  function search(r, c) {
    if (count >= limit) return;
    if (r === n) {
      if (!extra || extra(grid)) count++;
      return;
    }
    const nr = c + 1 === n ? r + 1 : r;
    const nc = c + 1 === n ? 0 : c + 1;
    if (grid[r][c]) {
      search(nr, nc);
      return;
    }
    for (let v = 1; v <= n; v++) {
      if (rows[r][v] || cols[c][v]) continue;
      rows[r][v] = cols[c][v] = true;
      grid[r][c] = v;
      search(nr, nc);
      grid[r][c] = 0;
      rows[r][v] = cols[c][v] = false;
      if (count >= limit) return;
    }
  }
  search(0, 0);
  return count;
}

export function countRegionLatin(puzzle, regions, limit = 2) {
  const labels = [...new Set(regions.flat())];
  return countLatin(puzzle, limit, (grid) => {
    for (const label of labels) {
      const seen = new Set();
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid.length; c++) {
          if (regions[r][c] !== label) continue;
          if (seen.has(grid[r][c])) return false;
          seen.add(grid[r][c]);
        }
      }
    }
    return true;
  });
}

function cageOk(grid, cageId, clues) {
  const groups = {};
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      const id = String(cageId[r][c]);
      if (!groups[id]) groups[id] = [];
      groups[id].push(grid[r][c]);
    }
  }
  for (const [id, values] of Object.entries(groups)) {
    const clue = clues[id] ?? clues[Number(id)];
    if (!clueSatisfied(clue, values)) return false;
  }
  return true;
}

export function clueSatisfied(clue, values) {
  const match = String(clue).match(/^(\d+)(.*)$/);
  if (!match) return false;
  const target = Number(match[1]);
  const op = match[2];
  if (!op) return values.length === 1 && values[0] === target;
  if (op === "+") return values.reduce((a, b) => a + b, 0) === target;
  if (op === "×" || op === "x" || op === "*") return values.reduce((a, b) => a * b, 1) === target;
  if (values.length !== 2) return false;
  const [a, b] = values;
  if (op === "−" || op === "-") return Math.abs(a - b) === target;
  if (op === "÷" || op === "/") {
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    return small !== 0 && big % small === 0 && big / small === target;
  }
  return false;
}

function cageCombos(n, length, clue) {
  const found = [];
  const values = Array(length);
  function fill(index) {
    if (index === length) {
      if (clueSatisfied(clue, values)) found.push(values.slice());
      return;
    }
    for (let value = 1; value <= n; value += 1) {
      values[index] = value;
      fill(index + 1);
    }
  }
  fill(0);
  return found;
}

export function cageSolutions(puzzle, cageId, clues, limit = 2) {
  const n = puzzle.length;
  const grid = puzzle.map((row) => row.slice());
  const cages = [];
  const byId = new Map();
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const id = String(cageId[row][col]);
      let cage = byId.get(id);
      if (!cage) {
        cage = { id, cells: [] };
        byId.set(id, cage);
        cages.push(cage);
      }
      cage.cells.push([row, col]);
    }
  }
  cages.forEach((cage) => {
    const clue = clues[cage.id] ?? clues[Number(cage.id)];
    cage.combos = cageCombos(n, cage.cells.length, clue);
    cage.pos = new Map(cage.cells.map(([row, col], index) => [`${row}-${col}`, index]));
  });
  const rows = Array.from({ length: n }, () => Array(n + 1).fill(false));
  const cols = Array.from({ length: n }, () => Array(n + 1).fill(false));
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const value = grid[row][col];
      if (!value) continue;
      if (value < 1 || value > n || rows[row][value] || cols[col][value]) return [];
      rows[row][value] = cols[col][value] = true;
    }
  }
  const solutions = [];
  let nodes = 0;

  function allows(cage, row, col, value) {
    const at = cage.pos.get(`${row}-${col}`);
    return cage.combos.some((combo) => combo[at] === value && cage.cells.every(([r, c], index) => !grid[r][c] || grid[r][c] === combo[index]));
  }

  function search() {
    if (solutions.length >= limit || nodes > 12000) return;
    nodes += 1;
    let best = null;
    let choices = null;
    for (let row = 0; row < n && choices?.length !== 0; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (grid[row][col]) continue;
        const cage = byId.get(String(cageId[row][col]));
        const list = [];
        for (let value = 1; value <= n; value += 1) {
          if (rows[row][value] || cols[col][value]) continue;
          if (allows(cage, row, col, value)) list.push(value);
        }
        if (!choices || list.length < choices.length) {
          best = [row, col];
          choices = list;
          if (list.length <= 1) break;
        }
      }
    }
    if (!best) {
      solutions.push(grid.map((row) => row.slice()));
      return;
    }
    if (!choices.length) return;
    const [row, col] = best;
    choices.forEach((value) => {
      if (solutions.length >= limit) return;
      rows[row][value] = cols[col][value] = true;
      grid[row][col] = value;
      search();
      grid[row][col] = 0;
      rows[row][value] = cols[col][value] = false;
    });
  }

  search();
  return solutions;
}

export function countCages(puzzle, cageId, clues, limit = 2) {
  return cageSolutions(puzzle, cageId, clues, limit).length;
}

export function countKakuro(rowSums, colSums, givens, limit = 2) {
  const n = rowSums.length;
  const grid = givens.map((row) => [...row]);
  let count = 0;

  function search(r, c) {
    if (count >= limit) return;
    if (r === n) {
      count++;
      return;
    }
    const nr = c + 1 === n ? r + 1 : r;
    const nc = c + 1 === n ? 0 : c + 1;
    if (grid[r][c]) {
      if (c + 1 === n) {
        const sum = grid[r].reduce((a, b) => a + b, 0);
        if (sum !== rowSums[r] || new Set(grid[r]).size !== n) return;
      }
      if (nr === n || c + 1 === n) {
        const col = [];
        for (let i = 0; i <= r; i++) col.push(grid[i][c]);
        if (new Set(col).size !== col.length) return;
        if (nr === n && col.reduce((a, b) => a + b, 0) !== colSums[c]) return;
      }
      search(nr, nc);
      return;
    }
    const usedRow = new Set(grid[r].filter(Boolean));
    const usedCol = new Set();
    for (let i = 0; i < r; i++) usedCol.add(grid[i][c]);
    for (let v = 1; v <= 9; v++) {
      if (usedRow.has(v) || usedCol.has(v)) continue;
      grid[r][c] = v;
      if (c + 1 === n) {
        const sum = grid[r].reduce((a, b) => a + b, 0);
        if (sum !== rowSums[r] || new Set(grid[r]).size !== n) {
          grid[r][c] = 0;
          continue;
        }
      }
      search(nr, nc);
      grid[r][c] = 0;
      if (count >= limit) return;
    }
  }
  search(0, 0);
  return count;
}

const EDGE_PATTERNS = {
  0: [[0, 0, 0, 0]],
  1: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],
  2: [[1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0], [0, 1, 0, 1], [0, 0, 1, 1]],
  3: [[1, 1, 1, 0], [1, 1, 0, 1], [1, 0, 1, 1], [0, 1, 1, 1]],
  4: [[1, 1, 1, 1]],
};

export function countFences(clues, limit = 2, deadline = Infinity) {
  const n = clues.length;
  const horiz = Array.from({ length: n + 1 }, () => Array(n).fill(null));
  const vert = Array.from({ length: n }, () => Array(n + 1).fill(null));
  let count = 0;
  let steps = 0;

  function agree(current, next) {
    if (current === null) return true;
    return current === !!next;
  }

  function search(cell) {
    if (count >= limit || count < 0) return;
    steps += 1;
    if (deadline < Infinity && (steps & 127) === 0 && Date.now() > deadline) {
      count = -1;
      return;
    }
    if (cell === n * n) {
      if (fenceIsOneLoop(horiz, vert, n)) count++;
      return;
    }
    const r = Math.floor(cell / n);
    const c = cell % n;
    const clue = clues[r][c];
    const options = clue === null || clue === undefined ? null : EDGE_PATTERNS[clue];
    const patterns = options || allPatterns();
    for (const [top, right, bottom, left] of patterns) {
      if (count >= limit || count < 0) return;
      if (!agree(horiz[r][c], top) || !agree(vert[r][c + 1], right) || !agree(horiz[r + 1][c], bottom) || !agree(vert[r][c], left)) {
        continue;
      }
      const prev = [horiz[r][c], vert[r][c + 1], horiz[r + 1][c], vert[r][c]];
      horiz[r][c] = !!top;
      vert[r][c + 1] = !!right;
      horiz[r + 1][c] = !!bottom;
      vert[r][c] = !!left;
      search(cell + 1);
      [horiz[r][c], vert[r][c + 1], horiz[r + 1][c], vert[r][c]] = prev;
    }
  }
  search(0);
  return count;
}

function allPatterns() {
  const out = [];
  for (let mask = 0; mask < 16; mask++) {
    out.push([(mask >> 3) & 1, (mask >> 2) & 1, (mask >> 1) & 1, mask & 1]);
  }
  return out;
}

function fenceIsOneLoop(horiz, vert, n) {
  const adj = new Map();
  function link(a, b) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c < n; c++) if (horiz[r][c]) link(`${r}-${c}`, `${r}-${c + 1}`);
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c <= n; c++) if (vert[r][c]) link(`${r}-${c}`, `${r + 1}-${c}`);
  }
  const nodes = [...adj.keys()];
  if (nodes.length < 4 || nodes.some((key) => adj.get(key).length !== 2)) return false;
  const seen = new Set([nodes[0]]);
  const stack = [nodes[0]];
  while (stack.length) {
    const key = stack.pop();
    for (const next of adj.get(key)) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen.size === nodes.length;
}

export function countNonogram(rowClues, colClues, limit = 2) {
  const rows = rowClues.length;
  const cols = colClues.length;
  const rowOpts = rowClues.map((runs) => lineOptions(cols, runs));
  const colOpts = colClues.map((runs) => lineOptions(rows, runs));
  if (rowOpts.some((list) => list.length === 0) || colOpts.some((list) => list.length === 0)) return 0;
  let count = 0;
  const grid = [];

  function search(r) {
    if (count >= limit) return;
    if (r === rows) {
      count++;
      return;
    }
    for (const row of rowOpts[r]) {
      grid[r] = row;
      let ok = true;
      for (let c = 0; c < cols && ok; c++) {
        if (!colOpts[c].some((full) => {
          for (let i = 0; i <= r; i++) if (full[i] !== grid[i][c]) return false;
          return true;
        })) ok = false;
      }
      if (ok) search(r + 1);
      if (count >= limit) return;
    }
  }
  search(0);
  return count;
}

function runLengths(bits) {
  const runs = [];
  let count = 0;
  for (const bit of bits) {
    if (bit) count++;
    else if (count) {
      runs.push(count);
      count = 0;
    }
  }
  if (count) runs.push(count);
  return runs.length ? runs : [0];
}

function lineOptions(length, runs) {
  const normalized = runs.length === 1 && runs[0] === 0 ? [] : runs;
  const out = [];
  function place(start, index, bits) {
    if (index === normalized.length) {
      out.push([...bits, ...Array(length - bits.length).fill(false)]);
      return;
    }
    const run = normalized[index];
    const rest = normalized.slice(index + 1).reduce((a, b) => a + b, 0);
    const gaps = normalized.length - index - 1;
    for (let pos = start; pos + run + rest + gaps <= length; pos++) {
      const next = [...bits, ...Array(pos - bits.length).fill(false), ...Array(run).fill(true)];
      if (index < normalized.length - 1) next.push(false);
      place(next.length, index + 1, next);
    }
  }
  place(0, 0, []);
  return out;
}

function factorial(n) {
  let value = 1;
  for (let i = 2; i <= n; i++) value *= i;
  return value;
}

export function identicalShipFactor(ships) {
  const freq = {};
  for (const size of ships) freq[size] = (freq[size] || 0) + 1;
  return Object.values(freq).reduce((acc, n) => acc * factorial(n), 1);
}

export function countFleets(rowClues, colClues, ships, limit = 8) {
  const rows = rowClues.length;
  const cols = colClues.length;
  const occupied = new Set();
  let count = 0;
  const sizes = [...ships].sort((a, b) => b - a);

  function overCapacity() {
    for (let r = 0; r < rows; r++) {
      let n = 0;
      for (let c = 0; c < cols; c++) if (occupied.has(`${r}-${c}`)) n++;
      if (n > rowClues[r]) return true;
    }
    for (let c = 0; c < cols; c++) {
      let n = 0;
      for (let r = 0; r < rows; r++) if (occupied.has(`${r}-${c}`)) n++;
      if (n > colClues[c]) return true;
    }
    return false;
  }

  function place(index) {
    if (count >= limit) return;
    if (index === sizes.length) {
      for (let r = 0; r < rows; r++) {
        let n = 0;
        for (let c = 0; c < cols; c++) if (occupied.has(`${r}-${c}`)) n++;
        if (n !== rowClues[r]) return;
      }
      for (let c = 0; c < cols; c++) {
        let n = 0;
        for (let r = 0; r < rows; r++) if (occupied.has(`${r}-${c}`)) n++;
        if (n !== colClues[c]) return;
      }
      count++;
      return;
    }
    const size = sizes[index];
    const orientations = size === 1 ? [true] : [true, false];
    for (const horizontal of orientations) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cells = [];
          let fits = true;
          for (let i = 0; i < size; i++) {
            const rr = horizontal ? r : r + i;
            const cc = horizontal ? c + i : c;
            if (rr >= rows || cc >= cols) {
              fits = false;
              break;
            }
            cells.push([rr, cc]);
          }
          if (!fits) continue;
          let blocked = false;
          for (const [rr, cc] of cells) {
            for (let dr = -1; dr <= 1 && !blocked; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (occupied.has(`${rr + dr}-${cc + dc}`)) blocked = true;
              }
            }
          }
          if (blocked) continue;
          cells.forEach(([rr, cc]) => occupied.add(`${rr}-${cc}`));
          if (!overCapacity()) place(index + 1);
          cells.forEach(([rr, cc]) => occupied.delete(`${rr}-${cc}`));
          if (count >= limit) return;
        }
      }
    }
  }
  place(0);
  return count;
}

export { digitsOk };
