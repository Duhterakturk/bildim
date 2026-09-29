import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCurrentExam, startExam } from "../api/exams";

function clock(total) {
  const safe = Math.max(0, total);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function Exam() {
  const [exam, setExam] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [base, setBase] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState(null);

  function apply(data) {
    setExam(data.exam);
    if (data.exam && !data.exam.finished_at) {
      setBase({ elapsed: data.exam.elapsed_seconds, at: Date.now() });
    }
  }

  function load() {
    return fetchCurrentExam()
      .then(apply)
      .catch(() => setError("Deneme yüklenemedi. Yeniden deneyebilirsiniz."));
  }

  useEffect(() => {
    load().finally(() => setLoaded(true));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function handleStart() {
    setError(null);
    try {
      apply(await startExam());
    } catch (err) {
      setError(err.response?.data?.error || "Deneme açılamadı. Yeniden deneyebilirsiniz.");
    }
  }

  if (!loaded) return <div className="max-w-3xl mx-auto px-4 py-10 text-slate-500">Yükleniyor...</div>;

  const elapsed = exam?.finished_at
    ? exam.elapsed_seconds
    : (base?.elapsed || 0) + Math.floor((now - (base?.at || now)) / 1000);
  const late = exam && elapsed > exam.limit_seconds;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-4xl font-semibold mb-2">Karışık Deneme</h1>
      <p className="text-stone-600 mb-6">
        Üç ayrı oyun, on beş dakika. Kolay kademede ilerlenir; bitince bu sayfaya dönebilirsiniz.
      </p>

      {!exam && (
        <button type="button" onClick={handleStart} className="press-btn">
          Denemeyi Açın
        </button>
      )}

      {exam && (
        <div className="bg-[#fffdf8] border border-line rounded-2xl p-6">
          <p className={`font-display text-4xl ${late ? "text-red-600" : "text-ink"}`}>
            {clock(elapsed)}
            <span className="text-base text-stone-500 ml-2">/ {clock(exam.limit_seconds)}</span>
          </p>
          <ul className="mt-6 space-y-3">
            {exam.games.map((game, index) => (
              <li key={game.id} className="flex items-center justify-between gap-3">
                <Link to={`/games/${game.slug}`} className="font-bold text-brand-700 hover:underline">
                  {index + 1}. {game.name_tr}
                </Link>
                <span className="text-sm text-stone-500">
                  {game.done ? `${game.points} puan` : "Bekliyor"}
                </span>
              </li>
            ))}
          </ul>
          {exam.finished_at && (
            <div className="mt-6">
              <p className="play-correct font-bold text-ink">
                Toplam {exam.total_points} puan. {exam.on_time ? "Süre içinde bitti." : "Süre dolduktan sonra bitti."}
              </p>
              <button type="button" onClick={handleStart} className="press-btn mt-4">
                Yeni Deneme
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
}
