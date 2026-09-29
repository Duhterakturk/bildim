import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { openCellHint } from "../../api/games";
import HowTo from "./HowTo";
import { currentHintFocus, publishCellHint } from "../../games/common/cellHint";
import { hintFor } from "../../games/hints";

function describe(hint, tr) {
  if (!hint) return "";
  const row = (hint.row ?? 0) + 1;
  const col = (hint.col ?? 0) + 1;
  if (hint.kind === "fill") {
    return tr
      ? `Bu kareye ${hint.value} düşer: ${row}. satır, ${col}. sütun.`
      : `${hint.value} belongs in row ${row}, column ${col}.`;
  }
  if (hint.kind === "mark" && hint.note === "step") {
    return tr ? `${hint.label}’den sonraki adım bu kare.` : `The step after ${hint.label} is this cell.`;
  }
  if (hint.kind === "mark" && hint.note === "ship") {
    return tr ? "Bu karede gemi var." : "A ship sits in this cell.";
  }
  if (hint.kind === "mark" && hint.note === "star") {
    return tr ? "Bu karede bir yıldız durur." : "A star belongs in this cell.";
  }
  if (hint.kind === "mark" && hint.note === "shade") {
    return tr ? "Bu kare boyalı." : "This cell is shaded.";
  }
  if (hint.kind === "mark" && hint.note === "path") {
    return tr ? "Bu daire yolda." : "This circle is on the path.";
  }
  if (hint.kind === "marks") {
    return tr
      ? `${hint.label} harfinin yolu bu karelerden geçer.`
      : `The ${hint.label} path runs through these cells.`;
  }
  if (hint.kind === "edge") {
    return tr ? "Bu kenar çitin bir parçası." : "This side is part of the fence.";
  }
  if (hint.kind === "piece") {
    return tr
      ? `${hint.name} parçası durması gereken yere kondu.`
      : `The ${hint.name} piece is placed where it belongs.`;
  }
  if (hint.kind === "spot") {
    return tr ? "1 burada." : "1 is here.";
  }
  if (hint.kind === "form") {
    const shape = { circle: ["daire", "circle"], square: ["kare", "square"], triangle: ["üçgen", "triangle"] }[hint.shape];
    const color = { red: ["Kırmızı", "Red"], yellow: ["Sarı", "Yellow"], blue: ["Mavi", "Blue"] }[hint.color];
    if (shape && color) {
      return tr ? `${color[0]} ${shape[0]} bu kareye konur.` : `The ${color[1].toLowerCase()} ${shape[1]} belongs in this cell.`;
    }
    return tr ? "Bu parça bu kareye konur." : "This piece belongs in this cell.";
  }
  if (hint.kind === "choice" && hint.value) {
    return tr ? "Doğru renk işaretlendi." : "The right color is marked.";
  }
  return "";
}

export default function HintBar({ slug }) {
  const { i18n } = useTranslation();
  const tr = !i18n.language.startsWith("en");
  const copy = hintFor(slug, tr ? "tr" : "en");
  const [attempt, setAttempt] = useState(null);
  const [balance, setBalance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    function handle(event) {
      const detail = event.detail;
      setAttempt(detail);
      if (typeof detail?.hint_balance === "number") setBalance(detail.hint_balance);
      setNote(detail?.hint ? describe(detail.hint, tr) : "");
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
  }, [tr]);

  async function revealCell() {
    if (!attempt?.id || busy || balance === 0) return;
    setBusy(true);
    try {
      const data = await openCellHint(attempt.id, currentHintFocus());
      publishCellHint(data.hint, data.hint_balance);
      setNote(describe(data.hint, tr));
    } catch (error) {
      const body = error.response?.data;
      if (typeof body?.hint_balance === "number") setBalance(body.hint_balance);
      setNote(body?.error || (tr ? "Şu an bir ipucu yok. Bir süre sonra yeniden deneyebilirsiniz." : "A hint is not available just now. You can try again in a moment."));
    } finally {
      setBusy(false);
    }
  }

  if (!copy) return null;
  const hintLabel = balance == null ? (tr ? "İpucu" : "Hint") : (tr ? `İpucu · ${balance}` : `Hint · ${balance}`);

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
