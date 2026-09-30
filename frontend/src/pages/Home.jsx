import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import GamePreview from "../components/games/GamePreview";

const GAMES = ["sudoku", "kare-karalamaca", "pentominolar"];
function PuzzleWorkshop() {
  const pieces = [
    { fill: "#8da87d", cells: [[0,0],[1,0],[0,1],[0,2],[0,3]] },
    { fill: "#e98a32", cells: [[3,0],[3,1],[3,2],[3,3],[3,4]] },
    { fill: "#315a46", cells: [[0,4],[1,4],[0,5],[1,5],[2,5]] },
  ];
  return <svg viewBox="0 0 540 330" aria-hidden="true" className="workshop-art">
    <rect x="146" y="20" width="225" height="270" rx="3" fill="#fff9e9" stroke="#385242" strokeWidth="2" />
    {pieces.map(({fill,cells},i) => <g key={i}>{cells.map(([x,y]) => <rect key={`${x}-${y}`} x={147+x*45} y={21+y*45} width="43" height="43" rx="2" fill={fill}/>)}</g>)}
    {Array.from({length:4},(_,i)=><path key={`v${i}`} d={`M${191+i*45} 20v270`} stroke="#73816b" strokeWidth="1"/>)}
    {Array.from({length:5},(_,i)=><path key={`h${i}`} d={`M146 ${65+i*45}h225`} stroke="#73816b" strokeWidth="1"/>)}
    <g transform="translate(25 90) rotate(-8 40 40)" fill="#e98a32" stroke="#bc6a23" strokeWidth="1">
      {[[1,0],[2,0],[0,1],[1,1],[1,2]].map(([x,y])=><rect key={`${x}-${y}`} x={x*30} y={y*30} width="29" height="29" rx="2"/>)}
    </g>
    <g transform="translate(408 173) rotate(8 40 40)" fill="#315a46" stroke="#264636" strokeWidth="1">
      {[[0,0],[2,0],[0,1],[1,1],[2,1]].map(([x,y])=><rect key={`${x}-${y}`} x={x*30} y={y*30} width="29" height="29" rx="2"/>)}
    </g>
  </svg>;
}

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return <div className="home-workshop">
    <section className="workshop-hero" aria-labelledby="home-title">
      <div className="workshop-intro">
        <p className="workshop-eyebrow">{t("home.eyebrow")}</p>
        <h1 id="home-title">{t("home.title")}</h1>
        <p className="workshop-description">{t("home.description")}</p>
        <div className="workshop-actions">
          <Link className="workshop-primary" to="/games">{t("home.explore")} <span aria-hidden="true">→</span></Link>
          <a className="workshop-text-link" href="#home-how">{t("home.how")}</a>
        </div>
        <p className="workshop-meta">{t("home.meta")}</p>
      </div>
      <Link to="/games/pentominolar" className="workshop-feature" aria-label={t("home.pentominoLink")}>
        <p>{t("home.pieceTitle")}</p>
        <PuzzleWorkshop />
        <span className="workshop-feature-caption">{t("home.pentominoLink")} <span aria-hidden="true">↗</span></span>
      </Link>
    </section>
    <section className="workshop-games" aria-labelledby="home-games-title">
      <div className="workshop-section-head"><h2 id="home-games-title">{t("home.choose")}</h2><Link className="workshop-text-link" to="/games">{t("home.allGames")} <span aria-hidden="true">→</span></Link></div>
      <div className="workshop-card-grid">{GAMES.map(slug=><Link className="workshop-card" to={`/games/${slug}`} key={slug}>
        <div><h3>{t(`home.featured.${slug}.name`)}</h3><p>{t(`home.featured.${slug}.description`)}</p></div>
        <GamePreview slug={slug}/>
        <span className="workshop-card-arrow" aria-hidden="true">↗</span>
      </Link>)}</div>
    </section>
    {(!user || user.role === "teacher") && <section className="workshop-together"><div><h2>{t("home.together")}</h2><p>{t("home.classDescription")}</p></div><Link className="workshop-text-link" to={user ? "/hesabim?bolum=siniflar" : "/register"}>{t("home.classLink")} <span aria-hidden="true">→</span></Link></section>}
    <section className="workshop-how" id="home-how" aria-labelledby="home-how-title"><h2 id="home-how-title">{t("home.how")}</h2><ol>{["choose","read","solve"].map((step,i)=><li key={step}><span aria-hidden="true">0{i+1}</span><div><h3>{t(`home.steps.${step}.title`)}</h3><p>{t(`home.steps.${step}.text`)}</p></div></li>)}</ol></section>
  </div>;
}
