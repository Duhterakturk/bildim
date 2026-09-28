// Metaforms. Desen yalnızca kayar. Döndürülmez, aynalanmaz.
// "#" öznenin yeridir. "X" öznenin olmadığı yerdir. "." kısıt değildir.
// "-" desende yoktur. "RC" belirli parça, "?T" herhangi bir üçgen, "R?" herhangi bir kırmızıdır.

export const SHAPES = ["circle", "square", "triangle"];
export const COLORS = ["red", "yellow", "blue"];

const COLOR_OF = { R: "red", B: "blue", Y: "yellow" };
const SHAPE_OF = { S: "square", T: "triangle", C: "circle" };
const CODE_COLOR = { red: "R", blue: "B", yellow: "Y" };
const CODE_SHAPE = { square: "S", triangle: "T", circle: "C" };
const PIECES = ["RS", "RT", "RC", "BS", "BT", "BC", "YS", "YT", "YC"];

export const PUZZLE_12 = {
  id: 12,
  clues: [
    { subject: "B?", pattern: [[".", "X", "."]] },
    { subject: "RT", pattern: [["X", ".", "X"], [".", "X", "."], ["X", ".", "X"]] },
    { subject: "Y?", pattern: [["Y?", "-"], ["-", "#"]] },
    { subject: "BT", pattern: [["#", "-"], ["-", "RT"]] },
    { subject: "YS", pattern: [["-", "?T"], ["-", "."], ["#", "-"]] },
    { subject: "?C", pattern: [["-", "#"], ["?C", "-"]] },
    { subject: "RS", pattern: [["?C"], ["X"], ["X"]] },
  ],
};

export function pieceCode(piece) {
  if (!piece) return null;
  if (typeof piece === "string") return piece;
  const color = CODE_COLOR[piece.color];
  const shape = CODE_SHAPE[piece.shape];
  if (!color || !shape) return null;
  return `${color}${shape}`;
}

export function pieceFromCode(code) {
  return { color: COLOR_OF[code[0]], shape: SHAPE_OF[code[1]] };
}

export function matches(piece, subject) {
  const code = pieceCode(piece);
  if (!code || !subject) return false;
  if (subject.startsWith("?")) return code[1] === subject[1];
  if (subject.endsWith("?")) return code[0] === subject[0];
  return code === subject;
}

function patternBox(pattern) {
  const height = pattern.length;
  const width = pattern.reduce((max, row) => Math.max(max, row.length), 0);
  const cells = [];
  for (let row = 0; row < height; row += 1) {
    const line = pattern[row] || [];
    for (let col = 0; col < line.length; col += 1) {
      if (line[col] !== "-") cells.push({ row, col, token: line[col] });
    }
  }
  return { height, width, cells };
}

function origins(box) {
  const list = [];
  for (let row = 0; row <= 3 - box.height; row += 1) {
    for (let col = 0; col <= 3 - box.width; col += 1) list.push({ row, col });
  }
  return list;
}

function at(board, origin, cell) {
  return board[origin.row + cell.row][origin.col + cell.col];
}

function isPositive(box) {
  return box.cells.some((cell) => cell.token === "#");
}

function positivePossible(board, subject, cells, origin) {
  return cells.every((cell) => {
    const piece = at(board, origin, cell);
    if (cell.token === "X") return !piece || !matches(piece, subject);
    if (cell.token === ".") return true;
    if (!piece) return true;
    return matches(piece, cell.token === "#" ? subject : cell.token);
  });
}

function positiveWitness(board, subject, cells, origin) {
  return cells.every((cell) => {
    const piece = at(board, origin, cell);
    if (cell.token === "X") return Boolean(piece) && !matches(piece, subject);
    if (cell.token === ".") return true;
    return piece && matches(piece, cell.token === "#" ? subject : cell.token);
  });
}

function negativeBroken(board, subject, cells, origin) {
  const symbols = cells.filter((cell) => cell.token !== "." && cell.token !== "X" && cell.token !== "#");
  if (!symbols.every((cell) => matches(at(board, origin, cell), cell.token))) return false;
  return cells.some((cell) => cell.token === "X" && matches(at(board, origin, cell), subject));
}

function negativeSafe(board, subject, cells, origin) {
  const symbols = cells.filter((cell) => cell.token !== "." && cell.token !== "X" && cell.token !== "#");
  const contradicted = symbols.some((cell) => {
    const piece = at(board, origin, cell);
    return piece && !matches(piece, cell.token);
  });
  if (contradicted) return true;
  const crosses = cells.filter((cell) => cell.token === "X");
  return crosses.every((cell) => {
    const piece = at(board, origin, cell);
    return piece && !matches(piece, subject);
  });
}

