// ABC Bağlama: her harf çifti tek bir yatay/dikey çizgiyle bağlanır.
// Çizgiler kesişmez, kare paylaşmaz ve tahtayı boşluksuz kaplar.

const LETTERS = ["A", "B", "C", "D", "E", "F", "G"];
const CONFIG = {
  easy: { size: 5, pairs: [4] },
  medium: { size: 6, pairs: [5] },
  hard: { size: 7, pairs: [6, 7] },
};
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function cellKey(row, col) {
  return `${row}-${col}`;
}

function snake(size) {
  const path = [];
  for (let row = 0; row < size; row += 1) {
    const cols = row % 2 === 0
      ? [...Array(size).keys()]
      : [...Array(size).keys()].reverse();
    for (const col of cols) path.push([row, col]);
  }
  return path;
}

function backbite(path) {
  const index = new Map(path.map((cell, at) => [cellKey(cell[0], cell[1]), at]));
  const atEnd = Math.random() < 0.5;
  const end = atEnd ? 0 : path.length - 1;
  const [row, col] = path[end];
  const cuts = [];
  for (const [dr, dc] of DIRS) {
    const at = index.get(cellKey(row + dr, col + dc));
    if (at == null) continue;
    if (atEnd && at >= 2) cuts.push(at);
    if (!atEnd && at <= path.length - 3) cuts.push(at);
  }
  if (cuts.length === 0) return path;
  const cut = cuts[Math.floor(Math.random() * cuts.length)];
  if (atEnd) return [...path.slice(0, cut).reverse(), ...path.slice(cut)];
  return [...path.slice(0, cut + 1), ...path.slice(cut + 1).reverse()];
}

function split(path, pairs) {
  const lengths = [];
  let remain = path.length;
  for (let index = 0; index < pairs; index += 1) {
    const later = pairs - index - 1;
    const max = remain - 3 * later;
    const length = later === 0 ? remain : 3 + Math.floor(Math.random() * (max - 3 + 1));
    lengths.push(length);
    remain -= length;
  }
  for (let index = lengths.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [lengths[index], lengths[swap]] = [lengths[swap], lengths[index]];
  }
  const segments = [];
  let at = 0;
  for (const length of lengths) {
    segments.push(path.slice(at, at + length));
    at += length;
  }
  return segments;
}

function induced(segment) {
  const at = new Map(segment.map((cell, index) => [cellKey(cell[0], cell[1]), index]));
  for (let index = 0; index < segment.length; index += 1) {
    const [row, col] = segment[index];
    for (const [dr, dc] of DIRS) {
      const other = at.get(cellKey(row + dr, col + dc));
      if (other != null && Math.abs(other - index) > 1) return false;
    }
  }
  return true;
}

function chordSplit(path) {
  const segments = [];
  let start = 0;
  for (let end = 3; end <= path.length; end += 1) {
    const piece = path.slice(start, end);
    const last = end === path.length;
    if (induced(piece) && !last) continue;
    const cut = induced(piece) ? end : end - 1;
    if (cut - start < 3) return null;
    segments.push(path.slice(start, cut));
    start = cut;
    end = cut + 2;
  }
  if (start !== path.length) return null;
  return segments;
}

function retarget(segments, allowed) {
  const parts = segments.map((segment) => segment.slice());
  const low = Math.min(...allowed);
  while (!allowed.includes(parts.length)) {
    if (parts.length < low) {
      let index = 0;
      for (let at = 1; at < parts.length; at += 1) {
        if (parts[at].length > parts[index].length) index = at;
      }
      if (parts[index].length < 6) return null;
      const room = parts[index].length - 5;
      const cut = 3 + Math.floor(Math.random() * (room));
      parts.splice(index, 1, parts[index].slice(0, cut), parts[index].slice(cut));
      continue;
    }
    let merged = false;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const joined = parts[index].concat(parts[index + 1]);
      if (!induced(joined)) continue;
      parts.splice(index, 2, joined);
      merged = true;
      break;
    }
    if (!merged) return null;
  }
  return parts;
}

function pack(segments, size) {
  const fixedCells = {};
  const paths = {};
  segments.forEach((segment, index) => {
    const letter = LETTERS[index];
    const cells = segment.map(([row, col]) => cellKey(row, col));
    paths[letter] = cells;
    fixedCells[cells[0]] = letter;
    fixedCells[cells[cells.length - 1]] = letter;
  });
  return { fixedCells, rows: size, cols: size, paths };
}

