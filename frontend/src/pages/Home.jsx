import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import GamePreview from "../components/games/GamePreview";
import { activePhotoId, subscribeTrial } from "../components/shop/themeTrial";
import { photoSrc } from "../components/shop/ThemeScene";

const GAMES = ["sudoku", "kare-karalamaca", "pentominolar"];

export default function Home() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [photoId, setPhotoId] = useState(activePhotoId);
  useEffect(() => subscribeTrial(() => setPhotoId(activePhotoId())), []);
  const scene = photoSrc(photoId);
  return (
    <div className="home-workshop" data-scene={photoId || undefined}>
      <section className="workshop-hero" aria-labelledby="home-title">
          <div
            className="workshop-scene"
            data-testid="home-scene"
            style={scene ? { backgroundImage: `url("${scene}")` } : undefined}
            aria-hidden="true"
          />

        <div key={location.key} className="workshop-light-pass" aria-hidden="true" />
        <div className="workshop-intro">
          <h1 id="home-title">{t("home.title")}</h1>
          <p className="workshop-description">{t("home.description")}</p>
          <div className="workshop-actions">
            <Link className="workshop-primary" to="/games">{t("home.explore")} <span aria-hidden="true">→</span></Link>
            <a className="workshop-text-link" href="#home-how">{t("home.how")}</a>
          </div>
          <p className="workshop-meta">{t("home.meta")}</p>
        </div>
        <div className="workshop-stage">
          <Link to="/games/pentominolar" className="workshop-feature workshop-board" aria-label={t("home.pentominoLink")}>
            <img className="workshop-sculpture" src="/art/bildim-sculpture-1440.webp"
              srcSet="/art/bildim-sculpture-768.webp 768w, /art/bildim-sculpture-1440.webp 1440w"
              sizes="(max-width: 820px) 92vw, 55vw" width="1440" height="960"
              alt="" fetchPriority="high" decoding="async" />
            <span className="workshop-feature-caption">{t("home.pentominoLink")} <span aria-hidden="true">↗</span></span>
          </Link>
        </div>
      </section>
      <section className="workshop-games" aria-labelledby="home-games-title">
        <div className="workshop-section-head">
          <h2 id="home-games-title">{t("home.choose")}</h2>
          <Link className="workshop-text-link" to="/games">{t("home.allGames")} <span aria-hidden="true">→</span></Link>
        </div>
        <div className="workshop-card-grid">
          {GAMES.map((slug) => (
            <Link className="workshop-card" to={`/games/${slug}`} key={slug}>
              <div>
                <h3>{t(`home.featured.${slug}.name`)}</h3>
                <p>{t(`home.featured.${slug}.description`)}</p>
              </div>
              <GamePreview slug={slug} />
              <span className="workshop-card-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
      {(!user || user.role === "teacher") && (
        <section className="workshop-together">
          <div>
            <h2>{t("home.together")}</h2>
            <p>{t("home.classDescription")}</p>
          </div>
          <Link className="workshop-text-link" to={user ? "/hesabim?bolum=siniflar" : "/register"}>{t("home.classLink")} <span aria-hidden="true">→</span></Link>
        </section>
      )}
      <section className="workshop-how" id="home-how" aria-labelledby="home-how-title">
        <h2 id="home-how-title">{t("home.how")}</h2>
        <ol>
          {["choose", "read", "solve"].map((step, i) => (
            <li key={step}>
              <span aria-hidden="true">0{i + 1}</span>
              <div>
                <h3>{t(`home.steps.${step}.title`)}</h3>
                <p>{t(`home.steps.${step}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
