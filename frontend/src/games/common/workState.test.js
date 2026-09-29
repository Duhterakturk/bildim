import { describe, expect, it } from "vitest";
import {
  boardClosed,
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

  it("holds the board until a failed save is released, then asks once", () => {
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "saving" })).toBe("blocked");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "offline" })).toBe("blocked");
    expect(discardDecision({ hasWork: false, solved: false, savePhase: "rejected" })).toBe("blocked");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "missing" })).toBe("blocked");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "released" })).toBe("ask");
    expect(discardDecision({ hasWork: false, solved: false, savePhase: "released" })).toBe("allow");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "already" })).toBe("allow");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "saved" })).toBe("allow");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "session" })).toBe("allow");
  });
});

describe("board closed only while the recorded solution still stands", () => {
  it("opens the board after a rejection or a release, and keeps it shut while saving", () => {
    expect(boardClosed("correct", "saving")).toBe(true);
    expect(boardClosed("correct", "saved")).toBe(true);
    expect(boardClosed("correct", "offline")).toBe(true);
    expect(boardClosed("correct", "already")).toBe(true);
    expect(boardClosed("correct", "rejected")).toBe(false);
    expect(boardClosed("correct", "released")).toBe(false);
    expect(boardClosed("correct", "missing")).toBe(false);
    expect(boardClosed("playing", "rejected")).toBe(false);
    expect(boardClosed("submitted", "rejected")).toBe(true);
  });
});
