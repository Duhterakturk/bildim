import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchMyProgress, downloadProgressExport, downloadProgressPdf } from "../../api/progress";

function BarChart({ perGame, lang }) {
  if (perGame.length === 0) {
    return <p className="text-slate-400 text-sm">Henüz tamamlanmış oyun yok.</p>;
  }
  const max = Math.max(...perGame.map((g) => g.best_points), 1);

  return (
    <div className="flex items-end gap-3 h-40 mt-2">
      {perGame.slice(0, 8).map((g) => {
        const height = Math.round((g.best_points / max) * 100);
        const name = lang === "tr" ? g.name_tr : g.name_en;
        return (
          <div key={g.game_slug} className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[10px] text-slate-500 mb-1">{g.best_points}</span>
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
  const { i18n } = useTranslation();
  const [ownProgress, setOwnProgress] = useState(null);
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
    fetchMyProgress({ startDate, endDate })
      .then((data) => {
        if (!cancelled) setOwnProgress(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [externalProgress, startDate, endDate]);

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
  if (!progress) return <p className="text-slate-500 text-sm">Yükleniyor...</p>;

  return (
    <div>
      {showExport && (
        <div className="flex flex-wrap items-end gap-3 mb-4 text-sm">
          <label className="flex flex-col text-xs text-slate-500">
            Başlangıç
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 mt-1"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-500">
            Bitiş
            <input
              type="date"
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
              Filtreyi temizle
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-brand-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{progress.total_completed}</p>
          <p className="text-xs text-slate-500">Tamamlanan Oyun</p>
        </div>
        <div className="bg-brand-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{progress.total_points}</p>
          <p className="text-xs text-slate-500">Toplam Puan</p>
        </div>
        <div className="bg-brand-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{progress.distinct_games_completed}</p>
          <p className="text-xs text-slate-500">Farklı Oyun Türü</p>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-700 mb-1">Oyun Bazlı En İyi Puanlar</h3>
      <BarChart perGame={progress.per_game} lang={i18n.language} />

      {showExport && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={handlePdf}
            disabled={exportingPdf}
            className="bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600 disabled:opacity-50"
          >
            {exportingPdf ? "İndiriliyor..." : "PDF İndirin"}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 disabled:opacity-50"
          >
            {exporting ? "İndiriliyor..." : "Excel Olarak İndirin"}
          </button>
        </div>
      )}
    </div>
  );
}
