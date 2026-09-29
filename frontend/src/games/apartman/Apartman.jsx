import { Fragment, useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton, { DiscardNotice, NewPuzzleButton, useDiscardGate } from "../common/ClearBoardButton";
import { boardClosed, cellsDiffer, notesPresent } from "../common/workState";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { useApplyCellHint, writeFill } from "../common/cellHint";
import NotesOverlay from "../common/NotesOverlay";
import NotesToggle from "../common/NotesToggle";
import { clearCellNotes, emptyNotes, toggleNote } from "../common/pencilNotes";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

function cloneBoard(grid) {
  return grid.map((row) => [...row]);
}

export default function Apartman() {
  const copy = useGameText("apartman");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("apartman", difficulty);
  const puzzle = issue?.puzzle?.givens || null;
  const clues = issue?.puzzle?.clues;
  const attemptId = issue?.id;
  const givenMask = puzzle ? puzzle.map((row) => row.map((v) => v !== 0)) : [];
  const size = puzzle ? puzzle.length : 4;
  const maxDigit = size;

  const [board, setBoard] = useState(null);
  const [notes, setNotes] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, code: saveCode, busy: saveBusy, save, retry: retryScore, release: releaseScore } = useAutoScore(attemptId);

  useEffect(() => {
    if (!puzzle) return;
    setBoard(cloneBoard(puzzle));
    setNotes(emptyNotes(puzzle.length, puzzle.length));
    setNotesMode(false);
    setStatus("playing");
    setSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId]);

  useApplyCellHint(attemptId, (hint) => {
    if (givenMask[hint.row]?.[hint.col]) return;
    writeFill(setBoard, hint);
    if (hint?.kind === "fill") setNotes((prev) => (prev ? clearCellNotes(prev, hint.row, hint.col) : prev));
  });

  function handleDifficultyChange(newDifficulty) {
    if (newDifficulty !== difficulty) setDifficulty(newDifficulty);
    else reload();
  }

  function clearBoard() {
    if (!puzzle) return;
    setBoard(cloneBoard(puzzle));
    setNotes(emptyNotes(puzzle.length, puzzle.length));
    setStatus("playing");
  }

  function handleCellChange(row, col, value) {
    if (givenMask[row][col] || boardClosed(status, savePhase)) return;
    const re = new RegExp(`[^1-${maxDigit}]`, "g");
    const digit = value.replace(re, "").slice(-1);
    if (notesMode) {
      if (!digit) return;
      setBoard((prev) => {
        const next = cloneBoard(prev);
        next[row][col] = 0;
        return next;
      });
      setNotes((prev) => toggleNote(prev, row, col, Number(digit)));
      setStatus("playing");
      return;
    }
    const next = cloneBoard(board);
    next[row][col] = digit ? Number(digit) : 0;
    setBoard(next);
    setNotes((prev) => clearCellNotes(prev, row, col));
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

  const clueCell = "board-clue w-12 h-12 flex items-center justify-center text-sm font-bold text-[#f4efe6]";

  const hasWork = cellsDiffer(board, puzzle) || notesPresent(notes);
  const gate = useDiscardGate({ boardKey: attemptId, hasWork, solved: status === "correct", savePhase });

  if (phase !== "ready" || !board || !notes || !clues) return <PuzzlePending phase={phase} onRetry={reload} />;

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="apartman" value={difficulty} disabled={gate.blocked} onChange={(level) => gate.ask("difficulty", () => handleDifficultyChange(level))} />
      <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-xs mb-2 max-w-md text-center">{play.notesHint}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div
        className="inline-grid max-w-full overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${size + 2}, minmax(0, 1fr))` }}
      >
        <div className={clueCell} />
        {clues.top.map((v, i) => (
          <div key={`t-${i}`} className={clueCell}>{v}</div>
        ))}
        <div className={clueCell} />

        {board.map((row, r) => (
          <Fragment key={r}>
            <div key={`l-${r}`} className={clueCell}>{clues.left[r]}</div>
            {row.map((val, c) => (
              <div key={`${r}-${c}`} className="relative">
                <input
                  value={val || ""}
                  onChange={(e) => handleCellChange(r, c, e.target.value)}
                  readOnly={givenMask[r][c] || boardClosed(status, savePhase)}
                  className={[
                    "board-cell w-12 h-12 relative z-10 text-center text-lg border border-slate-300 focus:outline-none focus:bg-brand-100",
                    givenMask[r][c] ? "font-bold" : "",
                  ].join(" ")}
                  style={{ backgroundColor: "var(--cell, #fff)", color: "var(--ink, #1e1a16)" }}
                />
                {!val && !givenMask[r][c] && <NotesOverlay digits={notes[r][c]} maxDigit={maxDigit} />}
              </div>
            ))}
            <div key={`r-${r}`} className={clueCell}>{clues.right[r]}</div>
          </Fragment>
        ))}

        <div className={clueCell} />
        {clues.bottom.map((v, i) => (
          <div key={`b-${i}`} className={clueCell}>{v}</div>
        ))}
        <div className={clueCell} />
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={checkSolution}
          disabled={status === "correct" || status === "submitted"}
          className="inline-flex min-h-[44px] items-center justify-center bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600 disabled:opacity-50"
        >
          {play.check}
        </button>
        <NotesToggle
          on={notesMode}
          onClick={() => setNotesMode((value) => !value)}
          label={notesMode ? play.notesOn : play.notes}
          hint={play.notesHint}
        />
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
