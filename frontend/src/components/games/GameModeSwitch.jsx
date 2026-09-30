import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function GameModeSwitch({ tournament, slug }) {
  const { t } = useTranslation();
  const base = slug ? `/games/${slug}` : "/games";
  return <nav className="game-mode-switch" aria-label={t("tournament.chooseMode")}>
    {[false, true].map(mode => <Link key={String(mode)}
      to={`${base}${mode ? "?mode=turnuva" : ""}`}
      className={`game-mode-button ${mode ? "mode-tournament" : "mode-normal"}`}
      aria-current={tournament === mode ? "page" : undefined}>
      <span>{t(mode ? "tournament.title" : "tournament.normalLabel")}</span>
      <small>{tournament === mode ? `✓ ${t("tournament.activeMode")}` : t("tournament.selectMode")}</small>
    </Link>)}
  </nav>;
}
