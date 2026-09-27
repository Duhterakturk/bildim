import { describe, it, expect } from "vitest";
import { generate } from "./puzzles";

const SIZE_BY_DIFFICULTY = { easy: 5, medium: 6, hard: 7 };

function regionOf(regionGrid, id) {
  const cells = [];
  for (let r = 0; r < regionGrid.length; r++) {
    for (let c = 0; c < regionGrid.length; c++) {
      if (regionGrid[r][c] === id) cells.push([r, c]);
    }
  }
  return cells;
}

function isConnected(cells) {
  const set = new Set(cells.map(([r, c]) => `${r}-${c}`));
  const seen = new Set([`${cells[0][0]}-${cells[0][1]}`]);
  const stack = [[cells[0][0], cells[0][1]]];
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [rr, cc] of [
      [r + 1, c],
      [r - 1, c],
      [r, c + 1],
      [r, c - 1],
    ]) {
      const key = `${rr}-${cc}`;
      if (set.has(key) && !seen.has(key)) {
        seen.add(key);
        stack.push([rr, cc]);
      }
    }
  }
  return seen.size === cells.length;
}

describe("Yıldız Dizilimi generator", () => {
  it("always deals a puzzle", () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      for (let i = 0; i < 200; i++) {
        expect(() => generate(difficulty)).not.toThrow();
      }
    }
  }, 180000);

  it("places one star per row, column, and region, with no two stars touching", () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      const n = SIZE_BY_DIFFICULTY[difficulty];
      for (let i = 0; i < 20; i++) {
        const { solutionSet, regionGrid, size } = generate(difficulty);
        expect(size).toBe(n);
        expect(solutionSet.length).toBe(n);

        const positions = solutionSet.map((key) => key.split("-").map(Number));
        const rows = new Set(positions.map(([r]) => r));
        const cols = new Set(positions.map(([, c]) => c));
        expect(rows.size).toBe(n);
        expect(cols.size).toBe(n);

        for (let a = 0; a < positions.length; a++) {
          for (let b = a + 1; b < positions.length; b++) {
            const [r1, c1] = positions[a];
            const [r2, c2] = positions[b];
            expect(Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1).toBe(false);
          }
        }

        expect(positions.every(([r, c]) => regionGrid[r][c] === r)).toBe(false);
        const seenRegions = new Set();
        for (const [r, c] of positions) seenRegions.add(regionGrid[r][c]);
        expect(seenRegions.size).toBe(n);
        for (const id of seenRegions) {
          const cells = regionOf(regionGrid, id);
          expect(cells.length).toBeGreaterThan(0);
          expect(isConnected(cells)).toBe(true);
          const starsHere = positions.filter(([r, c]) => regionGrid[r][c] === id);
          expect(starsHere).toHaveLength(1);
        }
      }
    }
  });
});
