import { useEffect, useRef, useState } from "react";
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

function emptyBoard(grid) {
  return grid.map((row) => row.map((cell) => (cell.type === "white" && cell.given ? cell.given : 0)));
}

function cellPixels(size) {
  if (size >= 8) return 40;
  if (size >= 7) return 44;
  return 48;
}

export default function Kakuro() {
  const copy = useGameText("kakuro");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("kakuro", difficulty);
  const puzzle = issue?.puzzle || null;
  const grid = puzzle?.grid;
  const size = puzzle?.size;
  const attemptId = issue?.id;
  const [board, setBoard] = useState(null);
  const [notes, setNotes] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, code: saveCode, busy: saveBusy, save, retry: retryScore, release: releaseScore } = useAutoScore(attemptId);

  const [renderedPuzzle, setRenderedPuzzle] = useState(null);
  let displayBoard = board;
  let displayNotes = notes;
  if (puzzle && puzzle !== renderedPuzzle) {
    displayBoard = emptyBoard(grid);
    displayNotes = emptyNotes(grid.length, grid[0].length);
    setRenderedPuzzle(puzzle);
    setBoard(displayBoard);
    setNotes(displayNotes);
    setNotesMode(false);
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
    writeFill(setBoard, hint);
    if (hint?.kind === "fill") {
      setNotes((prev) => (prev ? clearCellNotes(prev, hint.row, hint.col) : prev));
    }
  });

  function handleDifficultyChange(newDifficulty) {
    if (newDifficulty !== difficulty) setDifficulty(newDifficulty);
    else reload();
  }

  function clearBoard() {
    if (!grid) return;
    setBoard(emptyBoard(grid));
    setNotes(emptyNotes(grid.length, grid[0].length));
    setStatus("playing");
  }

  function handleCellChange(row, col, value) {
    if (boardClosed(status, savePhase) || grid[row][col].given) return;
    const digit = value.replace(/[^1-9]/g, "").slice(-1);
    if (notesMode) {
      if (!digit) return;
      setBoard((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = 0;
        return next;
      });
      setNotes((prev) => toggleNote(prev, row, col, Number(digit)));
      setStatus("playing");
      return;
    }
    const next = displayBoard.map((r) => [...r]);
    next[row][col] = digit ? Number(digit) : 0;
    setBoard(next);
    setNotes((prev) => clearCellNotes(prev, row, col));
    setStatus("playing");
  }

  function answerGrid() {
    return grid.map((row, r) => row.map((cell, c) => (cell.type === "white" ? displayBoard[r][c] || 0 : null)));
  }

  async function checkSolution() {
    if (!attemptId || status === "correct" || status === "submitted") return;
    try {
      const correct = await checkPuzzle(attemptId, answerGrid());
      setStatus(correct ? "correct" : "incorrect");
      if (correct) {
        clearInterval(timerRef.current);
        save(answerGrid());
      }
    } catch (error) {
      setStatus(scoreStatus(error));
    }
  }

  const hasWork = cellsDiffer(displayBoard, grid ? emptyBoard(grid) : null) || notesPresent(displayNotes);
  const gate = useDiscardGate({ boardKey: attemptId, hasWork, solved: status === "correct", savePhase });

  if (phase !== "ready" || !displayBoard || !displayNotes || !grid) return <PuzzlePending phase={phase} onRetry={reload} />;

  const cell = cellPixels(size);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="kakuro" value={difficulty} disabled={gate.blocked} onChange={(level) => gate.ask("difficulty", () => handleDifficultyChange(level))} />
      <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-xs mb-2 max-w-md text-center">{play.notesHint}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div
        className="inline-grid max-w-full border-2 border-[#243024]"
        data-testid="kakuro-board"
        style={{ gridTemplateColumns: `repeat(${size}, ${cell}px)` }}
      >
        {grid.map((row, r) =>
          row.map((item, c) => {
            if (item.type === "clue") {
              return (
                <div key={`${r}-${c}`} className="board-cell relative border" style={{ width: cell, height: cell, background: "var(--cell, #cfe3cf)", borderColor: "var(--line, #6d8a6d)", color: "var(--ink, #1e1a16)" }}>
                  <svg viewBox="0 0 10 10" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                    <line x1="0" y1="0" x2="10" y2="10" stroke="var(--ink, #243024)" strokeWidth="0.15" />
                  </svg>
                  {item.right != null && (
                    <span className="board-clue absolute top-0 right-0 z-10 px-0.5 text-[13px] font-bold leading-none sm:text-[14px]">{item.right}</span>
                  )}
                  {item.down != null && (
                    <span className="board-clue absolute bottom-0 left-0 z-10 px-0.5 text-[13px] font-bold leading-none sm:text-[14px]">{item.down}</span>
                  )}
                </div>
              );
            }
            if (item.type !== "white") {
              return <div key={`${r}-${c}`} style={{ width: cell, height: cell, background: "#4a4a4a" }} />;
            }
            return (
              <div key={`${r}-${c}`} className="board-cell relative" style={{ width: cell, height: cell, background: "var(--cell, #fff)" }}>
                <input
                  aria-label={`${r + 1}-${c + 1}`}
                  value={displayBoard[r][c] || ""}
                  onChange={(e) => handleCellChange(r, c, e.target.value)}
                  readOnly={boardClosed(status, savePhase) || Boolean(item.given)}
                  inputMode="numeric"
                  className={[
                    "relative z-10 h-full w-full border border-slate-300 bg-transparent text-center text-base font-semibold text-[var(--ink,#1e1a16)] focus:outline-none focus:bg-brand-100",
                    item.given ? "font-bold" : "",
                  ].join(" ")}
                />
                {!displayBoard[r][c] && !item.given && (
                  <NotesOverlay digits={displayNotes[r][c]} maxDigit={9} />
                )}
              </div>
            );
          })
        )}
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