function neighborsOf(key, size) {
  const [row, col] = key.split("-").map(Number);
  const found = [];
  for (const [dr, dc] of DIRS) {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (nextRow >= 0 && nextCol >= 0 && nextRow < size && nextCol < size) {
      found.push(cellKey(nextRow, nextCol));
    }
  }
  return found;
}

export function countFlows(fixedCells, size, limit = 2) {
  const groups = {};
  for (const [key, letter] of Object.entries(fixedCells)) {
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(key);
  }
  const pairs = Object.keys(groups).sort().map((letter) => {
    const [start, goal] = groups[letter];
    return [start, goal];
  });
  const terminal = new Map(Object.entries(fixedCells));
  const filled = new Set();
  let count = 0;
  let nodes = 0;
  const cap = 60000;

  function openNeighbors(current, goal) {
    return neighborsOf(current, size).filter((next) => {
      if (filled.has(next)) return false;
      return next === goal || !terminal.has(next);
    });
  }

  function reachable(start, goal) {
    const queue = [start];
    const seen = new Set([start]);
    while (queue.length) {
      const current = queue.pop();
      if (current === goal) return true;
      for (const next of neighborsOf(current, size)) {
        if (seen.has(next) || filled.has(next)) continue;
        if (next !== goal && terminal.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    return false;
  }

  function walk(current, goal, pairIndex) {
    if (count >= limit || nodes > cap) return;
    nodes += 1;
    if (current === goal) {
      for (let index = pairIndex + 1; index < pairs.length; index += 1) {
        const [start, end] = pairs[index];
        if (!reachable(start, end)) return;
      }
      cover(pairIndex + 1);
      return;
    }
    let options = openNeighbors(current, goal);
    const forced = options.filter((next) => next !== goal && neighborsOf(next, size).every((around) => around === current || filled.has(around)));
    if (forced.length > 1) return;
    if (forced.length === 1) options = forced;
    options.sort((left, right) => {
      const [lr, lc] = left.split("-").map(Number);
      const [rr, rc] = right.split("-").map(Number);
      const [gr, gc] = goal.split("-").map(Number);
      return Math.abs(lr - gr) + Math.abs(lc - gc) - (Math.abs(rr - gr) + Math.abs(rc - gc));
    });
    for (const next of options) {
      filled.add(next);
      walk(next, goal, pairIndex);
      filled.delete(next);
      if (count >= limit || nodes > cap) return;
    }
  }

  function cover(pairIndex) {
    if (count >= limit || nodes > cap) return;
    if (pairIndex === pairs.length) {
      if (filled.size === size * size) count += 1;
      return;
    }
    const [start, goal] = pairs[pairIndex];
    filled.add(start);
    walk(start, goal, pairIndex);
    filled.delete(start);
  }

  cover(0);
  if (nodes > cap && count < limit) return limit;
  return count;
}

function segmentKey(segments) {
  return segments.map((segment) => segment.map(([row, col]) => cellKey(row, col)).join(".")).join("|");
}

export function generate(difficulty = "easy") {
  const { size, pairs } = CONFIG[difficulty] || CONFIG.easy;
  const deadline = Date.now() + 2900;
  let path = snake(size);
  for (let step = 0; step < 220; step += 1) path = backbite(path);
  let spins = 0;
  while (Date.now() < deadline) {
    const chorded = chordSplit(path);
    const seen = new Set();
    const tries = chorded ? 8 : 0;
    for (let index = 0; index < tries && Date.now() < deadline; index += 1) {
      const aimed = retarget(chorded, pairs);
      if (!aimed) break;
      const key = segmentKey(aimed);
      if (seen.has(key)) break;
      seen.add(key);
      const puzzle = pack(aimed, size);
      if (countFlows(puzzle.fixedCells, size) === 1) return puzzle;
    }
    const pairCount = pairs[Math.floor(Math.random() * pairs.length)];
    const randomTries = size === 7 ? 0 : 4;
    for (let attempt = 0; attempt < randomTries && Date.now() < deadline; attempt += 1) {
      const puzzle = pack(split(path, pairCount), size);
      if (countFlows(puzzle.fixedCells, size) === 1) return puzzle;
    }
    spins += 1;
    if (spins % 5 === 0) {
      path = snake(size);
      for (let step = 0; step < 80; step += 1) path = backbite(path);
    } else {
      for (let step = 0; step < 50; step += 1) path = backbite(path);
    }
  }
  throw new Error("Harf bağı üretilemedi");
}
