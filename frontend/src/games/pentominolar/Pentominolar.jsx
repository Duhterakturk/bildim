import { useEffect, useRef, useState } from "react";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import ClearBoardButton, { DiscardNotice, NewPuzzleButton, useDiscardGate } from "../common/ClearBoardButton";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { useApplyCellHint } from "../common/cellHint";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { PENTOMINOES, orient, placementAt, poseMatching } from "./shapes";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

const PIECE_COLOR = ["bg-brand-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500"];

function ShapePreview({ name, turns, flipped, anchor }) {
  const shape = orient(PENTOMINOES[name], turns, flipped);
  const maxR = Math.max(...shape.map(([r]) => r)) + 1;
  const maxC = Math.max(...shape.map(([, c]) => c)) + 1;
  const anchorKey = `${shape[0][0]}-${shape[0][1]}`;

  return (
    <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${maxC}, 14px)` }}>
      {Array.from({ length: maxR * maxC }, (_, i) => {
        const r = Math.floor(i / maxC);
        const c = i % maxC;
        const filled = shape.some(([sr, sc]) => sr === r && sc === c);
        const isAnchor = anchor && `${r}-${c}` === anchorKey;
        return (
          <div
            key={`${r}-${c}`}
            className={`w-3.5 h-3.5 ${filled ? (isAnchor ? "bg-slate-800" : "bg-brand-500") : "bg-transparent"}`}
          />
        );
      })}
    </div>
  );
}

export default function Pentominolar() {
  const copy = useGameText("pentominolar");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("pentominolar", difficulty);
  const puzzle = issue?.puzzle || null;
  const pieces = puzzle?.pieces || [];
  const region = puzzle?.region || [];
  const rows = puzzle?.rows || 0;
  const cols = puzzle?.cols || 0;
  const attemptId = issue?.id;
  const [selected, setSelected] = useState(0);
  const [turns, setTurns] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [placements, setPlacements] = useState([]);
  const [notice, setNotice] = useState(null);
  const [hintCells, setHintCells] = useState([]);
  const [hintName, setHintName] = useState(null);
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const { phase: savePhase, save } = useAutoScore(attemptId);

  const regionSet = new Set(region);

  useEffect(() => {
    if (!attemptId) return undefined;
    setSelected(0);
    setTurns(0);
    setFlipped(false);
    setPlacements([]);
    setNotice(null);
    setHintCells([]);
    setHintName(null);
    setStatus("playing");
    setSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId]);

  useApplyCellHint(attemptId, (hint) => {
    if (hint.kind !== "piece" || !hint.name || !Array.isArray(hint.cells)) return;
    const cells = hint.cells.map((key) => key.split("-").map(Number));
    const pose = poseMatching(hint.name, hint.cells);
    const index = pieces.indexOf(hint.name);
    if (index >= 0) setSelected(index);
    setTurns(pose.turns);
    setFlipped(pose.flipped);
    setHintName(hint.name);
    setHintCells(hint.cells);
    setPlacements((prev) => {
      const covered = new Set(hint.cells);
      const rest = prev.filter(
        (piece) => piece.name !== hint.name && piece.cells.every(([r, c]) => !covered.has(`${r}-${c}`)),
      );
      return [...rest, { name: hint.name, cells }];
    });
    setNotice(null);
  });

  function cellPiece(r, c) {
    return placements.find((piece) => piece.cells.some(([pr, pc]) => pr === r && pc === c));
  }

  function place(r, c) {
    if (status === "correct") return;
    const existing = cellPiece(r, c);
    if (existing) {
      setPlacements((prev) => prev.filter((piece) => piece.name !== existing.name));
      setStatus("playing");
      setNotice(null);
      return;
    }
    const name = pieces[selected];
    if (!name || placements.some((piece) => piece.name === name)) return;
    const shape = orient(PENTOMINOES[name], turns, flipped);
    const occupied = new Set(placements.flatMap((piece) => piece.cells.map(([rr, cc]) => `${rr}-${cc}`)));
    const cells = placementAt(shape, r, c, regionSet, occupied);
    if (!cells) {
      setNotice(play.noFit);
      return;
    }
    setPlacements((prev) => [...prev, { name, cells }]);
    setNotice(null);
    setStatus("playing");
    const next = pieces.findIndex((piece, index) => index !== selected && !placements.some((p) => p.name === piece) && piece !== name);
    if (next >= 0) setSelected(next);
  }

  function clearBoard() {
    setPlacements([]);
    setNotice(null);
    setHintCells([]);
    setHintName(null);
    setStatus("playing");
  }

  function checkSolution() {
    if (status === "correct" || status === "submitted") return;
    const covered = new Set(placements.flatMap((piece) => piece.cells.map(([r, c]) => `${r}-${c}`)));
    const solved = placements.length === pieces.length && region.every((key) => covered.has(key)) && covered.size === region.length;
    setStatus(solved ? "correct" : "incorrect");
    if (solved) {
      clearInterval(timerRef.current);
      save(placementAnswer());
    }
  }

  function placementAnswer() {
    return {
      placements: placements.map((piece) => ({
        name: piece.name,
        cells: piece.cells.map(([r, c]) => `${r}-${c}`),
      })),
    };
  }

  const hasWork = placements.length > 0;
  const gate = useDiscardGate({ boardKey: attemptId, hasWork, solved: status === "correct", savePhase });

  if (phase !== "ready" || !puzzle) return <PuzzlePending phase={phase} onRetry={reload} />;

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker
        gameSlug="pentominolar"
        value={difficulty}
        disabled={gate.blocked}
        onChange={(level) => {
          if (level === difficulty) return;
          gate.ask("difficulty", () => setDifficulty(level));
        }}
      />
      <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-1 text-center max-w-md">{play.anchor}</p>
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      <div className="mb-4 flex w-full max-w-3xl flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
      <div className="w-full sm:w-auto sm:max-w-[14rem]">
        <p className="text-xs text-slate-500 mb-2 text-center">{play.pieces}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {pieces.map((name, index) => {
            const used = placements.some((piece) => piece.name === name);
            const active = index === selected;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setSelected(index);
                  setTurns(0);
                  setFlipped(false);
                }}
                className={[
                  "px-2 py-2 rounded-lg border flex flex-col items-center gap-1 min-w-16",
                  used ? "opacity-40" : "",
                  active ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white",
                  hintName === name ? "ring-2 ring-[#2461f7]" : "",
                ].join(" ")}
              >
                <ShapePreview name={name} turns={active ? turns : 0} flipped={active ? flipped : false} />
                <span className="text-[10px] font-semibold text-slate-500">{name}</span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => setTurns((value) => (value + 1) % 4)}
            className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold"
          >
            {play.rotate}
          </button>
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold"
          >
            {play.flip}
          </button>
        </div>
      </div>

      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 2.5rem)` }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const inRegion = regionSet.has(`${r}-${c}`);
          if (!inRegion) return <div key={`${r}-${c}`} className="w-10 h-10" />;
          const piece = cellPiece(r, c);
          const color = piece ? PIECE_COLOR[pieces.indexOf(piece.name) % PIECE_COLOR.length] : "bg-white";
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => place(r, c)}
              className={`w-10 h-10 border border-slate-400 ${color} ${hintCells.includes(`${r}-${c}`) ? "ring-4 ring-[#2461f7] ring-inset" : ""}`}
            />
          );
        })}
      </div>
      </div>

      {notice && status === "playing" && <p className="text-amber-600 text-sm mt-3 text-center max-w-md">{notice}</p>}

      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={checkSolution}
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

      {status === "correct" && <p className="play-correct text-emerald-600 mt-3">{play.correct}</p>}
      {status === "incorrect" && <p className="text-red-500 mt-3">{play.incorrect}</p>}
      {status === "rejected" && <p className="text-red-500 mt-3">{play.rejected}</p>}
      {status === "already" && <p className="text-red-500 mt-3">{play.already}</p>}
      {status === "offline" && <p className="text-[#f4efe6] mt-3">{play.offline}</p>}
      <ScoreNotice phase={savePhase} onRetry={() => save(placementAnswer())} />
    </div>
  );
}
