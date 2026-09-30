const INK = "#1e1a16";
const PAPER = "#f6f3ec";
const LINE = "#c9c0b4";

function Sheet({ children, fill = PAPER }) {
  return (
    <svg viewBox="0 0 160 110" aria-hidden="true" className="h-full w-auto max-w-full">
      <rect width="160" height="110" rx="10" fill={fill} />
      {children}
    </svg>
  );
}

function label(x, y, value, size = 8, fill = INK, weight = 700) {
  return (
    <text
      key={`${x}-${y}-${value}`}
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      fontFamily="ui-sans-serif, system-ui, sans-serif"
    >
      {value}
    </text>
  );
}

function gridLines(x, y, n, size, thick = 0) {
  const lines = [];
  for (let i = 0; i <= n; i += 1) {
    const heavy = thick && i % thick === 0;
    const width = heavy ? 1.8 : 0.55;
    const color = heavy ? INK : LINE;
    lines.push(<line key={`h-${i}`} x1={x} y1={y + i * size} x2={x + n * size} y2={y + i * size} stroke={color} strokeWidth={width} />);
    lines.push(<line key={`v-${i}`} x1={x + i * size} y1={y} x2={x + i * size} y2={y + n * size} stroke={color} strokeWidth={width} />);
  }
  return lines;
}

function Sudoku() {
  const x = 35;
  const y = 10;
  const size = 10;
  const digits = { "0-0": 5, "1-4": 3, "2-7": 9, "3-2": 8, "4-4": 1, "5-8": 6, "6-1": 4, "7-6": 2, "8-3": 7 };
  return (
    <Sheet>
      {gridLines(x, y, 9, size, 3)}
      {Object.entries(digits).map(([key, value]) => {
        const [row, col] = key.split("-").map(Number);
        return label(x + col * size + size / 2, y + row * size + size / 2, value, 6.5);
      })}
    </Sheet>
  );
}

function Jigsaw() {
  const x = 48;
  const y = 23;
  const size = 16;
  const regions = [
    [0, 0, 1, 1],
    [0, 2, 1, 1],
    [2, 2, 3, 1],
    [2, 3, 3, 3],
  ];
  const digits = { "0-1": 2, "1-3": 4, "2-0": 1, "3-2": 3 };
  const edges = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      if (col < 3 && regions[row][col] !== regions[row][col + 1]) {
        edges.push([x + (col + 1) * size, y + row * size, x + (col + 1) * size, y + (row + 1) * size]);
      }
      if (row < 3 && regions[row][col] !== regions[row + 1][col]) {
        edges.push([x + col * size, y + (row + 1) * size, x + (col + 1) * size, y + (row + 1) * size]);
      }
    }
  }
  return (
    <Sheet>
      {gridLines(x, y, 4, size)}
      {edges.map(([x1, y1, x2, y2], index) => (
        <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth="2.6" />
      ))}
      <rect x={x} y={y} width={size * 4} height={size * 4} fill="none" stroke={INK} strokeWidth="2.4" />
      {Object.entries(digits).map(([key, value]) => {
        const [row, col] = key.split("-").map(Number);
        return label(x + col * size + size / 2, y + row * size + size / 2, value, 9);
      })}
    </Sheet>
  );
}

function Kakuro() {
  const x = 40;
  const y = 15;
  const size = 16;
  const rows = ["bbccc", "cwwwc", "cwwww", "bcwww", "bccbb"];
  return (
    <Sheet>
      {rows.map((row, r) => [...row].map((kind, c) => {
        const left = x + c * size;
        const top = y + r * size;
        if (kind === "b") return <rect key={`${r}-${c}`} x={left} y={top} width={size} height={size} fill="#4a4a4a" />;
        if (kind === "w") {
          return (
            <g key={`${r}-${c}`}>
              <rect x={left} y={top} width={size} height={size} fill="#fff" stroke={LINE} strokeWidth="0.6" />
              {(r + c) % 3 === 0 ? label(left + size / 2, top + size / 2, ((r + c) % 7) + 1, 8) : null}
            </g>
          );
        }
        return (
          <g key={`${r}-${c}`}>
            <rect x={left} y={top} width={size} height={size} fill="#cfe3cf" stroke="#6d8a6d" strokeWidth="0.6" />
            <line x1={left} y1={top} x2={left + size} y2={top + size} stroke="#243024" strokeWidth="0.7" />
            {label(left + size - 4, top + 5, 4 + c, 6)}
            {label(left + 4, top + size - 4, 9 + r, 6)}
          </g>
        );
      }))}
    </Sheet>
  );
}

