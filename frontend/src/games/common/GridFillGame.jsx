import { useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "./useAutoScore";
import ClearBoardButton, { DiscardNotice, NewPuzzleButton, useDiscardGate } from "./ClearBoardButton";
import { boardClosed, cellsDiffer, notesPresent } from "./workState";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useApplyCellHint, writeFill } from "./cellHint";
import { useGameText } from "./gameText";
import NotesOverlay from "./NotesOverlay";
import NotesToggle from "./NotesToggle";
import { clearCellNotes, emptyNotes, resizeNotes, toggleNote } from "./pencilNotes";
import { usePlayCopy } from "./playCopy";

function cloneBoard(grid) {
  return grid.map((row) => [...row]);
}

function cellSizeClass(gridWidth) {
  if (gridWidth >= 8) return "w-8 h-8 text-sm";
  if (gridWidth >= 6) return "w-10 h-10";
  return "w-12 h-12 text-lg";
}

/**
 * Satır/sütun tabanlı, hücre doldurmalı oyunlar için paylaşılan iskelet.
 * Not modu küçük aday rakam yazar; çözüme yalnızca büyük rakam gider.
 */
export default function GridFillGame({
  slug,
  puzzle,
  attemptId,
  maxDigit = 9,
  cellClassName,
  renderOverlay,
  instructions,
  onRegenerate,
  difficulty,
  onDifficultyChange,
}) {
  const copy = useGameText(slug, { n: puzzle.length });
  const play = usePlayCopy();
  const blurb = instructions || copy.rules;
  const givenMask = puzzle.map((row) => row.map((v) => v !== 0));
  const cellSize = cellSizeClass(puzzle[0].length);
  const [board, setBoard] = useState(() => cloneBoard(puzzle));
  const [notes, setNotes] = useState(() => emptyNotes(puzzle.length, puzzle[0].length));
  const [notesMode, setNotesMode] = useState(false);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, code: saveCode, busy: saveBusy, save, retry: retryScore, release: releaseScore } = useAutoScore(attemptId);

  const [renderedPuzzle, setRenderedPuzzle] = useState(puzzle);
  let displayBoard = board;
  let displayNotes = notes;
  if (puzzle !== renderedPuzzle) {
    displayBoard = cloneBoard(puzzle);
    displayNotes = emptyNotes(puzzle.length, puzzle[0].length);
    setRenderedPuzzle(puzzle);
    setBoard(displayBoard);
    setNotes(displayNotes);
    setNotesMode(false);
    setStatus("playing");
  } else {
    displayNotes = resizeNotes(notes, puzzle.length, puzzle[0].length);
  }

  useEffect(() => {
    setSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [puzzle]);

  useApplyCellHint(puzzle, (hint) => {
    writeFill(setBoard, hint);
    if (hint?.kind === "fill") {
      setNotes((prev) => clearCellNotes(prev, hint.row, hint.col));
    }
  });

  function clearBoard() {
    setBoard(cloneBoard(puzzle));
    setNotes(emptyNotes(puzzle.length, puzzle[0].length));
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
    const next = cloneBoard(displayBoard);
    next[row][col] = digit ? Number(digit) : 0;
    setBoard(next);
    setNotes((prev) => clearCellNotes(prev, row, col));
    setStatus("playing");
  }

  async function checkSolution() {
    if (!attemptId || status === "correct" || status === "submitted") return;
    try {
      const correct = await checkPuzzle(attemptId, displayBoard);
      setStatus(correct ? "correct" : "incorrect");
      if (correct) {
        clearInterval(timerRef.current);
        save(displayBoard);
      }
    } catch (error) {
      setStatus(scoreStatus(error));
    }
  }

  const hasWork = cellsDiffer(displayBoard, puzzle) || notesPresent(displayNotes);
  const gate = useDiscardGate({
    boardKey: attemptId,
    hasWork,
    solved: status === "correct",
    savePhase,
  });

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      {onDifficultyChange && (
        <DifficultyPicker
          gameSlug={slug}
          value={difficulty}
          disabled={gate.blocked}
          onChange={(level) => {
            if (level === difficulty) return;
            gate.ask("difficulty", () => onDifficultyChange(level));
          }}
        />
      )}
      {blurb && <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{blurb}</p>}
      <p className="text-slate-500 text-xs mb-2 max-w-md text-center">{play.notesHint}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div
        className="inline-grid border-2 border-slate-700 max-w-full overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${puzzle[0].length}, minmax(0, 1fr))` }}
      >
        {displayBoard.map((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className="board-cell relative"
              style={{ backgroundColor: "var(--cell, #fff)" }}
            >
              <input
                value={val || ""}
                onChange={(e) => handleCellChange(r, c, e.target.value)}
                readOnly={givenMask[r][c] || boardClosed(status, savePhase)}
                className={[
                  cellSize,
                  "relative z-10 bg-transparent text-center border border-slate-300 focus:outline-none focus:bg-brand-100 text-[var(--ink,#1e1a16)]",
                  givenMask[r][c] ? "font-bold" : "",
                  cellClassName ? cellClassName(r, c) : "",
                ].join(" ")}
              />
              {!val && !givenMask[r][c] && (
                <NotesOverlay digits={displayNotes[r]?.[c] || []} maxDigit={maxDigit} />
              )}
              {renderOverlay && (
                <div className="pointer-events-none absolute inset-0 z-20">{renderOverlay(r, c)}</div>
              )}
            </div>
          ))
        )}
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
            {onRegenerate && (
              <NewPuzzleButton disabled={gate.blocked} onClick={() => gate.ask("new", onRegenerate)} />
            )}
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
