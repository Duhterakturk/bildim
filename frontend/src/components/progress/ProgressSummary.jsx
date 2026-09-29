import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchMyProgress, downloadProgressExport, downloadProgressPdf } from "../../api/progress";
import { btnSecondary } from "../common/buttons";

function BarChart({ perGame, language, empty }) {
  if (perGame.length === 0) {
    return <p className="text-slate-400 text-sm">{empty}</p>;
  }
  const english = String(language || "").startsWith("en");
  const max = Math.max(...perGame.map((g) => g.best_points), 1);

  return (
    <div className="flex items-end gap-3 h-40 mt-2">
      {perGame.slice(0, 8).map((g) => {
        const height = Math.round((g.best_points / max) * 100);
        const name = english ? (g.name_en || g.name_tr) : (g.name_tr || g.name_en);
        return (
          <div key={g.game_slug} className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[10px] text-slate-500 mb-1">{new Intl.NumberFormat(english ? "en" : "tr").format(g.best_points)}</span>
            <div
              className="w-full bg-brand-500 rounded-t"
              style={{ height: `${height}%`, minHeight: 4 }}
              title={`${name}: ${g.best_points}`}
            />
            <span className="text-[10px] text-slate-500 mt-1 truncate w-full text-center">{name}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * İlerleme özeti (stat kartları + grafik). `progress` verisi dışarıdan
 * verilmezse kendi kullanıcısının ilerlemesini (`/progress/me`) getirir —
 * böylece hem Panelim sayfasında hem de veli/öğretmen görünümlerinde
 * (dışarıdan `progress` prop'u geçirilerek) yeniden kullanılabilir. Tarih
 * aralığı filtresi yalnızca kendi ilerlemesi görüntülenirken (`showExport`)
 * gösterilir.
 */
export default function ProgressSummary({ progress: externalProgress, showExport = true }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en" : "tr";
  const formatCount = (value) => new Intl.NumberFormat(locale).format(value ?? 0);
  const [ownProgress, setOwnProgress] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (externalProgress) return;
    // Yarışan istekleri (ör. tarih alanlarına art arda yazarken) engellemek
    // için: yalnızca bu efekt hâlâ "güncel" ise (temizlenmediyse) sonucu
    // uygula — geç gelen eski bir yanıt, daha yeni bir isteğin sonucunun
    // üzerine yazmasın.
    let cancelled = false;
    setLoadError(false);
    fetchMyProgress({ startDate, endDate })
      .then((data) => {
        if (!cancelled) setOwnProgress(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [externalProgress, startDate, endDate, reloadKey]);

  async function handlePdf() {
    setExportingPdf(true);
    try {
      await downloadProgressPdf({ startDate, endDate });
    } catch {
      // Sessizce yoksay; kullanıcı giriş yapmamış olabilir.
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadProgressExport({ startDate, endDate });
    } catch {
      // Sessizce yoksay; kullanıcı giriş yapmamış olabilir.
    } finally {
      setExporting(false);
    }
  }

  const progress = externalProgress || ownProgress;
  if (loadError && !externalProgress) {
    return (
      <div>
        <p role="alert" className="text-sm text-slate-700">{i18n.t("account.progressError")}</p>
        <button type="button" className={`${btnSecondary} mt-3`} onClick={() => setReloadKey((n) => n + 1)}>
          {i18n.t("account.retry")}
        </button>
      </div>
    );
  }
  if (!progress) return <p className="text-slate-600 text-sm" role="status">{t("progress.loading")}</p>;

  const untouched = !progress.total_completed && !(progress.per_game || []).length && !startDate && !endDate;
  if (untouched && showExport) {
    return (
      <div>
        <p className="text-sm text-slate-700">{i18n.t("account.progressEmpty")}</p>
        <p className="text-sm text-slate-600 mt-1">{i18n.t("account.progressEmptyHelp")}</p>
      </div>
    );
  }

  return (
    <div>
      {showExport && (
        <div className="flex flex-wrap items-end gap-3 mb-4 text-sm">
          <label className="flex flex-col text-xs text-slate-500">
            {t("progress.start")}
            <input
              type="date"
              lang={locale}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 mt-1"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-500">
            {t("progress.end")}
            <input
              type="date"
              lang={locale}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 mt-1"
            />
          </label>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-slate-500 hover:underline pb-2"
            >
              {t("progress.clear")}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-brand-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{formatCount(progress.total_completed)}</p>
          <p className="text-xs text-slate-500">{t("progress.completed")}</p>
        </div>
        <div className="bg-brand-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{formatCount(progress.total_points)}</p>
          <p className="text-xs text-slate-500">{t("progress.points")}</p>
        </div>
        <div className="bg-brand-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{formatCount(progress.distinct_games_completed)}</p>
          <p className="text-xs text-slate-500">{t("progress.kinds")}</p>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-700 mb-1">{t("progress.best")}</h3>
      <BarChart perGame={progress.per_game} language={i18n.language} empty={t("progress.empty")} />

      {showExport && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={handlePdf}
            disabled={exportingPdf}
            className={btnSecondary}
          >
            {exportingPdf ? t("progress.downloading") : t("progress.pdf")}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className={btnSecondary}
          >
            {exporting ? t("progress.downloading") : t("progress.excel")}
          </button>
        </div>
      )}
    </div>
  );
}
