import ToggleGridGame from "../common/ToggleGridGame";
import { PuzzlePending, useIssuedPuzzle } from "../common/useIssuedPuzzle";
import { useStartingDifficulty } from "../common/useStartingDifficulty";

function placedLengths(marked) {
  const cells = [...marked].map((key) => key.split("-").map(Number));
  const seen = new Set();
  const lengths = [];
  cells.forEach(([row, col]) => {
    const start = `${row}-${col}`;
    if (seen.has(start)) return;
    const group = [];
    const stack = [[row, col]];
    seen.add(start);
    while (stack.length) {
      const [r, c] = stack.pop();
      group.push([r, c]);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const key = `${r + dr}-${c + dc}`;
        if (!marked.has(key) || seen.has(key)) return;
        seen.add(key);
        stack.push([r + dr, c + dc]);
      });
    }
    const sameRow = group.every(([r]) => r === group[0][0]);
    const sameCol = group.every(([, c]) => c === group[0][1]);
    if (sameRow || sameCol) lengths.push(group.length);
  });
  return lengths;
}

function shipDone(ships, marked) {
  const lengths = placedLengths(marked);
  const used = Array(lengths.length).fill(false);
  return ships.map((size) => {
    const index = lengths.findIndex((length, item) => !used[item] && length === size);
    if (index < 0) return false;
    used[index] = true;
    return true;
  });
}

function Fleet({ ships, marked }) {
  if (!ships?.length) return null;
  const done = shipDone(ships, marked);
  return (
    <div data-testid="fleet" className="mb-3 flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2">
      {ships.map((size, index) => (
        <span
          key={`${size}-${index}`}
          data-testid="fleet-ship"
          data-done={done[index] ? "true" : "false"}
          className={`inline-flex items-center gap-0.5 ${done[index] ? "opacity-40" : ""}`}
        >
          {Array.from({ length: size }, (_, cell) => (
            <span key={cell} className={`inline-block h-3.5 w-3.5 border border-[#f4efe6] ${done[index] ? "bg-emerald-500" : "bg-[#1e293b]"}`} />
          ))}
        </span>
      ))}
    </div>
  );
}

export default function AmiralBatti() {
  const [difficulty, setDifficulty] = useStartingDifficulty();
  const { issue, phase, reload } = useIssuedPuzzle("amiral-batti", difficulty);
  if (phase !== "ready") return <PuzzlePending phase={phase} onRetry={reload} />;
  const { rowClues, colClues, rows, cols, ships } = issue.puzzle;

  return (
    <ToggleGridGame
      slug="amiral-batti"
      attemptId={issue.id}
      rows={rows}
      cols={cols}
      rowClues={rowClues}
      colClues={colClues}
      markSymbol="🚢"
      allowCross
      extra={(marked) => <Fleet ships={ships} marked={marked} />}
      onRegenerate={reload}
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
    />
  );
}
