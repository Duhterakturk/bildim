import { useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { submitScore } from "../../api/games";
import { usePlayCopy } from "./playCopy";

/** Aynı deneme için tek skor gönderir. Başarısızlık yeniden denemeye izin verir. */
export function useAutoScore(attemptId) {
  const sent = useRef(null);
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    sent.current = null;
    setPhase("idle");
  }, [attemptId]);

  async function save(answer) {
    if (!attemptId || sent.current === attemptId) return;
    if (!localStorage.getItem("mindarena_access_token")) return;
    const token = attemptId;
    sent.current = token;
    setPhase("saving");
    try {
      await submitScore({ attempt_id: token, answer });
      if (sent.current === token) setPhase("saved");
    } catch (error) {
      if (sent.current !== token) return;
      sent.current = null;
      setPhase(scoreStatus(error));
    }
  }

  return { phase, save };
}

export function ScoreNotice({ phase, onRetry }) {
  const play = usePlayCopy();
  if (phase === "saving") return <p className="text-slate-500 mt-3">{play.saving}</p>;
  if (phase === "saved") return <p className="text-emerald-600 mt-3">{play.saved}</p>;
  if (phase === "rejected") return <p className="text-red-500 mt-3">{play.rejected}</p>;
  if (phase === "already") return <p className="text-red-500 mt-3">{play.already}</p>;
  if (phase === "offline") {
    return (
      <div className="mt-3 text-center">
        <p className="text-[#f4efe6]">{play.offline}</p>
        <button type="button" className="mt-2 text-sm font-semibold underline" onClick={onRetry}>{play.retry}</button>
      </div>
    );
  }
  return null;
}
