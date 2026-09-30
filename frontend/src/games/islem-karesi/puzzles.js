// İşlem karesi: sayılar aradaki işlemle satırın sağına ve sütunun altına eşitlenir.
// Çarpma ve bölme, toplama ve çıkarmadan önce yapılır. 1-9 her sayıda bir kez durur.

const SIZE = { easy: 3, medium: 3, hard: 3 };
const KEEP = { easy: 5, medium: 3, hard: 2 };
const OPS = ["+", "+", "×", "−"];

function shuffle(list, random) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function evaluateLine(values, ops) {
  const nums = values.map(Number);
  const operators = ops.slice();
  let index = 0;
  while (index < operators.length) {
    const op = operators[index];
    if (op !== "×" && op !== "÷") {
      index += 1;
      continue;
    }
    const left = nums[index];
    const right = nums[index + 1];
    let next = null;
    if (op === "×") next = left * right;
    else if (right && left % right === 0) next = left / right;
    if (!Number.isInteger(next)) return null;
    nums.splice(index, 2, next);
    operators.splice(index, 1);
  }
  let total = nums[0];
  for (let step = 0; step < operators.length; step += 1) {
    if (operators[step] === "+") total += nums[step + 1];
    else if (operators[step] === "−") total -= nums[step + 1];
    else return null;
  }
  return total;
}

function lineValues(grid, across, down) {
  const size = grid.length;
  const rows = grid.map((row, index) => evaluateLine(row, across[index]));
  const cols = [];
  for (let col = 0; col < size; col += 1) {
    const values = [];
    const ops = [];
    for (let row = 0; row < size; row += 1) {
      values.push(grid[row][col]);
      if (row < size - 1) ops.push(down[row][col]);
    }
    cols.push(evaluateLine(values, ops));
  }
  return { rows, cols };
}

export function countBoards(puzzle, limit = 2) {
  const size = puzzle.givens.length;
  const grid = puzzle.givens.map((row) => row.slice());
  const used = new Set(grid.flat().filter(Boolean));
  const blanks = [];
  grid.forEach((row, r) => row.forEach((value, c) => {
    if (!value) blanks.push([r, c]);
  }));
  let count = 0;

  function matches() {
    const scored = lineValues(grid, puzzle.across, puzzle.down);
    return scored.rows.every((value, index) => value === puzzle.rowResults[index])
      && scored.cols.every((value, index) => value === puzzle.colResults[index]);
  }

  function place(index) {
    if (count >= limit) return;
    if (index === blanks.length) {
      if (matches()) count += 1;
      return;
    }
    const [row, col] = blanks[index];
    for (let number = 1; number <= 9; number += 1) {
      if (used.has(number)) continue;
      grid[row][col] = number;
      used.add(number);
      const scored = lineValues(grid, puzzle.across, puzzle.down);
      const rowBad = grid[row].every(Boolean) && scored.rows[row] !== puzzle.rowResults[row];
      const colBad = grid.every((line) => line[col]) && scored.cols[col] !== puzzle.colResults[col];
      if (!rowBad && !colBad) place(index + 1);
      used.delete(number);
      grid[row][col] = 0;
      if (count >= limit) return;
    }
  }

  place(0);
  return count;
}

function sprinkleDivision(solution, across, down, random) {
  const size = solution.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      if (random() > 0.4) continue;
      const previous = across[row][col];
      across[row][col] = "÷";
      if (evaluateLine(solution[row], across[row]) === null) across[row][col] = previous;
    }
  }
  for (let col = 0; col < size; col += 1) {
    const values = solution.map((row) => row[col]);
    for (let row = 0; row < size - 1; row += 1) {
      if (random() > 0.4) continue;
      const previous = down[row][col];
      down[row][col] = "÷";
      const ops = down.map((line) => line[col]);
      if (evaluateLine(values, ops) === null) down[row][col] = previous;
    }
  }
}

function randomOps(size, random) {
  const bag = shuffle(OPS, random);
  const across = Array.from({ length: size }, (_, row) => (
    Array.from({ length: size - 1 }, (__, col) => bag[(row + col) % bag.length])
  ));
  const down = Array.from({ length: size - 1 }, (_, row) => (
    Array.from({ length: size }, (__, col) => bag[(row + col + 1) % bag.length])
  ));
  return { across, down };
}

export function generate(difficulty = "easy", random = Math.random) {
  const size = SIZE[difficulty] || 2;
  const keep = KEEP[difficulty] ?? 1;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random).slice(0, size * size);
    const solution = Array.from({ length: size }, (_, row) => (
      numbers.slice(row * size, row * size + size)
    ));
    const { across, down } = randomOps(size, random);
    sprinkleDivision(solution, across, down, random);
    const scored = lineValues(solution, across, down);
    const results = [...scored.rows, ...scored.cols];
    if (results.some((value) => !Number.isInteger(value) || value < 1)) continue;
    let givens = solution.map((row) => row.slice());
    const order = shuffle(givens.flatMap((row, r) => row.map((_, c) => [r, c])), random);
    for (const [row, col] of order) {
      if (givens.flat().filter(Boolean).length <= keep) break;
      const previous = givens[row][col];
      givens[row][col] = 0;
      const puzzle = { givens, across, down, rowResults: scored.rows, colResults: scored.cols };
      if (countBoards(puzzle, 2) !== 1) givens[row][col] = previous;
    }
    givens = givens.map((row) => row.slice());
    const puzzle = {
      givens,
      across,
      down,
      rowResults: scored.rows,
      colResults: scored.cols,
      solution,
    };
    if (countBoards(puzzle, 2) === 1) return puzzle;
  }
  throw new Error("İşlem karesi üretilemedi");
}
