import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { openCellHint } from "../../api/games";
import HowTo from "./HowTo";
import { currentHintFocus, publishCellHint } from "../../games/common/cellHint";
import { hintFor } from "../../games/hints";
import { apiErrorText } from "../../i18n/apiError";

function describe(hint, t, language) {
  if (!hint) return "";
  const row = (hint.row ?? 0) + 1;
  const col = (hint.col ?? 0) + 1;
  if (hint.kind === "fill") return t("play.hintFill", { value: hint.value, row, col });
  if (hint.kind === "mark" && hint.note === "step") return t("play.hintStep", { label: hint.label });
  if (hint.kind === "mark" && hint.note === "ship") return t("play.hintShip");
  if (hint.kind === "mark" && hint.note === "star") return t("play.hintStar");
  if (hint.kind === "mark" && hint.note === "shade") return t("play.hintShade");
  if (hint.kind === "mark" && hint.note === "path") return t("play.hintPath");
  if (hint.kind === "marks") return t("play.hintMarks", { label: hint.label });
  if (hint.kind === "edge") return t("play.hintEdge");
  if (hint.kind === "piece") return t("play.hintPiece", { name: hint.name });
  if (hint.kind === "spot") return t("play.hintSpot");
  if (hint.kind === "form") {
    const shape = hint.shape ? t(`shapes.${hint.shape}`, { defaultValue: "" }) : "";
    const color = hint.color ? t(`colors.${hint.color}`, { defaultValue: "" }) : "";
    if (shape && color) {
      const english = String(language || "").startsWith("en");
      return t("play.hintForm", {
        color: english ? color.toLocaleLowerCase("en") : color,
        shape: english ? shape.toLocaleLowerCase("en") : shape,
      });
    }
    return t("play.hintFormPlain");
  }
  if (hint.kind === "choice" && hint.value) return t("play.hintChoice");
  return "";
}

export default function HintBar({ slug }) {
  const { t, i18n } = useTranslation();
  const tr = !i18n.language.startsWith("en");
  const copy = hintFor(slug, tr ? "tr" : "en");
  const [attempt, setAttempt] = useState(null);
  const [balance, setBalance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(null);
  const [fault, setFault] = useState(null);

  useEffect(() => {
    function handle(event) {
      const detail = event.detail;
      setAttempt(detail);
      if (typeof detail?.hint_balance === "number") setBalance(detail.hint_balance);
      setFault(null);
      setHint(detail?.hint || null);
    }
    function handleBalance(event) {
      if (typeof event.detail?.balance === "number") setBalance(event.detail.balance);
    }
    window.addEventListener("mindarena:attempt", handle);
    window.addEventListener("mindarena:hints", handleBalance);
    return () => {
      window.removeEventListener("mindarena:attempt", handle);
      window.removeEventListener("mindarena:hints", handleBalance);
    };
  }, []);

  async function revealCell() {
    if (!attempt?.id || busy || balance === 0) return;
    setBusy(true);
    try {
      const data = await openCellHint(attempt.id, currentHintFocus());
      publishCellHint(data.hint, data.hint_balance);
      setFault(null);
      setHint(data.hint);
    } catch (error) {
      const body = error.response?.data;
      if (typeof body?.hint_balance === "number") setBalance(body.hint_balance);
      setHint(null);
      setFault(body?.code ? { code: body.code, fallback: "errors.hint_unavailable" } : { fallback: "errors.hint_unavailable" });
    } finally {
      setBusy(false);
    }
  }

  if (!copy) return null;
  const hintLabel = balance == null ? t("play.hint") : t("play.hintCount", { count: balance });
  const note = fault ? apiErrorText(fault, t, i18n) : describe(hint, t, i18n.language);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <HowTo slug={slug} size={attempt?.size} />
        <button
          type="button"
          onClick={revealCell}
          disabled={!attempt?.id || busy || balance === 0}
          className="press-btn text-sm disabled:opacity-50"
          style={{ padding: "0.55rem 1.1rem" }}
        >
          {hintLabel}
        </button>
      </div>
      {note && <p className="mt-3 text-sm font-semibold">{note}</p>}
    </div>
  );
}
