import { generate as kakuro } from "../src/games/kakuro/puzzles.js";
import { generate as sudoku } from "../src/games/sudoku/puzzles.js";
import { generate as bolgesel } from "../src/games/bolgesel-sudoku/puzzles.js";
import { generate as apartman } from "../src/games/apartman/puzzles.js";
import { generate as cit } from "../src/games/cit/puzzles.js";
import { generate as amiral } from "../src/games/amiral-batti/puzzles.js";
import { generate as sihirli } from "../src/games/sihirli-piramit/puzzles.js";
import { generate as patika } from "../src/games/patika/puzzles.js";
import { generate as abc } from "../src/games/abc-baglama/puzzles.js";
import { generate as islem } from "../src/games/islem-karesi/puzzles.js";
import { generate as kendoku } from "../src/games/kendoku/puzzles.js";
import { generate as yildiz } from "../src/games/yildiz-savaslari/puzzles.js";
import { generate as kare } from "../src/games/kare-karalamaca/puzzles.js";
import { generate as carpmaca } from "../src/games/carpmaca/puzzles.js";
import { generate as futoshiki } from "../src/games/futoshiki/puzzles.js";
import { generate as pentomino } from "../src/games/pentominolar/puzzles.js";
import { generate as metaforms } from "../src/games/metaforms/puzzles.js";
import { generate as numbers } from "../src/games/numbers/puzzles.js";
import { generate as colours } from "../src/games/colours/puzzles.js";

function sealed(publicPuzzle, proofBase, solution) {
  return { public: publicPuzzle, proof: { ...proofBase, solution } };
}

function open(slug, difficulty) {
  switch (slug) {
    case "sudoku": {
      const puzzle = sudoku(difficulty);
      const pub = { givens: puzzle.puzzle };
      return sealed(pub, pub, puzzle.solution);
    }
    case "kakuro": {
      const puzzle = kakuro(difficulty);
      const pub = { grid: puzzle.grid, size: puzzle.size };
      return sealed(pub, pub, puzzle.solution);
    }
    case "bolgesel-sudoku": {
      const puzzle = bolgesel(difficulty);
      const pub = { givens: puzzle.puzzle };
      return sealed(pub, pub, puzzle.solution);
    }
    case "apartman": {
      const puzzle = apartman(difficulty);
      const pub = { givens: puzzle.puzzle, clues: puzzle.clues };
      return sealed(pub, pub, puzzle.solution);
    }
    case "cit": {
      const puzzle = cit(difficulty);
      const proof = { clues: puzzle.clues };
      return sealed(
        { clues: puzzle.clues, size: puzzle.size },
        proof,
        { horizontal: puzzle.horizontalSolution, vertical: puzzle.verticalSolution },
      );
    }
    case "amiral-batti": {
      const puzzle = amiral(difficulty);
      const pub = { rowClues: puzzle.rowClues, colClues: puzzle.colClues, rows: puzzle.rows, cols: puzzle.cols, ships: puzzle.ships };
      return sealed(pub, pub, { cells: puzzle.solutionSet });
    }
    case "sihirli-piramit": {
      const puzzle = sihirli(difficulty);
      const pub = { rows: puzzle.rows };
      return sealed(pub, pub, { path: puzzle.path });
    }
    case "patika": {
      const puzzle = patika(difficulty);
      const pub = { rows: puzzle.rows, cols: puzzle.cols, blacks: puzzle.blacks };
      return sealed(pub, pub, { edges: puzzle.edges });
    }
    case "abc-baglama": {
      const puzzle = abc(difficulty);
      const pub = { fixedCells: puzzle.fixedCells, rows: puzzle.rows, cols: puzzle.cols };
      return sealed(pub, pub, { paths: puzzle.paths });
    }
    case "islem-karesi": {
      const puzzle = islem(difficulty);
      const pub = {
        givens: puzzle.givens,
        across: puzzle.across,
        down: puzzle.down,
        rowResults: puzzle.rowResults,
        colResults: puzzle.colResults,
      };
      return sealed(pub, pub, puzzle.solution);
    }
    case "kendoku": {
      const puzzle = kendoku(difficulty);
      const proof = { cageId: puzzle.cageId, cageClues: puzzle.cageClues };
      const pub = { givens: puzzle.puzzle, cageId: puzzle.cageId, cageAnchor: puzzle.cageAnchor, cageClues: puzzle.cageClues };
      return sealed(pub, proof, puzzle.solution);
    }
    case "yildiz-savaslari": {
      const puzzle = yildiz(difficulty);
      const proof = { regionGrid: puzzle.regionGrid };
      const pub = { regionGrid: puzzle.regionGrid, rowClues: puzzle.rowClues, colClues: puzzle.colClues, size: puzzle.size };
      return sealed(pub, proof, { cells: puzzle.solutionSet });
    }
    case "kare-karalamaca": {
      const puzzle = kare(difficulty);
      const proof = { rowClues: puzzle.rowClues, colClues: puzzle.colClues };
      return sealed({ ...proof, size: puzzle.size }, proof, { cells: puzzle.solutionSet });
    }
    case "carpmaca": {
      const puzzle = carpmaca(difficulty);
      const pub = { variant: puzzle.variant, maxValue: puzzle.maxValue, rowHeaders: puzzle.rowHeaders, colHeaders: puzzle.colHeaders, givens: puzzle.puzzle };
      return sealed(pub, pub, puzzle.solution);
    }
    case "futoshiki": {
      const puzzle = futoshiki(difficulty);
      const pub = { givens: puzzle.puzzle, horizontal: puzzle.horizontal, vertical: puzzle.vertical };
      return sealed(pub, pub, puzzle.solution);
    }
    case "pentominolar": {
      const puzzle = pentomino(difficulty);
      const proof = { pieces: puzzle.pieces, region: puzzle.region };
      return sealed(
        { ...proof, rows: puzzle.rows, cols: puzzle.cols },
        proof,
        { placements: puzzle.solutionPlacements },
      );
    }
    case "metaforms": {
      const puzzle = metaforms(difficulty);
      return sealed({ clues: puzzle.clues }, { clues: puzzle.clues }, { grid: puzzle.solution });
    }
    case "numbers": {
      const puzzle = numbers(difficulty);
      const pub = { clues: puzzle.clues };
      return sealed(pub, pub, puzzle.solution);
    }
    case "colours": {
      const puzzle = colours(difficulty);
      const pub = { pieces: puzzle.pieces, clues: puzzle.clues };
      return sealed(pub, { pieces: puzzle.pieces, clues: puzzle.clues }, puzzle.solution);
    }
    default:
      throw new Error(`Bilinmeyen oyun: ${slug}`);
  }
}

import readline from "node:readline";

function writeLine(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function reply(slug, difficulty) {
  try {
    writeLine(open(slug, difficulty || "easy"));
  } catch {
    writeLine({ error: "Bulmaca açılamadı" });
  }
}

if (process.argv[2]) {
  reply(process.argv[2], process.argv[3]);
} else {
  const lines = readline.createInterface({ input: process.stdin });
  lines.on("line", (line) => {
    const [slug, difficulty] = line.trim().split(/\s+/);
    if (slug) reply(slug, difficulty);
  });
}
