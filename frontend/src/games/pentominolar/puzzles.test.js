import { describe, it, expect } from "vitest";
import tr from "../../i18n/locales/tr.json";
import en from "../../i18n/locales/en.json";
import { PENTOMINOES } from "./shapes";
import { distinctTilings, generate } from "./puzzles";

const COUNT = { easy: 2, medium: 3, hard: 4 };

describe("Beşli Şekil generator", () => {
  it("says pieces can be flipped", () => {
    expect(tr.gameRules.pentominolar).toContain("ters çevrilebilir");
    expect(en.gameRules.pentominolar).toContain("flipped");
  });

  function linked(region) {
    const cells = region.map((key) => {
      const match = /^(\d+)-(\d+)$/.exec(key);
      expect(match).not.toBeNull();
      return [Number(match[1]), Number(match[2])];
    });
    const set = new Set(cells.map(([r, c]) => `${r},${c}`));
    const seen = new Set([`${cells[0][0]},${cells[0][1]}`]);
    const stack = [[cells[0][0], cells[0][1]]];
    while (stack.length) {
      const [r, c] = stack.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const next = `${r + dr},${c + dc}`;
        if (!set.has(next) || seen.has(next)) return;
        seen.add(next);
        stack.push([r + dr, c + dc]);
      });
    }
    return seen.size === cells.length;
  }

  it("builds one connected region with a single tiling", () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      const count = COUNT[difficulty];
      for (let i = 0; i < 200; i++) {
        const { pieces, region, rows, cols, solutionPlacements } = generate(difficulty);
        const solutionOrder = solutionPlacements.flatMap((piece) => piece.cells).join(",");
        expect(region.join(",")).not.toBe(solutionOrder);
        expect(pieces).toHaveLength(count);
        expect(new Set(pieces).size).toBe(count);
        expect(region).toHaveLength(count * 5);
        expect(linked(region)).toBe(true);
        for (const key of region) {
          const [r, c] = key.split("-").map(Number);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThan(rows);
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThan(cols);
        }
        const internal = region.map((key) => key.replace("-", ","));
        expect(distinctTilings(pieces, internal)).toBe(1);
        for (const name of pieces) expect(PENTOMINOES[name]).toHaveLength(5);
      }
    }
  }, 180000);
});
