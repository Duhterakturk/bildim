import { useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton, { DiscardNotice, NewPuzzleButton, useDiscardGate } from "../common/ClearBoardButton";
import { anyFilled, boardClosed } from "../common/workState";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useApplyCellHint, writeFill } from "../common/cellHint";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function clone(grid) {
  return grid.map((row) => row.slice());
}

const LETTERS = "ABCDEFGHI";

function starLetters(clue) {
  if (clue.kind === "equation" && /^[A-I]$/.test(clue.left)) return [clue.left];
  if (clue.kind === "equation") return `${clue.left}${clue.right}`.match(/[A-I]/g) || [];
  return clue.cells || [];
}

function clueText(clue) {
  if (clue.kind === "relation") return clue.op === "*" ? "★×★=★" : "★+★=★";
  if (clue.kind === "total") return `${clue.cells.map(() => "★").join("+")}=${clue.target}`;
  const right = String(clue.right).replaceAll("*", "×");
  if (/^[A-I]$/.test(clue.left)) return right.replace(/([+\-×/])/g, " $1 ");
  return `${clue.left} = ${right}`;
}

function StarCard({ clue }) {
  const marked = new Set(starLetters(clue));
  return (
    <div className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center">
      <div className="inline-grid grid-cols-3 gap-0.5">
        {LETTERS.split("").map((letter, index) => (
          <div key={letter} className="flex h-3 w-3 items-center justify-center border border-slate-300 bg-white text-[8px] leading-none text-slate-900">
            {marked.has(letter) ? "★" : ""}
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs font-bold text-slate-900">{clueText(clue)}</p>
    </div>
  );
}

export default function Numbers() {
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("numbers", difficulty);
  const puzzle = issue?.puzzle;
  const clues = puzzle?.clues;
  const copy = useGameText("numbers");
  const play = usePlayCopy();
  const attemptId = issue?.id;
  const [board, setBoard] = useState(null);
  const [digit, setDigit] = useState(1);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, code: saveCode, busy: saveBusy, save, retry: retryScore, release: releaseScore } = useAutoScore(attemptId);

  useEffect(() => {
    if (!clues) return undefined;
    setBoard([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
    setDigit(1);
    setStatus("playing");
    setSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId, clues]);

  useApplyCellHint(attemptId, (hint) => {
    writeFill(setBoard, hint);
    setStatus("playing");
  });

  function newGame(next) {
    if (next && next !== difficulty) setDifficulty(next);
    else reload();
  }

  function write(row, col) {
    if (!board || boardClosed(status, savePhase)) return;
    const next = clone(board);
    next[row][col] = digit || 0;
    setBoard(next);
    setStatus("playing");
  }

  async function checkSolution() {
    if (!attemptId || !board || status === "correct" || status === "submitted") return;
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

  if (phase !== "ready" || !board || !clues) return <PuzzlePending phase={phase} onRetry={reload} />;

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="numbers" value={difficulty} disabled={gate.blocked} onChange={(level) => gate.ask("difficulty", () => newGame(level))} />
      <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div className="flex flex-wrap justify-center gap-2 max-w-xl mb-4">
        {clues.map((clue, index) => (
          <StarCard key={`${clue.kind}-${index}`} clue={clue} />
        ))}
      </div>

      <div className="inline-grid grid-cols-3 gap-1 mb-4">
        {board.map((row, rowIndex) => row.map((value, colIndex) => (
          <button
            key={`${rowIndex}-${colIndex}`}
            type="button"
            onClick={() => write(rowIndex, colIndex)}
            className="w-12 h-12 border border-slate-400 bg-white text-xl font-bold text-slate-900"
          >
            {value || ""}
          </button>
        )))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {DIGITS.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => setDigit(number)}
            className={`w-9 h-9 rounded-lg border font-bold ${digit === number ? "bg-brand-500 text-white border-brand-500" : "bg-white text-slate-800 border-slate-300"}`}
          >
            {number}
          </button>
        ))}
        <button type="button" onClick={() => setDigit(0)} className="w-9 h-9 rounded-lg border border-slate-300 bg-white font-bold text-slate-700">✕</button>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={checkSolution} disabled={status === "correct" || status === "submitted"} className="inline-flex min-h-[44px] items-center justify-center bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50">{play.check}</button>
        {gate.pending ? (
          <DiscardNotice pending={gate.pending} onConfirm={gate.confirm} onCancel={gate.cancel} />
        ) : (
          <>
            <ClearBoardButton disabled={gate.blocked} onClick={() => gate.ask("clear", () => { setBoard([[0, 0, 0], [0, 0, 0], [0, 0, 0]]); setStatus("playing"); })} />
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
