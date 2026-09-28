import { countFleets, identicalShipFactor } from "../common/solvers";

// Gizli Filo: gemiler birbirine değmez. Satır ve sütun sayıları tek bir
// dizilimi tarif edene kadar yeniden denenir.
// rastgele bir filo yerleştirilir. Zorluk; ızgara boyutu ve filo
// büyüklüğüyle ölçeklenir.
const CONFIG = {
  easy: { rows: 5, cols: 5, ships: [3, 2, 1, 1] },
  medium: { rows: 6, cols: 6, ships: [4, 3, 2, 1, 1] },
  hard: { rows: 7, cols: 7, ships: [4, 3, 3, 2, 2, 1, 1] },
};

function placeFleet(rows, cols, shipSizes, deadline) {
  for (let attempt = 0; attempt < 80 && Date.now() < deadline; attempt++) {
    const occupied = new Set();
    let success = true;
    for (const size of shipSizes) {
      let placed = false;
      for (let tries = 0; tries < 300; tries++) {
        const horizontal = Math.random() < 0.5;
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        const cells = [];
        let inBounds = true;
        for (let i = 0; i < size; i++) {
          const rr = horizontal ? r : r + i;
          const cc = horizontal ? c + i : c;
          if (rr >= rows || cc >= cols) {
            inBounds = false;
            break;
          }
          cells.push([rr, cc]);
        }
        if (!inBounds) continue;

        let conflict = false;
        for (const [rr, cc] of cells) {
          for (let dr = -1; dr <= 1 && !conflict; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (occupied.has(`${rr + dr}-${cc + dc}`)) {
                conflict = true;
                break;
              }
            }
          }
          if (conflict) break;
        }
        if (conflict) continue;

        cells.forEach(([rr, cc]) => occupied.add(`${rr}-${cc}`));
        placed = true;
        break;
      }
      if (!placed) {
        success = false;
        break;
      }
    }
    if (success) return occupied;
  }
  return null;
}

export function generate(difficulty = "easy") {
  const { rows, cols, ships } = CONFIG[difficulty] || CONFIG.easy;
  const factor = identicalShipFactor(ships);
  const deadline = Date.now() + 1900;
  while (Date.now() < deadline) {
    const occupied = placeFleet(rows, cols, ships, deadline);
    if (!occupied) continue;
    const solutionSet = [...occupied];
    const rowClues = Array.from({ length: rows }, (_, r) =>
      solutionSet.filter((key) => Number(key.split("-")[0]) === r).length
    );
    const colClues = Array.from({ length: cols }, (_, c) =>
      solutionSet.filter((key) => Number(key.split("-")[1]) === c).length
    );
    if (countFleets(rowClues, colClues, ships, factor + 1) !== factor) continue;
    return { solutionSet, rowClues, colClues, rows, cols, ships: ships.slice() };
  }
  throw new Error("Tek çözüm Gizli Filo üretilemedi");
}
