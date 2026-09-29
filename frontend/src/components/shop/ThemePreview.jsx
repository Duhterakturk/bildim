import { photoSrc } from "./ThemeScene";

const DIGITS = ["5", "", "3", "", "", "1", "", "4", "2", "", "", "8", "", "6", "", "7"];

export default function ThemePreview({ item, className = "w-full h-28" }) {
  const { cell = "#fffdf8", ink = "#293c35", line = "#7c8c82", room = "#f5f3ed" } = item.preview || {};
  const size = 22;
  const origin = 8;
  const src = photoSrc(item.id, true);
  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ backgroundColor: room }} data-testid="preview">
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" loading="lazy" decoding="async" />}
      <svg viewBox="0 0 120 110" className="relative h-full w-full" aria-hidden="true">
        {DIGITS.map((digit, index) => {
          const col = index % 4;
          const row = Math.floor(index / 4);
          const x = origin + col * size;
          const y = 28 + row * size;
          const selected = index === 5;
          return (
            <g key={index}>
              <rect x={x} y={y} width={size} height={size} fill={selected ? ink : cell} stroke={line} />
              {digit && (
                <text x={x + size / 2} y={y + 15} textAnchor="middle" fontSize="12" fontWeight="700" fill={selected ? cell : ink}>
                  {digit}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
