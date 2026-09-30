import { useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton, { DiscardNotice, NewPuzzleButton, useDiscardGate } from "../common/ClearBoardButton";
import { boardClosed, cellsDiffer } from "../common/workState";
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

export default function IslemKaresi() {
  const copy = useGameText("islem-karesi");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("islem-karesi", difficulty);
  const puzzle = issue?.puzzle;
  const attemptId = issue?.id;
  const [board, setBoard] = useState(null);
  const [digit, setDigit] = useState(1);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, code: saveCode, busy: saveBusy, save, retry: retryScore, release: releaseScore } = useAutoScore(attemptId);

  useEffect(() => {
    if (!puzzle?.givens) return undefined;
    setBoard(clone(puzzle.givens));
    setDigit(1);
    setStatus("playing");
    setSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId, puzzle]);

  useApplyCellHint(attemptId, (hint) => {
    writeFill(setBoard, hint);
    setStatus("playing");
  });

  function newGame(next) {
    if (next && next !== difficulty) setDifficulty(next);
    else reload();
  }

  function write(row, col) {
    if (!board || puzzle.givens[row][col] || boardClosed(status, savePhase)) return;
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

  const hasWork = cellsDiffer(board, puzzle?.givens);
  const gate = useDiscardGate({ boardKey: attemptId, hasWork, solved: status === "correct", savePhase });

  if (phase !== "ready" || !board || !puzzle?.across) return <PuzzlePending phase={phase} onRetry={reload} />;

  const size = board.length;

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="islem-karesi" value={difficulty} disabled={gate.blocked} onChange={(level) => gate.ask("difficulty", () => newGame(level))} />
      <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div className="flex flex-col gap-1 mb-4">
        {board.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              {row.map((value, colIndex) => (
                <div key={`cell-${rowIndex}-${colIndex}`} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => write(rowIndex, colIndex)}
                    className={`w-12 h-12 border border-slate-400 bg-white text-xl font-bold text-slate-900 ${puzzle.givens[rowIndex][colIndex] ? "bg-slate-100" : ""}`}
                  >
                    {value || ""}
                  </button>
                  {colIndex < size - 1 && (
                    <span className="w-6 text-center text-lg font-bold text-[#f4efe6]">{puzzle.across[rowIndex][colIndex]}</span>
                  )}
                </div>
              ))}
              <span className="ml-2 text-lg font-bold text-[#f4efe6]">= {puzzle.rowResults[rowIndex]}</span>
            </div>
            {rowIndex < size - 1 && (
              <div className="flex items-center gap-1">
                {puzzle.down[rowIndex].map((op, colIndex) => (
                  <div key={`down-${rowIndex}-${colIndex}`} className="flex items-center gap-1">
                    <span className="w-12 text-center text-lg font-bold text-[#f4efe6]">{op}</span>
                    {colIndex < size - 1 && <span className="w-6" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center gap-1 mt-1">
          {puzzle.colResults.map((result, colIndex) => (
            <div key={`col-${colIndex}`} className="flex items-center gap-1">
              <span className="w-12 text-center text-sm font-bold text-[#f4efe6]">= {result}</span>
              {colIndex < size - 1 && <span className="w-6" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {DIGITS.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => setDigit(number)}
            className={`w-9 h-9 rounded-lg border font-bold ${digit === number ? "bg-brand-500 text-white border-brand-500" : "bg-white text-slate-900 border-slate-300"}`}
          >
            {number}
          </button>
        ))}
        <button type="button" onClick={() => setDigit(0)} className="w-9 h-9 rounded-lg border border-slate-300 bg-white font-bold text-slate-700">
          ✕
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" data-normal-check onClick={checkSolution} disabled={status === "correct" || status === "submitted"} className="inline-flex min-h-[44px] items-center justify-center bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50">{play.check}</button>
        {gate.pending ? (
          <DiscardNotice pending={gate.pending} onConfirm={gate.confirm} onCancel={gate.cancel} />
        ) : (
          <>
            <ClearBoardButton disabled={gate.blocked} onClick={() => gate.ask("clear", () => { setBoard(clone(puzzle.givens)); setStatus("playing"); })} />
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
