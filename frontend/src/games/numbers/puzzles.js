// Numbers: 3×3, sayılar 1-9 birer kez. Harfler A B C / D E F / G H I.
// Tek yıldızlı harf işleminde yıldızlı kare yazılan işleme eşittir.
// Çok yıldızlı harf işlemi harflerle okunur. Sonuçlu yıldız toplamı veya çarpımı sayıya eşittir.
// Sonuçsuz ★+★=★ ve ★×★=★ sırasızdır: herhangi ikisi üçüncüsünü verir. Bölme tam bölünür.

const LETTERS = "ABCDEFGHI";

function shuffle(list, random) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function cellValue(grid, letter) {
  const index = LETTERS.indexOf(letter);
  if (index < 0) return null;
  const value = grid[Math.floor(index / 3)][index % 3];
  return value || null;
}

function evalSide(grid, text) {
  const raw = String(text).replace(/\s/g, "").replace("×", "*").replace("−", "-");
  if (/^[A-I]$/.test(raw)) return cellValue(grid, raw);
  const match = raw.match(/^([A-I])([+\-*/])([A-I])$/);
  if (!match) return null;
  const left = cellValue(grid, match[1]);
  const right = cellValue(grid, match[3]);
  if (!left || !right) return null;
  if (match[2] === "+") return left + right;
  if (match[2] === "-") return left - right;
  if (match[2] === "*") return left * right;
  if (left % right !== 0) return null;
  return left / right;
}

function unordered(values, op) {
  const [a, b, c] = values;
  if (op === "*") return a * b === c || a * c === b || b * c === a;
  return a + b === c || a + c === b || b + c === a;
}

export function holds(grid, clue) {
  if (clue.kind === "placement") {
    const values = clue.cells.map(letter => cellValue(grid, letter));
    return values.every(Boolean) && (clue.exclude ? values.every(v => !clue.values.includes(v)) : [...values].sort().join() === [...clue.values].sort().join());
  }
  if (clue.kind === "equation") {
    const left = evalSide(grid, clue.left);
    const right = evalSide(grid, clue.right);
    return left !== null && left === right;
  }
  const values = (clue.cells || []).map((letter) => cellValue(grid, letter));
  if (values.some((value) => !value)) return false;
  if (clue.kind === "total") return values.reduce((sum, value) => sum + value, 0) === clue.target;
  if (clue.kind === "relation") return values.length === 3 && unordered(values, clue.op);
  return false;
}

function slot(letter) {
  return letter.charCodeAt(0) - 65;
}

function sideOf(text) {
  const raw = String(text).replace(/\s/g, "").replace("×", "*").replace("−", "-");
  if (/^[A-I]$/.test(raw)) return { kind: "cell", index: slot(raw) };
  const match = raw.match(/^([A-I])([+\-*/])([A-I])$/);
  if (!match) return null;
  return { kind: "op", op: match[2], left: slot(match[1]), right: slot(match[3]) };
}

function readSide(cells, side) {
  if (!side) return null;
  if (side.kind === "cell") return cells[side.index] || null;
  const left = cells[side.left];
  const right = cells[side.right];
  if (!left || !right) return null;
  if (side.op === "+") return left + right;
  if (side.op === "-") return left - right;
  if (side.op === "*") return left * right;
  if (left % right !== 0) return null;
  return left / right;
}

function compiled(clue) {
  if (clue.kind === "placement") return cells => {
    const values = clue.cells.map(letter => cells[slot(letter)]).filter(Boolean);
    return clue.exclude ? values.every(v => !clue.values.includes(v)) : values.every(v => clue.values.includes(v));
  };
  if (clue.kind === "equation") {
    const left = sideOf(clue.left);
    const right = sideOf(clue.right);
    const ready = (cells, side) => {
      if (!side) return false;
      if (side.kind === "cell") return Boolean(cells[side.index]);
      return Boolean(cells[side.left] && cells[side.right]);
    };
    return (cells) => {
      if (!ready(cells, left) || !ready(cells, right)) return true;
      const a = readSide(cells, left);
      const b = readSide(cells, right);
      return a !== null && b !== null && a === b;
    };
  }
  const indexes = (clue.cells || []).map(slot);
  if (clue.kind === "total") {
    const target = clue.target;
    return (cells) => {
      let sum = 0;
      for (const index of indexes) {
        if (!cells[index]) return true;
        sum += cells[index];
      }
      return sum === target;
    };
  }
  if (clue.kind === "relation") {
    const multiply = clue.op === "*";
    return (cells) => {
      const values = indexes.map((index) => cells[index]);
      if (values.some((value) => !value)) return true;
      const [a, b, c] = values;
      if (multiply) return a * b === c || a * c === b || b * c === a;
      return a + b === c || a + c === b || b + c === a;
    };
  }
  return () => false;
}

