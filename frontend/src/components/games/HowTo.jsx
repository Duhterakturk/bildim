import { useState } from "react";
import { useTranslation } from "react-i18next";
import { hintFor } from "../../games/hints";

export default function HowTo({ slug, size, className = "" }) {
  const { t, i18n } = useTranslation();
  const tr = !i18n.language.startsWith("en");
  const [open, setOpen] = useState(false);
  const copy = hintFor(slug, tr ? "tr" : "en");
  const known = Number.isInteger(size) && size > 0;
  const openEnded = !known && (slug === "kendoku" || slug === "futoshiki");
  const rule = t(openEnded ? `gameRules.${slug}Any` : `gameRules.${slug}`, known ? { n: size } : {});

  return (
    <>
      <button
        type="button"
        className={`how-mark ${className}`}
        aria-label={t("games.how")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        ?
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/55" />
          <div
            className="relative w-full max-w-md rounded-2xl bg-[#fffdf8] p-5 text-ink"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={t("games.how")}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl">{t("games.how")}</h2>
              <button type="button" className="how-mark" aria-label={t("games.close")} onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <p className="mt-3 leading-relaxed">{rule}</p>
            {copy && <p className="mt-3 text-stone-600 leading-relaxed">{copy.hint} {copy.example}</p>}
          </div>
        </div>
      )}
    </>
  );
}
