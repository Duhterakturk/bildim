import { countFences } from "../common/solvers";

// Çit: dikdörtgen olmayan bir bölgenin sınırı, tek kapalı halka. Gizlenen
// ipuçları ikinci bir halka bırakmayacak kadar az tutulur.
const SIZE_BY_DIFFICULTY = { easy: 5, medium: 5, hard: 6 };
const HIDDEN_CLUES = { easy: 0, medium: 2, hard: 3 };

function neighbors(r, c, n) {
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ].filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < n && cc < n);
}

function hasPinch(cells, n) {
  const inside = new Set(cells.map(([r, c]) => `${r}-${c}`));
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const nw = inside.has(`${r}-${c}`);
      const ne = inside.has(`${r}-${c + 1}`);
      const sw = inside.has(`${r + 1}-${c}`);
      const se = inside.has(`${r + 1}-${c + 1}`);
      if ((nw && se && !ne && !sw) || (ne && sw && !nw && !se)) return true;
    }
  }
  return false;
}

function isFilledRectangle(cells) {
  const rows = cells.map(([r]) => r);
  const cols = cells.map(([, c]) => c);
  const height = Math.max(...rows) - Math.min(...rows) + 1;
  const width = Math.max(...cols) - Math.min(...cols) + 1;
  return cells.length === height * width;
}

function growRegion(n) {
  const target = Math.max(6, Math.round(n * n * 0.42));
  for (let attempt = 0; attempt < 60; attempt++) {
    const startR = Math.floor(Math.random() * n);
    const startC = Math.floor(Math.random() * n);
    const cells = [[startR, startC]];
    const inside = new Set([`${startR}-${startC}`]);
    while (cells.length < target) {
      const frontier = [];
      for (const [r, c] of cells) {
        for (const next of neighbors(r, c, n)) {
          if (!inside.has(`${next[0]}-${next[1]}`)) frontier.push(next);
        }
      }
      if (frontier.length === 0) break;
      const pick = frontier[Math.floor(Math.random() * frontier.length)];
      inside.add(`${pick[0]}-${pick[1]}`);
      cells.push(pick);
    }
    if (cells.length >= 6 && !isFilledRectangle(cells) && !hasPinch(cells, n)) return cells;
  }
  return null;
}

function boundary(cells, n) {
  const inside = new Set(cells.map(([r, c]) => `${r}-${c}`));
  const horizontal = Array.from({ length: n + 1 }, () => Array(n).fill(false));
  const vertical = Array.from({ length: n }, () => Array(n + 1).fill(false));
  for (const [r, c] of cells) {
    if (!inside.has(`${r - 1}-${c}`)) horizontal[r][c] = true;
    if (!inside.has(`${r + 1}-${c}`)) horizontal[r + 1][c] = true;
    if (!inside.has(`${r}-${c - 1}`)) vertical[r][c] = true;
    if (!inside.has(`${r}-${c + 1}`)) vertical[r][c + 1] = true;
  }
  return { horizontal, vertical };
}

function clueGrid(horizontal, vertical, n) {
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => {
      let count = 0;
      if (horizontal[r][c]) count++;
      if (horizontal[r + 1][c]) count++;
      if (vertical[r][c]) count++;
      if (vertical[r][c + 1]) count++;
      return count;
    })
  );
}

export function isSimpleCycle(horizontal, vertical, n) {
  const adj = new Map();
  function link(a, b) {
    const ka = `${a[0]}-${a[1]}`;
    const kb = `${b[0]}-${b[1]}`;
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka).push(kb);
    adj.get(kb).push(ka);
  }
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c < n; c++) {
      if (horizontal[r][c]) link([r, c], [r, c + 1]);
    }
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c <= n; c++) {
      if (vertical[r][c]) link([r, c], [r + 1, c]);
    }
  }
  const nodes = [...adj.keys()];
  if (nodes.length < 4) return false;
  if (nodes.some((key) => adj.get(key).length !== 2)) return false;
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

export function generate(difficulty = "easy") {
  const n = SIZE_BY_DIFFICULTY[difficulty] || 5;
  const hide = HIDDEN_CLUES[difficulty] || 0;
  const giveUp = Date.now() + 1400;
  for (let attempt = 0; attempt < 200 && Date.now() < giveUp; attempt++) {
    const cells = growRegion(n);
    if (!cells) continue;
    const { horizontal, vertical } = boundary(cells, n);
    if (!isSimpleCycle(horizontal, vertical, n)) continue;
    const clues = clueGrid(horizontal, vertical, n);
    const spots = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) spots.push([r, c]);
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    for (const [r, c] of spots.slice(0, Math.min(hide, spots.length - 1))) clues[r][c] = null;
    const budget = Math.min(Date.now() + 350, giveUp);
    if (countFences(clues, 2, budget) !== 1) continue;
    return {
      clues,
      horizontalSolution: horizontal,
      verticalSolution: vertical,
      size: n,
    };
  }
  throw new Error("Çit halkası üretilemedi");
}
