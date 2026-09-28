import { describe, expect, it } from "vitest";
import { countSolutions, generate, shapeProblems } from "./puzzles";

function whites(grid) {
  return grid.map((row) => row.map((cell) => cell.type === "white"));
}

describe("kakuro", () => {
  it("deals 200 puzzles per difficulty without failing", () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      for (let round = 0; round < 200; round += 1) {
        const puzzle = generate(difficulty);
        expect(puzzle.size).toBeGreaterThan(0);
        expect(puzzle.grid).toHaveLength(puzzle.size);
        expect(puzzle.solution).toHaveLength(puzzle.size);
      }
    }
  }, 180000);

  for (const difficulty of ["easy", "medium", "hard"]) {
    it(`builds 20 unique ${difficulty} boards in time`, () => {
      const limit = difficulty === "easy" ? 1000 : difficulty === "medium" ? 2000 : 3000;
      const sizes = { easy: 6, medium: 7, hard: 8 };
      const bounds = { easy: [2, 4], medium: [2, 5], hard: [2, 6] };
      for (let i = 0; i < 20; i += 1) {
        const started = Date.now();
        const puzzle = generate(difficulty);
        expect(Date.now() - started).toBeLessThan(limit);
        expect(puzzle.size).toBe(sizes[difficulty]);
        expect(countSolutions(puzzle.grid, 2)).toBe(1);
        const mask = whites(puzzle.grid);
        expect(shapeProblems(mask, bounds[difficulty][0], bounds[difficulty][1])).toBe("");
        const filled = mask.flat().filter(Boolean).length;
        if (difficulty === "medium") expect(filled).toBeGreaterThanOrEqual(20);
        if (difficulty === "hard") {
          expect(filled).toBeGreaterThanOrEqual(32);
          expect(filled).toBeLessThanOrEqual(40);
        }
        for (let i = 1; i < puzzle.size; i += 1) {
          expect(mask[i].some(Boolean)).toBe(true);
          expect(mask.some((row) => row[i])).toBe(true);
        }
        const givens = puzzle.grid.flat().filter((cell) => cell.given).length;
        if (difficulty === "easy") expect(givens).toBeLessThanOrEqual(1);
        else expect(givens).toBe(0);
        puzzle.solution.forEach((row, r) => row.forEach((value, c) => {
          if (puzzle.grid[r][c].type === "white") expect(value).toBeGreaterThanOrEqual(1);
          else expect(value).toBeNull();
        }));
      }
    }, 60000);
  }
});
