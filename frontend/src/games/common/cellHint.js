import { useEffect, useRef } from "react";

let currentAttempt = null;
let currentHint = null;
let currentHints = [];
let hintFocus = null;

export function publishHintFocus(round) {
  hintFocus = Number.isInteger(round) ? round : null;
}

export function currentHintFocus() {
  return hintFocus;
}

function boardSize(puzzle) {
  if (!puzzle || typeof puzzle !== "object") return null;
  if (Number.isInteger(puzzle.size) && puzzle.size > 0) return puzzle.size;
  if (Number.isInteger(puzzle.rows) && puzzle.rows > 0) return puzzle.rows;
  if (Array.isArray(puzzle.givens) && puzzle.givens.length > 0) return puzzle.givens.length;
  if (Array.isArray(puzzle.grid) && puzzle.grid.length > 0) return puzzle.grid.length;
  if (Array.isArray(puzzle.clues) && puzzle.clues.length > 0) return puzzle.clues.length;
  return null;
}

export function publishAttempt(issue) {
  hintFocus = null;
  currentHints = Array.isArray(issue?.hints) ? issue.hints.filter(Boolean) : [];
  if (!currentHints.length && issue?.hint) currentHints = [issue.hint];
  currentHint = currentHints[currentHints.length - 1] || null;
  currentAttempt = issue
    ? { tournament: issue.puzzle?.tournament, id: issue.id, hint: currentHint, hints: currentHints, hint_balance: issue.hint_balance ?? null, size: boardSize(issue.puzzle) }
    : null;
  window.dispatchEvent(new CustomEvent("mindarena:attempt", { detail: currentAttempt }));
  if (typeof issue?.hint_balance === "number") {
    window.dispatchEvent(new CustomEvent("mindarena:hints", { detail: { balance: issue.hint_balance } }));
  }
}

export function publishCellHint(hint, balance) {
  if (hint) currentHints = [...currentHints, hint];
  currentHint = hint;
  if (currentAttempt) {
    currentAttempt = {
      ...currentAttempt,
      hint,
      hints: currentHints,
      hint_balance: typeof balance === "number" ? balance : currentAttempt.hint_balance,
    };
  }
  window.dispatchEvent(new CustomEvent("mindarena:attempt", { detail: currentAttempt }));
  if (hint) window.dispatchEvent(new CustomEvent("mindarena:cell-hint", { detail: hint }));
  if (typeof balance === "number") {
    window.dispatchEvent(new CustomEvent("mindarena:hints", { detail: { balance } }));
  }
}

export function useApplyCellHint(token, apply) {
  const ref = useRef(apply);
  ref.current = apply;
  useEffect(() => {
    currentHints.forEach((hint) => ref.current(hint));
    function handle(event) {
      if (event.detail) ref.current(event.detail);
    }
    window.addEventListener("mindarena:cell-hint", handle);
    return () => window.removeEventListener("mindarena:cell-hint", handle);
  }, [token]);
}

export function writeFill(setBoard, hint, rowShift = 0, colShift = 0) {
  if (!hint || hint.kind !== "fill") return;
  setBoard((prev) => {
    if (!prev) return prev;
    const row = hint.row + rowShift;
    const col = hint.col + colShift;
    if (!prev[row]) return prev;
    const next = prev.map((line) => [...line]);
    next[row][col] = hint.value;
    return next;
  });
}