export function solve(clues) {
  const checks = clues.map(compiled);
  const cells = Array(9).fill(0);
  const used = Array(10).fill(false);
  const found = [];

  function place(index) {
    if (found.length > 1) return;
    if (checks.some((check) => !check(cells))) return;
    if (index === 9) {
      found.push([cells.slice(0, 3), cells.slice(3, 6), cells.slice(6)]);
      return;
    }
    for (let digit = 1; digit <= 9; digit += 1) {
      if (used[digit]) continue;
      used[digit] = true;
      cells[index] = digit;
      place(index + 1);
      cells[index] = 0;
      used[digit] = false;
      if (found.length > 1) return;
    }
  }

  place(0);
  return found;
}

function at(grid, letter) {
  return cellValue(grid, letter);
}

function cluePool(grid) {
  const clues = [];
  const seen = new Set();
  function add(clue) {
    const signature = JSON.stringify(clue);
    if (seen.has(signature) || !holds(grid, clue)) return;
    seen.add(signature);
    clues.push(clue);
  }

  for (const left of LETTERS) {
    for (const first of LETTERS) {
      if (first === left) continue;
      for (const second of LETTERS) {
        if (second === left || second === first) continue;
        const a = at(grid, first);
        const b = at(grid, second);
        if (a + b === at(grid, left)) add({ kind: "equation", left, right: `${first}+${second}` });
        if (a - b === at(grid, left)) add({ kind: "equation", left, right: `${first}-${second}` });
        if (a * b === at(grid, left)) add({ kind: "equation", left, right: `${first}*${second}` });
        if (b && a % b === 0 && a / b === at(grid, left)) add({ kind: "equation", left, right: `${first}/${second}` });
      }
    }
  }

  for (const a of LETTERS) {
    for (const b of LETTERS) {
      if (a === b || !at(grid, b) || at(grid, a) % at(grid, b) !== 0) continue;
      for (const c of LETTERS) {
        if (c === a || c === b) continue;
        for (const d of LETTERS) {
          if (d === a || d === b || d === c || !at(grid, d) || at(grid, c) % at(grid, d) !== 0) continue;
          if (`${a}${b}` > `${c}${d}`) continue;
          if (at(grid, a) / at(grid, b) !== at(grid, c) / at(grid, d)) continue;
          add({ kind: "equation", left: `${a}/${b}`, right: `${c}/${d}` });
        }
      }
    }
  }

  const lists = [];
  for (let i = 0; i < LETTERS.length; i += 1) {
    for (let j = i + 1; j < LETTERS.length; j += 1) lists.push([LETTERS[i], LETTERS[j]]);
    for (let j = i + 1; j < LETTERS.length; j += 1) {
      for (let k = j + 1; k < LETTERS.length; k += 1) lists.push([LETTERS[i], LETTERS[j], LETTERS[k]]);
    }
  }
  lists.forEach((cells) => {
    const values = cells.map((letter) => at(grid, letter));
    if (cells.length >= 2) add({ kind: "total", cells, target: values.reduce((sum, value) => sum + value, 0) });
    if (cells.length === 3 && unordered(values, "+")) add({ kind: "relation", op: "+", cells });
    if (cells.length === 3 && unordered(values, "*")) add({ kind: "relation", op: "*", cells });
  });
  return clues;
}

function isRatio(clue) {
  return clue.kind === "equation" && String(clue.left).includes("/") && String(clue.right).includes("/");
}

function harden(clue) {
  return clue.kind === "relation" || isRatio(clue);
}

function trim(clues) {
  const kept = clues.slice();
  const dropped = [];
  for (let index = 0; index < kept.length;) {
    const next = kept.filter((_, item) => item !== index);
    if (solve(next).length === 1) {
      dropped.push(kept[index]);
      kept.splice(index, 1);
    } else {
      index += 1;
    }
  }
  return { kept, dropped };
}

export function generate(difficulty = "easy", random = Math.random) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
    const solution = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)];
    const groups = [["A","B","C"],["D","E","F"],["G","H","I"],["A","D","G"],["B","E","H"],["C","F","I"]];
    const placements = groups.flatMap(cells => {
      const values = cells.map(letter => cellValue(solution, letter));
      return [{kind:"placement",cells,values}, {kind:"placement",cells,values:digits.filter(v=>!values.includes(v)).slice(0,2),exclude:true}];
    });
    const pool = shuffle([...cluePool(solution).filter(c => c.kind !== "equation"), ...placements], random);
    const clues = [];
    let unique = false;
    for (const clue of pool) {
      clues.push(clue);
      const found = solve(clues);
      if (found.length === 1) {
        unique = true;
        break;
      }
      if (found.length === 0) clues.pop();
    }
    if (!unique) continue;
    const { kept, dropped } = trim(clues);
    if (difficulty === "hard" && !kept.some(harden)) continue;
    const spare = difficulty === "easy"
      ? 2 + Math.floor(random() * 2)
      : difficulty === "medium" ? 1 : 0;
    const totals = shuffle(dropped.filter((clue) => clue.kind === "total"), random);
    const others = shuffle(dropped.filter((clue) => clue.kind !== "total"), random);
    const back = (difficulty === "easy" ? [...totals, ...others] : shuffle(dropped, random)).slice(0, spare);
    return { clues: shuffle([...kept, ...back], random), solution };
  }
  throw new Error("Sayı bulmacası üretilemedi");
}
