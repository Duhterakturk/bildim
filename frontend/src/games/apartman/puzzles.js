import { generateLatinSquare, shuffle } from "../common/latinSquare";
import { countLatin } from "../common/solvers";

// 4x4 Apartman. Kenar ipuçları her oynanışta yeni bir Latin kareden hesaplanır.
// Yalnızca tek çözümü olan bulmacalar döner.
export const GIVENS_BY_DIFFICULTY = { easy: 0, medium: 0, hard: 0 };
export const EDGE_CLUES_BY_DIFFICULTY = { easy: 12, medium: 9, hard: 6 };

function visibleCount(sequence) {
  let count = 0;
  let tallest = 0;
  for (const height of sequence) {
    if (height > tallest) {
      count++;
      tallest = height;
    }
  }
  return count;
}

export function computeClues(solution) {
  const n = solution.length;
  const top = [];
  const bottom = [];
  for (let c = 0; c < n; c++) {
    const col = solution.map((row) => row[c]);
    top.push(visibleCount(col));
    bottom.push(visibleCount([...col].reverse()));
  }
  const left = solution.map((row) => visibleCount(row));
  const right = solution.map((row) => visibleCount([...row].reverse()));
  return { top, bottom, left, right };
}

function respects(grid, clues) {
  const n = grid.length;
  const again = computeClues(grid);
  return ["top", "bottom", "left", "right"].every((side) =>
    again[side].every((value, i) => !clues[side][i] || value === clues[side][i])
  ) && grid.length === n;
}

export function generate(difficulty = "easy") {
  const target = EDGE_CLUES_BY_DIFFICULTY[difficulty] || 12;
  const puzzle = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let attempt = 0; attempt < 120; attempt++) {
    const solution = generateLatinSquare(4);
    const clues = computeClues(solution);
    if (countLatin(puzzle, 2, (grid) => respects(grid, clues)) !== 1) continue;
    let remaining = 16;
    const positions = shuffle(["top", "bottom", "left", "right"].flatMap(side =>
      Array.from({ length: 4 }, (_, i) => [side, i])));
    for (const [side, i] of positions) {
      if (remaining === target) break;
      const saved = clues[side][i];
      clues[side][i] = 0;
      if (countLatin(puzzle, 2, (grid) => respects(grid, clues)) === 1) remaining--;
      else clues[side][i] = saved;
    }
    if (remaining === target) return { puzzle, solution, clues };
  }
  throw new Error("Unique Apartman puzzle generation failed");
}
