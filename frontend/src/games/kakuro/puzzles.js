const CONFIG = {
  easy: { size: 6, min: 2, max: 4, budget: 1000, whites: [8, 25] },
  medium: { size: 7, min: 2, max: 5, budget: 2000, whites: [20, 36] },
  hard: { size: 8, min: 2, max: 6, budget: 3000, whites: [32, 40] },
};

const COMBOS = new Map();

function combos(length, sum) {
  const key = `${length}:${sum}`;
  const cached = COMBOS.get(key);
  if (cached) return cached;
  const found = [];
  function walk(start, left, total, mask) {
    if (left === 0) {
      if (total === 0) found.push(mask);
      return;
    }
    for (let digit = start; digit <= 9; digit += 1) {
      if (digit > total) break;
      walk(digit + 1, left - 1, total - digit, mask | (1 << digit));
    }
  }
  walk(1, length, sum, 0);
  COMBOS.set(key, found);
  return found;
}

function bits(mask) {
  const values = [];
  for (let digit = 1; digit <= 9; digit += 1) if (mask & (1 << digit)) values.push(digit);
  return values;
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function runsOf(white) {
  const n = white.length;
  const runs = [];
  const across = Array.from({ length: n }, () => Array(n).fill(-1));
  const down = Array.from({ length: n }, () => Array(n).fill(-1));
  for (let r = 0; r < n; r += 1) {
    let c = 0;
    while (c < n) {
      if (!white[r][c]) {
        c += 1;
        continue;
      }
      const cells = [];
      while (c < n && white[r][c]) {
        cells.push([r, c]);
        c += 1;
      }
      const id = runs.length;
      cells.forEach(([rr, cc]) => { across[rr][cc] = id; });
      runs.push({ cells, dir: "right" });
    }
  }
  for (let c = 0; c < n; c += 1) {
    let r = 0;
    while (r < n) {
      if (!white[r][c]) {
        r += 1;
        continue;
      }
      const cells = [];
      while (r < n && white[r][c]) {
        cells.push([r, c]);
        r += 1;
      }
      const id = runs.length;
      cells.forEach(([rr, cc]) => { down[rr][cc] = id; });
      runs.push({ cells, dir: "down" });
    }
  }
  return { runs, across, down };
}

export function shapeProblems(white, minRun, maxRun) {
  const n = white.length;
  for (let i = 0; i < n; i += 1) {
    if (white[0][i] || white[i][0]) return "border";
  }
  const { runs } = runsOf(white);
  if (!runs.length) return "empty";
  for (const run of runs) {
    if (run.cells.length < minRun || run.cells.length > maxRun) return "length";
    const [r, c] = run.cells[0];
    if (run.dir === "right" && (c === 0 || white[r][c - 1])) return "clue";
    if (run.dir === "down" && (r === 0 || white[r - 1][c])) return "clue";
  }
  const seen = new Set();
  const stack = [];
  for (let r = 0; r < n && !stack.length; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (white[r][c]) {
        stack.push([r, c]);
        break;
      }
    }
  }
  while (stack.length) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;
    if (seen.has(key)) continue;
    seen.add(key);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < n && cc < n && white[rr][cc]) stack.push([rr, cc]);
    });
  }
  let total = 0;
  for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) if (white[r][c]) total += 1;
  if (seen.size !== total) return "split";
  for (let i = 1; i < n; i += 1) {
    if (!white[i].some(Boolean)) return "edge";
    if (!white.some((row) => row[i])) return "edge";
  }
  const rows = white.slice(1).map((row) => row.join(""));
  if (new Set(rows).size < Math.min(3, n - 1)) return "repeat";
  return "";
}

function whiteCount(white) {
  return white.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
}

function canDrop(white, r, c) {
  if (!white[r][c]) return false;
  const rowLeft = white[r].filter(Boolean).length;
  const colLeft = white.reduce((sum, row) => sum + (row[c] ? 1 : 0), 0);
  return rowLeft > 1 && colLeft > 1;
}

function splitOk(length, index, minRun, maxRun) {
  const left = index;
  const right = length - index - 1;
  const side = (size) => size === 0 || (size >= minRun && size <= maxRun);
  return side(left) && side(right);
}

