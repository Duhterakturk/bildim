import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HowTo from "./HowTo";
import GamePreview from "./GamePreview";

const LEVELS = ["easy", "medium", "hard"];

function levelText(t, level, state) {
  const name = t(`difficulty.${level}`);
  if (!state.unlocked[level]) return `${name} 🔒`;
  const index = LEVELS.indexOf(level);
  const next = LEVELS[index + 1];
  const openingNext = next && !state.unlocked[next];
  if (openingNext) {
    const done = Math.min(state.progress[level] || 0, state.threshold);
    return `${name} ${done}/${state.threshold}`;
  }
  return `${name} ✓`;
}

export default function GameCard({ game, index = 0, progress = null }) {
  const { t, i18n } = useTranslation();
  const name = i18n.language?.startsWith("en") ? (game.name_en || game.name_tr) : (game.name_tr || game.name_en);
  const state = progress?.games?.[game.slug]
    ? { ...progress.games[game.slug], threshold: progress.threshold }
    : null;

  return (
    <div
      className="game-card card-rise relative"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
      data-testid={`game-card-${game.slug}`}
    >
      <Link to={`/games/${game.slug}`} className="block p-2.5">
        <GamePreview slug={game.slug} />
        <h3 className="mt-2 pr-8 text-[15px] font-bold leading-tight text-inherit">{name}</h3>
        <p className="mt-1.5">
          <span className="game-pill">
            {t("games.min_grade")}: {game.min_grade_level}
          </span>
        </p>
        {state && (
          <p className="mt-1.5 pr-8 text-[11px] leading-snug text-inherit">
            {LEVELS.map((level) => levelText(t, level, state)).join("  ")}
          </p>
        )}
      </Link>
      <HowTo slug={game.slug} className="absolute right-2.5 top-[128px] text-inherit" />
    </div>
  );
}
