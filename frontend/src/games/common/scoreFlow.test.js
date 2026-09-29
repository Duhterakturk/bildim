import { describe, expect, it } from "vitest";
import { scoreStatus } from "../../api/client";
import { discardDecision } from "./workState";
import { applyScoreResult, initialScore, openAttempt, releaseScore, startScore } from "./scoreFlow";

function error(status, code) {
  return { response: { status, data: code ? { code } : {} } };
}

describe("score status keeps 404 and 409 apart", () => {
  it("maps conflict, missing puzzle, session, rejection, and connection failure", () => {
    expect(scoreStatus(error(409))).toBe("already");
    expect(scoreStatus(error(404))).toBe("missing");
    expect(scoreStatus(error(400, "grade_rules"))).toBe("rejected");
    expect(scoreStatus(error(401))).toBe("session");
    expect(scoreStatus(error(403))).toBe("session");
    expect(scoreStatus(error(422))).toBe("session");
    expect(scoreStatus(error(500))).toBe("offline");
    expect(scoreStatus(error(503))).toBe("offline");
    expect(scoreStatus({ code: "ERR_NETWORK" })).toBe("offline");
    expect(scoreStatus({ code: "ECONNABORTED", response: undefined })).toBe("offline");
  });
});

describe("score flight", () => {
  it("saves once and lets a finished puzzle leave", () => {
    const opened = openAttempt(initialScore(), "a1");
    const begun = startScore(opened, { attemptId: "a1", answer: { n: 1 } });
    const saved = applyScoreResult(begun.state, { generation: begun.request.generation, phase: "saved" });
    expect(saved.phase).toBe("saved");
    expect(saved.finishedId).toBe("a1");
    expect(startScore(saved, { attemptId: "a1", answer: { n: 1 } }).request).toBeNull();
    expect(discardDecision({ hasWork: true, solved: true, savePhase: saved.phase })).toBe("allow");
  });

  it("blocks a second submit while the first request is still out", () => {
    const opened = openAttempt(initialScore(), "a1");
    const first = startScore(opened, { attemptId: "a1", answer: { n: 1 } });
    const second = startScore(first.state, { attemptId: "a1", answer: { n: 2 } });
    expect(first.request.answer).toEqual({ n: 1 });
    expect(second.request).toBeNull();
    expect(second.state.answer).toEqual({ n: 1 });
    expect(discardDecision({ hasWork: true, solved: true, savePhase: first.state.phase })).toBe("blocked");
  });

  it("retries a network failure with the stored answer, then saves", () => {
    const opened = openAttempt(initialScore(), "a1");
    const first = startScore(opened, { attemptId: "a1", answer: { cells: [1] } });
    const failed = applyScoreResult(first.state, { generation: first.request.generation, phase: "offline" });
    expect(failed.phase).toBe("offline");
    expect(failed.answer).toEqual({ cells: [1] });
    const again = startScore(failed, { attemptId: "a1", answer: failed.answer });
    expect(again.request).toEqual({ attemptId: "a1", answer: { cells: [1] }, generation: failed.generation });
    const saved = applyScoreResult(again.state, { generation: again.request.generation, phase: "saved" });
    expect(saved.phase).toBe("saved");
  });

  it("releases a server error without deleting the stored answer", () => {
    const opened = openAttempt(initialScore(), "a1");
    const first = startScore(opened, { attemptId: "a1", answer: { n: 4 } });
    const failed = applyScoreResult(first.state, { generation: first.request.generation, phase: "offline", code: null });
    const released = releaseScore(failed);
    expect(released.phase).toBe("released");
    expect(released.answer).toEqual({ n: 4 });
    expect(discardDecision({ hasWork: true, solved: true, savePhase: released.phase })).toBe("ask");
    const late = applyScoreResult(released, { generation: first.request.generation, phase: "saved" });
    expect(late.phase).toBe("released");
  });

  it("gives a rejected answer an exit that is not another copy of the same payload", () => {
    const opened = openAttempt(initialScore(), "a1");
    const first = startScore(opened, { attemptId: "a1", answer: { n: 0 } });
    const rejected = applyScoreResult(first.state, {
      generation: first.request.generation,
      phase: "rejected",
      code: "grade_rules",
    });
    expect(rejected.code).toBe("grade_rules");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "rejected" })).toBe("blocked");
    const released = releaseScore(rejected);
    expect(released.phase).toBe("released");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "released" })).toBe("ask");
    const corrected = startScore(released, { attemptId: "a1", answer: { n: 8 } });
    expect(corrected.request.answer).toEqual({ n: 8 });
    expect(corrected.request.attemptId).toBe("a1");
  });

  it("keeps the answer when the player backs out of the later confirm", () => {
    const opened = openAttempt(initialScore(), "a1");
    const failed = applyScoreResult(
      startScore(opened, { attemptId: "a1", answer: { n: 3 } }).state,
      { generation: opened.generation, phase: "rejected", code: "grade_rules" },
    );
    const released = releaseScore(failed);
    expect(discardDecision({ hasWork: true, solved: true, savePhase: released.phase })).toBe("ask");
    expect(released.answer).toEqual({ n: 3 });
    expect(released.phase).toBe("released");
  });

  it("ignores a late result after the player opens another puzzle", () => {
    const opened = openAttempt(initialScore(), "a1");
    const first = startScore(opened, { attemptId: "a1", answer: { n: 1 } });
    const moved = openAttempt(first.state, "a2");
    const late = applyScoreResult(moved, { generation: first.request.generation, phase: "saved" });
    expect(late.attemptId).toBe("a2");
    expect(late.phase).toBe("idle");
    expect(late.code).toBeNull();
    expect(late.busy).toBe(false);
    const oldError = applyScoreResult(moved, { generation: first.request.generation, phase: "rejected", code: "grade_rules" });
    expect(oldError.phase).toBe("idle");
    expect(discardDecision({ hasWork: false, solved: false, savePhase: oldError.phase })).toBe("allow");
  });

  it("treats an already saved attempt as finished and does not send it again", () => {
    const opened = openAttempt(initialScore(), "a1");
    const first = startScore(opened, { attemptId: "a1", answer: { n: 1 } });
    const already = applyScoreResult(first.state, { generation: first.request.generation, phase: "already" });
    expect(already.phase).toBe("already");
    expect(already.finishedId).toBe("a1");
    expect(startScore(already, { attemptId: "a1", answer: { n: 9 } }).request).toBeNull();
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "already" })).toBe("allow");
    expect(discardDecision({ hasWork: true, solved: true, savePhase: "missing" })).toBe("blocked");
  });

  it("does not keep an old error on the next puzzle", () => {
    const opened = openAttempt(initialScore(), "a1");
    const rejected = applyScoreResult(
      startScore(opened, { attemptId: "a1", answer: { n: 1 } }).state,
      { generation: opened.generation, phase: "rejected", code: "grade_rules" },
    );
    const moved = openAttempt(rejected, "a2");
    expect(moved.phase).toBe("idle");
    expect(moved.code).toBeNull();
    expect(moved.busy).toBe(false);
    expect(discardDecision({ hasWork: false, solved: false, savePhase: moved.phase })).toBe("allow");
  });
});