export function clueStatus(board, clue) {
  const box = patternBox(clue.pattern);
  const spots = origins(box);
  const full = board.every((row) => row.every(Boolean));
  if (isPositive(box)) {
    if (spots.some((origin) => positiveWitness(board, clue.subject, box.cells, origin))) return "ok";
    if (!spots.some((origin) => positivePossible(board, clue.subject, box.cells, origin))) return "bad";
    return full ? "bad" : "open";
  }
  if (spots.some((origin) => negativeBroken(board, clue.subject, box.cells, origin))) return "bad";
  if (spots.every((origin) => negativeSafe(board, clue.subject, box.cells, origin))) return "ok";
  return full ? "bad" : "open";
}

export function isValid(board, clues) {
  return clues.every((clue) => clueStatus(board, clue) === "ok");
}

function metaOrder(clues) {
  const weight = Array(9).fill(0);
  clues.forEach((clue) => {
    const box = patternBox(clue.pattern);
    box.cells.forEach((cell) => {
      if (cell.token === "." || cell.token === "-") return;
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          const atRow = row + cell.row;
          const atCol = col + cell.col;
          if (atRow < 3 && atCol < 3) weight[atRow * 3 + atCol] += cell.token === "#" || cell.token === "X" ? 2 : 1;
        }
      }
    });
  });
  return [0, 1, 2, 3, 4, 5, 6, 7, 8].sort((left, right) => weight[right] - weight[left] || left - right);
}

export function solve(clues) {
  const grid = [null, null, null].map(() => [null, null, null]);
  const found = [];
  const order = metaOrder(clues);

  function place(index, used) {
    if (found.length > 1) return;
    if (clues.some((clue) => clueStatus(grid, clue) === "bad")) return;
    if (index === 9) {
      if (isValid(grid, clues)) found.push(grid.map((row) => row.slice()));
      return;
    }
    const row = Math.floor(order[index] / 3);
    const col = order[index] % 3;
    for (const piece of PIECES) {
      if (used.has(piece)) continue;
      grid[row][col] = piece;
      used.add(piece);
      place(index + 1, used);
      used.delete(piece);
      grid[row][col] = null;
      if (found.length > 1) return;
    }
  }

  place(0, new Set());
  return found;
}

function rowsOf(codes) {
  return codes.map((row) => row.map(pieceFromCode));
}

function shuffle(list, random) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

const TEMPLATES = [
  [{ r: 0, c: 0, t: "#" }, { r: 0, c: 1 }, { r: 0, c: 2 }],
  [{ r: 0, c: 0 }, { r: 0, c: 1, t: "#" }, { r: 0, c: 2 }],
  [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2, t: "#" }],
  [{ r: 0, c: 0, t: "#" }, { r: 1, c: 0 }, { r: 2, c: 0 }],
  [{ r: 0, c: 0 }, { r: 1, c: 0, t: "#" }, { r: 2, c: 0 }],
  [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0, t: "#" }],
  [{ r: 0, c: 0, t: "#" }, { r: 0, c: 1, t: "-" }, { r: 1, c: 0, t: "-" }, { r: 1, c: 1 }],
  [{ r: 0, c: 0, t: "-" }, { r: 0, c: 1, t: "#" }, { r: 1, c: 0 }, { r: 1, c: 1, t: "-" }],
  [{ r: 0, c: 0, t: "#" }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 2, c: 1 }],
  [{ r: 0, c: 1, t: "#" }, { r: 1, c: 1 }, { r: 2, c: 0 }, { r: 2, c: 1 }],
  [{ r: 0, c: 0, t: "#" }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }],
];

const NEGATIVES = [
  [["X", ".", "X"]],
  [[".", "X", "."]],
  [["X", "X", "."]],
  [[".", "X", "X"]],
  [["X"], ["."], ["X"]],
  [["."], ["X"], ["."]],
  [["X", "."], [".", "X"]],
];

function subjectsFor(code) {
  return [code, `?${code[1]}`, `${code[0]}?`];
}

function symbolFor(code, mode) {
  if (mode === "exact") return code;
  if (mode === "shape") return `?${code[1]}`;
  return `${code[0]}?`;
}

function directMeta(clue) {
  if (clue.subject.includes("?")) return false;
  const box = patternBox(clue.pattern);
  return isPositive(box) && origins(box).length === 1;
}

