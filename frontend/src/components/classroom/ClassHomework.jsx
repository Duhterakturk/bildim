import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchGames } from "../../api/games";
import { createAssignment, fetchAssignment, fetchMyAssignment } from "../../api/classrooms";
import { btnPrimary, btnSecondary } from "../common/buttons";
import { copyText } from "../common/copyText";
import { apiErrorText, apiFailure } from "../../i18n/apiError";

function gameLabel(game, language) {
  const english = String(language || "").startsWith("en");
  if (english) return game.name_en || game.name_tr || game.slug;
  return game.name_tr || game.name_en || game.slug;
}

function levelLabel(t, difficulty) {
  const key = `difficulty.inline.${difficulty}`;
  const value = t(key);
  return value === key ? "" : value;
}

export function ClassHomework({ classroomId, classroomName }) {
  const { t, i18n } = useTranslation();
  const [games, setGames] = useState([]);
  const [form, setForm] = useState({ slugs: [], difficulty: "easy", target_count: 3 });
  const [board, setBoard] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchGames().then(setGames).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classroomId) return undefined;
    let cancelled = false;
    setBoard(null);
    setPhase("loading");
    setError(null);
    setCopied(null);
    setForm({ slugs: [], difficulty: "easy", target_count: 3 });
    fetchAssignment(classroomId)
      .then((data) => {
        if (!cancelled) {
          setBoard(data);
          setPhase("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBoard(null);
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId, reloadKey]);

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
      setError(apiFailure(err, "account.teacher.saveError"));
    }
  }

  const assignments = board?.assignments?.length ? board.assignments : board?.assignment ? [board.assignment] : [];
  const shareText = phase === "ready" && assignments.length
    ? `${t("account.teacher.weekSentence", { name: classroomName, count: board.class_total })} ${t("account.teacher.pendingSentence", { count: board.pending_count })}`
    : "";

  async function handleCopy() {
    if (!shareText) return;
    setCopied((await copyText(shareText)) ? "ok" : "fail");
  }

  function toggleSlug(slug) {
    setForm((current) => ({
      ...current,
      slugs: current.slugs.includes(slug)
        ? current.slugs.filter((item) => item !== slug)
        : [...current.slugs, slug],
    }));
  }

  return (
    <section className="mb-4 rounded-xl border border-line bg-[#fffdf8] p-4">
      <h2 className="mb-1 text-lg font-semibold text-ink">{t("account.teacher.homeworkTitle")}</h2>
      <p className="mb-3 text-sm text-stone-500">
        {t("account.teacher.homeworkIntro", { name: classroomName })}
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
                className={`inline-flex min-h-[44px] items-center rounded-full border px-3 text-sm ${on ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-ink"}`}
              >
                {gameLabel(game, i18n.language)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
        <select
          className="min-h-[44px] rounded-lg border border-line bg-white px-3 text-sm"
          value={form.difficulty}
          onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
        >
          <option value="easy">{t("difficulty.easy")}</option>
          <option value="medium">{t("difficulty.medium")}</option>
          <option value="hard">{t("difficulty.hard")}</option>
        </select>
        <input
          type="number"
          min="1"
          max="10"
          required
          value={form.target_count}
          onChange={(e) => setForm({ ...form, target_count: e.target.value })}
          className="min-h-[44px] w-20 rounded-lg border border-line bg-white px-3 text-sm"
        />
        <button type="submit" className="press-btn inline-flex min-h-[44px] items-center !px-4 !py-2 text-sm" disabled={form.slugs.length === 0}>{t("account.teacher.saveHomework")}</button>
        </div>
      </form>
      {error && <p role="alert" className="text-red-500 text-sm mb-4">{apiErrorText(error, t, i18n)}</p>}

      {phase === "loading" && <p className="text-sm text-slate-600" role="status">{t("account.teacher.homeworkLoading")}</p>}
      {phase === "error" && (
        <div>
          <p role="alert" className="text-sm text-slate-700">{t("account.teacher.homeworkError")}</p>
          <button type="button" className={`${btnSecondary} mt-3`} onClick={() => setReloadKey((n) => n + 1)}>{t("account.retry")}</button>
        </div>
      )}
      {phase === "ready" && assignments.length === 0 && (
        <p className="text-sm text-stone-500">{t("account.teacher.homeworkEmpty")}</p>
      )}
      {phase === "ready" && assignments.length > 0 && (
        <div>
          <ul className="mb-3 space-y-2">
            {assignments.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
                <span>{t("account.teacher.target", { count: item.target_count, level: levelLabel(t, item.difficulty), game: gameLabel(item, i18n.language) })}</span>
                <Link to={`/board/${item.slug}?difficulty=${item.difficulty}`} className="inline-flex min-h-[44px] items-center font-bold text-brand-700">
                  {t("account.teacher.openBoard")}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-3xl font-semibold leading-none text-ink">{new Intl.NumberFormat(i18n.language?.startsWith("en") ? "en" : "tr").format(board.class_total)}</p>
          <p className="mb-3 text-sm text-stone-500">{t("account.teacher.weekFinished", { count: board.class_total })}</p>

          {(board.finished || []).length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-4">
              {board.finished.map((row) => (
                <li key={row.full_name} className="bg-white border border-line rounded-full px-3 py-1 text-sm">
                  {row.full_name}
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-stone-600 mb-4">{t("account.teacher.pending", { count: board.pending_count })}</p>
          <p className="bg-white border border-line rounded-xl px-4 py-3 text-sm mb-3">{shareText}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleCopy} className="inline-flex min-h-[44px] items-center text-sm font-bold text-brand-700">
              {t("account.teacher.copyText")}
            </button>
            {copied === "ok" && <p role="status" className="text-sm text-emerald-700">{t("account.teacher.copied")}</p>}
            {copied === "fail" && <p role="alert" className="text-sm text-red-700">{t("account.teacher.copyError")}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

export function StudentHomework({ classroomId }) {
  const { t, i18n } = useTranslation();
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
        <h2 className="font-display text-2xl text-ink mb-2">{t("account.teacher.homeworkTitle")}</h2>
        <p className="text-sm text-slate-600 mb-4">{t("account.homeworkEmpty")}</p>
        <Link to="/games" className={btnSecondary}>{t("account.play")}</Link>
      </section>
    );
  }
  const finished = assignments.every((item) => item.finished);

  return (
    <section className="bg-[#fffdf8] rounded-2xl border border-line p-6 mb-6">
      <h2 className="font-display text-2xl text-ink mb-3">{t("account.teacher.homeworkTitle")}</h2>
      <ul className="space-y-4">
        {assignments.map((item) => (
          <li key={item.id}>
            <p className="text-stone-600 mb-1">
              {t("account.homeworkTarget", { count: item.target_count, level: levelLabel(t, item.difficulty), game: gameLabel(item, i18n.language) })}
            </p>
            <p className="font-display text-4xl text-ink">
              {Math.min(item.done_count, item.target_count)}
              <span className="text-2xl text-stone-400"> / {item.target_count}</span>
            </p>
            {!item.finished && (
              <Link to={`/games/${item.slug}`} className={`${btnPrimary} mt-2`}>
                {t("account.homeworkGo")}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-stone-500 mt-4">
        {finished ? t("account.homeworkDone") : t("account.homeworkWaiting")}
      </p>
    </section>
  );
}
