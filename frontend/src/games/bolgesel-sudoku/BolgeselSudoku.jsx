import GridFillGame from "../common/GridFillGame";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { REGIONS } from "./puzzles";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

const REGION_BG = {
  A: "bg-brand-50",
  B: "bg-amber-50",
  C: "bg-emerald-50",
  D: "bg-rose-50",
};

export default function BolgeselSudoku() {
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("bolgesel-sudoku", difficulty);
  if (phase !== "ready") return <PuzzlePending phase={phase} onRetry={reload} />;
  const puzzle = issue.puzzle.givens;

  function cellClassName(r, c) {
    const region = REGIONS[r][c];
    const classes = [REGION_BG[region]];
    if (c === REGIONS[0].length - 1 || REGIONS[r][c + 1] !== region) classes.push("border-r-4 border-r-slate-700");
    if (r === REGIONS.length - 1 || REGIONS[r + 1][c] !== region) classes.push("border-b-4 border-b-slate-700");
    return classes.join(" ");
  }

  return (
    <GridFillGame
      slug="bolgesel-sudoku"
      attemptId={issue.id}
      puzzle={puzzle}
      maxDigit={4}
      cellClassName={cellClassName}
      onRegenerate={reload}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
    />
  );
}