function carveShape(n, minRun, maxRun, minWhites, maxWhites) {
  const white = Array.from({ length: n }, () => Array(n).fill(false));
  for (let r = 1; r < n; r += 1) for (let c = 1; c < n; c += 1) white[r][c] = true;
  for (let guard = 0; guard < 80; guard += 1) {
    const count = whiteCount(white);
    const { runs } = runsOf(white);
    const tooLong = runs.some((run) => run.cells.length > maxRun);
    const tooShort = runs.some((run) => run.cells.length < minRun);
    const valid = !tooLong && !tooShort && count >= minWhites && count <= maxWhites && !shapeProblems(white, minRun, maxRun);
    const wantsShorter = runs.some((run) => run.cells.length >= 5) && count - 1 >= minWhites;
    if (valid && !wantsShorter) return white;
    const spots = [];
    runs.forEach((run) => {
      const crowded = run.cells.length > maxRun
        || (count > minWhites && run.cells.length >= 5)
        || (count > maxWhites && run.cells.length > minRun);
      if (!crowded) return;
      run.cells.forEach(([r, c], index) => {
        if (!canDrop(white, r, c) || !splitOk(run.cells.length, index, minRun, maxRun)) return;
        const other = runs.find((item) => item.dir !== run.dir && item.cells.some(([rr, cc]) => rr === r && cc === c));
        if (!other) return;
        const otherIndex = other.cells.findIndex(([rr, cc]) => rr === r && cc === c);
        if (!splitOk(other.cells.length, otherIndex, minRun, maxRun)) return;
        spots.push([r, c]);
      });
    });
    if (!spots.length) return valid ? white : null;
    const [r, c] = spots[Math.floor(Math.random() * spots.length)];
    white[r][c] = false;
  }
  return null;
}

function paintShape(n, minRun, maxRun, minWhites, maxWhites) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const white = carveShape(n, minRun, maxRun, minWhites, maxWhites);
    if (white) return white;
  }
  return null;
}

function fillDigits(white, bias) {
  const { runs, across, down } = runsOf(white);
  const cells = [];
  white.forEach((row, r) => row.forEach((on, c) => {
    if (on) cells.push({ r, c, h: across[r][c], v: down[r][c] });
  }));
  const used = runs.map(() => 0);
  const value = Array(cells.length).fill(0);
  let steps = 0;

  function candidates(index) {
    const cell = cells[index];
    let mask = (~used[cell.h]) & (~used[cell.v]) & 0x3fe;
    const hLeft = runs[cell.h].cells.length - bits(used[cell.h]).length - 1;
    const vLeft = runs[cell.v].cells.length - bits(used[cell.v]).length - 1;
    if (hLeft < 0 || vLeft < 0) return 0;
    return mask;
  }

  function search() {
    steps += 1;
    if (steps > 6000) return false;
    let best = -1;
    let bestCount = 99;
    for (let i = 0; i < cells.length; i += 1) {
      if (value[i]) continue;
      const count = bits(candidates(i)).length;
      if (count < bestCount) {
        best = i;
        bestCount = count;
        if (count <= 1) break;
      }
    }
    if (best < 0) return true;
    let order = bits(candidates(best));
    if (bias === "low") order = order.filter((digit) => digit <= 5).sort((a, b) => a - b);
    else if (bias === "high") order.sort((a, b) => b - a);
    else shuffle(order);
    if (!order.length) return false;
    for (const digit of order) {
      const cell = cells[best];
      value[best] = digit;
      used[cell.h] |= 1 << digit;
      used[cell.v] |= 1 << digit;
      if (search()) return true;
      used[cell.h] &= ~(1 << digit);
      used[cell.v] &= ~(1 << digit);
      value[best] = 0;
    }
    return false;
  }

  if (!search()) return null;
  const grid = white.map((row) => row.map(() => null));
  cells.forEach((cell, index) => { grid[cell.r][cell.c] = value[index]; });
  return grid;
}

let lastBoards = [];

