import { describe, expect, it } from "vitest";
import {
  cellsDiffer,
  discardDecision,
  edgesMarked,
  anyFilled,
  notesPresent,
  pathsDrawn,
  pyramidMarked,
} from "./workState";

describe("user work against the starting board", () => {
  it("ignores untouched givens and empty notes", () => {
    const givens = [[5, 0], [0, 9]];
    expect(cellsDiffer(givens, givens)).toBe(false);
    expect(notesPresent([[[]]])).toBe(false);
  });

  it("sees a filled cell, a note, a mark, a path, and a pyramid step", () => {
    expect(cellsDiffer([[5, 3], [0, 9]], [[5, 0], [0, 9]])).toBe(true);
    expect(notesPresent([[[], [2]]])).toBe(true);
    expect(edgesMarked([[false, "x"], [true, false]])).toBe(true);
    expect(edgesMarked([[false, false]])).toBe(false);
    expect(pathsDrawn({ A: ["0-0"] })).toBe(true);
    expect(pathsDrawn({})).toBe(false);
    expect(pyramidMarked([0, null, 1])).toBe(true);
    expect(pyramidMarked([0, null, null])).toBe(false);
    expect(anyFilled([[0, null], [false, 0]])).toBe(false);
    expect(anyFilled([[null, { shape: "I" }]])).toBe(true);
  });
});

describe("discard decision", () => {
  it("allows an untouched board and a saved solution", () => {
    expect(discardDecision({ hasWork: false, solved: false, savePhase: "idle" })).toBe("allow");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "saved" })).toBe("allow");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "idle" })).toBe("allow");
  });

  it("asks only while the player still has unfinished work", () => {
    expect(discardDecision({ hasWork: true, solved: false, savePhase: "idle" })).toBe("ask");
  });

  it("does not replace the board while a score save can still finish", () => {
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "saving" })).toBe("blocked");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "offline" })).toBe("blocked");
    expect(discardDecision({ hasWork: false, solved: false, savePhase: "rejected" })).toBe("blocked");
  });
});
