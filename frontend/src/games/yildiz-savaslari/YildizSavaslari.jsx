import ToggleGridGame from "../common/ToggleGridGame";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

export default function YildizSavaslari() {
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("yildiz-savaslari", difficulty);
  if (phase !== "ready") return <PuzzlePending phase={phase} onRetry={reload} />;
  const { rowClues, colClues, regionGrid, size } = issue.puzzle;

  return (
    <ToggleGridGame
      slug="yildiz-savaslari"
      attemptId={issue.id}
      rows={size}
      cols={size}
      rowClues={rowClues}
      colClues={colClues}
      regionGrid={regionGrid}
      markSymbol="★"
      allowCross
      onRegenerate={reload}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
    />
  );
}
