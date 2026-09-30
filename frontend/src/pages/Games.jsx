import GameModeSwitch from "../components/games/GameModeSwitch";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchGames } from "../api/games";
import { fetchAllUnlocked } from "../api/difficulty";
import { useAuth } from "../context/AuthContext";
import { apiErrorText } from "../i18n/apiError";
import GameCard from "../components/games/GameCard";

export default function Games() {
  const [params] = useSearchParams();
  const tournament = params.get("mode") === "turnuva";
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;
  const [games, setGames] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchGames()
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch(() => {
        setError({ fallback: "games.loadError" });
        setLoading(false);
      });
  }, [t]);

  useEffect(() => {
    if (!userId) {
      setProgress(null);
      return undefined;
    }
    let alive = true;
    fetchAllUnlocked()
      .then((data) => {
        if (alive && data?.games) setProgress(data);
      })
      .catch(() => {
        if (alive) setProgress(null);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <h1 className="scene-label font-display text-4xl font-semibold">{t(tournament ? "tournament.title" : "games.title")}</h1>
        <Link to="/exam" className="press-btn text-sm" style={{ padding: "0.55rem 1rem" }}>
          {t("exam.title")}
        </Link>
      </div>

      <GameModeSwitch tournament={tournament} />
      {error && <p role="alert" className="text-red-500">{apiErrorText(error, t, i18n)}</p>}

      {loading && (
        <>
          {slow && (
            <p className="text-slate-500 text-sm mb-4">
              {t("games.waking")}
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="game-card p-2.5 animate-pulse">
                <div className="h-[110px] rounded-[10px] bg-white/10" />
                <div className="mt-2 h-4 w-2/3 rounded bg-white/10" />
                <div className="mt-2 h-3 w-1/3 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
          {games.map((game, index) => (
            <GameCard tournament={tournament} key={game.slug} game={game} index={index} progress={progress} />
          ))}
        </div>
      )}
    </div>
  );
}
