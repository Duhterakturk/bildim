import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "../common/useAutoScore";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import ClearBoardButton from "../common/ClearBoardButton";
import { useApplyCellHint } from "../common/cellHint";
import { useGameText } from "../common/gameText";
import { usePlayCopy } from "../common/playCopy";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

const COLOR = {
  A: "#e11d48",
  B: "#2563eb",
  C: "#16a34a",
  D: "#ea580c",
  E: "#7c3aed",
  F: "#0d9488",
  G: "#db2777",
};

function neighbors(a, b) {
  const [ar, ac] = a.split("-").map(Number);
  const [br, bc] = b.split("-").map(Number);
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

function ownerOf(paths, key) {
  for (const [letter, path] of Object.entries(paths)) {
    const index = path.indexOf(key);
    if (index >= 0) return { letter, index };
  }
  return null;
}

function applyStep(prev, letter, key, fixed) {
  const path = [...(prev[letter] || [])];
  if (path.length === 0) return prev;
  const tip = path[path.length - 1];
  if (key === tip) return prev;
  if (path.length >= 2 && key === path[path.length - 2]) {
    path.pop();
    return { ...prev, [letter]: path };
  }
  if (!neighbors(tip, key) || path.includes(key)) return prev;
  const letterHere = fixed[key];
  if (letterHere && letterHere !== letter) return prev;
  if (letterHere === letter && path.includes(key)) return prev;
  const next = { ...prev };
  const other = ownerOf(prev, key);
  if (other && other.letter !== letter) {
    if (other.index === 0) return prev;
    next[other.letter] = prev[other.letter].slice(0, other.index);
  }
  next[letter] = [...path, key];
  return next;
}

function parseCell(key) {
  const [row, col] = key.split("-").map(Number);
  return { row, col };
}

function traverse(fromKey, toKey) {
  const from = parseCell(fromKey);
  const to = parseCell(toKey);
  const steps = [];
  let { row, col } = from;
  const horizontal = Math.sign(to.col - col);
  while (col !== to.col) {
    col += horizontal;
    steps.push(`${row}-${col}`);
  }
  const vertical = Math.sign(to.row - row);
  while (row !== to.row) {
    row += vertical;
    steps.push(`${row}-${col}`);
  }
  return steps;
}

const HitGrid = memo(function HitGrid({ size, cell, fixed, shake, downRef }) {
  return (
    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${size}, ${cell}px)`, gridTemplateRows: `repeat(${size}, ${cell}px)` }}>
      {Array.from({ length: size * size }, (_, index) => {
        const row = Math.floor(index / size);
        const col = index % size;
        const key = `${row}-${col}`;
        return (
          <button
            key={key}
            type="button"
            data-cell={key}
            aria-label={fixed[key] || key}
            onPointerDown={(event) => downRef.current?.(event, key)}
            className="border border-slate-300 bg-transparent touch-none"
            style={{ width: cell, height: cell, animation: shake === key ? "abc-shake 180ms linear" : undefined }}
          />
        );
      })}
    </div>
  );
});

const LetterGrid = memo(function LetterGrid({ size, cell, fixed, selected }) {
  const mark = Math.max(0, Math.round(cell * 0.7));
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 grid"
      style={{ gridTemplateColumns: `repeat(${size}, ${cell}px)`, gridTemplateRows: `repeat(${size}, ${cell}px)` }}
    >
      {Array.from({ length: size * size }, (_, index) => {
        const key = `${Math.floor(index / size)}-${index % size}`;
        const letter = fixed[key];
        const active = letter && selected === letter;
        return (
          <div key={index} className="flex items-center justify-center" style={{ width: cell, height: cell }}>
            {letter && (
              <span
                data-mark={key}
                className="flex items-center justify-center rounded-full text-sm font-bold text-white"
                style={{
                  width: mark,
                  height: mark,
                  background: COLOR[letter],
                  transform: active ? "scale(1.15)" : undefined,
                  boxShadow: active ? `0 0 0 3px #fff, 0 0 0 5px ${COLOR[letter]}` : undefined,
                }}
              >
                {letter}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

function cellSize(boardSize) {
  if (!boardSize || typeof window === "undefined") return 44;
  return Math.max(0, Math.floor(Math.min(56, (window.innerWidth - 32) / boardSize)));
}

export default function AbcBaglama() {
  const { t } = useTranslation();
  const copy = useGameText("abc-baglama");
  const play = usePlayCopy();
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("abc-baglama", difficulty);
  const puzzle = issue?.puzzle;
  const attemptId = issue?.id;
  const [paths, setPaths] = useState({});
  const [selected, setSelected] = useState(null);
  const [shake, setShake] = useState(null);
  const [status, setStatus] = useState("playing");
  const [note, setNote] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [cell, setCell] = useState(44);
  const [ink, setInk] = useState(null);
  const timerRef = useRef(null);
  const { phase: savePhase, save } = useAutoScore(attemptId);
  const drag = useRef(null);
  const pointer = useRef(null);
  const pathsRef = useRef(paths);
  const boardRef = useRef(null);
  const rubberRef = useRef(null);
  const downRef = useRef(null);
  const frameRef = useRef(0);
  const queuedRef = useRef(null);
  const checkedSig = useRef("");
  const checking = useRef(false);
  const sizeRef = useRef(0);
  const cellRef = useRef(44);
  const fixedRef = useRef({});

  const fixed = puzzle?.fixedCells || {};
  const size = puzzle?.rows || 0;
  const letters = useMemo(() => [...new Set(Object.values(fixed))].sort(), [fixed]);
  sizeRef.current = size;
  cellRef.current = cell;
  fixedRef.current = fixed;

  useEffect(() => {
    if (!size) return undefined;
    const measure = () => setCell(cellSize(size));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [size]);

  useEffect(() => {
    if (!attemptId) return undefined;
    pathsRef.current = {};
    setPaths({});
    checkedSig.current = "";
    setSelected(null);
    setInk(null);
    setStatus("playing");
    setNote("");
    setSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId]);

  useApplyCellHint(attemptId, (hint) => {
    if (hint.kind !== "marks" || !hint.label || !Array.isArray(hint.cells)) return;
    const next = { ...pathsRef.current, [hint.label]: hint.cells.map(String) };
    pathsRef.current = next;
    setPaths(next);
    setStatus("playing");
    setNote("");
  });

  const ends = useMemo(() => {
    const map = {};
    for (const [key, letter] of Object.entries(fixed)) (map[letter] ||= []).push(key);
    return map;
  }, [fixed]);

  const owners = useMemo(() => {
    const map = new Map();
    for (const [letter, path] of Object.entries(paths)) {
      path.forEach((key, index) => map.set(key, { letter, index }));
    }
    return map;
  }, [paths]);

  const linked = useMemo(() => letters.filter((letter) => {
    const path = paths[letter] || [];
    const pair = ends[letter] || [];
    return path.length >= 2 && pair.includes(path[0]) && pair.includes(path[path.length - 1]) && path[0] !== path[path.length - 1];
  }).length, [letters, paths, ends]);

  const filled = useMemo(() => new Set(Object.values(paths).flat()).size, [paths]);

  function reachedMate(letter, path) {
    if (!path || path.length < 2) return false;
    const pair = ends[letter] || [];
    return pair.includes(path[0]) && pair.includes(path[path.length - 1]) && path[0] !== path[path.length - 1];
  }

  function writePaths(next) {
    pathsRef.current = next;
    if (pointer.current?.drawing) {
      queuedRef.current = next;
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        setPaths(queuedRef.current);
      });
      return;
    }
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    setPaths(next);
  }

  function flushPaths() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    setPaths(pathsRef.current);
  }

  function clickCell(key) {
    const letterHere = fixed[key];
    const current = pathsRef.current;
    const path = selected ? current[selected] || [] : [];
    const tip = path[path.length - 1];

    if (selected && key === tip && path.length > 0) {
      if (path.length <= 1) {
        writePaths({ ...current, [selected]: [] });
        setSelected(null);
      } else {
        writePaths({ ...current, [selected]: current[selected].slice(0, -1) });
      }
      return;
    }

    if (selected && tip && neighbors(tip, key)) {
      const stepped = applyStep(current, selected, key, fixed);
      if (stepped !== current) {
        writePaths(stepped);
        if (reachedMate(selected, stepped[selected])) setSelected(null);
        return;
      }
    }

    if (letterHere) {
      setSelected(letterHere);
      const existing = current[letterHere] || [];
      if (existing.length === 0) writePaths({ ...current, [letterHere]: [key] });
      else if (existing[0] === key && existing[existing.length - 1] !== key) {
        writePaths({ ...current, [letterHere]: [...existing].reverse() });
      }
      return;
    }

    const occupied = owners.get(key) || ownerOf(current, key);
    if (occupied && occupied.index === (current[occupied.letter] || []).length - 1 && occupied.index > 0) {
      setSelected(occupied.letter);
      return;
    }

    setShake(key);
    window.setTimeout(() => setShake((value) => (value === key ? null : value)), 180);
    setSelected(null);
  }

  function boardMetrics() {
    const board = boardRef.current;
    const cellPx = cellRef.current;
    const n = sizeRef.current;
    if (!board || !cellPx || !n) return null;
    const rect = board.getBoundingClientRect();
    const zoom = rect.width / (n * cellPx) || 1;
    return { rect, zoom, cellPx, n };
  }

  function cellAt(clientX, clientY, metrics) {
    const x = (clientX - metrics.rect.left) / metrics.zoom;
    const y = (clientY - metrics.rect.top) / metrics.zoom;
    const col = Math.floor(x / metrics.cellPx);
    const row = Math.floor(y / metrics.cellPx);
    if (row < 0 || col < 0 || row >= metrics.n || col >= metrics.n) return null;
    return `${row}-${col}`;
  }

  function hideRubber() {
    rubberRef.current?.setAttribute("visibility", "hidden");
  }

  function placeRubber(clientX, clientY, metrics) {
    const line = rubberRef.current;
    const active = pointer.current;
    const tip = active?.letter ? (pathsRef.current[active.letter] || []).at(-1) : null;
    if (!line || !active?.drawing || !tip || !metrics) {
      hideRubber();
      return;
    }
    const [row, col] = tip.split("-").map(Number);
    line.setAttribute("x1", String(col * metrics.cellPx + metrics.cellPx / 2));
    line.setAttribute("y1", String(row * metrics.cellPx + metrics.cellPx / 2));
    line.setAttribute("x2", String((clientX - metrics.rect.left) / metrics.zoom));
    line.setAttribute("y2", String((clientY - metrics.rect.top) / metrics.zoom));
    line.setAttribute("stroke", COLOR[active.letter]);
    line.setAttribute("visibility", "visible");
  }

  function absorb(key) {
    const active = pointer.current;
    if (!active?.drawing || active.done || !key) return;
    const letter = active.letter;
    let base = pathsRef.current;
    const path = base[letter] || [];
    const at = path.indexOf(key);
    if (at >= 0) {
      if (at < path.length - 1) writePaths({ ...base, [letter]: path.slice(0, at + 1) });
      return;
    }
    const tip = path.at(-1);
    if (!tip) return;
    for (const step of traverse(tip, key)) {
      const next = applyStep(base, letter, step, fixedRef.current);
      if (next === base) break;
      base = next;
      if (reachedMate(letter, base[letter])) {
        active.done = true;
        setSelected(null);
        break;
      }
    }
    if (base !== pathsRef.current) writePaths(base);
  }

  function onPointerDown(event, key) {
    if (status === "correct" || status === "submitted") return;
    event.preventDefault();
    boardRef.current?.setPointerCapture?.(event.pointerId);
    const letterHere = fixed[key];
    const occupied = ownerOf(pathsRef.current, key);
    const occupiedPath = occupied ? pathsRef.current[occupied.letter] || [] : [];
    const linkedHere = Boolean(occupied && reachedMate(occupied.letter, occupiedPath));
    const isTip = Boolean(occupied && occupied.index === occupiedPath.length - 1 && occupied.index > 0);
    if (!letterHere && !isTip && !linkedHere) {
      pointer.current = { key, x: event.clientX, y: event.clientY, dragged: false, drawing: false };
      drag.current = null;
      return;
    }
    const letter = letterHere || occupied.letter;
    let existing = pathsRef.current[letter] || [];
    const tip = existing[existing.length - 1];
    const completing = letterHere && selected === letter && tip && key !== tip && neighbors(tip, key) && !reachedMate(letter, existing);
    if (completing) {
      const stepped = applyStep(pathsRef.current, letter, key, fixed);
      if (stepped !== pathsRef.current) writePaths(stepped);
      const finished = reachedMate(letter, (stepped[letter] || existing));
      if (finished) setSelected(null);
      pointer.current = { key, x: event.clientX, y: event.clientY, dragged: false, drawing: false, done: finished };
      drag.current = null;
      return;
    }
    const alreadyTip = tip === key && existing.length > 0;
    if (linkedHere && existing.includes(key)) {
      const at = existing.indexOf(key);
      if (at < existing.length - 1) {
        existing = existing.slice(0, at + 1);
        writePaths({ ...pathsRef.current, [letter]: existing });
      }
    } else if (letterHere) {
      if (existing.length === 0 || !existing.includes(key)) {
        writePaths({ ...pathsRef.current, [letter]: [key] });
      } else if (existing[0] === key && tip !== key) {
        writePaths({ ...pathsRef.current, [letter]: [...existing].reverse() });
      }
    }
    drag.current = { letter };
    pointer.current = { key, x: event.clientX, y: event.clientY, dragged: false, drawing: true, alreadyTip, letter, done: false };
    boardRef.current?.classList.add("abc-dragging");
    if (window.__abcMeasure) window.__abcDragStart = performance.now();
    setSelected(letter);
    setInk(letter);
  }
  downRef.current = onPointerDown;

  function onPointerMove(event) {
    const started = window.__abcMeasure ? performance.now() : 0;
    const active = pointer.current;
    if (!active || active.done) return;
    const samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
    const points = samples.length ? samples : [event];
    const last = points[points.length - 1];
    if (!active.drawing) {
      if (Math.hypot(last.clientX - active.x, last.clientY - active.y) >= 8) active.dragged = true;
      return;
    }
    active.dragged = true;
    const metrics = boardMetrics();
    if (!metrics) return;
    let previous = (pathsRef.current[active.letter] || []).at(-1);
    for (const sample of points) {
      const key = cellAt(sample.clientX, sample.clientY, metrics);
      if (!key || key === previous) continue;
      absorb(key);
      previous = (pathsRef.current[active.letter] || []).at(-1);
    }
    placeRubber(last.clientX, last.clientY, metrics);
    if (window.__abcMeasure) {
      window.__abcMoveMs = window.__abcMoveMs || [];
      window.__abcMoveMs.push(performance.now() - started);
    }
  }

  function onPointerUp() {
    const active = pointer.current;
    pointer.current = null;
    drag.current = null;
    boardRef.current?.classList.remove("abc-dragging");
    hideRubber();
    flushPaths();
    setInk(null);
    if (window.__abcMeasure && window.__abcDragStart) window.__abcDragMs = performance.now() - window.__abcDragStart;
    if (active && !active.dragged && !active.drawing) clickCell(active.key);
    else if (active && !active.dragged && active.alreadyTip) clickCell(active.key);
  }

  function localProblem() {
    if (filled < size * size) return t("play.emptyCell");
    const open = letters.find((letter) => !reachedMate(letter, paths[letter]));
    return open ? t("play.letterOpen", { letter: open }) : "";
  }

  function outcomeNote(next) {
    if (next === "rejected") return play.rejected;
    if (next === "already") return play.already;
    return play.offline;
  }

  async function checkSolution() {
    if (!attemptId || checking.current || status === "correct" || status === "submitted") return;
    const problem = localProblem();
    if (problem) {
      setNote(problem);
      setStatus("incorrect");
      return;
    }
    checking.current = true;
    try {
      const correct = await checkPuzzle(attemptId, { paths });
      setStatus(correct ? "correct" : "incorrect");
      setNote(correct ? play.correct : play.incorrect);
      if (correct) {
        clearInterval(timerRef.current);
        save({ paths });
      }
    } catch (error) {
      const next = scoreStatus(error);
      setStatus(next);
      setNote(outcomeNote(next));
    } finally {
      checking.current = false;
    }
  }

  useEffect(() => {
    if (!attemptId || !size) return undefined;
    if (status === "correct" || status === "submitted") return undefined;
    if (filled !== size * size || linked !== letters.length) return undefined;
    const signature = JSON.stringify(paths);
    if (checking.current || checkedSig.current === signature) return undefined;
    checkedSig.current = signature;
    checking.current = true;
    const token = attemptId;
    const answer = paths;
    (async () => {
      try {
        const correct = await checkPuzzle(token, { paths: answer });
        if (token !== attemptId) return;
        if (!correct) {
          setStatus("incorrect");
          setNote(play.incorrect);
          return;
        }
        clearInterval(timerRef.current);
        setStatus("correct");
        setNote(play.correct);
        save({ paths: answer });
      } catch (error) {
        const next = scoreStatus(error);
        setStatus(next);
        setNote(outcomeNote(next));
      } finally {
        checking.current = false;
      }
    })();
    return undefined;
  }, [filled, linked, letters.length, paths, attemptId, size, status, play]);

  if (phase !== "ready" || !size) return <PuzzlePending phase={phase} />;

  const width = Math.max(0, size * cell);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      <DifficultyPicker gameSlug="abc-baglama" value={difficulty} onChange={setDifficulty} />
      <p className="play-rules text-slate-500 text-sm mb-2 max-w-md text-center">{copy.rules}</p>
      <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{t("play.flowHint")}</p>
      <p className="text-slate-500 text-sm mb-2">{play.clock(seconds)}</p>
      {letters.map((letter) => (
        <span key={letter} hidden data-testid={`path-${letter}`} data-length={(paths[letter] || []).length} />
      ))}
      <p className="text-sm font-semibold text-[#f4efe6] mb-3" data-testid="link-progress">
        {t("play.linked", { linked, pairs: letters.length, filled, total: size * size })}
      </p>

      <div
        ref={boardRef}
        className={`relative select-none bg-white${ink ? " abc-dragging" : ""}`}
        style={{ width, height: width, touchAction: "none" }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <style>{`@keyframes abc-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } } .abc-dragging, .abc-dragging * { transition: none !important; animation: none !important; }`}</style>
        <HitGrid size={size} cell={cell} fixed={fixed} shake={shake} downRef={downRef} />
        <svg className="absolute inset-0 z-10 pointer-events-none" width={Math.max(0, width)} height={Math.max(0, width)}>
          {letters.map((letter) => {
            const path = paths[letter] || [];
            if (path.length < 2) return null;
            const points = path.map((key) => {
              const [row, col] = key.split("-").map(Number);
              return `${col * cell + cell / 2},${row * cell + cell / 2}`;
            }).join(" ");
            return (
              <polyline
                key={letter}
                points={points}
                fill="none"
                stroke={COLOR[letter]}
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {ink && (paths[ink] || []).length > 0 && (() => {
            const tip = paths[ink][paths[ink].length - 1];
            const [row, col] = tip.split("-").map(Number);
            return (
              <circle
                data-testid="ink-tip"
                cx={col * cell + cell / 2}
                cy={row * cell + cell / 2}
                r={cell * 0.9}
                fill={COLOR[ink]}
                opacity="0.35"
              />
            );
          })()}
          <line ref={rubberRef} data-testid="rubber-line" strokeWidth="4" strokeLinecap="round" opacity="0.45" visibility="hidden" />
        </svg>
        <LetterGrid size={size} cell={cell} fixed={fixed} selected={selected} />
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-4">
        <button type="button" onClick={checkSolution} disabled={status === "correct" || status === "submitted"} className="bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50">{play.check}</button>
        <ClearBoardButton onClick={() => { pathsRef.current = {}; setPaths({}); checkedSig.current = ""; setSelected(null); setStatus("playing"); setNote(""); }} />
        <button type="button" onClick={reload} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold">{play.newPuzzle}</button>
      </div>
      {note && <p className={`mt-3 ${status === "correct" ? "text-emerald-600" : "text-red-500"}`}>{note}</p>}
      {status === "offline" && <p className="text-[#f4efe6] mt-3">{play.offline}</p>}
      <ScoreNotice phase={savePhase} onRetry={() => save({ paths })} />
    </div>
  );
}