export function countSolutions(grid, limit = 2, stepLimit = 8000) {
  lastBoards = [];
  const n = grid.length;
  const white = grid.map((row) => row.map((cell) => cell.type === "white"));
  const { runs, across, down } = runsOf(white);
  const cells = [];
  const given = [];
  grid.forEach((row, r) => row.forEach((cell, c) => {
    if (cell.type !== "white") return;
    const index = cells.length;
    cells.push({ r, c, h: across[r][c], v: down[r][c] });
    if (cell.given) given.push([index, cell.given]);
  }));
  runs.forEach((run) => {
    let sum = 0;
    const [sr, sc] = run.cells[0];
    const clue = run.dir === "right" ? grid[sr][sc - 1] : grid[sr - 1][sc];
    sum = run.dir === "right" ? clue.right : clue.down;
    run.sum = sum;
    run.masks = combos(run.cells.length, sum);
  });
  const used = runs.map(() => 0);
  const value = Array(cells.length).fill(0);
  given.forEach(([index, digit]) => {
    value[index] = digit;
    used[cells[index].h] |= 1 << digit;
    used[cells[index].v] |= 1 << digit;
  });
  let found = 0;
  let steps = 0;

  function allows(run, mask) {
    return run.masks.some((combo) => (combo & mask) === mask);
  }

  function candidates(index) {
    const cell = cells[index];
    let mask = (~used[cell.h]) & (~used[cell.v]) & 0x3fe;
    const next = [];
    bits(mask).forEach((digit) => {
      const bit = 1 << digit;
      if (allows(runs[cell.h], used[cell.h] | bit) && allows(runs[cell.v], used[cell.v] | bit)) next.push(digit);
    });
    return next;
  }

  function search() {
    steps += 1;
    if (found >= limit || steps > stepLimit) {
      if (steps > stepLimit) found = limit;
      return;
    }
    let best = -1;
    let bestList = null;
    for (let i = 0; i < cells.length; i += 1) {
      if (value[i]) continue;
      const list = candidates(i);
      if (best === -1 || list.length < bestList.length) {
        best = i;
        bestList = list;
        if (list.length <= 1) break;
      }
    }
    if (best < 0) {
      const snap = grid.map((row) => row.map(() => null));
      cells.forEach((cell, index) => { snap[cell.r][cell.c] = value[index]; });
      lastBoards.push(snap);
      found += 1;
      return;
    }
    for (const digit of bestList) {
      const cell = cells[best];
      value[best] = digit;
      used[cell.h] |= 1 << digit;
      used[cell.v] |= 1 << digit;
      search();
      used[cell.h] &= ~(1 << digit);
      used[cell.v] &= ~(1 << digit);
      value[best] = 0;
      if (found >= limit) return;
    }
  }

  search();
  return found;
}

function buildGrid(white, digits) {
  const n = white.length;
  const grid = white.map((row) => row.map(() => ({ type: "block" })));
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (white[r][c]) {
        grid[r][c] = { type: "white" };
        continue;
      }
      let right = 0;
      let down = 0;
      for (let cc = c + 1; cc < n && white[r][cc]; cc += 1) right += digits[r][cc];
      for (let rr = r + 1; rr < n && white[rr][c]; rr += 1) down += digits[rr][c];
      if (right || down) {
        const clue = { type: "clue" };
        if (right) clue.right = right;
        if (down) clue.down = down;
        grid[r][c] = clue;
      }
    }
  }
  const solution = digits.map((row) => row.map((value) => (value == null ? null : value)));
  return { grid, solution, size: n };
}

function dealOnce(difficulty = "easy") {
  const cfg = CONFIG[difficulty] || CONFIG.easy;
  const started = Date.now();
  while (Date.now() - started < cfg.budget) {
    const white = paintShape(cfg.size, cfg.min, cfg.max, cfg.whites[0], cfg.whites[1]);
    if (!white) continue;
    for (let fillTry = 0; fillTry < 6; fillTry += 1) {
      if (Date.now() - started > cfg.budget) break;
      const digits = fillDigits(white, fillTry === 0 ? "low" : fillTry === 1 ? "high" : "rand");
      if (!digits) continue;
      const built = buildGrid(white, digits);
      const count = countSolutions(built.grid, 2, 4000);
      if (count === 1) return built;
      if (fillTry < 2 && count > 1 && lastBoards[1]) {
        const other = lastBoards[1];
        const spots = [];
        digits.forEach((row, r) => row.forEach((value, c) => {
          if (value != null && other[r][c] != null && other[r][c] !== value) spots.push([r, c]);
        }));
        shuffle(spots);
        const { runs, across, down } = runsOf(white);
        for (const [r, c] of spots.slice(0, 4)) {
          const used = new Set();
          runs[across[r][c]].cells.concat(runs[down[r][c]].cells).forEach(([rr, cc]) => {
            if (rr !== r || cc !== c) used.add(digits[rr][cc]);
          });
          for (let digit = 1; digit <= 9; digit += 1) {
            if (used.has(digit) || digit === digits[r][c]) continue;
            const previous = digits[r][c];
            digits[r][c] = digit;
            const next = buildGrid(white, digits);
            if (countSolutions(next.grid, 2, 8000) === 1) return next;
            digits[r][c] = previous;
            if (Date.now() - started > cfg.budget) break;
          }
        }
      }
      if (difficulty === "easy" && count > 1) {
        const spots = [];
        built.grid.forEach((row, r) => row.forEach((cell, c) => {
          if (cell.type === "white") spots.push([r, c]);
        }));
        shuffle(spots);
        for (const [r, c] of spots.slice(0, 8)) {
          built.grid[r][c] = { type: "white", given: digits[r][c] };
          if (countSolutions(built.grid, 2) === 1) return built;
          built.grid[r][c] = { type: "white" };
        }
      }
    }
  }
  throw new Error("Tek çözüm Kakuro üretilemedi");
}

export function generate(difficulty = "easy") {
  let failure;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return dealOnce(difficulty);
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}
