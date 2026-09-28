import { Fragment, useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton from "../common/ClearBoardButton";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { useApplyCellHint, writeFill } from "../common/cellHint";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

function cloneBoard(grid) {
  return grid.map((row) => [...row]);
}

export default function Carpmaca() {
  const copy = useGameText("carpmaca");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("carpmaca", difficulty);
  const game = issue?.puzzle || null;
  const rowHeaders = game?.rowHeaders;
  const colHeaders = game?.colHeaders;
  const puzzle = game?.givens;
  const attemptId = issue?.id;
  const givenMask = puzzle ? puzzle.map((row) => row.map((v) => v !== 0)) : [];

  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, save } = useAutoScore(attemptId);

  const [renderedGame, setRenderedGame] = useState(null);
  let displayBoard = board;
  if (game && game !== renderedGame) {
    displayBoard = cloneBoard(puzzle);
    setRenderedGame(game);
    setBoard(displayBoard);
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
    if (givenMask[hint.row]?.[hint.col]) return;
    writeFill(setBoard, hint);
  });

  function handleDifficultyChange(newDifficulty) {
    if (newDifficulty !== difficulty) setDifficulty(newDifficulty);
    else reload();
  }

  function clearBoard() {
    if (!puzzle) return;
    setBoard(cloneBoard(puzzle));
    setStatus("playing");
  }

  function handleCellChange(row, col, value) {
    if (givenMask[row][col] || status === "correct") return;
    const digits = value.replace(/[^0-9]/g, "").slice(0, 3);
    const next = cloneBoard(displayBoard);
    next[row][col] = digits ? Number(digits) : 0;
    setBoard(next);
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

  if (phase !== "ready" || !displayBoard || !rowHeaders) return <PuzzlePending phase={phase} />;

  const headerCell = "w-12 h-12 flex items-center justify-center text-sm font-bold bg-slate-800 text-white";

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="carpmaca" value={difficulty} onChange={handleDifficultyChange} />
      <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div
        className="inline-grid max-w-full overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${colHeaders.length + 1}, minmax(0, 1fr))` }}
      >
        <div className={headerCell}>×</div>
        {colHeaders.map((v, i) => (
          <div key={`ch-${i}`} className={headerCell}>{v}</div>
        ))}

        {displayBoard.map((row, r) => (
          <Fragment key={r}>
            <div key={`rh-${r}`} className={headerCell}>{rowHeaders[r]}</div>
            {row.map((val, c) => (
              <input
                key={`${r}-${c}`}
                value={val || ""}
                onChange={(e) => handleCellChange(r, c, e.target.value)}
                readOnly={givenMask[r][c] || status === "correct"}
                className={[
                  "w-12 h-12 text-center text-lg border border-slate-300 focus:outline-none focus:bg-brand-100",
                  givenMask[r][c] ? "bg-slate-100 font-bold text-slate-700" : "bg-white",
                ].join(" ")}
              />
            ))}
          </Fragment>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={checkSolution}
          disabled={status === "correct" || status === "submitted"}
          className="bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600 disabled:opacity-50"
        >
          {play.check}
        </button>
        <ClearBoardButton onClick={clearBoard} />
        <button
          onClick={reload}
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
      <ScoreNotice phase={savePhase} onRetry={() => save(displayBoard)} />
    </div>
  );
}