function Kendoku() {
  const x = 40;
  const y = 15;
  const size = 20;
  return (
    <Sheet>
      <rect x={x} y={y} width={size * 4} height={size * 4} fill="#fff" stroke={LINE} />
      {gridLines(x, y, 4, size)}
      <rect x={x + 1} y={y + 1} width={size * 2 - 2} height={size * 2 - 2} fill="none" stroke={INK} strokeWidth="2.4" />
      <rect x={x + size * 2 + 1} y={y + 1} width={size * 2 - 2} height={size * 3 - 2} fill="none" stroke={INK} strokeWidth="2.4" />
      <rect x={x + 1} y={y + size * 2 + 1} width={size * 2 - 2} height={size * 2 - 2} fill="none" stroke={INK} strokeWidth="2.4" />
      {label(x + 12, y + 8, "6+", 8, "#2461f7")}
      {label(x + size * 2 + 13, y + 8, "11+", 8, "#2461f7")}
      {label(x + 11, y + size * 2 + 8, "3", 8, "#2461f7")}
      {label(x + size + size / 2, y + size + size / 2, 2, 9)}
      {label(x + size * 3 + size / 2, y + size * 2 + size / 2, 4, 9)}
    </Sheet>
  );
}

function Futoshiki() {
  const x = 28;
  const y = 18;
  const size = 16;
  const gap = 8;
  const digits = { "0-0": 1, "0-2": 3, "1-1": 2, "2-3": 4, "3-0": 2 };
  const signs = [
    [0, 0, "<"],
    [0, 2, ">"],
    [1, 1, "<"],
    [2, 0, ">"],
    [3, 1, "<"],
  ];
  return (
    <Sheet>
      {[0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((col) => {
        const left = x + col * (size + gap);
        const top = y + row * (size + gap);
        const key = `${row}-${col}`;
        return (
          <g key={key}>
            <rect x={left} y={top} width={size} height={size} fill="#fff" stroke={LINE} />
            {digits[key] ? label(left + size / 2, top + size / 2, digits[key], 9) : null}
          </g>
        );
      }))}
      {signs.map(([row, col, sign]) => label(
        x + col * (size + gap) + size + gap / 2,
        y + row * (size + gap) + size / 2,
        sign,
        9,
        "#2461f7",
      ))}
    </Sheet>
  );
}

function Apartman() {
  const x = 38;
  const y = 13;
  const size = 14;
  const top = [2, 1, 3, 2];
  const left = [3, 2, 1, 2];
  const right = [1, 2, 3, 1];
  const bottom = [1, 3, 2, 2];
  const filled = { "0-2": 3, "1-0": 1, "2-3": 4, "3-1": 2 };
  return (
    <Sheet>
      <rect x="30" y="6" width="100" height="98" rx="6" fill="#1a1a1a" />
      {top.map((value, col) => label(x + (col + 1) * size + size / 2, y + size / 2, value, 8, "#f4efe6"))}
      {bottom.map((value, col) => label(x + (col + 1) * size + size / 2, y + 5 * size + size / 2, value, 8, "#f4efe6"))}
      {left.map((value, row) => label(x + size / 2, y + (row + 1) * size + size / 2, value, 8, "#f4efe6"))}
      {right.map((value, row) => label(x + 5 * size + size / 2, y + (row + 1) * size + size / 2, value, 8, "#f4efe6"))}
      {[0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((col) => {
        const key = `${row}-${col}`;
        return (
          <g key={key}>
            <rect x={x + (col + 1) * size} y={y + (row + 1) * size} width={size} height={size} fill="#fff" stroke={LINE} />
            {filled[key] ? label(x + (col + 1) * size + size / 2, y + (row + 1) * size + size / 2, filled[key], 8) : null}
          </g>
        );
      }))}
    </Sheet>
  );
}

