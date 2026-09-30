import { useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton, { DiscardNotice, NewPuzzleButton, useDiscardGate } from "../common/ClearBoardButton";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useApplyCellHint } from "../common/cellHint";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";
import { boardClosed } from "../common/workState";
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
  const { phase: savePhase, code: saveCode, busy: saveBusy, save, retry: retryScore, release: releaseScore } = useAutoScore(attemptId);
  const drag = useRef(null);

  useEffect(() => {
    if (!attemptId) return undefined;
    drag.current = null;
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
    if (boardClosed(status, savePhase)) return;
    setEdges((prev) => {
      const next = new Set(prev);
      if (next.has(edge)) next.delete(edge);
      else next.add(edge);
      return next;
    });
    setStatus("playing");
  }

  function drawTo(cell) {
    const stroke = drag.current;
    if (!stroke || !white(cell) || !adjacent(stroke.cell, cell) || boardClosed(status, savePhase)) return;
    const edge = edgeKey(stroke.cell, cell);
    setEdges((prev) => {
      const next = new Set(prev);
      if (next.has(edge)) next.delete(edge);
      else next.add(edge);
      return next;
    });
    stroke.changed = true;
    stroke.cell = cell;
    setStatus("playing");
  }

  function pointerCell(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / rect.width * size);
    const row = Math.floor((event.clientY - rect.top) / rect.height * size);
    return row >= 0 && col >= 0 && row < size && col < size ? cellKey(row, col) : null;
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

  const hasWork = edges.size > 0;
  const gate = useDiscardGate({ boardKey: attemptId, hasWork, solved: status === "correct", savePhase });

  if (phase !== "ready" || !size) return <PuzzlePending phase={phase} onRetry={reload} />;



  return (
    <div className="flex w-full flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="patika" value={difficulty} disabled={gate.blocked} onChange={(level) => gate.ask("difficulty", () => newGame(level))} />
      <p className="play-rules text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <p className="text-sm text-center mb-3">{play.pathDrawing}</p>
      <div
        data-testid="patika-board"
        className="relative mb-4 touch-none select-none"
        style={{ width: "min(100%, 440px)", aspectRatio: "1", background: "#fff", border: "2px solid #111" }}
        onPointerDown={(event) => {
          if (event.button !== 0 || boardClosed(status, savePhase)) return;
          const cell = pointerCell(event);
          if (!cell || !white(cell)) return;
          event.preventDefault();
          drag.current = { cell, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 6) drag.current.moved = true;
          const cell = pointerCell(event);
          if (!cell) return;
          const [r, c] = cell.split("-").map(Number);
          const [sr, sc] = drag.current.cell.split("-").map(Number);
          if (r !== sr && c !== sc) return;
          const distance = Math.abs(r - sr) + Math.abs(c - sc);
          for (let step = 1; step <= distance; step++) {
            const next = cellKey(sr + Math.sign(r - sr) * step, sc + Math.sign(c - sc) * step);
            if (!white(next)) break;
            drawTo(next);
          }
        }}
        onPointerUp={(event) => {
          const stroke = drag.current;
          drag.current = null;
          if (!stroke || stroke.pointerId !== event.pointerId || stroke.moved || stroke.changed || boardClosed(status, savePhase)) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width * size;
          const y = (event.clientY - rect.top) / rect.height * size;
          let nearest = null, distance = .28;
          for (const edge of edges) {
            const [a, b] = edge.split("|").map(cell => cell.split("-").map(Number));
            const ax = a[1] + .5, ay = a[0] + .5, dx = b[1] - a[1], dy = b[0] - a[0];
            const t = Math.max(0, Math.min(1, (x - ax) * dx + (y - ay) * dy));
            const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
            if (d < distance) { nearest = edge; distance = d; }
          }
          if (nearest) {
            setEdges(prev => { const next = new Set(prev); next.delete(nearest); return next; });
            setStatus("playing");
          }
        }}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}
      >
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {Array.from({ length: size * size }, (_, index) => {
            const row = Math.floor(index / size), col = index % size;
            const cell = cellKey(row, col);
            return <button key={cell} type="button" data-cell={cell}
              aria-label={`${row + 1}, ${col + 1}`} disabled={blacks.has(cell)}
              style={{ background: blacks.has(cell) ? "#111" : "#fff", border: "1px solid #aaa" }}
              onKeyDown={(event) => {
                const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
                if (!delta) return;
                event.preventDefault();
                const r = row + delta[0], c = col + delta[1], next = cellKey(r, c);
                if (r < 0 || c < 0 || r >= size || c >= size || !white(next)) return;
                toggle(edgeKey(cell, next));
                event.currentTarget.parentElement.querySelector(`[data-cell="${next}"]`)?.focus();
              }} />;
          })}
        </div>
        <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          {[...edges].map((edge) => {
            const [a, b] = edge.split("|");
            const [ar, ac] = a.split("-").map(Number), [br, bc] = b.split("-").map(Number);
            return <line key={edge} data-edge={edge} x1={ac + .5} y1={ar + .5} x2={bc + .5} y2={br + .5} stroke="#111" strokeWidth=".12" strokeLinecap="round" />;
          })}
        </svg>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" data-normal-check onClick={checkSolution} disabled={status === "correct" || status === "submitted"} className="inline-flex min-h-[44px] items-center justify-center bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50">{play.check}</button>
        {gate.pending ? (
          <DiscardNotice pending={gate.pending} onConfirm={gate.confirm} onCancel={gate.cancel} />
        ) : (
          <>
            <ClearBoardButton disabled={gate.blocked} onClick={() => gate.ask("clear", () => { setEdges(new Set()); setStatus("playing"); })} />
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
