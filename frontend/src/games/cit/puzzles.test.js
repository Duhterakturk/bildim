import { describe, it, expect } from "vitest";
import { countFences } from "../common/solvers";
import { generate, isSimpleCycle } from "./puzzles";

const SIZE = { easy: 5, medium: 5, hard: 6 };

function interiorFromLoop(horizontal, vertical, n) {
  const inside = new Set();
  for (let r = 0; r < n; r++) {
    let crossed = false;
    for (let c = 0; c < n; c++) {
      if (vertical[r][c]) crossed = !crossed;
      if (crossed) inside.add(`${r}-${c}`);
    }
  }
  return inside;
}

function isFilledRectangle(keys) {
  const cells = [...keys].map((key) => key.split("-").map(Number));
  const rows = cells.map(([r]) => r);
  const cols = cells.map(([, c]) => c);
  const height = Math.max(...rows) - Math.min(...rows) + 1;
  const width = Math.max(...cols) - Math.min(...cols) + 1;
  return cells.length === height * width;
}

describe("Çit loop generator", () => {
  it("deals 300 hard loops within 1.5 seconds, each with one solution", () => {
    let slowest = 0;
    for (let round = 0; round < 300; round += 1) {
      const started = Date.now();
      const puzzle = generate("hard");
      const elapsed = Date.now() - started;
      if (elapsed > slowest) slowest = elapsed;
      expect(elapsed).toBeLessThan(1500);
      expect(countFences(puzzle.clues)).toBe(1);
    }
    expect(slowest).toBeLessThan(1500);
  }, 180000);

  it("builds one non-rectangular closed loop whose clues match the edges", () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      const n = SIZE[difficulty];
      for (let i = 0; i < 4; i++) {
        const { clues, horizontalSolution, verticalSolution, size } = generate(difficulty);
        expect(size).toBe(n);
        expect(isSimpleCycle(horizontalSolution, verticalSolution, n)).toBe(true);
        const interior = interiorFromLoop(horizontalSolution, verticalSolution, n);
        expect(interior.size).toBeGreaterThanOrEqual(6);
        expect(isFilledRectangle(interior)).toBe(false);

        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (clues[r][c] === null) continue;
            let count = 0;
            if (horizontalSolution[r][c]) count++;
            if (horizontalSolution[r + 1][c]) count++;
            if (verticalSolution[r][c]) count++;
            if (verticalSolution[r][c + 1]) count++;
            expect(clues[r][c]).toBe(count);
          }
        }
      }
    }
  });
});