function Carpmaca() {
  const x = 28;
  const y = 14;
  const size = 22;
  const headers = [8, 18, 15];
  const rows = [6, 12, 30];
  const given = { "0-0": 2, "1-2": 3, "2-1": 6 };
  return (
    <Sheet>
      <rect x={x} y={y} width={size} height={size} fill="#1e293b" />
      {label(x + size / 2, y + size / 2, "1–6", 8, "#fff")}
      {headers.map((value, index) => (
        <g key={`c-${value}`}>
          <rect x={x + (index + 1) * size} y={y} width={size} height={size} fill="#1e293b" />
          {label(x + (index + 1) * size + size / 2, y + size / 2, value, 10, "#fff")}
        </g>
      ))}
      {rows.map((value, row) => (
        <g key={`r-${value}`}>
          <rect x={x} y={y + (row + 1) * size} width={size} height={size} fill="#1e293b" />
          {label(x + size / 2, y + (row + 1) * size + size / 2, value, 10, "#fff")}
          {headers.map((_, col) => {
            const key = `${row}-${col}`;
            return (
              <g key={key}>
                <rect x={x + (col + 1) * size} y={y + (row + 1) * size} width={size} height={size} fill={given[key] ? "#f1f5f9" : "#fff"} stroke={LINE} />
                {given[key] ? label(x + (col + 1) * size + size / 2, y + (row + 1) * size + size / 2, given[key], 9) : null}
              </g>
            );
          })}
        </g>
      ))}
    </Sheet>
  );
}

function Islem() {
  const cells = [
    [34, 22, 3],
    [78, 22, 1],
    [34, 62, 2],
    [78, 62, 4],
  ];
  return (
    <Sheet fill="#1c1c1c">
      {cells.map(([cx, cy, value]) => (
        <g key={`${cx}-${cy}`}>
          <rect x={cx} y={cy} width={26} height={26} fill="#fff" stroke={LINE} />
          {label(cx + 13, cy + 13, value, 12)}
        </g>
      ))}
      {label(68, 35, "+", 14, "#f4efe6")}
      {label(68, 75, "×", 14, "#f4efe6")}
      {label(47, 55, "−", 14, "#f4efe6")}
      {label(91, 55, "+", 14, "#f4efe6")}
      {label(128, 35, "= 4", 10, "#f4efe6")}
      {label(128, 75, "= 8", 10, "#f4efe6")}
    </Sheet>
  );
}

function Stars() {
  const x = 36;
  const y = 11;
  const size = 22;
  const regions = [
    [0, 0, 1, 1],
    [0, 2, 1, 1],
    [3, 2, 2, 1],
    [3, 3, 2, 2],
  ];
  const fills = ["#fde68a", "#bae6fd", "#a7f3d0", "#fecdd3"];
  const stars = new Set(["0-1", "1-3", "2-0", "3-2"]);
  return (
    <Sheet>
      {regions.map((row, r) => row.map((id, c) => {
        const key = `${r}-${c}`;
        const left = x + c * size;
        const top = y + r * size;
        const rightEdge = c < 3 && regions[r][c + 1] !== id;
        const bottomEdge = r < 3 && regions[r + 1][c] !== id;
        return (
          <g key={key}>
            <rect x={left} y={top} width={size} height={size} fill={fills[id]} stroke={LINE} />
            {rightEdge ? <line x1={left + size} y1={top} x2={left + size} y2={top + size} stroke={INK} strokeWidth="2.4" /> : null}
            {bottomEdge ? <line x1={left} y1={top + size} x2={left + size} y2={top + size} stroke={INK} strokeWidth="2.4" /> : null}
            {stars.has(key) ? label(left + size / 2, top + size / 2, "★", 12, "#1e293b") : null}
          </g>
        );
      }))}
      <rect x={x} y={y} width={size * 4} height={size * 4} fill="none" stroke={INK} strokeWidth="1.4" />
    </Sheet>
  );
}

function Battleship() {
  const x = 34;
  const y = 10;
  const size = 15;
  const ships = new Set(["1-1", "1-2", "1-3", "3-1", "4-3", "4-4"]);
  const colClues = [0, 3, 1, 0, 2];
  const rowClues = [0, 3, 0, 1, 2];
  return (
    <Sheet fill="#102033">
      {colClues.map((value, col) => label(x + (col + 1) * size + size / 2, y + size / 2, value, 8, "#f4efe6"))}
      {rowClues.map((value, row) => label(x + size / 2, y + (row + 1) * size + size / 2, value, 8, "#f4efe6"))}
      {rowClues.map((_, row) => colClues.map((_, col) => {
        const key = `${row}-${col}`;
        return (
          <rect
            key={key}
            x={x + (col + 1) * size}
            y={y + (row + 1) * size}
            width={size}
            height={size}
            fill={ships.has(key) ? "#2461f7" : "#e8eef6"}
            stroke="#334155"
          />
        );
      }))}
    </Sheet>
  );
}

