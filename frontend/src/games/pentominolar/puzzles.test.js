import { describe, it, expect } from "vitest";
import tr from "../../i18n/locales/tr.json";
import en from "../../i18n/locales/en.json";
import { PENTOMINOES } from "./shapes";
import { generate } from "./puzzles";

const COUNT = { easy: 2, medium: 3, hard: 4 };

describe("Beşli Şekil generator", () => {
  it("says pieces can be flipped", () => {
    expect(tr.gameRules.pentominolar).toContain("ters çevrilebilir");
    expect(en.gameRules.pentominolar).toContain("flipped");
  });

  it("builds a gap-free region tiled by distinct five-square pieces", () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      const count = COUNT[difficulty];
      for (let i = 0; i < 20; i++) {
        const { pieces, region, rows, cols, solutionPlacements } = generate(difficulty);
        const solutionOrder = solutionPlacements.flatMap((piece) => piece.cells).join(",");
        expect(region.join(",")).not.toBe(solutionOrder);
        expect(pieces).toHaveLength(count);
        expect(new Set(pieces).size).toBe(count);
        expect(region).toHaveLength(count * 5);
        expect(new Set(region).size).toBe(count * 5);
        for (const key of region) {
          const [r, c] = key.split("-").map(Number);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThan(rows);
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThan(cols);
        }
        for (const name of pieces) expect(PENTOMINOES[name]).toHaveLength(5);
      }
    }
  });
});
