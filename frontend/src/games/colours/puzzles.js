// Colours: 3×3, 9 parça, boş hücre yok.
// Tikli kareler listedeki öğeleri birebir alır, sıra serbesttir.
// Çarpılı karelerde bu öğeler bulunmaz.
// ?S herhangi bir kare, ?C herhangi bir daire, B? o renkten herhangi bir parça.

export const PIECE_CODES = ["GS", "BS", "YS", "RS", "YC", "KC", "GC", "RC", "BC"];

export const BOOKLET_CODES = ["GC", "BC", "YC", "RC", "KC", "OC", "PC", "MC", "AC"];
const COLOR_OF = { O: "orange", P: "purple", M: "pink", A: "gray", G: "green", B: "blue", Y: "yellow", R: "red", K: "black" };
const SHAPE_OF = { S: "square", C: "circle" };
const CODE_COLOR = { orange: "O", purple: "P", pink: "M", gray: "A", green: "G", blue: "B", yellow: "Y", red: "R", black: "K" };
const CODE_SHAPE = { square: "S", circle: "C" };

export const QUESTION_3 = {
  clues: [
    { items: ["BC", "YC", "KC"], marks: [[".", "V", "."], ["V", ".", "."], [".", ".", "V"]] },
    { items: ["?C"], marks: [["V", ".", "."], [".", ".", "."], [".", ".", "."]] },
    { items: ["?S", "?S", "?S"], marks: [[".", ".", "V"], [".", "V", "."], [".", "V", "."]] },
    { items: ["B?", "B?"], marks: [[".", "V", "."], [".", ".", "."], ["V", ".", "."]] },
    { items: ["R?", "R?"], marks: [[".", ".", "."], [".", ".", "V"], [".", "V", "."]] },
    { items: ["Y?"], marks: [[".", ".", "X"], [".", ".", "X"], [".", ".", "X"]] },
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

export function matches(piece, item) {
  const code = pieceCode(piece);
  if (!code || !item) return false;
  if (item.startsWith("?")) return code[1] === item[1];
  if (item.endsWith("?")) return code[0] === item[0];
  return code === item;
}

function marked(marks, token) {
  const cells = [];
  marks.forEach((row, rowIndex) => {
    row.forEach((mark, colIndex) => {
      if (mark === token) cells.push([rowIndex, colIndex]);
    });
  });
  return cells;
}

function assigns(pieces, items) {
  if (pieces.length !== items.length) return false;
  const used = Array(items.length).fill(false);
  function take(index) {
    if (index === pieces.length) return true;
    for (let item = 0; item < items.length; item += 1) {
      if (used[item] || !matches(pieces[index], items[item])) continue;
      used[item] = true;
      if (take(index + 1)) return true;
      used[item] = false;
    }
    return false;
  }
  return take(0);
}

export function holds(grid, clue) {
  const checks = marked(clue.marks, "V");
  const crosses = marked(clue.marks, "X");
  if (checks.length) {
    const pieces = checks.map(([row, col]) => grid[row][col]);
    if (pieces.some((piece) => !piece)) return false;
    if (!assigns(pieces, clue.items)) return false;
  }
  return crosses.every(([row, col]) => {
    const piece = grid[row][col];
    return piece && clue.items.every((item) => !matches(piece, item));
  });
}

function fits(pieces, items) {
  const used = Array(items.length).fill(false);
  function place(index) {
    if (index === pieces.length) return true;
    for (let item = 0; item < items.length; item += 1) {
      if (used[item] || !matches(pieces[index], items[item])) continue;
      used[item] = true;
      if (place(index + 1)) return true;
      used[item] = false;
    }
    return false;
  }
  return place(0);
}

function colourBroken(grid, clue) {
  const crosses = marked(clue.marks, "X");
  if (crosses.some(([row, col]) => grid[row][col] && clue.items.some((item) => matches(grid[row][col], item)))) return true;
  const pieces = marked(clue.marks, "V").map(([row, col]) => grid[row][col]).filter(Boolean);
  return pieces.length > 0 && !fits(pieces, clue.items);
}

function colourOrder(clues) {
  const weight = Array(9).fill(0);
  clues.forEach((clue) => {
    marked(clue.marks, "V").forEach(([row, col]) => {
      weight[row * 3 + col] += 3;
    });
    marked(clue.marks, "X").forEach(([row, col]) => {
      weight[row * 3 + col] += 1;
    });
  });
  return [0, 1, 2, 3, 4, 5, 6, 7, 8].sort((left, right) => weight[right] - weight[left] || left - right);
}

export function solve(clues, palette = PIECE_CODES) {
  const grid = [null, null, null].map(() => [null, null, null]);
  const found = [];
  const order = colourOrder(clues);

  function place(index, used) {
    if (found.length > 1) return;
    if (clues.some((clue) => colourBroken(grid, clue))) return;
    if (index === 9) {
      if (clues.every((clue) => holds(grid, clue))) found.push(grid.map((row) => row.slice()));
      return;
    }
    const row = Math.floor(order[index] / 3);
    const col = order[index] % 3;
    for (const code of palette) {
      if (used.has(code)) continue;
      grid[row][col] = code;
      used.add(code);
      place(index + 1, used);
      used.delete(code);
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

function blankMarks() {
  return [[".", ".", "."], [".", ".", "."], [".", ".", "."]];
}

function paint(cells, token) {
  const marks = blankMarks();
  cells.forEach(([row, col]) => {
    marks[row][col] = token;
  });
  return marks;
}

function itemOf(code, mode) {
  if (mode === "exact") return code;
  if (mode === "shape") return `?${code[1]}`;
  return `${code[0]}?`;
}

function itemKind(item) {
  if (item.startsWith("?")) return "shape";
  if (item.endsWith("?")) return "color";
  return "exact";
}

function directColour(clue) {
  const checks = clue.marks.flat().filter((mark) => mark === "V").length;
  return checks === 1 && clue.items.length === 1 && itemKind(clue.items[0]) === "exact";
}

const DIRECT_CAP = { easy: 2, medium: 1, hard: 0 };

function colourPool(grid) {
  const clues = [];
  const seen = new Set();
  function add(clue) {
    const signature = JSON.stringify(clue);
    if (seen.has(signature) || !holds(grid, clue)) return;
    if (new Set(clue.items.map(itemKind)).size !== 1) return;
    seen.add(signature);
    clues.push(clue);
  }
  const cells = [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => [row, col]));
  cells.forEach((cell) => {
    const code = grid[cell[0]][cell[1]];
    ["exact"].forEach((mode) => {
      add({ items: [itemOf(code, mode)], marks: paint([cell], "V") });
    });
  });
  for (let row = 0; row < 3; row += 1) {
    const line = [[row, 0], [row, 1], [row, 2]];
    [[line[0], line[1]], [line[1], line[2]], [line[0], line[2]], line].forEach((group) => {
      ["exact"].forEach((mode) => {
        add({ items: group.map(([r, c]) => itemOf(grid[r][c], mode)), marks: paint(group, "V") });
      });
    });
  }
  for (let col = 0; col < 3; col += 1) {
    const line = [[0, col], [1, col], [2, col]];
    [[line[0], line[1]], [line[1], line[2]], line].forEach((group) => {
      ["exact"].forEach((mode) => {
        add({ items: group.map(([r, c]) => itemOf(grid[r][c], mode)), marks: paint(group, "V") });
      });
    });
  }
  function segments(line) {
    for (let start = 0; start < line.length; start += 1) {
      for (let end = start + 1; end <= line.length; end += 1) {
        const seg = line.slice(start, end);
        const present = seg.map(([row, col]) => grid[row][col]);
        BOOKLET_CODES.forEach((code) => {
          [code].forEach((item) => {
            if (present.every((piece) => !matches(piece, item))) add({ items: [item], marks: paint(seg, "X") });
          });
        });
      }
    }
  }
  for (let row = 0; row < 3; row += 1) segments([[row, 0], [row, 1], [row, 2]]);
  for (let col = 0; col < 3; col += 1) segments([[0, col], [1, col], [2, col]]);
  return clues;
}

function sameFound(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function underCap(list, clue, cap) {
  return !directColour(clue) || list.filter(directColour).length < cap;
}

function assemble(pool, sparePool, random, difficulty) {
  const cap = DIRECT_CAP[difficulty] ?? 0;
  const clues = [];
  let known = null;
  for (const clue of pool) {
    if (known && known.length === 1) break;
    if (!underCap(clues, clue, cap)) continue;
    const found = solve(clues.concat(clue), BOOKLET_CODES);
    if (!found.length) continue;
    if (known && found.length === known.length && sameFound(found, known)) continue;
    clues.push(clue);
    known = found;
  }
  if (!known || known.length !== 1) return null;
  const seen = new Set(clues.map((clue) => JSON.stringify(clue)));
  sparePool.forEach((clue) => {
    if (seen.has(JSON.stringify(clue)) || directColour(clue) || clues.length >= 16) return;
    seen.add(JSON.stringify(clue));
    clues.push(clue);
  });
  const kept = clues.slice();
  const dropped = [];
  for (let index = 0; index < kept.length;) {
    const next = kept.filter((_, item) => item !== index);
    if (solve(next, BOOKLET_CODES).length === 1) {
      dropped.push(kept[index]);
      kept.splice(index, 1);
    } else {
      index += 1;
    }
  }
  const lift = Math.max(0, 6 + Math.floor(random() * 2) - kept.length);
  const spare = difficulty === "easy" ? lift + 2 + Math.floor(random() * 2) : difficulty === "medium" ? lift + 1 : lift;
  const plain = shuffle(dropped.filter((clue) => !directColour(clue)), random);
  const pins = shuffle(dropped.filter(directColour), random);
  const back = [];
  [...plain, ...pins].forEach((clue) => {
    if (back.length >= spare || !underCap(kept.concat(back), clue, cap)) return;
    back.push(clue);
  });
  return shuffle([...kept, ...back], random);
}

export function generate(difficulty = "easy", random = Math.random) {
  const cap = DIRECT_CAP[difficulty] ?? 0;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const order = shuffle(BOOKLET_CODES, random);
    const solution = [order.slice(0, 3), order.slice(3, 6), order.slice(6)];
    const pool = colourPool(solution);
    const pins = shuffle(pool.filter(directColour), random).slice(0, cap);
    const rest = pool.filter((clue) => !directColour(clue));
    const strong = shuffle(rest.filter((clue) => clue.marks.flat().filter((mark) => mark === "V").length >= 2 && clue.items.every((item) => itemKind(item) === "exact")), random);
    const weak = shuffle(rest.filter((clue) => !strong.includes(clue)), random);
    const chosen = assemble([...strong, ...weak.slice(0, 10), ...pins], weak.slice(10), random, difficulty);
    if (!chosen) continue;
    return {
      pieces: BOOKLET_CODES.map(pieceFromCode),
      clues: chosen,
      solution: rowsOf(solution),
    };
  }
  throw new Error("Renk bulmacası üretilemedi");
}
