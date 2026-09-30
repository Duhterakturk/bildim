import { useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton, { DiscardNotice, NewPuzzleButton, useDiscardGate } from "../common/ClearBoardButton";
import { anyFilled, boardClosed } from "../common/workState";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useApplyCellHint } from "../common/cellHint";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

const INK = {
  orange: "#f97316", purple: "#6d28d9", pink: "#db2777", gray: "#9ca3af",
  red: "#e11d48",
  yellow: "#eab308",
  blue: "#2461f7",
  green: "#16a34a",
  black: "#1e1a16",
};

function samePiece(a, b) {
  return Boolean(a && b && a.shape === b.shape && a.color === b.color);
}

function Glyph({ shape, color, size = 28 }) {
  const fill = color ? INK[color] : "none";
  const stroke = color ? INK[color] : "#1e1a16";
  if (shape === "square") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect x="5" y="5" width="22" height="22" rx="2" fill={fill} stroke={stroke} strokeWidth="2.5" />
      </svg>
    );
  }
  if (shape === "triangle") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <polygon points="16,4 29,28 3,28" fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill={fill} stroke={stroke} strokeWidth="2.5" />
    </svg>
  );
}

function ItemMark({ item }) {
  if (item.endsWith("?")) {
    const ink = INK[{ G: "green", B: "blue", Y: "yellow", R: "red", K: "black", O: "orange", P: "purple", M: "pink", A: "gray" }[item[0]]];
    return (
      <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
        <line x1="6" y1="26" x2="26" y2="6" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (item.startsWith("?")) {
    return (
      <span className="relative inline-flex">
        <Glyph shape={item[1] === "S" ? "square" : "circle"} size={18} />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-700">?</span>
      </span>
    );
  }
  const color = { G: "green", B: "blue", Y: "yellow", R: "red", K: "black", O: "orange", P: "purple", M: "pink", A: "gray" }[item[0]];
  return <Glyph shape={item[1] === "S" ? "square" : "circle"} color={color} size={18} />;
}

function ClueCard({ clue }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5">
      <div className="flex flex-col">
        {clue.items.map((item, index) => <ItemMark key={`${item}-${index}`} item={item} />)}
      </div>
      <div className="grid grid-cols-3 gap-px bg-slate-300 p-px">
        {clue.marks.flatMap((row, rowIndex) => row.map((mark, colIndex) => (
          <div key={`${rowIndex}-${colIndex}`} className="flex h-4 w-4 items-center justify-center bg-white text-[11px] font-bold leading-none">
            {mark === "V" ? <span className="text-emerald-600">✓</span> : null}
            {mark === "X" ? <span className="text-rose-600">✕</span> : null}
          </div>
        )))}
      </div>
    </div>
  );
}

function emptyBoard() {
  return Array.from({ length: 3 }, () => Array(3).fill(null));
}

export default function Colours() {
  const copy = useGameText("colours");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("colours", difficulty);
  const pieces = issue?.puzzle?.pieces || [];
  const clues = issue?.puzzle?.clues || [];
  const attemptId = issue?.id;
  const [board, setBoard] = useState(emptyBoard);
  const [selected, setSelected] = useState(null);
  const [hintCell, setHintCell] = useState(null);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, code: saveCode, busy: saveBusy, save, retry: retryScore, release: releaseScore } = useAutoScore(attemptId);

  useEffect(() => {
    if (!attemptId) return undefined;
    setBoard(emptyBoard());
    setSelected(null);
    setHintCell(null);
    setStatus("playing");
    setSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId]);

  useApplyCellHint(attemptId, (hint) => {
    if (hint.kind !== "form") return;
    const piece = { shape: hint.shape, color: hint.color };
    setBoard((prev) => {
      const next = prev.map((row) => row.slice());
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          if (samePiece(next[row][col], piece)) next[row][col] = null;
        }
      }
      next[hint.row][hint.col] = piece;
      return next;
    });
    setHintCell(`${hint.row}-${hint.col}`);
    setStatus("playing");
  });

  function newGame(next) {
    if (next && next !== difficulty) setDifficulty(next);
    else reload();
  }

  function place(row, col) {
    if (boardClosed(status, savePhase)) return;
    const next = board.map((line) => line.slice());
    const current = next[row][col];
    if (!selected) {
      if (!current) return;
      next[row][col] = null;
      setSelected(current);
      setBoard(next);
      setStatus("playing");
      return;
    }
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (samePiece(next[r][c], selected)) next[r][c] = null;
      }
    }
    const displaced = current && !samePiece(current, selected) ? current : null;
    next[row][col] = selected;
    setSelected(displaced);
    setBoard(next);
    setStatus("playing");
  }

  async function checkSolution() {
    if (!attemptId || status === "correct" || status === "submitted") return;
    try {
      const correct = await checkPuzzle(attemptId, board);
      setStatus(correct ? "correct" : "incorrect");
      if (correct) {
        clearInterval(timerRef.current);
        save(board);
      }
    } catch (error) {
      setStatus(scoreStatus(error));
    }
  }

  const hasWork = anyFilled(board);
  const gate = useDiscardGate({ boardKey: attemptId, hasWork, solved: status === "correct", savePhase });

  if (phase !== "ready" || pieces.length === 0) return <PuzzlePending phase={phase} onRetry={reload} />;

  const placed = new Set(board.flat().filter(Boolean).map((piece) => `${piece.shape}:${piece.color}`));

  return (
    <div className="flex w-full max-w-xl flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="colours" value={difficulty} disabled={gate.blocked} onChange={(level) => gate.ask("difficulty", () => newGame(level))} />
      <p className="play-rules text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div className="mb-4 flex w-full flex-wrap justify-center gap-2">
        {clues.map((clue, index) => <ClueCard key={index} clue={clue} />)}
      </div>

      <div className="mb-4 flex items-start justify-center gap-3">
        <div className="inline-grid grid-cols-3 gap-1 rounded-lg bg-slate-300 p-1">
          {board.map((row, rowIndex) => row.map((piece, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            return (
              <button
                key={key}
                type="button"
                onClick={() => place(rowIndex, colIndex)}
                className={`flex h-12 w-12 items-center justify-center border border-slate-300 bg-white sm:h-14 sm:w-14 ${hintCell === key ? "ring-4 ring-[#2461f7] ring-inset" : ""}`}
              >
                {piece ? <Glyph shape={piece.shape} color={piece.color} size={32} /> : null}
              </button>
            );
          }))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold text-slate-400">{play.pieces}</p>
          <div className={`grid gap-2 ${pieces.length > 4 ? "grid-cols-2" : "grid-cols-1"}`}>
            {pieces.map((piece) => {
              const used = placed.has(`${piece.shape}:${piece.color}`);
              const active = samePiece(selected, piece);
              return (
                <button
                  key={`${piece.shape}-${piece.color}`}
                  type="button"
                  disabled={used}
                  onClick={() => setSelected(active ? null : piece)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border bg-white sm:h-12 sm:w-12 ${used ? "opacity-30" : ""} ${active ? "border-[#2461f7] ring-2 ring-[#2461f7]" : "border-slate-300"}`}
                >
                  <Glyph shape={piece.shape} color={piece.color} size={26} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" data-normal-check onClick={checkSolution} disabled={status === "correct" || status === "submitted"} className="inline-flex min-h-[44px] items-center justify-center bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50">{play.check}</button>
        {gate.pending ? (
          <DiscardNotice pending={gate.pending} onConfirm={gate.confirm} onCancel={gate.cancel} />
        ) : (
          <>
            <ClearBoardButton disabled={gate.blocked} onClick={() => gate.ask("clear", () => { setBoard(emptyBoard()); setSelected(null); setHintCell(null); setStatus("playing"); })} />
            <NewPuzzleButton disabled={gate.blocked} onClick={() => gate.ask("new", () => newGame())} />
          </>
        )}
      </div>
      {status === "correct" && savePhase !== "rejected" && savePhase !== "missing" && <p className="text-emerald-600 mt-3">{play.correct}</p>}
      {status === "incorrect" && <p className="text-red-500 mt-3">{play.incorrect}</p>}
      {status === "rejected" && <p className="text-red-500 mt-3">{play.rejected}</p>}
      {status === "already" && <p className="text-red-500 mt-3">{play.already}</p>}
      {status === "offline" && <p className="text-[#f4efe6] mt-3">{play.offline}</p>}
      <ScoreNotice phase={savePhase} code={saveCode} busy={saveBusy} onRetry={retryScore} onRelease={releaseScore} />
    </div>
  );
}