function relativeMeta(clue) {
  return clue.pattern.flat().some((token) => token !== "." && token !== "-" && token !== "#" && token !== "X");
}

const DIRECT_CAP = { easy: 2, medium: 1, hard: 0 };

function metaPool(grid, random) {
  const clues = [];
  const seen = new Set();
  function add(clue) {
    const signature = JSON.stringify(clue);
    if (seen.has(signature) || clueStatus(grid, clue) !== "ok") return;
    seen.add(signature);
    clues.push(clue);
  }
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const code = grid[row][col];
      subjectsFor(code).forEach((subject) => {
        TEMPLATES.forEach((template) => {
          const hash = template.find((cell) => cell.t === "#");
          const originRow = row - hash.r;
          const originCol = col - hash.c;
          const height = Math.max(...template.map((cell) => cell.r)) + 1;
          const width = Math.max(...template.map((cell) => cell.c)) + 1;
          if (originRow < 0 || originCol < 0 || originRow + height > 3 || originCol + width > 3) return;
          const pattern = Array.from({ length: height }, () => Array(width).fill("."));
          template.forEach((cell) => {
            if (cell.t === "-") pattern[cell.r][cell.c] = "-";
            if (cell.t === "#") pattern[cell.r][cell.c] = "#";
          });
          add({ subject, pattern });
          const pads = template.filter((cell) => cell.t !== "#" && cell.t !== "-");
          if (!pads.length) return;
          const pad = pads[Math.floor(random() * pads.length)];
          const piece = grid[originRow + pad.r][originCol + pad.c];
          const next = pattern.map((line) => line.slice());
          next[pad.r][pad.c] = symbolFor(piece, ["exact", "shape", "color"][Math.floor(random() * 3)]);
          add({ subject, pattern: next });
        });
      });
    }
  }
  PIECES.forEach((code) => {
    subjectsFor(code).forEach((subject) => {
      NEGATIVES.forEach((pattern) => add({ subject, pattern }));
    });
  });
  return clues;
}

function sameFound(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function underCap(list, clue, cap) {
  return !directMeta(clue) || list.filter(directMeta).length < cap;
}

function assemble(pool, random, difficulty) {
  const cap = DIRECT_CAP[difficulty] ?? 0;
  const clues = [];
  let known = null;
  for (const clue of pool) {
    if (known && known.length === 1) break;
    if (!underCap(clues, clue, cap)) continue;
    const found = solve(clues.concat(clue));
    if (!found.length) continue;
    if (known && found.length === known.length && sameFound(found, known)) continue;
    clues.push(clue);
    known = found;
  }
  if (!known || known.length !== 1) return null;
  const kept = clues.slice();
  const dropped = [];
  for (let index = 0; index < kept.length;) {
    const next = kept.filter((_, item) => item !== index);
    if (solve(next).length === 1) {
      dropped.push(kept[index]);
      kept.splice(index, 1);
    } else {
      index += 1;
    }
  }
  const spare = difficulty === "easy" ? 2 + Math.floor(random() * 2) : difficulty === "medium" ? 1 : 0;
  const relative = shuffle(dropped.filter((clue) => relativeMeta(clue) && !directMeta(clue)), random);
  const rest = shuffle(dropped.filter((clue) => !relativeMeta(clue) && !directMeta(clue)), random);
  const pins = shuffle(dropped.filter(directMeta), random);
  const back = [];
  [...relative, ...rest, ...pins].forEach((clue) => {
    if (back.length >= spare || !underCap(kept.concat(back), clue, cap)) return;
    back.push(clue);
  });
  return shuffle([...kept, ...back], random);
}

export function generate(difficulty = "easy", random = Math.random) {
  const cap = DIRECT_CAP[difficulty] ?? 0;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const order = shuffle(PIECES, random);
    const solution = [order.slice(0, 3), order.slice(3, 6), order.slice(6)];
    const pool = metaPool(solution, random);
    const relative = shuffle(pool.filter((clue) => relativeMeta(clue) && !directMeta(clue)), random);
    const rest = shuffle(pool.filter((clue) => !relativeMeta(clue) && !directMeta(clue)), random);
    const pins = shuffle(pool.filter(directMeta), random).slice(0, cap);
    const chosen = assemble([...relative.slice(0, 24), ...rest.slice(0, 8), ...pins], random, difficulty);
    if (!chosen) continue;
    return { clues: chosen, solution: rowsOf(solution) };
  }
  throw new Error("Parça bulmacası üretilemedi");
}
