import { useState } from "react";
import { btnDanger, btnSecondary } from "../../components/common/buttons";
import { usePlayCopy } from "./playCopy";

function ConfirmRow({ message, confirmLabel, onConfirm, onCancel }) {
  const { keep } = usePlayCopy();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-700">{message}</span>
      <button type="button" className={btnDanger} onClick={onConfirm}>{confirmLabel}</button>
      <button type="button" className={btnSecondary} onClick={onCancel}>{keep}</button>
    </span>
  );
}

export default function ClearBoardButton({ onClick, hasWork = false, disabled = false }) {
  const { clear, discard } = usePlayCopy();
  const [ask, setAsk] = useState(false);
  if (ask) {
    return (
      <ConfirmRow
        message={discard}
        confirmLabel={clear}
        onConfirm={() => { setAsk(false); onClick(); }}
        onCancel={() => setAsk(false)}
      />
    );
  }
  return (
    <button type="button" disabled={disabled} className={btnSecondary} onClick={() => (hasWork ? setAsk(true) : onClick())}>
      {clear}
    </button>
  );
}

export function NewPuzzleButton({ onClick, hasWork = false, disabled = false }) {
  const { newPuzzle, discardNew } = usePlayCopy();
  const [ask, setAsk] = useState(false);
  if (ask) {
    return (
      <ConfirmRow
        message={discardNew}
        confirmLabel={newPuzzle}
        onConfirm={() => { setAsk(false); onClick(); }}
        onCancel={() => setAsk(false)}
      />
    );
  }
  return (
    <button type="button" disabled={disabled} className={btnSecondary} onClick={() => (hasWork ? setAsk(true) : onClick())}>
      {newPuzzle}
    </button>
  );
}
