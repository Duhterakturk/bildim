import { describe, expect, it } from "vitest";
import tr from "../../i18n/locales/tr.json";
import en from "../../i18n/locales/en.json";
import { hintFor } from "../hints";
import { PUZZLE_12, generate, isValid, pieceCode, solve } from "./puzzles";

const SOLUTION = [
  ["RS", "YT", "BC"],
  ["BT", "RC", "YC"],
  ["YS", "RT", "BS"],
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

describe("metaforms clues", () => {
  it("tells the player the pattern sits inside the board", () => {
    expect(tr.gameRules.metaforms).toContain("desenin tamamı (beyaz kareler dahil) 3×3 tahtanın içine sığar");
    expect(tr.gameRules.metaforms).toContain("herhangi bir parça olabilir");
    expect(en.gameRules.metaforms).toContain("fits inside the 3×3 board");
    expect(hintFor("metaforms", "tr").hint).toContain("3×3");
    expect(hintFor("metaforms", "en").hint).toContain("blank white cell");
  });

  it("deals a different unique board for each difficulty", () => {
    const totals = { easy: 0, medium: 0, hard: 0 };
    ["easy", "medium", "hard"].forEach((difficulty) => {
      let previous = "";
      for (let round = 0; round < 20; round += 1) {
        const started = Date.now();
        const puzzle = generate(difficulty, mulberry32(90 + round + difficulty.length * 30));
        expect(Date.now() - started).toBeLessThan(2000);
        const codes = puzzle.solution.map((row) => row.map(pieceCode));
        expect(new Set(codes.flat()).size).toBe(9);
        expect(solve(puzzle.clues)).toEqual([codes]);
        const signature = JSON.stringify(puzzle.clues) + JSON.stringify(codes);
        expect(signature).not.toBe(previous);
        previous = signature;
        const directs = puzzle.clues.filter((clue) => {
          if (clue.subject.includes("?")) return false;
          const height = clue.pattern.length;
          const width = clue.pattern.reduce((max, row) => Math.max(max, row.length), 0);
          const positive = clue.pattern.some((row) => row.includes("#"));
          return positive && (4 - height) * (4 - width) === 1;
        }).length;
        expect(directs).toBeLessThanOrEqual({ easy: 2, medium: 1, hard: 0 }[difficulty]);
        totals[difficulty] += puzzle.clues.length;
      }
    });
    expect(totals.easy / 20).toBeGreaterThan(totals.medium / 20);
    expect(totals.medium / 20).toBeGreaterThan(totals.hard / 20);
  });

  it("accepts the book solution and no other layout", () => {
    expect(isValid(SOLUTION, PUZZLE_12.clues)).toBe(true);
    const swapped = SOLUTION.map((row) => row.slice());
    const first = swapped[0][0];
    swapped[0][0] = swapped[0][1];
    swapped[0][1] = first;
    expect(isValid(swapped, PUZZLE_12.clues)).toBe(false);
    const found = solve(PUZZLE_12.clues);
    expect(found).toEqual([SOLUTION]);
  });
});
