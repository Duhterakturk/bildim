import { Suspense } from "react";
import { useParams } from "react-router-dom";
import { getGameComponent } from "../games/registry";
import HintBar from "../components/games/HintBar";

export default function GamePage() {
  const { slug } = useParams();
  const GameComponent = getGameComponent(slug);

  if (!GameComponent) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-600">
        Bu oyun şu anda açılamıyor.
      </div>
    );
  }

  return (
    <div className="play-room mx-auto max-w-5xl px-4 py-10">
      <div className="play-scale">
        <HintBar slug={slug} />
        <Suspense fallback={<p>Yükleniyor...</p>}>
          <GameComponent />
        </Suspense>
      </div>
    </div>
  );
}
