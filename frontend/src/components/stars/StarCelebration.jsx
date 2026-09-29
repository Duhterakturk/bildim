import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { STARS_EVENT } from "../../api/games";
import { useAuth } from "../../context/AuthContext";
import Modal from "../common/Modal";
import Owl from "../owl/Owl";

const ORDER = ["solve", "no_hint", "fast"];
const LEVEL_EVENT = "mindarena:level-opened";

function countsOf(pieces) {
  const counts = {};
  for (const piece of pieces) counts[piece] = (counts[piece] || 0) + 1;
  return counts;
}

function isSpecial(detail) {
  return Boolean(detail?.new_record || detail?.stage_up || detail?.new_title || detail?.new_certificate || detail?.level_up);
}

export default function StarCelebration() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const titleId = useId();
  const bodyId = useId();
  const [stars, setStars] = useState(null);
  const [shown, setShown] = useState(0);
  const latest = useRef(null);

  useEffect(() => {
    function onStars(event) {
      const detail = event.detail;
      if (!detail?.pieces) return;
      latest.current = detail;
      setStars(detail);
      setShown(0);
    }
    function onLevel(event) {
      const level = event.detail?.level;
      if (!level) return;
      setStars((current) => {
        const base = current || latest.current;
        if (!base) return current;
        return { ...base, level_up: level };
      });
    }
    window.addEventListener(STARS_EVENT, onStars);
    window.addEventListener(LEVEL_EVENT, onLevel);
    return () => {
      window.removeEventListener(STARS_EVENT, onStars);
      window.removeEventListener(LEVEL_EVENT, onLevel);
    };
  }, []);

  useEffect(() => {
    if (!stars || shown >= stars.pieces.length) return undefined;
    const timer = window.setTimeout(() => setShown((count) => count + 1), 280);
    return () => window.clearTimeout(timer);
  }, [stars, shown]);

  const special = isSpecial(stars);
  useEffect(() => {
    if (!stars || special) return undefined;
    const timer = window.setTimeout(() => setStars(null), 3000);
    return () => window.clearTimeout(timer);
  }, [stars, special]);

  if (!stars) return null;

  const counts = countsOf(stars.pieces);
  const lines = ORDER.filter((piece) => counts[piece]).map((piece) => t(`stars.${piece}`, { count: counts[piece] }));
  const body = (
    <>
      <h2 id={titleId} className="mb-2 text-lg font-bold">{t("stars.title")}</h2>
      <div className="flex flex-wrap justify-center gap-1 text-2xl mb-2">
        {stars.pieces.map((piece, index) => (
          <span key={`${piece}-${index}`} className={index < shown ? "opacity-100" : "opacity-20"}>⭐</span>
        ))}
      </div>
      <ul className="text-sm text-slate-600 space-y-1">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p id={bodyId} className="mt-2 text-sm font-semibold" data-testid="star-total">{t("stars.total", { count: stars.pieces.length })}</p>
      {stars.new_record && (
        <p className="mt-3 font-semibold text-amber-700" data-testid="record-note">
          {t("stars.record", { seconds: stars.improved_by })}
        </p>
      )}
      {stars.stage_up && (
        <div className="mt-3">
          <Owl stage={stars.stage_up} className="w-24 mx-auto" />
          <p className="font-semibold text-amber-700">{t("owl.grew")}</p>
        </div>
      )}
      {stars.new_title && (
        <p className="mt-2 text-sm font-semibold">{t("titles.earned", { rank: t(`titles.${stars.new_title.rank}`) })}</p>
      )}
      {stars.new_certificate && <p className="mt-2 font-semibold text-amber-700">{t("certs.earned")}</p>}
      {stars.level_up && (
        <p className="mt-2 font-semibold text-emerald-700" data-testid="level-note">
          {t("difficulty.opened", { level: t(`difficulty.${stars.level_up}`) })}
        </p>
      )}
      {!user && <p className="mt-3 text-sm text-slate-500">{t("stars.login")}</p>}
    </>
  );

  if (!special) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3" data-testid="star-toast">
        <div className="flex max-w-lg items-center gap-3 rounded-full bg-white px-4 py-1.5 text-slate-900 shadow-xl">
          <div className="flex text-xl leading-none">
            {stars.pieces.map((piece, index) => (
              <span key={`${piece}-${index}`} className={index < shown ? "opacity-100" : "opacity-20"}>⭐</span>
            ))}
          </div>
          <p className="text-sm text-slate-700">
            {lines.join(" · ")}
            <span className="mt-0.5 block font-semibold text-slate-900" data-testid="star-total">{t("stars.total", { count: stars.pieces.length })}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Modal
      onClose={() => setStars(null)}
      labelledBy={titleId}
      describedBy={bodyId}
      testId="star-card"
      overlayClassName="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      panelClassName="relative w-full max-w-sm rounded-2xl bg-white px-6 py-5 text-center text-slate-900 shadow-xl"
      footer={(
        <button
          type="button"
          data-dialog-close
          className="mt-4 min-h-[44px] shrink-0 bg-white text-sm font-semibold text-brand-700"
          onClick={() => setStars(null)}
        >
          {t("stars.close")}
        </button>
      )}
      decoration={(
        <div className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="confetti">
          {Array.from({ length: 18 }, (_, index) => (
            <span
              key={index}
              className="absolute top-0 h-2 w-2 rounded-sm"
              style={{
                left: `${(index * 17) % 100}%`,
                background: ["#e11d48", "#f59e0b", "#16a34a", "#2563eb"][index % 4],
                animation: `star-fall ${900 + (index % 5) * 180}ms ease-in forwards`,
              }}
            />
          ))}
          <style>{`@keyframes star-fall { to { transform: translateY(70vh) rotate(180deg); opacity: 0.2; } }`}</style>
        </div>
      )}
    >
      {body}
    </Modal>
  );
}
