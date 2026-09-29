import GridFillGame from "../common/GridFillGame";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

export default function Futoshiki() {
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("futoshiki", difficulty);
  if (phase !== "ready") return <PuzzlePending phase={phase} onRetry={reload} />;
  const { givens: puzzle, horizontal, vertical } = issue.puzzle;

  function renderOverlay(r, c) {
    const h = horizontal.find((x) => x.r === r && x.c === c);
    const v = vertical.find((x) => x.r === r && x.c === c);
    return (
      <>
        {h && (
          <span data-testid="futo-sign" className="pointer-events-auto absolute left-full top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-[var(--ink,#1e1a16)]">
            {h.sign === ">" ? ">" : "<"}
          </span>
        )}
        {v && (
          <span data-testid="futo-sign" className="pointer-events-auto absolute top-full left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-[var(--ink,#1e1a16)]">
            {v.sign === "v" ? "∨" : "∧"}
          </span>
        )}
      </>
    );
  }

  return (
    <GridFillGame
      slug="futoshiki"
      attemptId={issue.id}
      puzzle={puzzle}
      maxDigit={puzzle.length}
      renderOverlay={renderOverlay}
      onRegenerate={reload}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
    />
  );
}
