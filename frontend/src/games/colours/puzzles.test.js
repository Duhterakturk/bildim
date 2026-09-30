import { describe, expect, it } from "vitest";
import { QUESTION_3, generate, holds, pieceCode, solve } from "./puzzles";

const SOLUTION = [
  ["GC", "BC", "GS"],
  ["YC", "YS", "RC"],
  ["BS", "RS", "KC"],
];

function mulberry32(seed) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

describe("colours", () => {
  it("deals a different unique board for each difficulty", () => {
    const totals = { easy: 0, medium: 0, hard: 0 };
    ["easy", "medium", "hard"].forEach((difficulty) => {
      let previous = "";
      for (let round = 0; round < 20; round += 1) {
        const started = Date.now();
        const puzzle = generate(difficulty, mulberry32(70 + round + difficulty.length * 30));
        expect(Date.now() - started).toBeLessThan(2000);
        const codes = puzzle.solution.map((row) => row.map(pieceCode));
        expect(new Set(codes.flat()).size).toBe(9);
        expect(solve(puzzle.clues, puzzle.pieces.map(pieceCode))).toEqual([codes]);
        const signature = JSON.stringify(puzzle.clues) + JSON.stringify(codes);
        expect(signature).not.toBe(previous);
        previous = signature;
        const directs = puzzle.clues.filter((clue) => {
          const checks = clue.marks.flat().filter((mark) => mark === "V").length;
          return checks === 1 && clue.items.length === 1 && !clue.items[0].includes("?");
        }).length;
        expect(directs).toBeLessThanOrEqual({ easy: 2, medium: 1, hard: 0 }[difficulty]);
        puzzle.clues.forEach((clue) => {
          const kinds = new Set(clue.items.map((item) => (item.startsWith("?") ? "shape" : item.endsWith("?") ? "color" : "exact")));
          expect(kinds.size).toBe(1);
        });
        totals[difficulty] += puzzle.clues.length;
      }
    });
    expect(totals.easy / 20).toBeGreaterThan(totals.medium / 20);
    expect(totals.medium / 20).toBeGreaterThan(totals.hard / 20);
    expect(totals.hard / 20).toBeGreaterThanOrEqual(6);
    expect(totals.hard / 20).toBeLessThanOrEqual(7.5);
  });

  it("solves book question 3 with one layout", () => {
    expect(QUESTION_3.clues.every((clue) => holds(SOLUTION, clue))).toBe(true);
    expect(solve(QUESTION_3.clues)).toEqual([SOLUTION]);
  });
});
