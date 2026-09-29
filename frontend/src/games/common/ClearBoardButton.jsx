import { useEffect, useRef, useState } from "react";
import { btnDanger, btnSecondary } from "../../components/common/buttons";
import { usePlayCopy } from "./playCopy";
import { discardDecision } from "./workState";

export function useDiscardGate({ boardKey, hasWork, solved, savePhase }) {
  const [pending, setPending] = useState(null);
  const lock = useRef(false);
  const decision = discardDecision({ hasWork, solved, savePhase });
  const decisionRef = useRef(decision);
  decisionRef.current = decision;
  const boardKeyRef = useRef(boardKey);
  boardKeyRef.current = boardKey;
  const live = pending && pending.boardKey === boardKey && decision === "ask" ? pending : null;

  useEffect(() => {
    setPending(null);
    lock.current = false;
  }, [boardKey]);

  function ask(kind, run) {
    if (lock.current || live) return;
    if (decisionRef.current !== "ask") {
      if (decisionRef.current === "blocked") return;
      lock.current = true;
      try {
        run();
      } finally {
        lock.current = false;
      }
      return;
    }
    setPending({ kind, run, boardKey: boardKeyRef.current });
  }

  function confirm() {
    if (!live || lock.current) return;
    if (decisionRef.current !== "ask" || live.boardKey !== boardKeyRef.current) {
      setPending(null);
      return;
    }
    lock.current = true;
    const run = live.run;
    setPending(null);
    try {
      run();
    } finally {
      lock.current = false;
    }
  }

  function cancel() {
    if (lock.current) return;
    setPending(null);
  }

  return {
    ask,
    pending: live,
    confirm,
    cancel,
    blocked: decision === "blocked" || Boolean(live),
  };
}

export function DiscardNotice({ pending, onConfirm, onCancel }) {
  const play = usePlayCopy();
  if (!pending) return null;
  const message = pending.kind === "clear"
    ? play.discard
    : pending.kind === "difficulty"
      ? play.discardLevel
      : play.discardNew;
  const label = pending.kind === "clear"
    ? play.clear
    : pending.kind === "difficulty"
      ? play.changeLevel
      : play.newPuzzle;
  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-2" role="group" aria-label={message}>
      <p className="m-0 max-w-full break-words text-center text-sm text-slate-800">{message}</p>
      <button type="button" className={btnDanger} onClick={onConfirm}>{label}</button>
      <button type="button" className={btnSecondary} onClick={onCancel}>{play.keep}</button>
    </div>
  );
}

export default function ClearBoardButton({ onClick, disabled = false }) {
  const { clear } = usePlayCopy();
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={btnSecondary}>
      {clear}
    </button>
  );
}

export function NewPuzzleButton({ onClick, disabled = false }) {
  const { newPuzzle } = usePlayCopy();
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={btnSecondary}>
      {newPuzzle}
    </button>
  );
}
