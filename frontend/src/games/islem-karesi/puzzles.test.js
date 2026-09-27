import { describe, expect, it } from "vitest";
import { countBoards, evaluateLine, generate } from "./puzzles";

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

describe("işlem karesi", () => {
  it("multiplies before it adds", () => {
    expect(evaluateLine([9, 6, 8], ["×", "−"])).toBe(46);
    expect(evaluateLine([1, 3, 4], ["+", "+"])).toBe(8);
  });

  it("builds one board of positive results for each difficulty", () => {
    ["easy", "medium", "hard"].forEach((difficulty) => {
      for (let round = 0; round < 50; round += 1) {
        const puzzle = generate(difficulty, mulberry32(40 + round * 3 + difficulty.length));
        expect(countBoards(puzzle, 2)).toBe(1);
        expect(new Set(puzzle.solution.flat()).size).toBe(puzzle.solution.length ** 2);
        [...puzzle.rowResults, ...puzzle.colResults].forEach((value) => {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(1);
        });
      }
    });
  }, 180000);
});
