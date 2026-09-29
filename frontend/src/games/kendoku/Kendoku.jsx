import GridFillGame from "../common/GridFillGame";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

export default function Kendoku() {
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("kendoku", difficulty);
  if (phase !== "ready") return <PuzzlePending phase={phase} onRetry={reload} />;
  const { givens: puzzle, cageId, cageAnchor, cageClues } = issue.puzzle;

  function cellClassName(r, c) {
    const id = cageId[r][c];
    const classes = [];
    if (c === cageId[0].length - 1 || cageId[r][c + 1] !== id) classes.push("border-r-4 border-r-slate-700");
    if (r === cageId.length - 1 || cageId[r + 1][c] !== id) classes.push("border-b-4 border-b-slate-700");
    return classes.join(" ");
  }

  function renderOverlay(r, c) {
    const id = cageId[r][c];
    const [ar, ac] = cageAnchor[id];
    if (ar !== r || ac !== c) return null;
    return (
      <span data-testid="cage-label" className="pointer-events-auto absolute top-0.5 left-0.5 text-[11px] font-bold leading-none text-[var(--ink,#1e1a16)] rounded-sm px-0.5">
        {cageClues[id]}
      </span>
    );
  }

  return (
    <GridFillGame
      slug="kendoku"
      attemptId={issue.id}
      puzzle={puzzle}
      maxDigit={puzzle.length}
      cellClassName={cellClassName}
      renderOverlay={renderOverlay}
      onRegenerate={reload}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
    />
  );
}
