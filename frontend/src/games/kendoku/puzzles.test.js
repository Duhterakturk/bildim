import { describe, expect, it } from "vitest";
import { countCages } from "../common/solvers";
import { generate } from "./puzzles";

function cagesOf(cageId) {
  const groups = new Map();
  cageId.forEach((row, r) => row.forEach((id, c) => {
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push([r, c]);
  }));
  return [...groups.values()];
}

function connected(cells) {
  const set = new Set(cells.map(([r, c]) => `${r}-${c}`));
  const seen = new Set([`${cells[0][0]}-${cells[0][1]}`]);
  const stack = [[cells[0][0], cells[0][1]]];
  while (stack.length) {
    const [r, c] = stack.pop();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const key = `${r + dr}-${c + dc}`;
      if (!set.has(key) || seen.has(key)) return;
      seen.add(key);
      stack.push([r + dr, c + dc]);
    });
  }
  return seen.size === cells.length;
}

describe("kendoku", () => {
  it("deals connected cages with one solution within three seconds", () => {
    ["easy", "medium", "hard"].forEach((difficulty) => {
      const size = { easy: 4, medium: 5, hard: 6 }[difficulty];
      for (let round = 0; round < 50; round += 1) {
        const started = Date.now();
        const puzzle = generate(difficulty);
        expect(Date.now() - started).toBeLessThan(3000);
        expect(puzzle.solution.length).toBeGreaterThanOrEqual(4);
        expect(puzzle.solution.length).toBeLessThanOrEqual(size);
        cagesOf(puzzle.cageId).forEach((cells) => {
          expect(cells.length).toBeGreaterThan(0);
          expect(connected(cells)).toBe(true);
        });
        const empty = puzzle.solution.map((row) => row.map(() => 0));
        expect(countCages(empty, puzzle.cageId, puzzle.cageClues)).toBe(1);
      }
    });
  }, 300000);
});
