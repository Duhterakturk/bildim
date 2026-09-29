/** Kullanıcının tahtaya yazdığı değer, başlangıç ipucundan farklı mı. */
export function cellsDiffer(current, initial) {
  if (!current || !initial) return false;
  for (let row = 0; row < current.length; row += 1) {
    for (let col = 0; col < (current[row] || []).length; col += 1) {
      if ((current[row][col] || 0) !== (initial[row]?.[col] || 0)) return true;
    }
  }
  return false;
}

export function notesPresent(notes) {
  if (!notes) return false;
  return notes.some((row) => Array.isArray(row) && row.some((cell) => Array.isArray(cell) && cell.length > 0));
}

export function anyFilled(grid) {
  if (!grid) return false;
  return grid.some((row) => Array.isArray(row) && row.some((cell) => cell != null && cell !== 0 && cell !== false));
}

/** Çit kenarı: false boştur; çizgi ve × kullanıcı işaretidir. */
export function edgesMarked(grid) {
  if (!grid) return false;
  return grid.some((row) => row.some((value) => value !== false));
}

/** Sihirli piramitte ilk satır ipucudur. */
export function pyramidMarked(marks) {
  if (!marks) return false;
  return marks.some((col, row) => row > 0 && col != null);
}

export function pathsDrawn(paths) {
  if (!paths) return false;
  return Object.values(paths).some((path) => Array.isArray(path) && path.length > 0);
}

/**
 * allow: işlem hemen yapılır.
 * ask: onay gerekir.
 * blocked: skor kaydı sürüyor veya yeniden denenebilir; tahta değiştirilmez.
 */
export function discardDecision({ hasWork, solved, savePhase }) {
  if (savePhase === "saving" || savePhase === "offline" || savePhase === "rejected") return "blocked";
  if (solved) return "allow";
  if (!hasWork) return "allow";
  return "ask";
}
