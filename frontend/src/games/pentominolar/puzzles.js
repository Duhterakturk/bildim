import { PENTOMINOES, orient } from "./shapes";
import { shuffle } from "../common/latinSquare";

// Beşli Şekil: seçilen parçalar kenar kenara dizilerek boşluksuz bir alan
// oluşturur. Oyuncu bu alanı verilen parçalarla döşer.
const COUNT_BY_DIFFICULTY = { easy: 2, medium: 3, hard: 4 };

function id(r, c) {
  return `${r},${c}`;
}

function parseId(value) {
  const [r, c] = value.split(",");
  return [Number(r), Number(c)];
}

function attach(occupied, shape) {
  const anchors = [...occupied].map(parseId);
  for (let attempt = 0; attempt < 100; attempt++) {
    const [ar, ac] = anchors[Math.floor(Math.random() * anchors.length)];
    const dir = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ][Math.floor(Math.random() * 4)];
    const [sr, sc] = shape[Math.floor(Math.random() * shape.length)];
    const originR = ar + dir[0] - sr;
    const originC = ac + dir[1] - sc;
    const cells = shape.map(([r, c]) => [r + originR, c + originC]);
    if (cells.some(([r, c]) => occupied.has(id(r, c)))) continue;
    return cells;
  }
  return null;
}

function orthogonal(cells) {
  const set = new Set(cells.map(([r, c]) => id(r, c)));
  const seen = new Set([id(cells[0][0], cells[0][1])]);
  const stack = [[cells[0][0], cells[0][1]]];
  while (stack.length) {
    const [r, c] = stack.pop();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const next = id(r + dr, c + dc);
      if (!set.has(next) || seen.has(next)) return;
      seen.add(next);
      stack.push([r + dr, c + dc]);
    });
  }
  return seen.size === cells.length;
}

export function distinctTilings(pieces, region) {
  const regionSet = new Set(region);
  const used = new Set();
  const signatures = new Set();
  const placed = [];

  function search(index) {
    if (signatures.size >= 2) return;
    if (index === pieces.length) {
      const sig = placed
        .map((piece) => `${piece.name}:${[...piece.cells].sort().join(".")}`)
        .sort()
        .join("|");
      signatures.add(sig);
      return;
    }
    const name = pieces[index];
    for (const flipped of [false, true]) {
      for (let turns = 0; turns < 4; turns++) {
        const shape = orient(PENTOMINOES[name], turns, flipped);
        for (const cell of region) {
          if (signatures.size >= 2) return;
          const [r, c] = parseId(cell);
          const [sr, sc] = shape[0];
          const cells = shape.map(([rr, cc]) => id(rr - sr + r, cc - sc + c));
          if (cells.some((item) => !regionSet.has(item) || used.has(item))) continue;
          cells.forEach((item) => used.add(item));
          placed.push({ name, cells });
          search(index + 1);
          placed.pop();
          cells.forEach((item) => used.delete(item));
        }
      }
    }
  }
  search(0);
  return signatures.size;
}

export function generate(difficulty = "easy") {
  const count = COUNT_BY_DIFFICULTY[difficulty] || 2;
  const names = Object.keys(PENTOMINOES);

  for (let attempt = 0; attempt < 400; attempt++) {
    const picked = shuffle(names).slice(0, count);
    const occupied = new Set();
    const placements = [];
    let ok = true;

    for (const name of picked) {
      const shape = orient(PENTOMINOES[name], Math.floor(Math.random() * 4), Math.random() < 0.5);
      let cells;
      if (placements.length === 0) {
        cells = shape.map(([r, c]) => [r, c]);
      } else {
        cells = attach(occupied, shape);
      }
      if (!cells) {
        ok = false;
        break;
      }
      cells.forEach(([r, c]) => occupied.add(id(r, c)));
      placements.push({ name, cells });
    }
    if (!ok) continue;

    const all = placements.flatMap((piece) => piece.cells);
    const minR = Math.min(...all.map(([r]) => r));
    const minC = Math.min(...all.map(([, c]) => c));
    const normalized = placements.map((piece) => ({
      name: piece.name,
      cells: piece.cells.map(([r, c]) => [r - minR, c - minC]),
    }));
    const rows = Math.max(...normalized.flatMap((piece) => piece.cells.map(([r]) => r))) + 1;
    const cols = Math.max(...normalized.flatMap((piece) => piece.cells.map(([, c]) => c))) + 1;
    const pairs = normalized.flatMap((piece) => piece.cells);
    if (!orthogonal(pairs)) continue;
    const region = shuffle(pairs.map(([r, c]) => id(r, c)));
    const pieceNames = normalized.map((piece) => piece.name);
    if (distinctTilings(pieceNames, region) !== 1) continue;
    return {
      pieces: pieceNames,
      region: region.map((cell) => {
        const [r, c] = parseId(cell);
        return `${r}-${c}`;
      }),
      rows,
      cols,
      solutionPlacements: normalized.map((piece) => ({
        name: piece.name,
        cells: piece.cells.map(([r, c]) => `${r}-${c}`),
      })),
    };
  }
  throw new Error("Beşli şekil alanı üretilemedi");
}
