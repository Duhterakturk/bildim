import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import GamePreview from "../components/games/GamePreview";
import { activePhotoId, subscribeTrial } from "../components/shop/themeTrial";
import { photoSrc } from "../components/shop/ThemeScene";

const GAMES = ["sudoku", "kare-karalamaca", "pentominolar"];

function cells(list, ox, oy, size, fill) {
  return list.map(([col, row]) => (
    <rect key={`${ox}-${col}-${row}`} x={ox + col * size} y={oy + row * size} width={size - 2} height={size - 2} rx="2" fill={fill} />
  ));
}

function HeroBoard({ illustrated = false }) {
  const ox = 168;
  const oy = 36;
  const size = 46;
  const cols = 5;
  const rows = 6;
  return (
    <svg className="workshop-art" viewBox="0 0 560 360" aria-hidden="true">
      {illustrated && <g className="workshop-drawing">
        <circle cx="290" cy="178" r="171" fill="#e1eadb" />
        <circle cx="290" cy="178" r="153" fill="none" stroke="#a5b69a" strokeWidth="1" />
        <path d="M76 243C12 82 178-34 349 16M417 38C556 112 524 278 395 340" fill="none" stroke="#c78336" strokeWidth="2" strokeDasharray="4 9" />
        <g transform="translate(415 24) rotate(9)">
          <rect width="85" height="85" rx="12" fill="#fffdf8" stroke="#c9bfa9" />
          <path d="M28 8V77M56 8V77M8 28H77M8 56H77" stroke="#c9bfa9" />
          <g fill="#315a46" fontSize="18" fontFamily="Manrope, sans-serif" textAnchor="middle"><text x="15" y="23">5</text><text x="42" y="51">3</text><text x="68" y="74">7</text></g>
        </g>
        <g transform="translate(72 267) rotate(-8)">
          <rect width="77" height="67" rx="10" fill="#315a46" />
          {[[12,12],[29,12],[46,12],[29,29],[46,46]].map(([x,y]) => <rect key={`${x}-${y}`} x={x} y={y} width="13" height="13" rx="2" fill="#f4cf8d" />)}
        </g>
      </g>}
      <rect x={ox} y={oy} width={cols * size} height={rows * size} fill="#fff9e9" stroke="#385242" strokeWidth="2" />
      {cells([[0, 0], [1, 0], [0, 1], [0, 2], [0, 3]], ox, oy, size, "#8da87d")}
      {cells([[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]], ox, oy, size, "#e98a32")}
      {cells([[0, 4], [1, 4], [0, 5], [1, 5], [2, 5]], ox, oy, size, "#315a46")}
      {Array.from({ length: cols - 1 }, (_, i) => (
        <path key={`v${i}`} d={`M${ox + (i + 1) * size} ${oy}v${rows * size}`} stroke="#73816b" strokeWidth="1" />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <path key={`h${i}`} d={`M${ox} ${oy + (i + 1) * size}h${cols * size}`} stroke="#73816b" strokeWidth="1" />
      ))}
      <g className={illustrated ? "workshop-piece-first" : undefined} transform="translate(28 108) rotate(-10 42 42)" fill="#e98a32" stroke="#fff9e9" strokeWidth="2">
        {cells([[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]], 0, 0, 30, "#e98a32")}
      </g>
      <g className={illustrated ? "workshop-piece-second" : undefined} transform="translate(412 168) rotate(8 42 28)" fill="#315a46" stroke="#fff9e9" strokeWidth="2">
        {cells([[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]], 0, 0, 30, "#315a46")}
      </g>
    </svg>
  );
}

export default function Home() {
  const { t } = useTranslation();
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

        <div className="workshop-intro">
          {!scene && <p className="workshop-kicker">{t("home.kicker")}</p>}
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
            <HeroBoard illustrated={!scene} />
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
