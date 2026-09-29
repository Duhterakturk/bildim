import { Link } from "react-router-dom";
import { btnPrimary } from "../components/common/buttons";
import { useTranslation } from "react-i18next";

const MARKS = [
  { top: "12%", left: "8%", delay: "0s", duration: "13s", rot: "-8deg", scale: 1, color: "#d9c7a3", node: "digit" },
  { top: "18%", left: "72%", delay: "1.2s", duration: "15s", rot: "10deg", scale: 0.85, color: "#9bb7c9", node: "star" },
  { top: "70%", left: "10%", delay: "0.6s", duration: "12s", rot: "6deg", scale: 1.05, color: "#c9a39a", node: "ship" },
  { top: "74%", left: "78%", delay: "1.8s", duration: "14s", rot: "-12deg", scale: 0.9, color: "#a8c0b2", node: "grid" },
  { top: "42%", left: "4%", delay: "2.1s", duration: "16s", rot: "4deg", scale: 0.75, color: "#e4ddd0", node: "ring" },
  { top: "46%", left: "88%", delay: "0.4s", duration: "11s", rot: "-6deg", scale: 0.8, color: "#d9c7a3", node: "plus" },
  { top: "88%", left: "38%", delay: "1.5s", duration: "13s", rot: "8deg", scale: 0.7, color: "#9bb7c9", node: "path" },
  { top: "8%", left: "42%", delay: "2.4s", duration: "15s", rot: "-4deg", scale: 0.85, color: "#c9a39a", node: "brick" },
  { top: "8%", left: "22%", delay: "0.8s", duration: "14s", rot: "12deg", scale: 0.7, color: "#9bb7c9", node: "star" },
  { top: "14%", left: "90%", delay: "1.6s", duration: "12s", rot: "-10deg", scale: 0.65, color: "#e4ddd0", node: "digit" },
  { top: "30%", left: "18%", delay: "2.2s", duration: "16s", rot: "7deg", scale: 0.6, color: "#a8c0b2", node: "ring" },
  { top: "28%", left: "84%", delay: "0.3s", duration: "13s", rot: "-8deg", scale: 0.75, color: "#c9a39a", node: "brick" },
  { top: "58%", left: "3%", delay: "1.1s", duration: "15s", rot: "5deg", scale: 0.7, color: "#d9c7a3", node: "grid" },
  { top: "60%", left: "92%", delay: "2.6s", duration: "11s", rot: "-14deg", scale: 0.65, color: "#9bb7c9", node: "ship" },
  { top: "86%", left: "16%", delay: "0.9s", duration: "14s", rot: "9deg", scale: 0.8, color: "#e4ddd0", node: "plus" },
  { top: "90%", left: "64%", delay: "1.9s", duration: "16s", rot: "-5deg", scale: 0.75, color: "#c9a39a", node: "star" },
  { top: "34%", left: "76%", delay: "2.8s", duration: "12s", rot: "11deg", scale: 0.55, color: "#a8c0b2", node: "path" },
  { top: "78%", left: "48%", delay: "0.2s", duration: "15s", rot: "-7deg", scale: 0.6, color: "#d9c7a3", node: "ring" },
];

function Mark({ kind }) {
  if (kind === "digit") {
    return (
      <svg viewBox="0 0 48 48" className="w-9 h-9">
        <rect x="4" y="4" width="40" height="40" rx="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <text x="24" y="31" textAnchor="middle" fontSize="18" fontFamily="Newsreader, Georgia, serif" fill="currentColor">7</text>
      </svg>
    );
  }
  if (kind === "star") {
    return (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <path d="M24 6l4.8 11.2L41 19.2l-9 8.2L34.2 40 24 33.8 13.8 40 16 27.4 7 19.2l12.2-2z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "ship") {
    return (
      <svg viewBox="0 0 48 48" className="w-10 h-8">
        <path d="M8 30h32l-4 8H12z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M24 28V10M24 14h10l-10 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "grid") {
    return (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <rect x="8" y="8" width="14" height="14" rx="2" fill="currentColor" />
        <rect x="26" y="8" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="8" y="26" width="14" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="26" y="26" width="14" height="14" rx="2" fill="currentColor" opacity="0.45" />
      </svg>
    );
  }
  if (kind === "ring") {
    return (
      <svg viewBox="0 0 48 48" className="w-7 h-7">
        <circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    );
  }
  if (kind === "plus") {
    return (
      <svg viewBox="0 0 48 48" className="w-7 h-7">
        <path d="M24 10v28M10 24h28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "path") {
    return (
      <svg viewBox="0 0 64 24" className="w-12 h-5">
        <circle cx="8" cy="12" r="4" fill="currentColor" />
        <circle cx="32" cy="12" r="4" fill="currentColor" opacity="0.7" />
        <circle cx="56" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 32" className="w-9 h-6">
      <rect x="4" y="6" width="18" height="10" rx="1" fill="currentColor" />
      <rect x="24" y="6" width="18" height="10" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="14" y="18" width="18" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="home-desk">
      <div className="home-marks pointer-events-none absolute inset-0" aria-hidden="true">
        {MARKS.map((mark, index) => (
          <span
            key={index}
            className="home-mark"
            style={{
              top: mark.top,
              left: mark.left,
              color: mark.color,
              "--delay": mark.delay,
              "--dur": mark.duration,
              "--rot": mark.rot,
            }}
          >
            <span style={{ zoom: mark.scale }}>
              <Mark kind={mark.node} />
            </span>
          </span>
        ))}
      </div>
      <div className="relative z-10 min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4">
          <h1 className="home-line font-hand font-semibold text-center text-balance">
            {t("home.title")}
          </h1>
          <Link to="/games" className={btnPrimary}>{t("account.play")}</Link>
        </div>
      </div>
    </div>
  );
}
