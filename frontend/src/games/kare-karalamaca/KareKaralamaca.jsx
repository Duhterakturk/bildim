import ToggleGridGame from "../common/ToggleGridGame";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

export default function KareKaralamaca() {
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("kare-karalamaca", difficulty);
  if (phase !== "ready") return <PuzzlePending phase={phase} onRetry={reload} />;
  const { rowClues, colClues, size } = issue.puzzle;

  return (
    <ToggleGridGame
      slug="kare-karalamaca"
      attemptId={issue.id}
      rows={size}
      cols={size}
      rowClues={rowClues}
      colClues={colClues}
      markSymbol="■"
      allowCross
      onRegenerate={reload}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
    />
  );
}
