import { describe, expect, it } from "vitest";
import tr from "../../i18n/locales/tr.json";
import en from "../../i18n/locales/en.json";
import { generate } from "./puzzles";

const SHIPS = {
  easy: [3, 2, 1, 1],
  medium: [4, 3, 2, 1, 1],
  hard: [4, 3, 3, 2, 2, 1, 1],
};

function countLayouts(rowClues, colClues, ships) {
  const rows = rowClues.length;
  const cols = colClues.length;
  const occupied = new Set();
  const sizes = [...ships].sort((a, b) => b - a);
  const anchor = [];
  let count = 0;

  function overCapacity() {
    for (let r = 0; r < rows; r += 1) {
      let n = 0;
      for (let c = 0; c < cols; c += 1) if (occupied.has(`${r}-${c}`)) n += 1;
      if (n > rowClues[r]) return true;
    }
    for (let c = 0; c < cols; c += 1) {
      let n = 0;
      for (let r = 0; r < rows; r += 1) if (occupied.has(`${r}-${c}`)) n += 1;
      if (n > colClues[c]) return true;
    }
    return false;
  }

  function place(index) {
    if (count > 1) return;
    if (index === sizes.length) {
      for (let r = 0; r < rows; r += 1) {
        let n = 0;
        for (let c = 0; c < cols; c += 1) if (occupied.has(`${r}-${c}`)) n += 1;
        if (n !== rowClues[r]) return;
      }
      for (let c = 0; c < cols; c += 1) {
        let n = 0;
        for (let r = 0; r < rows; r += 1) if (occupied.has(`${r}-${c}`)) n += 1;
        if (n !== colClues[c]) return;
      }
      count += 1;
      return;
    }
    const size = sizes[index];
    const floor = index > 0 && sizes[index - 1] === size ? anchor[index - 1] : "";
    const orientations = size === 1 ? [true] : [true, false];
    orientations.forEach((horizontal) => {
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const cells = [];
          let fits = true;
          for (let i = 0; i < size; i += 1) {
            const rr = horizontal ? r : r + i;
            const cc = horizontal ? c + i : c;
            if (rr >= rows || cc >= cols) {
              fits = false;
              break;
            }
            cells.push([rr, cc]);
          }
          if (!fits) continue;
          const key = `${horizontal ? "H" : "V"}${String(r).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
          if (key <= floor) continue;
          let blocked = false;
          cells.forEach(([rr, cc]) => {
            for (let dr = -1; dr <= 1 && !blocked; dr += 1) {
              for (let dc = -1; dc <= 1; dc += 1) {
                if (occupied.has(`${rr + dr}-${cc + dc}`)) blocked = true;
              }
            }
          });
          if (blocked) continue;
          cells.forEach(([rr, cc]) => occupied.add(`${rr}-${cc}`));
          if (!overCapacity()) {
            anchor[index] = key;
            place(index + 1);
          }
          cells.forEach(([rr, cc]) => occupied.delete(`${rr}-${cc}`));
          if (count > 1) return;
        }
      }
    });
  }

  place(0);
  return count;
}

describe("Amiral Battı fleet generator", () => {
  it("shows the fleet in the rules", () => {
    expect(tr.gameRules["amiral-batti"]).toContain("Üstteki gemilerin hepsi yerleştirilir");
    expect(en.gameRules["amiral-batti"]).toContain("Every ship shown above is placed");
  });

  it("deals 300 puzzles per difficulty without failing", () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      for (let round = 0; round < 300; round += 1) {
        const started = Date.now();
        const puzzle = generate(difficulty);
        expect(Date.now() - started).toBeLessThan(2000);
        expect(puzzle.ships).toEqual(SHIPS[difficulty]);
      }
    }
  }, 180000);

  it("has one layout per puzzle once the fleet, clues, and no-touch rule are known", () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      for (let round = 0; round < 20; round += 1) {
        const puzzle = generate(difficulty);
        expect(puzzle.ships).toEqual(SHIPS[difficulty]);
        expect(countLayouts(puzzle.rowClues, puzzle.colClues, puzzle.ships)).toBe(1);
      }
    }
  }, 180000);
});
