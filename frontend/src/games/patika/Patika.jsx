import { useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton from "../common/ClearBoardButton";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useApplyCellHint } from "../common/cellHint";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";
import { edgeKey } from "./puzzles";

function adjacent(a, b) {
  const [ar, ac] = a.split("-").map(Number);
  const [br, bc] = b.split("-").map(Number);
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

export default function Patika() {
  const copy = useGameText("patika");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("patika", difficulty);
  const puzzle = issue?.puzzle;
  const size = puzzle?.rows || 0;
  const blacks = new Set(puzzle?.blacks || []);
  const attemptId = issue?.id;
  const [edges, setEdges] = useState(() => new Set());
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, save } = useAutoScore(attemptId);
  const drag = useRef(null);

  useEffect(() => {
    if (!attemptId) return undefined;
    setEdges(new Set());
    setStatus("playing");
    setSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId]);

  useApplyCellHint(attemptId, (hint) => {
    if (hint.kind !== "edge" || !hint.a || !hint.b) return;
    setEdges((prev) => new Set(prev).add(edgeKey(hint.a, hint.b)));
    setStatus("playing");
  });

  function cellKey(row, col) {
    return `${row}-${col}`;
  }

  function white(cell) {
    return !blacks.has(cell);
  }

  function toggle(edge) {
    if (status === "correct" || status === "submitted") return;
    setEdges((prev) => {
      const next = new Set(prev);
      if (next.has(edge)) next.delete(edge);
      else next.add(edge);
      return next;
    });
    setStatus("playing");
  }

  function addEdge(a, b) {
    if (!white(a) || !white(b) || !adjacent(a, b)) return;
    if (status === "correct" || status === "submitted") return;
    setEdges((prev) => new Set(prev).add(edgeKey(a, b)));
    setStatus("playing");
  }

  function newGame(next) {
    if (next && next !== difficulty) setDifficulty(next);
    else reload();
  }

  async function checkSolution() {
    if (!attemptId || status === "correct" || status === "submitted") return;
    try {
      const correct = await checkPuzzle(attemptId, { edges: [...edges] });
      setStatus(correct ? "correct" : "incorrect");
      if (correct) {
        clearInterval(timerRef.current);
        save({ edges: [...edges] });
      }
    } catch (error) {
      setStatus(scoreStatus(error));
    }
  }

  if (phase !== "ready" || !size) return <PuzzlePending phase={phase} />;

  const tracks = size * 2 - 1;

  return (
    <div className="flex w-full flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="patika" value={difficulty} onChange={newGame} />
      <p className="play-rules text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div className="mb-4 touch-none">
        <div
          className="grid"
          style={{
            gridTemplateColumns: Array.from({ length: tracks }, (_, index) => (index % 2 === 0 ? "2.1rem" : "0.65rem")).join(" "),
            gridTemplateRows: Array.from({ length: tracks }, (_, index) => (index % 2 === 0 ? "2.1rem" : "0.65rem")).join(" "),
          }}
        >
          {Array.from({ length: tracks * tracks }, (_, index) => {
            const row = Math.floor(index / tracks);
            const col = index % tracks;
            if (row % 2 === 0 && col % 2 === 0) {
              const cell = cellKey(row / 2, col / 2);
              const closed = blacks.has(cell);
              return (
                <button
                  key={cell}
                  type="button"
                  onPointerDown={() => { drag.current = closed ? null : cell; }}
                  onPointerEnter={() => {
                    if (!drag.current || drag.current === cell) return;
                    addEdge(drag.current, cell);
                    drag.current = cell;
                  }}
                  onPointerUp={() => { drag.current = null; }}
                  className={`rounded-sm ${closed ? "bg-slate-800" : "bg-white border border-slate-300"}`}
                />
              );
            }
            if (row % 2 === 0 && col % 2 === 1) {
              const left = cellKey(row / 2, (col - 1) / 2);
              const right = cellKey(row / 2, (col + 1) / 2);
              if (!white(left) || !white(right)) return <div key={`${row}-${col}`} />;
              const edge = edgeKey(left, right);
              const on = edges.has(edge);
              return (
                <button key={edge} type="button" onClick={() => toggle(edge)} className="flex items-center justify-center">
                  <span className={`h-1.5 w-full rounded-full ${on ? "bg-[#2461f7]" : "bg-slate-200"}`} />
                </button>
              );
            }
            if (row % 2 === 1 && col % 2 === 0) {
              const up = cellKey((row - 1) / 2, col / 2);
              const down = cellKey((row + 1) / 2, col / 2);
              if (!white(up) || !white(down)) return <div key={`${row}-${col}`} />;
              const edge = edgeKey(up, down);
              const on = edges.has(edge);
              return (
                <button key={edge} type="button" onClick={() => toggle(edge)} className="flex items-center justify-center">
                  <span className={`h-full w-1.5 rounded-full ${on ? "bg-[#2461f7]" : "bg-slate-200"}`} />
                </button>
              );
            }
            return <div key={`${row}-${col}`} />;
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={checkSolution} disabled={status === "correct" || status === "submitted"} className="bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50">{play.check}</button>
        <ClearBoardButton onClick={() => { setEdges(new Set()); setStatus("playing"); }} />
        <button type="button" onClick={() => newGame()} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold">{play.newPuzzle}</button>
      </div>
      {status === "correct" && <p className="text-emerald-600 mt-3">{play.correct}</p>}
      {status === "incorrect" && <p className="text-red-500 mt-3">{play.incorrect}</p>}
      {status === "rejected" && <p className="text-red-500 mt-3">{play.rejected}</p>}
      {status === "already" && <p className="text-red-500 mt-3">{play.already}</p>}
      {status === "offline" && <p className="text-[#f4efe6] mt-3">{play.offline}</p>}
      <ScoreNotice phase={savePhase} onRetry={() => save({ edges: [...edges] })} />
    </div>
  );
}
