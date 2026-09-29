import { Suspense, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getGameComponent } from "../games/registry";

const LEVELS = { easy: "Kolay", medium: "Orta", hard: "Zor" };

export default function Board() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const GameComponent = getGameComponent(slug);
  const level = LEVELS[params.get("difficulty")] || LEVELS.easy;
  const title = t(`gameTitle.${slug}`, { defaultValue: slug });

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    document.documentElement.requestFullscreen().catch(() => {});
  }

  if (!GameComponent) {
    return <p className="p-10 text-center">Bu oyun tahtaya alınamadı.</p>;
  }

  return (
    <div className="board-mode min-h-screen bg-paper">
      <header className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-ink leading-none">{title}</h1>
          <p className="text-stone-500 mt-1">{level}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={toggleFullscreen} className="press-btn !px-4 !py-2 text-sm">
            Tam ekran
          </button>
          <Link to="/hesabim?bolum=siniflar" className="px-4 py-2 text-sm font-bold text-stone-600">
            Çık
          </Link>
        </div>
      </header>
      <div className="board-play flex justify-center px-4 pb-16">
        <Suspense fallback={<p>Yükleniyor...</p>}>
          <GameComponent />
        </Suspense>
      </div>
    </div>
  );
}
