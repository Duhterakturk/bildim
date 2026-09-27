import { generateLatinSquare, computeCageClue } from "../common/latinSquare";
import { cageSolutions } from "../common/solvers";

const SIZES = { easy: [4], medium: [5, 4], hard: [6, 5, 4] };
const MAX_SIZE = { easy: 2, medium: 3, hard: 4 };

function blank(n) {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

function touches(left, right) {
  return left.some(([row, col]) => right.some(([otherRow, otherCol]) => Math.abs(row - otherRow) + Math.abs(col - otherCol) === 1));
}

function clueFor(cells, solution, difficulty, random) {
  const values = cells.map(([row, col]) => solution[row][col]);
  if (values.length === 1) return String(values[0]);
  const multiply = difficulty === "hard" ? 0.55 : difficulty === "medium" ? 0.35 : 0.15;
  let op = "+";
  if (values.length === 2) {
    const roll = random();
    if (roll < multiply) op = "×";
    else if (roll < multiply + (difficulty === "easy" ? 0.15 : 0.25)) op = "÷";
    else if (roll < 0.7) op = "−";
  } else if (random() < multiply) op = "×";
  return `${computeCageClue(op, values).target}${computeCageClue(op, values).op}`;
}

function pack(cages, solution, difficulty, random) {
  const cageId = blank(solution.length).map((row, rowIndex) => row.map((_, colIndex) => 0));
  const cageAnchor = {};
  const cageCells = {};
  const cageClues = {};
  cages.forEach((cells, index) => {
    const id = index + 1;
    const anchor = cells.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    cells.forEach(([row, col]) => {
      cageId[row][col] = id;
    });
    cageAnchor[id] = anchor;
    cageCells[id] = cells;
    cageClues[id] = clueFor(cells, solution, difficulty, random);
  });
  return { cageId, cageAnchor, cageCells, cageClues };
}

function layout(n, solution, difficulty, random) {
  let cages = [];
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) cages.push([[row, col]]);
  }
  const maxSize = MAX_SIZE[difficulty] || 2;
  const goal = difficulty === "hard" ? Math.ceil((n * n) / 3.2) : difficulty === "medium" ? Math.ceil((n * n) / 2.4) : Math.ceil((n * n) / 1.7);
  let guard = 0;
  while (cages.length > goal && guard < 300) {
    guard += 1;
    const index = Math.floor(random() * cages.length);
    const neighbors = cages
      .map((cells, other) => ({ cells, other }))
      .filter((item) => item.other !== index && cages[index].length + item.cells.length <= maxSize && touches(cages[index], item.cells));
    if (!neighbors.length) continue;
    const pick = neighbors[Math.floor(random() * neighbors.length)];
    cages[index] = cages[index].concat(pick.cells);
    cages.splice(pick.other, 1);
  }
  return pack(cages, solution, difficulty, random);
}

function connectedGroups(cells) {
  const set = new Set(cells.map(([r, c]) => `${r}-${c}`));
  const seen = new Set();
  const groups = [];
  cells.forEach(([row, col]) => {
    const start = `${row}-${col}`;
    if (seen.has(start)) return;
    const group = [];
    const stack = [[row, col]];
    seen.add(start);
    while (stack.length) {
      const [r, c] = stack.pop();
      group.push([r, c]);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const key = `${r + dr}-${c + dc}`;
        if (!set.has(key) || seen.has(key)) return;
        seen.add(key);
        stack.push([r + dr, c + dc]);
      });
    }
    groups.push(group);
  });
  return groups;
}

function pin(body, solution, row, col, difficulty, random) {
  const cages = [];
  Object.values(body.cageCells).forEach((group) => {
    if (!group.some(([r, c]) => r === row && c === col)) {
      cages.push(group);
      return;
    }
    const rest = group.filter(([r, c]) => r !== row || c !== col);
    cages.push(...connectedGroups(rest));
  });
  cages.push([[row, col]]);
  return pack(cages.filter((group) => group.length), solution, difficulty, random);
}

function attempt(n, difficulty, random, deadline) {
  let best = null;
  while (Date.now() < deadline) {
    const solution = generateLatinSquare(n);
    let body = layout(n, solution, difficulty, random);
    let found = cageSolutions(blank(n), body.cageId, body.cageClues, 2);
    let guard = 0;
    while (found.length > 1 && guard < n * n && Date.now() < deadline) {
      guard += 1;
      let row = 0;
      let col = 0;
      for (let r = 0; r < n; r += 1) {
        for (let c = 0; c < n; c += 1) {
          if (found[0][r][c] !== found[1][r][c]) {
            row = r;
            col = c;
          }
        }
      }
      body = pin(body, solution, row, col, difficulty, random);
      found = cageSolutions(blank(n), body.cageId, body.cageClues, 2);
    }
    if (found.length === 1) {
      best = { puzzle: blank(n), solution, ...body };
      return best;
    }
  }
  return best;
}

export function generate(difficulty = "easy", random = Math.random) {
  const deadline = Date.now() + 2800;
  const sizes = SIZES[difficulty] || SIZES.easy;
  for (const size of sizes) {
    const puzzle = attempt(size, difficulty, random, deadline);
    if (puzzle) return puzzle;
    if (Date.now() >= deadline) break;
  }
  const solution = generateLatinSquare(4);
  const cages = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) cages.push([[row, col]]);
  }
  return { puzzle: blank(4), solution, ...pack(cages, solution, "easy", random) };
}