function Nonogram() {
  const x = 46;
  const y = 28;
  const size = 14;
  const marks = new Set(["0-0", "0-1", "0-2", "1-0", "2-2", "2-3", "3-1", "3-2"]);
  const colClues = ["1", "2", "3", "1"];
  const rowClues = ["3", "1", "2", "2"];
  return (
    <Sheet>
      {colClues.map((value, col) => label(x + col * size + size / 2, y - 8, value, 8, "#5b21b6"))}
      {rowClues.map((value, row) => label(x - 10, y + row * size + size / 2, value, 8, "#5b21b6"))}
      {rowClues.map((_, row) => colClues.map((__, col) => {
        const key = `${row}-${col}`;
        return (
          <rect
            key={key}
            x={x + col * size}
            y={y + row * size}
            width={size}
            height={size}
            fill={marks.has(key) ? "#0f172a" : "#fff"}
            stroke="#ddd6fe"
          />
        );
      }))}
    </Sheet>
  );
}

function Cit() {
  const dots = [28, 58, 88, 118];
  const ys = [18, 48, 78];
  const numbers = [[2, 1, 3], [2, 3, 1]];
  return (
    <Sheet>
      {numbers.map((row, r) => row.map((value, c) => label((dots[c] + dots[c + 1]) / 2, (ys[r] + ys[r + 1]) / 2, value, 11, "#57534e", 600)))}
      <polyline points="28,18 88,18 88,78 28,78 28,18" fill="none" stroke="#1d4ed8" strokeWidth="3.2" strokeLinejoin="round" />
      {ys.map((py) => dots.map((px) => <circle key={`${px}-${py}`} cx={px} cy={py} r="2.4" fill={INK} />))}
    </Sheet>
  );
}

function Patika() {
  const x = 36;
  const y = 15;
  const size = 20;
  const black = new Set(["0-3", "2-1"]);
  return (
    <Sheet>
      {[0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((col) => (
        <rect
          key={`${row}-${col}`}
          x={x + col * size}
          y={y + row * size}
          width={size}
          height={size}
          fill={black.has(`${row}-${col}`) ? "#1e293b" : "#fff"}
          stroke={LINE}
        />
      )))}
      <path d="M46 25 H86 V45 H106 V85 H66" fill="none" stroke="#2461f7" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </Sheet>
  );
}

function Abc() {
  return (
    <Sheet>
      <path d="M36 70 C52 70 52 38 78 38" fill="none" stroke="#e11d48" strokeWidth="4" strokeLinecap="round" />
      <path d="M78 78 C96 78 100 70 124 58" fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 40 C58 28 70 28 86 40" fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />
      {[["A", 36, 74, "#e11d48"], ["A", 78, 34, "#e11d48"], ["B", 78, 82, "#2563eb"], ["B", 124, 54, "#2563eb"], ["C", 36, 36, "#16a34a"], ["C", 90, 42, "#16a34a"]].map(([letter, cx, cy, color]) => (
        <g key={`${letter}-${cx}`}>
          <circle cx={cx} cy={cy} r="11" fill={color} />
          {label(cx, cy, letter, 11, "#fff")}
        </g>
      ))}
    </Sheet>
  );
}

function Pyramid() {
  const rows = [[4], [1, 3], [2, 4, 1], [3, 2, 4, 1]];
  return (
    <Sheet>
      {rows.map((row, r) => row.map((value, c) => {
        const cx = 80 + (c - (row.length - 1) / 2) * 28;
        const cy = 18 + r * 24;
        const onPath = (r === 0 && c === 0) || (r === 1 && c === 0) || (r === 2 && c === 1) || (r === 3 && c === 1);
        return (
          <g key={`${r}-${c}`}>
            <circle cx={cx} cy={cy} r="10" fill="#fff" stroke={onPath ? "#2461f7" : LINE} strokeWidth={onPath ? 2.4 : 1} />
            {label(cx, cy, value, 9)}
          </g>
        );
      }))}
    </Sheet>
  );
}

