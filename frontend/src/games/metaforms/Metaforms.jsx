import { useEffect, useMemo, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton, { DiscardNotice, NewPuzzleButton, useDiscardGate } from "../common/ClearBoardButton";
import { anyFilled, boardClosed } from "../common/workState";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { useApplyCellHint } from "../common/cellHint";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";
import { COLORS, SHAPES, clueStatus, isValid, pieceCode, solve } from "./puzzles";

const INK = {
  red: "#e11d48",
  yellow: "#eab308",
  blue: "#2461f7",
};

function samePiece(a, b) {
  return Boolean(a && b && a.shape === b.shape && a.color === b.color);
}

function Glyph({ shape, color, size = 28 }) {
  const fill = color ? INK[color] : "none";
  const stroke = color ? INK[color] : "#1e1a16";
  if (!shape) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="12" fill={fill} />
      </svg>
    );
  }
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

function SubjectMark({ subject, size = 26 }) {
  if (!subject) return null;
  if (subject.endsWith("?")) return <Pencil color={subject[0]} size={size} />;
  if (subject.startsWith("?")) return <Glyph shape={SHAPE_OF[subject[1]]} size={size} />;
  return <Glyph shape={SHAPE_OF[subject[1]]} color={COLOR_OF[subject[0]]} size={size} />;
}

function Pencil({ color, size }) {
  const ink = color === "R" ? INK.red : color === "B" ? INK.blue : INK.yellow;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <polygon points="16,3 20,10 12,10" fill={ink} />
      <rect x="12" y="10" width="8" height="14" fill={ink} />
      <rect x="12" y="24" width="8" height="4" fill="#1e1a16" />
    </svg>
  );
}

const COLOR_OF = { R: "red", B: "blue", Y: "yellow" };
const SHAPE_OF = { S: "square", T: "triangle", C: "circle" };

function PatternCell({ token }) {
  if (token === "-") return <div className="h-4 w-4" />;
  if (token === "#") return <div className="h-4 w-4 clue-hatch" />;
  if (token === ".") return <div className="h-4 w-4 border border-slate-300 bg-white" />;
  if (token === "X") {
    return <div className="flex h-4 w-4 items-center justify-center border border-slate-300 bg-white text-[11px] font-bold leading-none text-rose-600">✕</div>;
  }
  return (
    <div className="flex h-4 w-4 items-center justify-center border border-slate-300 bg-white">
      <SubjectMark subject={token} size={12} />
    </div>
  );
}

function ClueCard({ clue, status }) {
  const mark = status === "ok" ? "bg-emerald-500" : status === "bad" ? "bg-rose-500" : "bg-slate-300";
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${mark}`} />
      <SubjectMark subject={clue.subject} />
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${Math.max(...clue.pattern.map((row) => row.length))}, 1rem)` }}>
        {clue.pattern.flatMap((row, rowIndex) => row.map((token, colIndex) => (
          <PatternCell key={`${rowIndex}-${colIndex}`} token={token} />
        )))}
      </div>
    </div>
  );
}

function PieceTray({ pieces, placed, selected, setSelected, label }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label ? <p className="text-xs font-semibold text-slate-500">{label}</p> : <p className="text-xs font-semibold text-transparent">.</p>}
      {pieces.map((piece) => {
        const used = placed.has(`${piece.shape}:${piece.color}`);
        const active = samePiece(selected, piece);
        return (
          <button
            key={`${piece.shape}-${piece.color}`}
            type="button"
            draggable={!used}
            disabled={used}
            onDragStart={() => { dragPiece.current = piece; setSelected(piece); }}
            onClick={() => setSelected(active ? null : piece)}
            className={[
              "flex h-11 w-11 items-center justify-center rounded-lg border bg-white",
              used ? "opacity-30" : "",
              active ? "border-[#2461f7] ring-2 ring-[#2461f7]" : "border-slate-300",
            ].join(" ")}
          >
            <Glyph shape={piece.shape} color={piece.color} size={26} />
          </button>
        );
      })}
    </div>
  );
}

function emptyBoard() {
  return [0, 1, 2].map(() => [null, null, null]);
}

