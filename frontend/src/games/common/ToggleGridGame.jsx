import { Fragment, useEffect, useRef, useState } from "react";
import { scoreStatus } from "../../api/client";
import { checkPuzzle } from "../../api/games";
import { ScoreNotice, useAutoScore } from "./useAutoScore";
import ClearBoardButton from "./ClearBoardButton";
import DifficultyPicker from "../../components/games/DifficultyPicker";
import { useApplyCellHint } from "./cellHint";
import { useGameText } from "./gameText";
import { applyMarkCycle } from "./markCycle";
import { pathArms } from "./pathValidation";
import { usePlayCopy } from "./playCopy";

const REGION_BG = [
  "bg-amber-200",
  "bg-sky-200",
  "bg-emerald-200",
  "bg-rose-200",
  "bg-violet-200",
  "bg-orange-300",
  "bg-teal-200",
  "bg-lime-200",
  "bg-fuchsia-200",
];

function regionColors(regionGrid) {
  if (!regionGrid) return null;
  const neighbors = new Map();
  for (let r = 0; r < regionGrid.length; r += 1) {
    for (let c = 0; c < regionGrid[r].length; c += 1) {
      const id = regionGrid[r][c];
      if (!neighbors.has(id)) neighbors.set(id, new Set());
      const link = (other) => {
        if (other === id) return;
        if (!neighbors.has(other)) neighbors.set(other, new Set());
        neighbors.get(id).add(other);
        neighbors.get(other).add(id);
      };
      if (c + 1 < regionGrid[r].length) link(regionGrid[r][c + 1]);
      if (r + 1 < regionGrid.length) link(regionGrid[r + 1][c]);
    }
  }
  const color = new Map();
  for (const id of neighbors.keys()) {
    const used = new Set();
    for (const next of neighbors.get(id)) if (color.has(next)) used.add(color.get(next));
    let pick = 0;
    while (used.has(pick)) pick += 1;
    color.set(id, pick % REGION_BG.length);
  }
  return color;
}

function PathStroke({ row, col, marked, fixedCells }) {
  const arms = pathArms(row, col, marked, fixedCells);
  const alone = !arms.up && !arms.down && !arms.left && !arms.right;
  return (
    <span className="absolute inset-0">
      {alone && <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />}
      {arms.left && <span className="absolute left-0 top-1/2 h-1.5 w-1/2 -translate-y-1/2 bg-white" />}
      {arms.right && <span className="absolute right-0 top-1/2 h-1.5 w-1/2 -translate-y-1/2 bg-white" />}
      {arms.up && <span className="absolute left-1/2 top-0 h-1/2 w-1.5 -translate-x-1/2 bg-white" />}
      {arms.down && <span className="absolute bottom-0 left-1/2 h-1/2 w-1.5 -translate-x-1/2 bg-white" />}
    </span>
  );
}

function cellSizeClass(gridWidth) {
  if (gridWidth >= 8) return "w-8 h-8 text-sm";
  if (gridWidth >= 6) return "w-9 h-9";
  return "w-10 h-10";
}

/**
 * Hücre tıklayarak işaretleme mekaniğine sahip oyunlar için paylaşılan iskelet.
 * `allowCross` açıkken tık: boş → işaret → X → boş. Çözüme yalnızca işaret gider.
 */
