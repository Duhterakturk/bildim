import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { scoreStatus } from "../../api/client";
import { submitScore } from "../../api/games";
import { apiErrorText, apiFailure } from "../../i18n/apiError";
import { applyScoreResult, initialScore, openAttempt, releaseScore, startScore } from "./scoreFlow";
import { btnPrimary, btnSecondary } from "../../components/common/buttons";
import { usePlayCopy } from "./playCopy";

/** Aynı deneme için tek skor gönderir. Başarısızlık yeniden denemeye veya bırakmaya izin verir. */
export function useAutoScore(attemptId) {
  const [state, setState] = useState(initialScore);
  const stateRef = useRef(state);

  useEffect(() => {
    const next = openAttempt(stateRef.current, attemptId);
    stateRef.current = next;
    setState(next);
  }, [attemptId]);

  async function save(answer) {
    if (!localStorage.getItem("mindarena_access_token")) return;
    const begun = startScore(stateRef.current, { attemptId, answer });
    if (!begun.request) return;
    stateRef.current = begun.state;
    setState(begun.state);
    const request = begun.request;
    try {
      await submitScore({ attempt_id: request.attemptId, answer: request.answer });
      const next = applyScoreResult(stateRef.current, { generation: request.generation, phase: "saved" });
      stateRef.current = next;
      setState(next);
    } catch (error) {
      const failure = apiFailure(error, "play.scoreRejected");
      const next = applyScoreResult(stateRef.current, {
        generation: request.generation,
        phase: scoreStatus(error),
        code: failure.code,
      });
      stateRef.current = next;
      setState(next);
    }
  }

  function retry() {
    const current = stateRef.current;
    if (current.phase !== "offline" || current.answer == null) return;
    return save(current.answer);
  }

  function release() {
    const next = releaseScore(stateRef.current);
    stateRef.current = next;
    setState(next);
  }

  return {
    phase: state.phase,
    code: state.code,
    busy: state.busy,
    save,
    retry,
    release,
  };
}

function noticeButton(className, busy, onClick, label) {
  return (
    <button
      type="button"
      className={`${className} max-w-full whitespace-normal text-center text-sm`}
      onClick={onClick}
      disabled={busy}
    >
      {label}
    </button>
  );
}

export function ScoreNotice({ phase, code, busy, onRetry, onRelease }) {
  const play = usePlayCopy();
  const { t, i18n } = useTranslation();
  if (phase === "saving") {
    return <p className="mt-3 max-w-md text-center text-slate-500" role="status">{play.scoreSaving}</p>;
  }
  if (phase === "saved") {
    return <p className="mt-3 max-w-md text-center text-emerald-600" role="status">{play.saved}</p>;
  }
  if (phase === "already") {
    return <p className="mt-3 max-w-md text-center text-slate-600" role="status">{play.scoreAlready}</p>;
  }
  if (phase === "released") {
    return <p className="mt-3 max-w-md text-center text-slate-500" role="status">{play.scoreReleased}</p>;
  }
  if (phase === "session") {
    return <p className="mt-3 max-w-md text-center text-slate-600" role="alert">{play.scoreSession}</p>;
  }
  if (phase !== "offline" && phase !== "rejected" && phase !== "missing") return null;
  const message = phase === "offline"
    ? play.scoreOffline
    : phase === "missing"
      ? play.scoreMissing
      : apiErrorText({ code, fallback: "play.scoreRejected" }, t, i18n);
  return (
    <div className="mt-3 flex w-full max-w-md flex-col items-center gap-2 px-2 text-center" role="alert">
      <p className="max-w-full text-sm text-red-600">{message}</p>
      <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
        {phase === "offline" && noticeButton(btnPrimary, busy, onRetry, play.scoreRetry)}
        {noticeButton(btnSecondary, busy, onRelease, play.scoreContinue)}
      </div>
    </div>
  );
}
