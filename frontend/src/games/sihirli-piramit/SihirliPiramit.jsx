import { useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton, { DiscardNotice, NewPuzzleButton, useDiscardGate } from "../common/ClearBoardButton";
import { boardClosed, pyramidMarked } from "../common/workState";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { useApplyCellHint } from "../common/cellHint";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

function emptyMarks(rows) {
  return rows.map((_, row) => (row === 0 ? 0 : null));
}

export default function SihirliPiramit() {
  const copy = useGameText("sihirli-piramit");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("sihirli-piramit", difficulty);
  const rows = issue?.puzzle?.rows || null;
  const attemptId = issue?.id;

  const [marks, setMarks] = useState(null);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, code: saveCode, busy: saveBusy, save, retry: retryScore, release: releaseScore } = useAutoScore(attemptId);

  const [renderedRows, setRenderedRows] = useState(null);
  let displayMarks = marks;
  if (rows && rows !== renderedRows) {
    displayMarks = emptyMarks(rows);
    setRenderedRows(rows);
    setMarks(displayMarks);
    setStatus("playing");
  }

  useEffect(() => {
    setSeconds(0);
    clearInterval(timerRef.current);
    if (!attemptId) return undefined;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId]);

  useApplyCellHint(attemptId, (hint) => {
    if (hint?.kind !== "mark" || hint.note !== "path") return;
    setMarks((prev) => {
      if (!prev || hint.row == null) return prev;
      const next = [...prev];
      next[hint.row] = hint.col;
      return next;
    });
    setStatus("playing");
  });

  function handleDifficultyChange(newDifficulty) {
    if (newDifficulty !== difficulty) setDifficulty(newDifficulty);
    else reload();
  }

  function clearBoard() {
    if (!rows) return;
    setMarks(emptyMarks(rows));
    setStatus("playing");
  }

  function choose(row, col) {
    if (!displayMarks || boardClosed(status, savePhase) || row === 0) return;
    const next = [...displayMarks];
    next[row] = next[row] === col ? null : col;
    setMarks(next);
    setStatus("playing");
  }

  async function checkSolution() {
    if (!attemptId || !displayMarks || status === "correct" || status === "submitted") return;
    if (displayMarks.some((col) => col == null)) {
      setStatus("incorrect");
      return;
    }
    try {
      const correct = await checkPuzzle(attemptId, { path: displayMarks });
      setStatus(correct ? "correct" : "incorrect");
      if (correct) {
        clearInterval(timerRef.current);
        save({ path: displayMarks });
      }
    } catch (error) {
      setStatus(scoreStatus(error));
    }
  }

  const hasWork = pyramidMarked(displayMarks);
  const gate = useDiscardGate({ boardKey: attemptId, hasWork, solved: status === "correct", savePhase });

  if (phase !== "ready" || !rows || !displayMarks) return <PuzzlePending phase={phase} onRetry={reload} />;

  const size = rows.length >= 6 ? "w-9 h-9 text-sm" : "w-11 h-11";

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="sihirli-piramit" value={difficulty} disabled={gate.blocked} onChange={(level) => gate.ask("difficulty", () => handleDifficultyChange(level))} />
      <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div className="flex flex-col items-center gap-1.5 max-w-full overflow-x-auto py-1">
        {rows.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((value, c) => {
              const selected = displayMarks[r] === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => choose(r, c)}
                  aria-pressed={selected}
                  className={[
                    size,
                    "rounded-full font-semibold text-[#1e1a16]",
                    selected ? "bg-white border-[3px] border-[#2461f7]" : "bg-white border border-slate-300",
                  ].join(" ")}
                >
                  {value}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button
          type="button"
          data-normal-check onClick={checkSolution}
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
            <NewPuzzleButton disabled={gate.blocked} onClick={() => gate.ask("new", reload)} />
          </>
        )}
      </div>

      {status === "correct" && savePhase !== "rejected" && savePhase !== "missing" && <p className="play-correct text-emerald-600 mt-3">{play.correct}</p>}
      {status === "incorrect" && <p className="text-red-500 mt-3">{play.incorrectCells}</p>}
      {status === "rejected" && <p className="text-red-500 mt-3">{play.rejected}</p>}
      {status === "already" && <p className="text-red-500 mt-3">{play.already}</p>}
      {status === "offline" && <p className="text-[#f4efe6] mt-3">{play.offline}</p>}
      <ScoreNotice phase={savePhase} code={saveCode} busy={saveBusy} onRetry={retryScore} onRelease={releaseScore} />
    </div>
  );
}