export default function ToggleGridGame({
  slug,
  instructions,
  rows,
  cols,
  attemptId,
  fixedCells = {},
  rowClues,
  colClues,
  regionGrid,
  markSymbol = "●",
  flowMarks = false,
  allowCross = false,
  extra,
  onRegenerate,
  difficulty,
  onDifficultyChange,
  validate,
  answerFrom,
}) {
  const copy = useGameText(slug);
  const play = usePlayCopy();
  const blurb = instructions || copy.rules;
  const [marked, setMarked] = useState(() => new Set());
  const [crossed, setCrossed] = useState(() => new Set());
  const [status, setStatus] = useState("playing");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const doneSig = useRef("");
  const { phase: savePhase, save } = useAutoScore(attemptId);

  function currentAnswer() {
    return answerFrom ? answerFrom(marked) : { cells: [...marked] };
  }

  useEffect(() => {
    setMarked(new Set());
    setCrossed(new Set());
    setStatus("playing");
    setSeconds(0);
    doneSig.current = "";
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptId]);

  useApplyCellHint(attemptId, (hint) => {
    const keys = [];
    if (hint.kind === "mark") keys.push(`${hint.row}-${hint.col}`);
    if (hint.kind === "marks" && Array.isArray(hint.cells)) keys.push(...hint.cells);
    if (!keys.length) return;
    setMarked((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => {
        if (fixedCells[key] === undefined) next.add(key);
      });
      return next;
    });
    setCrossed((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => next.delete(key));
      return next;
    });
  });

  function clearBoard() {
    setMarked(new Set());
    setCrossed(new Set());
    setStatus("playing");
  }

  function toggleCell(r, c) {
    const key = `${r}-${c}`;
    if (fixedCells[key] !== undefined || status === "correct") return;
    if (allowCross) {
      const next = applyMarkCycle(marked, crossed, key);
      setMarked(next.marked);
      setCrossed(next.crossed);
    } else {
      setMarked((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }
    setStatus("playing");
  }

  async function checkSolution() {
    const answer = currentAnswer();
    if (validate) {
      const isCorrect = validate(marked, fixedCells);
      setStatus(isCorrect ? "correct" : "incorrect");
      if (isCorrect) {
        clearInterval(timerRef.current);
        save(answer);
      }
      return;
    }
    if (!attemptId) return;
    try {
      const correct = await checkPuzzle(attemptId, answer);
      setStatus(correct ? "correct" : "incorrect");
      if (correct) {
        clearInterval(timerRef.current);
        save(answer);
      }
    } catch (error) {
      setStatus(scoreStatus(error));
    }
  }

  const book = slug === "kare-karalamaca";
  const hasClues = rowClues || colClues;
  const gridCols = cols + (hasClues ? 1 : 0);
  const cellSize = book ? "" : cellSizeClass(gridCols);
  const bookCell = book ? { width: `min(2.5rem, calc((100vw - 2rem) / ${gridCols}))`, height: `min(2.5rem, calc((100vw - 2rem) / ${gridCols}))` } : undefined;
  const clueCell = book
    ? "flex items-center justify-center text-xs font-bold text-center leading-tight bg-violet-100 text-violet-900"
    : `${cellSize} board-clue flex items-center justify-center text-xs font-bold text-[#f4efe6] text-center leading-tight`;

  function toneClass(tone) {
    if (tone === "done") return "text-violet-300";
    if (tone === "over") return "text-red-600";
    return "";
  }

  const rowFlags = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => marked.has(`${r}-${c}`)));
  const colFlags = Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, r) => marked.has(`${r}-${c}`)));
  const boardFull = book && rowFlags.every((row, r) => row.every((_, c) => marked.has(`${r}-${c}`) || crossed.has(`${r}-${c}`)));
  const cluesHold = book && boardFull
    && rowClues.every((clue, r) => clueTone(clue, rowFlags[r]) === "done")
    && colClues.every((clue, c) => clueTone(clue, colFlags[c]) === "done");

  useEffect(() => {
    if (!cluesHold || !attemptId || status === "correct" || status === "submitted") return undefined;
    const signature = [...marked].sort().join("|");
    if (doneSig.current === signature) return undefined;
    doneSig.current = signature;
    const answer = answerFrom ? answerFrom(marked) : { cells: [...marked] };
    const token = attemptId;
    (async () => {
      try {
        const correct = await checkPuzzle(token, answer);
        if (!correct) {
          setStatus("incorrect");
          return;
        }
        clearInterval(timerRef.current);
        setStatus("correct");
        save(answer);
      } catch (error) {
        setStatus(scoreStatus(error));
      }
    })();
    return undefined;
  }, [cluesHold, attemptId, status, marked, answerFrom]);

  function runsOf(flags) {
    const runs = [];
    let count = 0;
    for (const bit of flags) {
      if (bit) count += 1;
      else if (count) {
        runs.push(count);
        count = 0;
      }
    }
    if (count) runs.push(count);
    return runs.length ? runs : [0];
  }

  function clueTone(expected, flags) {
    if (!book || !Array.isArray(expected)) return "open";
    const actual = runsOf(flags);
    const want = expected.map(Number);
    if (actual.length === want.length && actual.every((value, index) => value === want[index])) return "done";
    const wanted = want.length === 1 && want[0] === 0 ? 0 : want.reduce((sum, value) => sum + value, 0);
    if (flags.filter(Boolean).length > wanted) return "over";
    return "open";
  }

  function renderClue(value, stacked) {
    if (Array.isArray(value) && stacked) {
      return (
        <span className="flex flex-col items-center justify-end leading-none gap-0.5">
          {value.map((part, index) => <span key={index}>{part}</span>)}
        </span>
      );
    }
    if (Array.isArray(value)) return value.join(" ");
    return value;
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{copy.title}</h1>
      {onDifficultyChange && (
        <DifficultyPicker gameSlug={slug} value={difficulty} onChange={onDifficultyChange} />
      )}
      {blurb && <p className="text-slate-500 text-sm mb-2 max-w-md text-center">{blurb}</p>}
      {allowCross && <p className="text-slate-500 text-xs mb-2 max-w-md text-center">{play.crossHint}</p>}
      <p className="text-slate-500 text-sm mb-4">{play.clock(seconds)}</p>

      {typeof extra === "function" ? extra(marked) : extra}

      <div
        data-testid="shade-board"
        className="inline-grid max-w-full"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
        {hasClues && <div className={clueCell} style={bookCell} />}
        {hasClues && colClues.map((v, i) => (
          <div key={`cc-${i}`} className={`${clueCell} ${book ? "items-end" : ""} ${toneClass(clueTone(v, colFlags[i]))}`} style={book ? { width: bookCell.width, minHeight: bookCell.height } : undefined}>{renderClue(v, book)}</div>
        ))}

        {Array.from({ length: rows }).map((_, r) => (
          <Fragment key={r}>
            {hasClues && (
              <div key={`rc-${r}`} className={`${clueCell} ${toneClass(clueTone(rowClues?.[r], rowFlags[r]))}`} style={bookCell}>
                {rowClues ? renderClue(rowClues[r], false) : ""}
              </div>
            )}
            {Array.from({ length: cols }).map((_, c) => {
              const key = `${r}-${c}`;
              const fixedLabel = fixedCells[key];
              const isMarked = marked.has(key);
              const isCrossed = crossed.has(key);
              const regionPaint = regionColors(regionGrid);
              const regionId = regionGrid ? regionGrid[r][c] : null;
              const regionEdge = regionGrid
                ? [
                    c + 1 < cols && regionGrid[r][c + 1] !== regionId ? "border-r-[3px] border-r-slate-800" : "",
                    r + 1 < rows && regionGrid[r + 1][c] !== regionId ? "border-b-[3px] border-b-slate-800" : "",
                  ].join(" ")
                : "";
              const regionClass = regionGrid ? `${REGION_BG[regionPaint.get(regionId)]} ${regionEdge}` : "bg-white";
              if (fixedLabel !== undefined) {
                return (
                  <div
                    key={key}
                    className={`${cellSize} flex items-center justify-center border border-slate-300 bg-slate-800 text-white font-bold text-sm`}
                    style={bookCell}
                  >
                    {fixedLabel}
                  </div>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCell(r, c)}
                  style={bookCell}
                  className={[
                    cellSize,
                    "relative flex items-center justify-center border border-slate-300 text-lg",
                    isMarked
                      ? (book ? "bg-slate-900 text-slate-900" : "bg-brand-500 text-white")
                      : isCrossed
                        ? `${book ? "bg-white text-slate-400 text-xs" : `${regionClass} text-slate-500`}`
                        : `${regionClass} hover:bg-brand-50`,
                  ].join(" ")}
                >
                  {isMarked
                    ? flowMarks
                      ? <PathStroke row={r} col={c} marked={marked} fixedCells={fixedCells} />
                      : (book ? "" : markSymbol)
                    : isCrossed
                      ? "×"
                      : ""}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={checkSolution}
          className="bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-600"
        >
          {play.check}
        </button>
        <ClearBoardButton onClick={clearBoard} />
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300"
          >
            {play.newPuzzle}
          </button>
        )}
      </div>

      {status === "correct" && <p className="play-correct text-emerald-600 mt-3">{play.correct}</p>}
      {status === "incorrect" && <p className="text-red-500 mt-3">{play.incorrect}</p>}
      {status === "rejected" && <p className="text-red-500 mt-3">{play.rejected}</p>}
      {status === "offline" && <p className="text-[#f4efe6] mt-3">{play.offline}</p>}
      <ScoreNotice phase={savePhase} onRetry={() => save(currentAnswer())} />
    </div>
  );
}