export default function Metaforms() {
  const copy = useGameText("metaforms");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("metaforms", difficulty);
  const clues = issue?.puzzle?.clues || [];
  const attemptId = issue?.id;
  const [board, setBoard] = useState(emptyBoard);
  const [selected, setSelected] = useState(null);
  const dragPiece = useRef(null);
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
    if (hint.kind !== "form" || !hint.shape || !hint.color) return;
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
    setSelected(null);
    setHintCell(`${hint.row}-${hint.col}`);
    setStatus("playing");
  });

  function newGame(nextDifficulty) {
    if (nextDifficulty && nextDifficulty !== difficulty) setDifficulty(nextDifficulty);
    else reload();
  }

  function clearBoard() {
    setBoard(emptyBoard());
    setSelected(null);
    setHintCell(null);
    setStatus("playing");
  }

  function place(row, col) {
    if (boardClosed(status, savePhase)) return;
    const next = board.map((line) => line.slice());
    const current = next[row][col];
    const piece = selected || dragPiece.current;
    if (!piece) {
      if (!current) return;
      next[row][col] = null;
      setSelected(current);
      setBoard(next);
      setStatus("playing");
      return;
    }
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (samePiece(next[r][c], piece)) next[r][c] = null;
      }
    }
    const displaced = current && !samePiece(current, piece) ? current : null;
    next[row][col] = piece;
    dragPiece.current = null;
    setSelected(displaced);
    setBoard(next);
    setStatus("playing");
  }

  async function checkSolution() {
    if (!attemptId || status === "correct" || status === "submitted") return;
    try {
      const correct = await checkPuzzle(attemptId, { grid: board });
      setStatus(correct ? "correct" : "incorrect");
      if (correct) {
        clearInterval(timerRef.current);
        save({ grid: board });
      }
    } catch (error) {
      setStatus(scoreStatus(error));
    }
  }

  const solutions = useMemo(() => (clues.length ? solve(clues) : []), [clues]);

  const hasWork = anyFilled(board);
  const gate = useDiscardGate({ boardKey: attemptId, hasWork, solved: status === "correct", savePhase });

  if (phase !== "ready") return <PuzzlePending phase={phase} onRetry={reload} />;
  if (clues.length === 0) return <PuzzlePending phase="error" onRetry={reload} />;

  const placed = new Set(board.flat().filter(Boolean).map((piece) => `${piece.shape}:${piece.color}`));
  const tray = SHAPES.flatMap((shape) => COLORS.map((color) => ({ shape, color })));
  const codes = board.map((row) => row.map((piece) => pieceCode(piece)));
  const marks = clues.map((clue) => clueStatus(codes, clue));
  const solved = board.flat().filter(Boolean).length === 9 && isValid(codes, clues);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="metaforms" value={difficulty} disabled={gate.blocked} onChange={(level) => gate.ask("difficulty", () => newGame(level))} />
      <p className="play-rules text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div className="mb-4 flex w-full max-w-3xl flex-wrap justify-center gap-2">
        {clues.map((clue, index) => (
          <ClueCard key={`${clue.subject}-${index}`} clue={clue} status={marks[index]} />
        ))}
      </div>

      <div className="mb-4 flex items-start justify-center gap-3">
        <PieceTray pieces={tray.slice(0, Math.ceil(tray.length / 2))} placed={placed} selected={selected} setSelected={setSelected} label={play.pieces} />
        <div className="inline-grid grid-cols-3 gap-1 rounded-lg bg-slate-300 p-1">
          {board.map((row, rowIndex) => row.map((piece, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            return (
              <button
                key={key}
                type="button"
                draggable={Boolean(piece)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", key);
                  dragPiece.current = piece;
                  setSelected(piece);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  place(rowIndex, colIndex);
                }}
                onClick={() => place(rowIndex, colIndex)}
                className={`flex h-14 w-14 items-center justify-center border border-slate-300 bg-white sm:h-16 sm:w-16 ${hintCell === key ? "ring-4 ring-[#2461f7] ring-inset" : ""}`}
              >
                {piece ? <Glyph shape={piece.shape} color={piece.color} size={36} /> : null}
              </button>
            );
          }))}
        </div>
        <PieceTray pieces={tray.slice(Math.ceil(tray.length / 2))} placed={placed} selected={selected} setSelected={setSelected} />
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-4">
        <button
          type="button"
          onClick={checkSolution}
          disabled={status === "correct" || status === "submitted"}
          className="inline-flex min-h-[44px] items-center justify-center bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600 disabled:opacity-50"
        >
          {play.check}
        </button>
        {gate.pending ? (
          <DiscardNotice pending={gate.pending} onConfirm={gate.confirm} onCancel={gate.cancel} />
        ) : (
          <>
            <ClearBoardButton disabled={gate.blocked} onClick={() => gate.ask("clear", clearBoard)} />
            <NewPuzzleButton disabled={gate.blocked} onClick={() => gate.ask("new", () => newGame())} />
          </>
        )}
      </div>

      {solutions.length !== 1 && <p className="text-rose-600 mt-3">Geliştirici uyarısı: bu bulmacanın {solutions.length} çözümü var.</p>}
      {solved && savePhase !== "rejected" && savePhase !== "missing" && <p className="play-correct text-emerald-600 mt-3 text-lg font-semibold">Tebrikler</p>}
      {status === "correct" && savePhase !== "rejected" && savePhase !== "missing" && <p className="play-correct text-emerald-600 mt-3">{play.correct}</p>}
      {status === "incorrect" && <p className="text-red-500 mt-3">{play.incorrect}</p>}
      {status === "rejected" && <p className="text-red-500 mt-3">{play.rejected}</p>}
      {status === "already" && <p className="text-red-500 mt-3">{play.already}</p>}
      {status === "offline" && <p className="text-[#f4efe6] mt-3">{play.offline}</p>}
      <ScoreNotice phase={savePhase} code={saveCode} busy={saveBusy} onRetry={retryScore} onRelease={releaseScore} />
    </div>
  );
}
