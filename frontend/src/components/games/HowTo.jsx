import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../common/Modal";
import { hintFor } from "../../games/hints";

export default function HowTo({ slug, size, className = "" }) {
  const { t, i18n } = useTranslation();
  const tr = !i18n.language.startsWith("en");
  const [open, setOpen] = useState(false);
  const opener = useRef(null);
  const titleId = useId();
  const bodyId = useId();
  const copy = hintFor(slug, tr ? "tr" : "en");
  const known = Number.isInteger(size) && size > 0;
  const openEnded = !known && (slug === "kendoku" || slug === "futoshiki");
  const rule = t(openEnded ? `gameRules.${slug}Any` : `gameRules.${slug}`, known ? { n: size } : {});

  return (
    <>
      <button
        type="button"
        ref={opener}
        className={`how-mark ${className}`}
        aria-label={t("games.how")}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        ?
      </button>
      {open && (
        <Modal
          onClose={() => setOpen(false)}
          labelledBy={titleId}
          describedBy={bodyId}
          returnTo={opener}
          closeOnBackdrop
          testId="how-dialog"
          overlayClassName="fixed inset-0 z-50 flex items-center justify-center px-4"
          panelClassName="relative w-full max-w-md rounded-2xl bg-[#fffdf8] p-5 text-ink"
          decoration={<div className="absolute inset-0 bg-black/55" />}
        >
          <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-3 flex items-start justify-between gap-3 bg-[#fffdf8] px-5 pb-2 pt-5">
            <h2 id={titleId} className="font-display text-xl">{t("games.how")}</h2>
            <button
              type="button"
              className="how-mark"
              data-dialog-close
              aria-label={t("games.close")}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <div id={bodyId}>
            <p className="leading-relaxed">{rule}</p>
            {copy && <p className="mt-3 leading-relaxed text-stone-600">{copy.hint} {copy.example}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
