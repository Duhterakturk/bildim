import { useEffect, useState } from "react";
import { btnSecondary } from "../../components/common/buttons";
import { openPuzzle } from "../../api/games";
import { publishAttempt } from "./cellHint";
import { usePlayCopy } from "./playCopy";

export function useIssuedPuzzle(slug, difficulty) {
  const [issue, setIssue] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [nonce, setNonce] = useState(0);
  const requestKey = `${slug}|${difficulty}|${nonce}`;
  const [activeKey, setActiveKey] = useState(requestKey);

  if (activeKey !== requestKey) {
    setActiveKey(requestKey);
    setPhase("loading");
    setIssue(null);
  }

  useEffect(() => {
    let cancelled = false;
    publishAttempt(null);
    openPuzzle(slug, difficulty)
      .then((data) => {
        if (!cancelled) {
          setIssue(data);
          setPhase("ready");
          publishAttempt(data);
        }
      })
      .catch(() => {
        if (!cancelled) setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, slug, difficulty]);

  return { issue, phase, reload: () => setNonce((value) => value + 1) };
}

export function PuzzlePending({ phase, onRetry }) {
  const play = usePlayCopy();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (phase === "error") return undefined;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "error") {
    return (
      <div className="px-4 py-8 text-center">
        <p role="alert" className="text-red-700">{play.unavailable}</p>
        {onRetry && (
          <button type="button" className={`${btnSecondary} mt-3`} onClick={onRetry}>{play.loadRetry}</button>
        )}
      </div>
    );
  }

  return <p role="status" className="text-slate-600">{slow ? play.loadingSlow : play.loading}</p>;
}
