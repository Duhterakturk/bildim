import { useEffect, useState } from "react";
import { activePhotoId, subscribeTrial } from "./themeTrial";

const FILE = {
  "theme-space": "space",
  "theme-forest": "forest",
  "theme-sea": "sea",
  "theme-candy": "aurora",
  "theme-night": "night",
  "bg-dawn": "dawn",
  "bg-meadow": "meadow",
  "bg-ink": "ink",
};

export function photoSrc(id, thumb = false) {
  const file = FILE[id];
  if (!file) return "";
  return `/themes/${file}${thumb ? "-thumb" : ""}.webp`;
}

export default function ThemeScene({ id, mini = false }) {
  if (!id || !FILE[id]) return null;
  return (
    <div className={mini ? "absolute inset-0" : "theme-scene pointer-events-none fixed inset-0 z-0"} data-testid={mini ? undefined : "theme-scene"}>
      <img
        src={photoSrc(id, mini)}
        alt=""
        className={mini ? "theme-photo theme-photo-mini" : "theme-photo"}
        loading={mini ? "lazy" : "eager"}
        decoding="async"
      />
      {!mini && <div className="theme-shade" />}
    </div>
  );
}

export function PhotoBackdrop() {
  const [id, setId] = useState(() => activePhotoId());
  useEffect(() => subscribeTrial(() => setId(activePhotoId())), []);
  return <ThemeScene id={id} />;
}
