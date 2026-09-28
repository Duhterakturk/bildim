import { useEffect, useMemo, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton from "../common/ClearBoardButton";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { useApplyCellHint, writeFill } from "../common/cellHint";
import NotesOverlay from "../common/NotesOverlay";
import NotesToggle from "../common/NotesToggle";
import { clearCellNotes, emptyNotes, toggleNote } from "../common/pencilNotes";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export default function Sudoku() {
  const copy = useGameText("sudoku");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("sudoku", difficulty);
  const puzzle = issue?.puzzle?.givens || null;
  const attemptId = issue?.id;
  const givenMask = useMemo(() => (puzzle ? puzzle.map((row) => row.map((v) => v !== 0)) : []), [puzzle]);

  const [board, setBoard] = useState(null);
  const [notes, setNotes] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, save } = useAutoScore(attemptId);

  useEffect(() => {
    if (!puzzle) return;
    setBoard(cloneBoard(puzzle));
    setNotes(emptyNotes(9, 9));
    setNotesMode(false);
    setStatus("playing");
    setSelected(null);
    clearInterval(timerRef.current);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId]);

  function clearBoard() {
    if (!puzzle) return;
    setBoard(cloneBoard(puzzle));
    setNotes(emptyNotes(9, 9));
    setSelected(null);
    setStatus("playing");
  }

  useApplyCellHint(attemptId, (hint) => {
    if (givenMask[hint.row]?.[hint.col]) return;
    writeFill(setBoard, hint);
    if (hint?.kind === "fill") setNotes((prev) => (prev ? clearCellNotes(prev, hint.row, hint.col) : prev));
  });

  function newPuzzle(nextDifficulty) {
    if (nextDifficulty && nextDifficulty !== difficulty) setDifficulty(nextDifficulty);
    else reload();
  }

  function handleCellChange(row, col, value) {
    if (givenMask[row][col] || status === "correct") return;
    const digit = value.replace(/[^1-9]/g, "").slice(-1);
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

  if (phase !== "ready" || !board || !notes) return <PuzzlePending phase={phase} />;

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>

      <DifficultyPicker gameSlug="sudoku" value={difficulty} onChange={newPuzzle} />
      <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-xs mb-2 max-w-md text-center">{play.notesHint}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div className="grid grid-cols-9 border-2 border-slate-700">
        {board.map((row, r) =>
          row.map((val, c) => (
            <div key={`${r}-${c}`} className="relative">
              <input
                value={val || ""}
                onFocus={() => setSelected([r, c])}
                onChange={(e) => handleCellChange(r, c, e.target.value)}
                readOnly={givenMask[r][c]}
                className={[
                  "board-cell w-9 h-9 relative z-10 text-center text-lg border border-slate-300 focus:outline-none focus:bg-brand-100",
                  givenMask[r][c] ? "font-bold" : "",
                  c % 3 === 2 && c !== 8 ? "border-r-2 border-r-slate-700" : "",
                  r % 3 === 2 && r !== 8 ? "border-b-2 border-b-slate-700" : "",
                  selected && selected[0] === r && selected[1] === c ? "ring-2 ring-brand-400" : "",
                ].join(" ")}
                style={{ backgroundColor: "var(--cell, #fff)", color: "var(--ink, #1e1a16)" }}
              />
              {!val && !givenMask[r][c] && <NotesOverlay digits={notes[r][c]} maxDigit={9} />}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={checkSolution}
          disabled={status === "correct" || status === "submitted"}
          className="bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600 disabled:opacity-50"
        >
          {play.check}
        </button>
        <NotesToggle
          on={notesMode}
          onClick={() => setNotesMode((value) => !value)}
          label={notesMode ? play.notesOn : play.notes}
          hint={play.notesHint}
        />
        <ClearBoardButton onClick={clearBoard} />
        <button
          onClick={() => newPuzzle()}
          className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300"
        >
          {play.newPuzzle}
        </button>
      </div>

      {status === "correct" && <p className="play-correct text-emerald-600 mt-3">{play.correct}</p>}
      {status === "incorrect" && <p className="text-red-500 mt-3">{play.incorrectCells}</p>}
      {status === "rejected" && <p className="text-red-500 mt-3">{play.rejected}</p>}
      {status === "already" && <p className="text-red-500 mt-3">{play.already}</p>}
      {status === "offline" && <p className="text-[#f4efe6] mt-3">{play.offline}</p>}
      <ScoreNotice phase={savePhase} onRetry={() => save(board)} />
    </div>
  );
}