function Pentomino() {
  const pieces = [
    { color: "#2461f7", ox: 18, oy: 28, cells: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]] },
    { color: "#f59e0b", ox: 68, oy: 22, cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
    { color: "#10b981", ox: 112, oy: 34, cells: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]] },
  ];
  const cell = 12;
  return (
    <Sheet>
      {pieces.map((piece) => piece.cells.map(([row, col]) => (
        <rect
          key={`${piece.ox}-${row}-${col}`}
          x={piece.ox + col * cell}
          y={piece.oy + row * cell}
          width={cell - 1.5}
          height={cell - 1.5}
          rx="1.5"
          fill={piece.color}
        />
      )))}
    </Sheet>
  );
}

function Metaforms() {
  const cells = [
    [".", "X"],
    ["BT", "#"],
  ];
  return (
    <Sheet>
      <rect x="22" y="28" width="116" height="54" rx="8" fill="#fff" stroke="#cbd5e1" />
      <circle cx="36" cy="55" r="4" fill="#cbd5e1" />
      <rect x="50" y="44" width="20" height="20" rx="2" fill="#e11d48" />
      {cells.map((row, r) => row.map((token, c) => {
        const left = 84 + c * 18;
        const top = 40 + r * 18;
        return (
          <g key={`${r}-${c}`}>
            <rect x={left} y={top} width="16" height="16" fill={token === "#" ? "#e2e8f0" : "#fff"} stroke="#cbd5e1" />
            {token === "X" ? label(left + 8, top + 8, "✕", 10, "#e11d48") : null}
            {token === "BT" ? <polygon points={`${left + 8},${top + 3} ${left + 13},${top + 13} ${left + 3},${top + 13}`} fill="#2461f7" /> : null}
            {token === "#" ? <line x1={left + 2} y1={top + 14} x2={left + 14} y2={top + 2} stroke="#94a3b8" strokeWidth="1.4" /> : null}
          </g>
        );
      }))}
    </Sheet>
  );
}

function Numbers() {
  const stars = new Set([0, 4, 8]);
  return (
    <Sheet>
      <rect x="46" y="14" width="68" height="82" rx="8" fill="#fff" stroke={LINE} />
      {[0, 1, 2].map((row) => [0, 1, 2].map((col) => {
        const index = row * 3 + col;
        return (
          <g key={index}>
            <rect x={54 + col * 16} y={22 + row * 16} width="14" height="14" fill="#fff" stroke={LINE} />
            {stars.has(index) ? label(61 + col * 16, 29 + row * 16, "★", 9, "#1e293b") : null}
          </g>
        );
      }))}
      {label(80, 82, "★+★=★", 9)}
    </Sheet>
  );
}

function Colours() {
  const marks = [
    [".", "V", "X"],
    ["V", ".", "."],
    [".", "X", "V"],
  ];
  return (
    <Sheet>
      <rect x="24" y="22" width="112" height="66" rx="8" fill="#fff" stroke="#cbd5e1" />
      <circle cx="46" cy="40" r="7" fill="#2461f7" />
      <circle cx="46" cy="59" r="7" fill="#eab308" />
      <circle cx="46" cy="76" r="7" fill="#16a34a" />
      {marks.map((row, r) => row.map((mark, c) => (
        <g key={`${r}-${c}`}>
          <rect x={68 + c * 18} y={32 + r * 16} width="16" height="14" fill="#fff" stroke="#cbd5e1" />
          {mark === "V" ? label(76 + c * 18, 39 + r * 16, "✓", 9, "#059669") : null}
          {mark === "X" ? label(76 + c * 18, 39 + r * 16, "✕", 9, "#e11d48") : null}
        </g>
      )))}
    </Sheet>
  );
}

const PREVIEWS = {
  sudoku: Sudoku,
  "bolgesel-sudoku": Jigsaw,
  kakuro: Kakuro,
  kendoku: Kendoku,
  futoshiki: Futoshiki,
  apartman: Apartman,
  carpmaca: Carpmaca,
  "islem-karesi": Islem,
  "yildiz-savaslari": Stars,
  "amiral-batti": Battleship,
  "kare-karalamaca": Nonogram,
  cit: Cit,
  patika: Patika,
  "abc-baglama": Abc,
  "sihirli-piramit": Pyramid,
  pentominolar: Pentomino,
  metaforms: Metaforms,
  numbers: Numbers,
  colours: Colours,
};

export default function GamePreview({ slug }) {
  const Draw = PREVIEWS[slug] || Sudoku;
  return (
    <div className="flex h-[110px] items-center justify-center overflow-hidden rounded-[10px] bg-[#f6f3ec]">
      <Draw />
    </div>
  );
}
