import { Suspense } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getGameComponent } from "../games/registry";
import HintBar from "../components/games/HintBar";

import TournamentQuestion from "../components/games/TournamentQuestion";
import HowTo from "../components/games/HowTo";

export default function GamePage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const tournament = params.get("mode") === "turnuva";
  const { t } = useTranslation();
  const GameComponent = getGameComponent(slug);

  if (!GameComponent) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-600">
        {t("board.unavailable")}
      </div>
    );
  }

  return (
    <div key={`${slug}-${tournament}`} className={`play-room mx-auto max-w-5xl px-4 py-10 ${tournament ? "tournament-room" : ""}`}>
      <Link className="scene-chip mb-4 inline-flex rounded-lg px-3 py-2" to={`/games/${slug}${tournament ? "" : "?mode=turnuva"}`}>{t(tournament ? "tournament.normal" : "tournament.title")}</Link>
      {tournament && <TournamentQuestion />}
      <div className="play-scale">
        {tournament ? <HowTo slug={slug} /> : <HintBar slug={slug} />}
        <Suspense fallback={<p>{t("common.loading")}</p>}>
          <GameComponent />
        </Suspense>
      </div>
    </div>
  );
}
