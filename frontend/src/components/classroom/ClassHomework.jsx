import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchGames } from "../../api/games";
import { createAssignment, fetchAssignment, fetchMyAssignment } from "../../api/classrooms";
import { btnPrimary, btnSecondary } from "../common/buttons";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

export function ClassHomework({ classroomId, classroomName }) {
  const [games, setGames] = useState([]);
  const [form, setForm] = useState({ slugs: [], difficulty: "easy", target_count: 3 });
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchGames().then(setGames).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classroomId) return;
    fetchAssignment(classroomId).then(setBoard).catch(() => setBoard(null));
  }, [classroomId]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      const next = await createAssignment(classroomId, {
        slugs: form.slugs,
        difficulty: form.difficulty,
        target_count: Number(form.target_count),
      });
      setBoard(next);
    } catch (err) {
      setError(err.response?.data?.error || "Ödev kaydedilemedi. Seçiminizi kontrol edip yeniden deneyebilirsiniz.");
    }
  }

  async function handleCopy() {
    if (!board?.sentence) return;
    await copyText(board.sentence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const assignments = board?.assignments?.length ? board.assignments : board?.assignment ? [board.assignment] : [];

  function toggleSlug(slug) {
    setForm((current) => ({
      ...current,
      slugs: current.slugs.includes(slug)
        ? current.slugs.filter((item) => item !== slug)
        : [...current.slugs, slug],
    }));
  }

  return (
    <section className="bg-[#fffdf8] rounded-2xl border border-line p-6 mb-6">
      <h2 className="font-display text-2xl text-ink mb-1">Bu haftanın ödevi</h2>
      <p className="text-sm text-stone-500 mb-4">
        {classroomName} için bir veya birkaç oyun seçilir. Sayı her oyun için geçerlidir. Sayım, ödevin bırakıldığı andan başlar. Kolay kademe herkese açıktır.
      </p>

      <form onSubmit={handleCreate} className="mb-5">
        <div className="flex flex-wrap gap-2 mb-3">
          {games.map((game) => {
            const on = form.slugs.includes(game.slug);
            return (
              <button
                key={game.slug}
                type="button"
                onClick={() => toggleSlug(game.slug)}
                className={`rounded-full border px-3 py-1 text-sm ${on ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-ink"}`}
              >
                {game.name_tr}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
        <select
          className="border border-line rounded-lg px-3 py-2 text-sm bg-white"
          value={form.difficulty}
          onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
        >
          <option value="easy">Kolay</option>
          <option value="medium">Orta</option>
          <option value="hard">Zor</option>
        </select>
        <input
          type="number"
          min="1"
          max="10"
          required
          value={form.target_count}
          onChange={(e) => setForm({ ...form, target_count: e.target.value })}
          className="w-20 border border-line rounded-lg px-3 py-2 text-sm bg-white"
        />
        <button type="submit" className="press-btn !px-4 !py-2 text-sm" disabled={form.slugs.length === 0}>Ödevi Kaydedin</button>
        </div>
      </form>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {assignments.length === 0 ? (
        <p className="text-sm text-stone-500">Bu hafta henüz bir ödev yok.</p>
      ) : (
        <div>
          <ul className="mb-4 space-y-2">
            {assignments.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
                <span>Hedef: {item.target_count} {item.difficulty_label.toLowerCase()} {item.name_tr}</span>
                <Link to={`/board/${item.slug}?difficulty=${item.difficulty}`} className="font-bold text-brand-700">
                  Tahtada Açın
                </Link>
              </li>
            ))}
          </ul>
          <p className="font-display text-5xl text-ink leading-none">{board.class_total}</p>
          <p className="text-sm text-stone-500 mb-4">bu hafta biten bulmaca</p>

          {board.finished.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-4">
              {board.finished.map((row) => (
                <li key={row.full_name} className="bg-white border border-line rounded-full px-3 py-1 text-sm">
                  {row.full_name}
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-stone-600 mb-4">Ödevi henüz tamamlamayan {board.pending_count} kişi var.</p>
          <p className="bg-white border border-line rounded-xl px-4 py-3 text-sm mb-3">{board.sentence}</p>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={handleCopy} className="text-sm font-bold text-brand-700">
              {copied ? "Kopyalandı" : "Metni Kopyalayın"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function StudentHomework({ classroomId }) {
  const { t } = useTranslation();
  const [pack, setPack] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!classroomId) {
      setPack(null);
      setPhase("idle");
      return undefined;
    }
    let cancelled = false;
    setPhase("loading");
    setPack(null);
    fetchMyAssignment()
      .then((data) => {
        if (!cancelled) {
          setPack(data);
          setPhase("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPack(null);
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId, reloadKey]);

  if (!classroomId || phase === "idle") return null;
  if (phase === "loading") {
    return <p className="text-sm text-slate-600" role="status">{t("account.homeworkLoading")}</p>;
  }
  if (phase === "error") {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <p role="alert" className="text-sm text-slate-700">{t("account.homeworkError")}</p>
        <button type="button" className={`${btnSecondary} mt-3`} onClick={() => setReloadKey((n) => n + 1)}>
          {t("account.retry")}
        </button>
      </div>
    );
  }

  const assignments = pack?.assignments?.length ? pack.assignments : pack?.assignment ? [pack.assignment] : [];
  if (!assignments.length) {
    return (
      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-display text-2xl text-ink mb-2">Bu haftanın ödevi</h2>
        <p className="text-sm text-slate-600 mb-4">{t("account.homeworkEmpty")}</p>
        <Link to="/games" className={btnSecondary}>{t("account.play")}</Link>
      </section>
    );
  }
  const finished = assignments.every((item) => item.finished);

  return (
    <section className="bg-[#fffdf8] rounded-2xl border border-line p-6 mb-6">
      <h2 className="font-display text-2xl text-ink mb-3">Bu haftanın ödevi</h2>
      <ul className="space-y-4">
        {assignments.map((item) => (
          <li key={item.id}>
            <p className="text-stone-600 mb-1">
              {item.target_count} {item.difficulty_label.toLowerCase()} {item.name_tr}
            </p>
            <p className="font-display text-4xl text-ink">
              {Math.min(item.done_count, item.target_count)}
              <span className="text-2xl text-stone-400"> / {item.target_count}</span>
            </p>
            {!item.finished && (
              <Link to={`/games/${item.slug}`} className={`${btnPrimary} mt-2`}>
                Bulmacaya Geçin
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-stone-500 mt-4">
        {finished ? "Ödev tamamlandı." : "Tamamlandığında burada görünür."}
      </p>
    </section>
  );
}
