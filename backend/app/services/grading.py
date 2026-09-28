"""Skoru istemcinin yazdığı puandan değil, bulmaca kurallarından hesaplar."""

import math

class GradeError(ValueError):
    pass


class _Budget:
    def __init__(self, limit=200_000):
        self.left = limit

    def tick(self):
        self.left -= 1
        if self.left < 0:
            raise GradeError("Bulmaca çok belirsiz")


def accepts(slug, difficulty, puzzle, answer):
    difficulty = _difficulty(difficulty)
    _validate(slug, difficulty, puzzle, answer)
    return True


def grade(slug, difficulty, puzzle, answer, duration_seconds):
    difficulty = _difficulty(difficulty)
    duration = _duration(duration_seconds)
    _validate(slug, difficulty, puzzle, answer)
    return max(1000 - duration, 100), duration


def _difficulty(difficulty):
    if difficulty not in ("easy", "medium", "hard"):
        raise GradeError("Zorluk geçersiz")
    return difficulty


def _duration(value):
    try:
        duration = int(value)
    except (TypeError, ValueError):
        raise GradeError("Süre gerekli") from None
    if duration < 0 or duration > 3 * 60 * 60:
        raise GradeError("Süre geçersiz")
    return duration


def _validate(slug, difficulty, puzzle, answer):
    checkers = {
        "sudoku": _grade_sudoku,
        "kakuro": _grade_kakuro,
        "bolgesel-sudoku": _grade_region,
        "apartman": _grade_apartman,
        "cit": _grade_cit,
        "amiral-batti": _grade_fleet,
        "sihirli-piramit": _grade_pyramid,
        "patika": _grade_patika,
        "abc-baglama": _grade_abc,
        "islem-karesi": _grade_islem,
        "kendoku": _grade_cages,
        "yildiz-savaslari": _grade_stars,
        "kare-karalamaca": _grade_nonogram,
        "carpmaca": _grade_products,
        "futoshiki": _grade_futoshiki,
        "pentominolar": _grade_pentomino,
        "metaforms": _grade_metaforms,
        "numbers": _grade_numbers,
        "colours": _grade_colours,
    }
    checker = checkers.get(slug)
    if checker is None:
        raise GradeError("Bu oyun skorlanamıyor")
    checker(difficulty, puzzle, answer)


def _int_grid(value, n, lo, hi, name="cevap"):
    if not isinstance(value, list) or len(value) != n:
        raise GradeError("Izgara boyutu uyuşmuyor")
    grid = []
    for row in value:
        if not isinstance(row, list) or len(row) != n:
            raise GradeError("Izgara boyutu uyuşmuyor")
        parsed = []
        for cell in row:
            if isinstance(cell, bool) or not isinstance(cell, int) or cell < lo or cell > hi:
                raise GradeError(f"{name} geçersiz")
            parsed.append(cell)
        grid.append(parsed)
    return grid


def _latin(grid):
    n = len(grid)
    for row in grid:
        if sorted(row) != list(range(1, n + 1)):
            return False
    for c in range(n):
        if sorted(grid[r][c] for r in range(n)) != list(range(1, n + 1)):
            return False
    return True


def _count_latin(puzzle, extra=None, limit=2):
    n = len(puzzle)
    grid = [row[:] for row in puzzle]
    rows = [[False] * (n + 1) for _ in range(n)]
    cols = [[False] * (n + 1) for _ in range(n)]
    budget = _Budget()
    for r in range(n):
        for c in range(n):
            value = grid[r][c]
            if not value:
                continue
            if value < 1 or value > n or rows[r][value] or cols[c][value]:
                return 0
            rows[r][value] = cols[c][value] = True
    count = 0

    def search(r, c):
        nonlocal count
        budget.tick()
        if count >= limit:
            return
        if r == n:
            if extra is None or extra(grid):
                count += 1
            return
        nr, nc = (r + 1, 0) if c + 1 == n else (r, c + 1)
        if grid[r][c]:
            search(nr, nc)
            return
        for value in range(1, n + 1):
            if rows[r][value] or cols[c][value]:
                continue
            rows[r][value] = cols[c][value] = True
            grid[r][c] = value
            search(nr, nc)
            grid[r][c] = 0
            rows[r][value] = cols[c][value] = False
            if count >= limit:
                return

    search(0, 0)
    return count


def _count_sudoku(puzzle, limit=2):
    grid = [row[:] for row in puzzle]
    rows = [[False] * 10 for _ in range(9)]
    cols = [[False] * 10 for _ in range(9)]
    boxes = [[False] * 10 for _ in range(9)]
    budget = _Budget()
    for r in range(9):
        for c in range(9):
            value = grid[r][c]
            if not value:
                continue
            box = (r // 3) * 3 + c // 3
            if value < 1 or value > 9 or rows[r][value] or cols[c][value] or boxes[box][value]:
                return 0
            rows[r][value] = cols[c][value] = boxes[box][value] = True
    count = 0

    def open_cell():
        best = None
        best_n = 10
        for r in range(9):
            for c in range(9):
                if grid[r][c]:
                    continue
                box = (r // 3) * 3 + c // 3
                options = sum(1 for value in range(1, 10) if not rows[r][value] and not cols[c][value] and not boxes[box][value])
                if options < best_n:
                    best_n = options
                    best = (r, c, box)
                    if options == 0:
                        return best
        return best

    def search():
        nonlocal count
        budget.tick()
        if count >= limit:
            return
        cell = open_cell()
        if cell is None:
            count += 1
            return
        r, c, box = cell
        for value in range(1, 10):
            if rows[r][value] or cols[c][value] or boxes[box][value]:
                continue
            rows[r][value] = cols[c][value] = boxes[box][value] = True
            grid[r][c] = value
            search()
            grid[r][c] = 0
            rows[r][value] = cols[c][value] = boxes[box][value] = False
            if count >= limit:
                return

    search()
    return count


SUDOKU_BAND = {"easy": (36, 42), "medium": (30, 35), "hard": (24, 29)}
REGIONS = [
    ["A", "A", "A", "B"],
    ["C", "A", "B", "B"],
    ["C", "C", "D", "B"],
    ["C", "D", "D", "D"],
]
REGION_GIVENS = {"easy": 8, "medium": 6, "hard": 4}
APARTMAN_GIVENS = {"easy": 8, "medium": 5, "hard": 3}
CIT_SIZE = {"easy": 5, "medium": 5, "hard": 6}
FLEETS = {
    "easy": (5, 5, (3, 2, 1, 1)),
    "medium": (6, 6, (4, 3, 2, 1, 1)),
    "hard": (7, 7, (4, 3, 3, 2, 2, 1, 1)),
}
PYRAMID_BASE = {"easy": 4, "medium": 5, "hard": 6}
ABC_SIZE = {"easy": 5, "medium": 6, "hard": 7}
ABC_PAIRS = {"easy": (4, 4), "medium": (5, 5), "hard": (6, 7)}
CAGE_SIZE = {"easy": 4, "medium": 5, "hard": 6}
STAR_SIZE = {"easy": 5, "medium": 6, "hard": 7}
NONOGRAM_SIZE = {"easy": 5, "medium": 6, "hard": 7}
PRODUCTS = {
    "easy": (4, 2, 5, 4),
    "medium": (4, 2, 9, 2),
    "hard": (5, 2, 12, 0),
}
FUTOSHIKI_SIZE = {"easy": 4, "medium": 5, "hard": 5}
PENTOMINO_COUNT = {"easy": 2, "medium": 3, "hard": 4}
FORM_SHAPES = {"circle", "square", "triangle"}
FORM_COLORS = {"red", "yellow", "blue"}
FORM_CELLS = {f"{row}-{col}" for row in range(3) for col in range(3)}
PENTOMINOES = {
    "F": [(0, 1), (0, 2), (1, 0), (1, 1), (2, 1)],
    "I": [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)],
    "L": [(0, 0), (1, 0), (2, 0), (3, 0), (3, 1)],
    "N": [(0, 1), (1, 1), (2, 0), (2, 1), (3, 0)],
    "P": [(0, 0), (0, 1), (1, 0), (1, 1), (2, 0)],
    "T": [(0, 0), (0, 1), (0, 2), (1, 1), (2, 1)],
    "U": [(0, 0), (0, 2), (1, 0), (1, 1), (1, 2)],
    "V": [(0, 0), (1, 0), (2, 0), (2, 1), (2, 2)],
    "W": [(0, 0), (1, 0), (1, 1), (2, 1), (2, 2)],
    "X": [(0, 1), (1, 0), (1, 1), (1, 2), (2, 1)],
    "Y": [(0, 1), (1, 0), (1, 1), (2, 1), (3, 1)],
    "Z": [(0, 0), (0, 1), (1, 1), (2, 1), (2, 2)],
}


def _filled(grid):
    return sum(1 for row in grid for cell in row if cell)


def _grade_sudoku(_difficulty, puzzle, answer):
    band = SUDOKU_BAND[_difficulty]
    givens = _int_grid((puzzle or {}).get("givens") if isinstance(puzzle, dict) else puzzle, 9, 0, 9, "ipucu")
    filled = _filled(givens)
    if filled < band[0] or filled > band[1]:
        raise GradeError("İpucu sayısı bu zorluğa uymuyor")
    solved = _int_grid(answer, 9, 1, 9)
    if not _latin_boxes(solved):
        raise GradeError("Çözüm kurallara uymuyor")
    for r in range(9):
        for c in range(9):
            if givens[r][c] and givens[r][c] != solved[r][c]:
                raise GradeError("Verilen rakam değiştirilmiş")


def _latin_boxes(grid):
    if not _latin(grid):
        return False
    for br in range(3):
        for bc in range(3):
            seen = []
            for r in range(br * 3, br * 3 + 3):
                for c in range(bc * 3, bc * 3 + 3):
                    seen.append(grid[r][c])
            if sorted(seen) != list(range(1, 10)):
                return False
    return True


def _grade_kakuro(_difficulty, puzzle, answer):
    if not isinstance(puzzle, dict) or not isinstance(puzzle.get("grid"), list) or not puzzle["grid"]:
        raise GradeError("Bulmaca eksik")
    board = puzzle["grid"]
    n = len(board)
    if not isinstance(answer, list) or len(answer) != n:
        raise GradeError("Izgara boyutu uyuşmuyor")
    solved = []
    for r, row in enumerate(board):
        if not isinstance(row, list) or len(row) != n or not isinstance(answer[r], list) or len(answer[r]) != n:
            raise GradeError("Izgara boyutu uyuşmuyor")
        parsed = []
        for c, cell in enumerate(row):
            if not isinstance(cell, dict):
                raise GradeError("Bulmaca eksik")
            value = answer[r][c]
            if cell.get("type") == "white":
                if isinstance(value, bool) or not isinstance(value, int) or value < 1 or value > 9:
                    raise GradeError("Çözüm kurallara uymuyor")
                given = cell.get("given")
                if isinstance(given, int) and given != value:
                    raise GradeError("Verilen rakam değiştirilmiş")
                parsed.append(value)
            else:
                if value not in (None, 0, ""):
                    raise GradeError("Çözüm kurallara uymuyor")
                parsed.append(None)
        solved.append(parsed)

    def check(cells, total):
        values = [solved[r][c] for r, c in cells]
        if len(values) != len(set(values)) or sum(values) != total:
            raise GradeError("Çözüm kurallara uymuyor")

    for r in range(n):
        c = 0
        while c < n:
            if solved[r][c] is None:
                c += 1
                continue
            start = c
            while c < n and solved[r][c] is not None:
                c += 1
            clue = board[r][start - 1]
            check([(r, col) for col in range(start, c)], int(clue.get("right")))
    for c in range(n):
        r = 0
        while r < n:
            if solved[r][c] is None:
                r += 1
                continue
            start = r
            while r < n and solved[r][c] is not None:
                r += 1
            clue = board[start - 1][c]
            check([(row, c) for row in range(start, r)], int(clue.get("down")))


def _grade_region(difficulty, puzzle, answer):
    givens = _int_grid((puzzle or {}).get("givens") if isinstance(puzzle, dict) else puzzle, 4, 0, 4, "ipucu")
    if _filled(givens) != REGION_GIVENS[difficulty]:
        raise GradeError("İpucu sayısı bu zorluğa uymuyor")
    solved = _int_grid(answer, 4, 1, 4)
    if not _latin(solved):
        raise GradeError("Çözüm kurallara uymuyor")
    for label in ("A", "B", "C", "D"):
        seen = [solved[r][c] for r in range(4) for c in range(4) if REGIONS[r][c] == label]
        if sorted(seen) != [1, 2, 3, 4]:
            raise GradeError("Çözüm kurallara uymuyor")
    for r in range(4):
        for c in range(4):
            if givens[r][c] and givens[r][c] != solved[r][c]:
                raise GradeError("Verilen rakam değiştirilmiş")


def _visible(sequence):
    count = 0
    tallest = 0
    for height in sequence:
        if height > tallest:
            count += 1
            tallest = height
    return count


def _grade_apartman(difficulty, puzzle, answer):
    if not isinstance(puzzle, dict):
        raise GradeError("Bulmaca eksik")
    givens = _int_grid(puzzle.get("givens"), 4, 0, 4, "ipucu")
    if _filled(givens) != APARTMAN_GIVENS[difficulty]:
        raise GradeError("İpucu sayısı bu zorluğa uymuyor")
    clues = puzzle.get("clues") or {}
    solved = _int_grid(answer, 4, 1, 4)
    if not _latin(solved):
        raise GradeError("Çözüm kurallara uymuyor")
    for r in range(4):
        for c in range(4):
            if givens[r][c] and givens[r][c] != solved[r][c]:
                raise GradeError("Verilen rakam değiştirilmiş")
    expected = {
        "top": [_visible([solved[r][c] for r in range(4)]) for c in range(4)],
        "bottom": [_visible([solved[r][c] for r in range(3, -1, -1)]) for c in range(4)],
        "left": [_visible(row) for row in solved],
        "right": [_visible(list(reversed(row))) for row in solved],
    }
    for side, values in expected.items():
        if list(clues.get(side) or []) != values:
            raise GradeError("Çözüm kurallara uymuyor")


def _grade_cit(difficulty, puzzle, answer):
    n = CIT_SIZE[difficulty]
    clues = (puzzle or {}).get("clues") if isinstance(puzzle, dict) else None
    if not isinstance(clues, list) or len(clues) != n:
        raise GradeError("Izgara boyutu uyuşmuyor")
    parsed = []
    for row in clues:
        if not isinstance(row, list) or len(row) != n:
            raise GradeError("Izgara boyutu uyuşmuyor")
        parsed.append([None if cell is None else int(cell) for cell in row])
    if not isinstance(answer, dict):
        raise GradeError("Çözüm eksik")
    horizontal = answer.get("horizontal")
    vertical = answer.get("vertical")
    if not _bool_grid(horizontal, n + 1, n) or not _bool_grid(vertical, n, n + 1):
        raise GradeError("Çözüm kurallara uymuyor")
    if not _fence_matches(parsed, horizontal, vertical) or not _fence_is_loop(horizontal, vertical, n):
        raise GradeError("Çözüm kurallara uymuyor")


def _bool_grid(value, rows, cols):
    if not isinstance(value, list) or len(value) != rows:
        return False
    for row in value:
        if not isinstance(row, list) or len(row) != cols or any(not isinstance(cell, bool) for cell in row):
            return False
    return True


def _fence_matches(clues, horizontal, vertical):
    n = len(clues)
    patterns = {
        0: {(0, 0, 0, 0)},
        1: {(1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1)},
        2: {(1, 1, 0, 0), (1, 0, 1, 0), (1, 0, 0, 1), (0, 1, 1, 0), (0, 1, 0, 1), (0, 0, 1, 1)},
        3: {(1, 1, 1, 0), (1, 1, 0, 1), (1, 0, 1, 1), (0, 1, 1, 1)},
        4: {(1, 1, 1, 1)},
    }
    for r in range(n):
        for c in range(n):
            clue = clues[r][c]
            edges = (
                int(horizontal[r][c]),
                int(vertical[r][c + 1]),
                int(horizontal[r + 1][c]),
                int(vertical[r][c]),
            )
            if clue is not None and edges not in patterns.get(clue, set()):
                return False
    return True


def _fence_is_loop(horizontal, vertical, n):
    adj = {}

    def link(a, b):
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)

    for r in range(n + 1):
        for c in range(n):
            if horizontal[r][c]:
                link(f"{r}-{c}", f"{r}-{c + 1}")
    for r in range(n):
        for c in range(n + 1):
            if vertical[r][c]:
                link(f"{r}-{c}", f"{r + 1}-{c}")
    if len(adj) < 4 or any(len(neigh) != 2 for neigh in adj.values()):
        return False
    start = next(iter(adj))
    seen = {start}
    stack = [start]
    while stack:
        key = stack.pop()
        for nxt in adj[key]:
            if nxt not in seen:
                seen.add(nxt)
                stack.append(nxt)
    return len(seen) == len(adj)


def _count_fences(clues, limit=2):
    n = len(clues)
    horizontal = [[None] * n for _ in range(n + 1)]
    vertical = [[None] * (n + 1) for _ in range(n)]
    patterns = {
        0: [(0, 0, 0, 0)],
        1: [(1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1)],
        2: [(1, 1, 0, 0), (1, 0, 1, 0), (1, 0, 0, 1), (0, 1, 1, 0), (0, 1, 0, 1), (0, 0, 1, 1)],
        3: [(1, 1, 1, 0), (1, 1, 0, 1), (1, 0, 1, 1), (0, 1, 1, 1)],
        4: [(1, 1, 1, 1)],
    }
    all_patterns = [(mask >> 3 & 1, mask >> 2 & 1, mask >> 1 & 1, mask & 1) for mask in range(16)]
    budget = _Budget(400_000)
    count = 0

    def search(cell):
        nonlocal count
        budget.tick()
        if count >= limit:
            return
        if cell == n * n:
            if _fence_is_loop(horizontal, vertical, n):
                count += 1
            return
        r, c = divmod(cell, n)
        clue = clues[r][c]
        options = all_patterns if clue is None else patterns.get(clue, [])
        for top, right, bottom, left in options:
            if horizontal[r][c] not in (None, bool(top)):
                continue
            if vertical[r][c + 1] not in (None, bool(right)):
                continue
            if horizontal[r + 1][c] not in (None, bool(bottom)):
                continue
            if vertical[r][c] not in (None, bool(left)):
                continue
            prev = (horizontal[r][c], vertical[r][c + 1], horizontal[r + 1][c], vertical[r][c])
            horizontal[r][c] = bool(top)
            vertical[r][c + 1] = bool(right)
            horizontal[r + 1][c] = bool(bottom)
            vertical[r][c] = bool(left)
            search(cell + 1)
            horizontal[r][c], vertical[r][c + 1], horizontal[r + 1][c], vertical[r][c] = prev
            if count >= limit:
                return

    search(0)
    return count


def _ship_factor(ships):
    freq = {}
    for size in ships:
        freq[size] = freq.get(size, 0) + 1
    factor = 1
    for count in freq.values():
        factor *= math.factorial(count)
    return factor


def _grade_fleet(difficulty, puzzle, answer):
    rows, cols, ships = FLEETS[difficulty]
    if not isinstance(puzzle, dict) or puzzle.get("rows") != rows or puzzle.get("cols") != cols:
        raise GradeError("Izgara boyutu uyuşmuyor")
    row_clues = [int(v) for v in puzzle.get("rowClues") or []]
    col_clues = [int(v) for v in puzzle.get("colClues") or []]
    if len(row_clues) != rows or len(col_clues) != cols:
        raise GradeError("Izgara boyutu uyuşmuyor")
    cells = set((answer or {}).get("cells") or [])
    if not _fleet_ok(cells, rows, cols, ships, row_clues, col_clues):
        raise GradeError("Çözüm kurallara uymuyor")


def _fleet_ok(cells, rows, cols, ships, row_clues, col_clues):
    if any(not isinstance(key, str) or key.count("-") != 1 for key in cells):
        return False
    parsed = []
    for key in cells:
        r, c = key.split("-")
        if not r.isdigit() or not c.isdigit():
            return False
        parsed.append((int(r), int(c)))
    if any(r < 0 or c < 0 or r >= rows or c >= cols for r, c in parsed) or len(parsed) != sum(ships):
        return False
    occupied = set(parsed)
    if len(occupied) != len(parsed):
        return False
    for r in range(rows):
        if sum((r, c) in occupied for c in range(cols)) != row_clues[r]:
            return False
    for c in range(cols):
        if sum((r, c) in occupied for r in range(rows)) != col_clues[c]:
            return False
    return _partition_ships(occupied, ships)


def _partition_ships(occupied, ships):
    remaining = set(occupied)
    sizes = sorted(ships, reverse=True)

    def search(index):
        if index == len(sizes):
            return not remaining
        size = sizes[index]
        for r, c in list(remaining):
            for horizontal in (True, False) if size > 1 else (True,):
                cells = []
                fits = True
                for i in range(size):
                    rr = r if horizontal else r + i
                    cc = c + i if horizontal else c
                    if (rr, cc) not in remaining:
                        fits = False
                        break
                    cells.append((rr, cc))
                if not fits:
                    continue
                if _touches_outside(cells, remaining):
                    continue
                for cell in cells:
                    remaining.remove(cell)
                if search(index + 1):
                    return True
                remaining.update(cells)
        return False

    return search(0)


def _touches_outside(cells, remaining):
    body = set(cells)
    for r, c in cells:
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                other = (r + dr, c + dc)
                if other in remaining and other not in body:
                    return True
    return False


def _count_fleets(row_clues, col_clues, ships, limit):
    rows, cols = len(row_clues), len(col_clues)
    occupied = set()
    sizes = sorted(ships, reverse=True)
    budget = _Budget()
    count = 0

    def over_capacity():
        for r in range(rows):
            if sum(f"{r}-{c}" in occupied for c in range(cols)) > row_clues[r]:
                return True
        for c in range(cols):
            if sum(f"{r}-{c}" in occupied for r in range(rows)) > col_clues[c]:
                return True
        return False

    def place(index):
        nonlocal count
        budget.tick()
        if count >= limit:
            return
        if index == len(sizes):
            for r in range(rows):
                if sum(f"{r}-{c}" in occupied for c in range(cols)) != row_clues[r]:
                    return
            for c in range(cols):
                if sum(f"{r}-{c}" in occupied for r in range(rows)) != col_clues[c]:
                    return
            count += 1
            return
        size = sizes[index]
        for horizontal in (True, False) if size > 1 else (True,):
            for r in range(rows):
                for c in range(cols):
                    cells = []
                    fits = True
                    for i in range(size):
                        rr = r if horizontal else r + i
                        cc = c + i if horizontal else c
                        if rr >= rows or cc >= cols:
                            fits = False
                            break
                        cells.append(f"{rr}-{cc}")
                    if not fits:
                        continue
                    blocked = False
                    for key in cells:
                        rr, cc = map(int, key.split("-"))
                        for dr in (-1, 0, 1):
                            for dc in (-1, 0, 1):
                                if f"{rr + dr}-{cc + dc}" in occupied:
                                    blocked = True
                    if blocked:
                        continue
                    occupied.update(cells)
                    if not over_capacity():
                        place(index + 1)
                    occupied.difference_update(cells)
                    if count >= limit:
                        return

    place(0)
    return count


def _grade_pyramid(difficulty, puzzle, answer):
    height = PYRAMID_BASE[difficulty]
    rows = (puzzle or {}).get("rows") if isinstance(puzzle, dict) else None
    if not isinstance(rows, list) or len(rows) != height:
        raise GradeError("Izgara boyutu uyuşmuyor")
    for index, row in enumerate(rows):
        if not isinstance(row, list) or len(row) != index + 1:
            raise GradeError("Izgara boyutu uyuşmuyor")
        if any(not isinstance(value, int) or isinstance(value, bool) or value < 1 or value > height for value in row):
            raise GradeError("İpucu geçersiz")
    path = answer.get("path") if isinstance(answer, dict) else None
    if not isinstance(path, list) or len(path) != height or path[0] != 0:
        raise GradeError("Çözüm eksik")
    seen = []
    for index, col in enumerate(path):
        if isinstance(col, bool) or not isinstance(col, int) or col < 0 or col > index:
            raise GradeError("Çözüm kurallara uymuyor")
        if index and col != path[index - 1] and col != path[index - 1] + 1:
            raise GradeError("Çözüm kurallara uymuyor")
        seen.append(rows[index][col])
    if sorted(seen) != list(range(1, height + 1)):
        raise GradeError("Çözüm kurallara uymuyor")


def _neighbors(key, nodes):
    r, c = map(int, key.split("-"))
    out = []
    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nxt = f"{r + dr}-{c + dc}"
        if nxt in nodes:
            out.append(nxt)
    return out


def _components(nodes):
    visited = set()
    components = []
    for node in nodes:
        if node in visited:
            continue
        stack = [node]
        visited.add(node)
        comp = []
        while stack:
            cur = stack.pop()
            comp.append(cur)
            for nxt in _neighbors(cur, nodes):
                if nxt not in visited:
                    visited.add(nxt)
                    stack.append(nxt)
        components.append(comp)
    return components


def _grade_patika(difficulty, puzzle, answer):
    size = {"easy": 8, "medium": 9, "hard": 10}.get(difficulty)
    if not isinstance(puzzle, dict) or puzzle.get("rows") != size or puzzle.get("cols") != size:
        raise GradeError("Izgara boyutu uyuşmuyor")
    blacks = {str(cell) for cell in (puzzle.get("blacks") or [])}
    edges = [str(edge) for edge in ((answer or {}).get("edges") or [])]
    whites = [f"{row}-{col}" for row in range(size) for col in range(size) if f"{row}-{col}" not in blacks]
    if len(whites) < 4:
        raise GradeError("Beyaz kare eksik")
    links = {cell: [] for cell in whites}
    for edge in edges:
        parts = edge.split("|")
        if len(parts) != 2 or parts[0] not in links or parts[1] not in links:
            raise GradeError("Çizgi beyaz kareleri bağlamıyor")
        ar, ac = (int(part) for part in parts[0].split("-"))
        br, bc = (int(part) for part in parts[1].split("-"))
        if abs(ar - br) + abs(ac - bc) != 1:
            raise GradeError("Çizgi çapraz")
        links[parts[0]].append(parts[1])
        links[parts[1]].append(parts[0])
    if any(len(links[cell]) != 2 for cell in whites):
        raise GradeError("Halka kurallara uymuyor")
    seen = {whites[0]}
    prev = whites[0]
    cursor = links[whites[0]][0]
    while cursor not in seen:
        seen.add(cursor)
        nxt = next(cell for cell in links[cursor] if cell != prev)
        prev, cursor = cursor, nxt
    if len(seen) != len(whites) or cursor != whites[0]:
        raise GradeError("Halka kurallara uymuyor")


def _sequential(marked, fixed):
    nodes = set(marked) | set(fixed)
    components = _components(nodes)
    if len(components) != 1:
        return False
    comp = set(components[0])
    endpoints = []
    for node in comp:
        degree = len(_neighbors(node, comp))
        if degree == 1:
            endpoints.append(node)
        elif degree != 2:
            return False
    if len(endpoints) != 2:
        return False
    ordered = [endpoints[0]]
    visited = {endpoints[0]}
    while ordered[-1] != endpoints[1]:
        nxt = next((n for n in _neighbors(ordered[-1], comp) if n not in visited), None)
        if nxt is None:
            return False
        ordered.append(nxt)
        visited.add(nxt)
    waypoints = [fixed[k] for k in ordered if k in fixed]
    expected = sorted(fixed.values(), key=lambda item: int(item))
    return waypoints == expected or waypoints == list(reversed(expected))


def _grade_abc(difficulty, puzzle, answer):
    size = ABC_SIZE[difficulty]
    low, high = ABC_PAIRS[difficulty]
    if not isinstance(puzzle, dict) or puzzle.get("rows") != size or puzzle.get("cols") != size:
        raise GradeError("Izgara boyutu uyuşmuyor")
    fixed = {str(key): str(value) for key, value in (puzzle.get("fixedCells") or {}).items()}
    groups = {}
    for key, label in fixed.items():
        groups.setdefault(label, []).append(key)
    if not low <= len(groups) <= high or any(len(spots) != 2 for spots in groups.values()):
        raise GradeError("Harf çiftleri eksik")
    paths = (answer or {}).get("paths") if isinstance(answer, dict) else None
    if not isinstance(paths, dict):
        raise GradeError("Çözüm eksik")
    seen = set()
    for label, ends in groups.items():
        path = paths.get(label)
        if not isinstance(path, list) or len(path) < 2:
            raise GradeError("Çözüm kurallara uymuyor")
        path = [str(cell) for cell in path]
        if {path[0], path[-1]} != set(ends):
            raise GradeError("Çözüm kurallara uymuyor")
        previous = None
        for cell in path:
            if cell in seen or (cell in fixed and fixed[cell] != label):
                raise GradeError("Çözüm kurallara uymuyor")
            row, col = (int(part) for part in cell.split("-"))
            if row < 0 or col < 0 or row >= size or col >= size:
                raise GradeError("Çözüm kurallara uymuyor")
            if previous is not None:
                prow, pcol = (int(part) for part in previous.split("-"))
                if abs(row - prow) + abs(col - pcol) != 1:
                    raise GradeError("Çözüm kurallara uymuyor")
            if cell in fixed and cell not in (path[0], path[-1]):
                raise GradeError("Çözüm kurallara uymuyor")
            seen.add(cell)
            previous = cell
    if len(seen) != size * size:
        raise GradeError("Çözüm kurallara uymuyor")


def _connection(marked, fixed):
    nodes = set(marked) | set(fixed)
    solved = set()
    for comp in _components(nodes):
        comp_set = set(comp)
        fixed_in = [key for key in comp if key in fixed]
        if len(fixed_in) != 2 or fixed[fixed_in[0]] != fixed[fixed_in[1]]:
            return False
        for node in comp_set:
            degree = len(_neighbors(node, comp_set))
            if node in fixed_in and degree != 1:
                return False
            if node not in fixed_in and degree != 2:
                return False
        solved.add(fixed[fixed_in[0]])
    return solved == set(fixed.values()) and bool(solved)


def _clue_ok(clue, values):
    text = str(clue)
    digits = ""
    while text and text[0].isdigit():
        digits += text[0]
        text = text[1:]
    if not digits:
        return False
    target = int(digits)
    if not text:
        return len(values) == 1 and values[0] == target
    if text == "+":
        return sum(values) == target
    if text in ("×", "x", "*"):
        product = 1
        for value in values:
            product *= value
        return product == target
    if len(values) != 2:
        return False
    a, b = values
    if text in ("−", "-"):
        return abs(a - b) == target
    if text in ("÷", "/"):
        big, small = max(a, b), min(a, b)
        return small and big % small == 0 and big // small == target
    return False


def _grade_cages(difficulty, puzzle, answer):
    n = CAGE_SIZE[difficulty]
    if not isinstance(puzzle, dict):
        raise GradeError("Bulmaca eksik")
    cage_id = puzzle.get("cageId")
    clues = puzzle.get("cageClues") or {}
    if not isinstance(cage_id, list) or len(cage_id) != n:
        raise GradeError("Izgara boyutu uyuşmuyor")
    solved = _int_grid(answer, n, 1, n)
    if not _latin(solved):
        raise GradeError("Çözüm kurallara uymuyor")
    groups = {}
    for r in range(n):
        if len(cage_id[r]) != n:
            raise GradeError("Izgara boyutu uyuşmuyor")
        for c in range(n):
            groups.setdefault(str(cage_id[r][c]), []).append(solved[r][c])
    if not clues or set(map(str, clues)) != set(groups):
        raise GradeError("Kafes ipuçları eksik")
    for key, values in groups.items():
        if not _clue_ok(clues.get(key, clues.get(int(key) if key.isdigit() else key)), values):
            raise GradeError("Çözüm kurallara uymuyor")


def _grade_stars(difficulty, puzzle, answer):
    n = STAR_SIZE[difficulty]
    region = (puzzle or {}).get("regionGrid") if isinstance(puzzle, dict) else None
    if not isinstance(region, list) or len(region) != n or any(len(row) != n for row in region):
        raise GradeError("Izgara boyutu uyuşmuyor")
    cells = set((answer or {}).get("cells") or [])
    if not _stars_ok(cells, region, n):
        raise GradeError("Çözüm kurallara uymuyor")


def _stars_ok(cells, region, n):
    if len(cells) != n:
        return False
    parsed = []
    for key in cells:
        if not isinstance(key, str) or key.count("-") != 1:
            return False
        r, c = key.split("-")
        if not r.isdigit() or not c.isdigit():
            return False
        parsed.append((int(r), int(c)))
    if any(r < 0 or c < 0 or r >= n or c >= n for r, c in parsed):
        return False
    if len({r for r, _ in parsed}) != n or len({c for _, c in parsed}) != n:
        return False
    for i, (r, c) in enumerate(parsed):
        for rr, cc in parsed[i + 1 :]:
            if abs(r - rr) <= 1 and abs(c - cc) <= 1:
                return False
    seen = set()
    for r, c in parsed:
        label = region[r][c]
        if label in seen:
            return False
        seen.add(label)
    return len(seen) == n


def _count_stars(region, n, limit=2):
    col_used = [False] * n
    region_used = set()
    prev = []
    budget = _Budget()
    count = 0

    def search(row):
        nonlocal count
        budget.tick()
        if count >= limit:
            return
        if row == n:
            count += 1
            return
        for c in range(n):
            label = region[row][c]
            if col_used[c] or label in region_used:
                continue
            if row and abs(prev[row - 1] - c) <= 1:
                continue
            col_used[c] = True
            region_used.add(label)
            prev.append(c)
            search(row + 1)
            prev.pop()
            region_used.remove(label)
            col_used[c] = False
            if count >= limit:
                return

    search(0)
    return count


def _grade_nonogram(difficulty, puzzle, answer):
    n = NONOGRAM_SIZE[difficulty]
    if not isinstance(puzzle, dict):
        raise GradeError("Bulmaca eksik")
    row_clues = puzzle.get("rowClues")
    col_clues = puzzle.get("colClues")
    if not isinstance(row_clues, list) or not isinstance(col_clues, list) or len(row_clues) != n or len(col_clues) != n:
        raise GradeError("Izgara boyutu uyuşmuyor")
    cells = set((answer or {}).get("cells") or [])
    grid = [[f"{r}-{c}" in cells for c in range(n)] for r in range(n)]
    if [_runs(row) for row in grid] != [list(map(int, runs)) for runs in row_clues]:
        raise GradeError("Çözüm kurallara uymuyor")
    if [_runs([grid[r][c] for r in range(n)]) for c in range(n)] != [list(map(int, runs)) for runs in col_clues]:
        raise GradeError("Çözüm kurallara uymuyor")


def _runs(bits):
    runs = []
    count = 0
    for bit in bits:
        if bit:
            count += 1
        elif count:
            runs.append(count)
            count = 0
    if count:
        runs.append(count)
    return runs or [0]


def _line_options(length, runs):
    normalized = [] if len(runs) == 1 and int(runs[0]) == 0 else [int(run) for run in runs]
    out = []

    def place(start, index, bits):
        if index == len(normalized):
            out.append(bits + [False] * (length - len(bits)))
            return
        run = normalized[index]
        rest = sum(normalized[index + 1 :])
        gaps = len(normalized) - index - 1
        pos = start
        while pos + run + rest + gaps <= length:
            nxt = bits + [False] * (pos - len(bits)) + [True] * run
            if index < len(normalized) - 1:
                nxt.append(False)
            place(len(nxt), index + 1, nxt)
            pos += 1

    place(0, 0, [])
    return out


def _count_nonogram(row_clues, col_clues, limit=2):
    rows, cols = len(row_clues), len(col_clues)
    row_opts = [_line_options(cols, runs) for runs in row_clues]
    col_opts = [_line_options(rows, runs) for runs in col_clues]
    if any(not options for options in row_opts + col_opts):
        return 0
    budget = _Budget()
    count = 0
    grid = []

    def search(r):
        nonlocal count
        budget.tick()
        if count >= limit:
            return
        if r == rows:
            count += 1
            return
        for row in row_opts[r]:
            grid.append(row)
            ok = True
            for c in range(cols):
                if not any(all(full[i] == grid[i][c] for i in range(r + 1)) for full in col_opts[c]):
                    ok = False
                    break
            if ok:
                search(r + 1)
            grid.pop()
            if count >= limit:
                return

    search(0)
    return count


def _grade_products(difficulty, puzzle, answer):
    size, lo, hi, givens = PRODUCTS[difficulty]
    if not isinstance(puzzle, dict):
        raise GradeError("Bulmaca eksik")
    rows = puzzle.get("rowHeaders")
    cols = puzzle.get("colHeaders")
    if not isinstance(rows, list) or not isinstance(cols, list) or len(rows) != size or len(cols) != size:
        raise GradeError("Izgara boyutu uyuşmuyor")
    if any(not isinstance(v, int) or isinstance(v, bool) or v < lo or v > hi for v in rows + cols):
        raise GradeError("Başlıklar geçersiz")
    solved = _int_grid(answer, size, 1, hi * hi)
    given = _int_grid(puzzle.get("givens"), size, 0, hi * hi, "ipucu")
    if _filled(given) != givens:
        raise GradeError("İpucu sayısı bu zorluğa uymuyor")
    for r in range(size):
        for c in range(size):
            if solved[r][c] != rows[r] * cols[c]:
                raise GradeError("Çözüm kurallara uymuyor")
            if given[r][c] and given[r][c] != solved[r][c]:
                raise GradeError("Verilen rakam değiştirilmiş")


def _grade_futoshiki(difficulty, puzzle, answer):
    n = FUTOSHIKI_SIZE[difficulty]
    if not isinstance(puzzle, dict):
        raise GradeError("Bulmaca eksik")
    givens = _int_grid(puzzle.get("givens"), n, 0, n, "ipucu")
    horizontal = puzzle.get("horizontal") or []
    vertical = puzzle.get("vertical") or []
    solved = _int_grid(answer, n, 1, n)
    if not _latin(solved):
        raise GradeError("Çözüm kurallara uymuyor")
    for r in range(n):
        for c in range(n):
            if givens[r][c] and givens[r][c] != solved[r][c]:
                raise GradeError("Verilen rakam değiştirilmiş")
    if not _signs_ok(solved, horizontal, vertical):
        raise GradeError("Çözüm kurallara uymuyor")


def _signs_ok(grid, horizontal, vertical):
    for hint in horizontal:
        r, c, sign = hint.get("r"), hint.get("c"), hint.get("sign")
        if sign == "<" and not grid[r][c] < grid[r][c + 1]:
            return False
        if sign == ">" and not grid[r][c] > grid[r][c + 1]:
            return False
        if sign not in ("<", ">"):
            return False
    for hint in vertical:
        r, c, sign = hint.get("r"), hint.get("c"), hint.get("sign")
        if sign == "v" and not grid[r][c] > grid[r + 1][c]:
            return False
        if sign == "^" and not grid[r][c] < grid[r + 1][c]:
            return False
        if sign not in ("v", "^"):
            return False
    return True


def _orient(cells, turns, flipped):
    shape = cells[:]
    if flipped:
        shape = _normalize([(r, -c) for r, c in shape])
    for _ in range(turns % 4):
        shape = _normalize([(c, -r) for r, c in shape])
    return shape


def _normalize(cells):
    min_r = min(r for r, _ in cells)
    min_c = min(c for _, c in cells)
    return [(r - min_r, c - min_c) for r, c in cells]


def _grade_pentomino(difficulty, puzzle, answer):
    count = PENTOMINO_COUNT[difficulty]
    if not isinstance(puzzle, dict) or not isinstance(answer, dict):
        raise GradeError("Bulmaca eksik")
    names = puzzle.get("pieces") or []
    region = puzzle.get("region") or []
    if len(names) != count or any(name not in PENTOMINOES for name in names) or len(set(names)) != count:
        raise GradeError("Parça listesi bu zorluğa uymuyor")
    if len(region) != count * 5 or len(set(region)) != len(region):
        raise GradeError("Alan geçersiz")
    placements = answer.get("placements") or []
    if not _pentomino_cover(names, region, placements):
        raise GradeError("Çözüm kurallara uymuyor")


def _pentomino_cover(names, region, placements):
    if len(placements) != len(names):
        return False
    region_set = set(region)
    covered = []
    used_names = []
    for piece in placements:
        name = piece.get("name")
        cells = piece.get("cells") or []
        if name not in names or len(cells) != 5:
            return False
        used_names.append(name)
        covered.extend(cells)
        shape = _normalize([tuple(map(int, cell.split("-"))) for cell in cells])
        if not any(sorted(shape) == sorted(_orient(PENTOMINOES[name], turns, flipped)) for flipped in (False, True) for turns in range(4)):
            return False
    return sorted(used_names) == sorted(names) and set(covered) == region_set and len(covered) == len(region_set)


def _distinct_tilings(names, region):
    region_set = set(region)
    used = set()
    signatures = set()
    placed = []
    budget = _Budget(400_000)

    def search(index):
        budget.tick()
        if len(signatures) >= 2:
            return
        if index == len(names):
            sig = "|".join(sorted(f"{piece[0]}:{'.'.join(sorted(piece[1]))}" for piece in placed))
            signatures.add(sig)
            return
        name = names[index]
        for flipped in (False, True):
            for turns in range(4):
                shape = _orient(PENTOMINOES[name], turns, flipped)
                for cell in region:
                    if len(signatures) >= 2:
                        return
                    r, c = map(int, cell.split("-"))
                    sr, sc = shape[0]
                    cells = [f"{rr - sr + r}-{cc - sc + c}" for rr, cc in shape]
                    if any(item not in region_set or item in used for item in cells):
                        continue
                    used.update(cells)
                    placed.append((name, cells))
                    search(index + 1)
                    placed.pop()
                    used.difference_update(cells)

    search(0)
    return len(signatures)


def _as_grid(answer):
    if isinstance(answer, dict) and isinstance(answer.get("grid"), list):
        return answer["grid"]
    return answer


def _eval_line(values, ops):
    nums = list(values)
    operators = list(ops)
    index = 0
    while index < len(operators):
        op = operators[index]
        if op not in ("×", "÷", "*", "/"):
            index += 1
            continue
        left, right = nums[index], nums[index + 1]
        if op in ("×", "*"):
            nxt = left * right
        elif right and left % right == 0:
            nxt = left // right
        else:
            return None
        nums[index:index + 2] = [nxt]
        del operators[index]
    total = nums[0]
    for step, op in enumerate(operators):
        if op == "+":
            total += nums[step + 1]
        elif op in ("−", "-"):
            total -= nums[step + 1]
        else:
            return None
    return total


def _grade_islem(_difficulty, puzzle, answer):
    givens = (puzzle or {}).get("givens") if isinstance(puzzle, dict) else None
    across = (puzzle or {}).get("across")
    down = (puzzle or {}).get("down")
    row_results = (puzzle or {}).get("rowResults")
    col_results = (puzzle or {}).get("colResults")
    grid = _as_grid(answer)
    if not isinstance(givens, list) or not givens or not isinstance(grid, list) or len(grid) != len(givens):
        raise GradeError("Izgara boyutu uyuşmuyor")
    size = len(givens)
    seen = set()
    for row in range(size):
        if not isinstance(grid[row], list) or len(grid[row]) != size or len(givens[row]) != size:
            raise GradeError("Izgara boyutu uyuşmuyor")
        for col in range(size):
            value = grid[row][col]
            if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 9:
                raise GradeError("Sayı geçersiz")
            if value in seen:
                raise GradeError("Sayı tekrar ediyor")
            seen.add(value)
            given = givens[row][col]
            if given and given != value:
                raise GradeError("Verilen sayı değişmiş")
    for row in range(size):
        if _eval_line(grid[row], across[row]) != row_results[row]:
            raise GradeError("Satır sonucu tutmuyor")
    for col in range(size):
        values = [grid[row][col] for row in range(size)]
        ops = [down[row][col] for row in range(size - 1)]
        if _eval_line(values, ops) != col_results[col]:
            raise GradeError("Sütun sonucu tutmuyor")


_NUMBER_LETTERS = "ABCDEFGHI"


def _number_at(grid, letter):
    index = _NUMBER_LETTERS.find(str(letter))
    if index < 0:
        return None
    value = grid[index // 3][index % 3]
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value


def _number_side(grid, text):
    raw = str(text).replace(" ", "").replace("×", "*").replace("−", "-")
    if len(raw) == 1 and raw in _NUMBER_LETTERS:
        return _number_at(grid, raw)
    if len(raw) == 3 and raw[0] in _NUMBER_LETTERS and raw[2] in _NUMBER_LETTERS and raw[1] in "+-*/":
        left = _number_at(grid, raw[0])
        right = _number_at(grid, raw[2])
        if left is None or right is None:
            return None
        if raw[1] == "+":
            return left + right
        if raw[1] == "-":
            return left - right
        if raw[1] == "*":
            return left * right
        if right == 0 or left % right != 0:
            return None
        return left // right
    return None


def _number_holds(grid, clue):
    kind = clue.get("kind") if isinstance(clue, dict) else None
    if kind == "equation":
        left = _number_side(grid, clue.get("left"))
        right = _number_side(grid, clue.get("right"))
        return left is not None and left == right
    cells = clue.get("cells") or []
    values = [_number_at(grid, cell) for cell in cells]
    if any(value is None for value in values):
        return False
    if kind == "total":
        return sum(values) == clue.get("target")
    if kind == "relation" and len(values) == 3:
        first, second, third = values
        if clue.get("op") == "*":
            return first * second == third or first * third == second or second * third == first
        return first + second == third or first + third == second or second + third == first
    return False


def _grade_numbers(_difficulty, puzzle, answer):
    clues = (puzzle or {}).get("clues") if isinstance(puzzle, dict) else None
    grid = _as_grid(answer)
    if not isinstance(grid, list) or len(grid) != 3 or not isinstance(clues, list) or not clues:
        raise GradeError("Izgara boyutu uyuşmuyor")
    seen = []
    for row in grid:
        if not isinstance(row, list) or len(row) != 3:
            raise GradeError("Izgara boyutu uyuşmuyor")
        for value in row:
            if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 9:
                raise GradeError("Sayı geçersiz")
            seen.append(value)
    if sorted(seen) != [1, 2, 3, 4, 5, 6, 7, 8, 9]:
        raise GradeError("Sayı tekrar ediyor")
    for clue in clues:
        if not _number_holds(grid, clue):
            raise GradeError("İşlem tutmuyor")


def _grade_colours(_difficulty, puzzle, answer):
    clues = (puzzle or {}).get("clues") if isinstance(puzzle, dict) else None
    grid = _as_grid(answer)
    if not isinstance(grid, list) or len(grid) != 3 or not isinstance(clues, list) or not clues:
        raise GradeError("Izgara boyutu uyuşmuyor")
    seen = set()
    for row in grid:
        if not isinstance(row, list) or len(row) != 3:
            raise GradeError("Izgara boyutu uyuşmuyor")
        for cell in row:
            if not isinstance(cell, dict):
                raise GradeError("Parça eksik")
            code = _colour_code(cell)
            if code not in _COLOUR_CODES or code in seen:
                raise GradeError("Parça geçersiz")
            seen.add(code)
    if len(seen) != 9:
        raise GradeError("Parça eksik")
    for clue in clues:
        if not _colour_clue(grid, clue):
            raise GradeError("İpucu tutmuyor")


_COLOUR_CODES = {"GS", "BS", "YS", "RS", "YC", "KC", "GC", "RC", "BC"}


def _colour_code(piece):
    color = {"green": "G", "blue": "B", "yellow": "Y", "red": "R", "black": "K"}.get(piece.get("color"))
    shape = {"square": "S", "circle": "C"}.get(piece.get("shape"))
    if not color or not shape:
        return None
    return color + shape


def _colour_matches(piece, item):
    code = _colour_code(piece) if isinstance(piece, dict) else None
    if not code or not isinstance(item, str) or len(item) != 2:
        return False
    if item.startswith("?"):
        return code[1] == item[1]
    if item.endswith("?"):
        return code[0] == item[0]
    return code == item


def _colour_assigns(pieces, items):
    if len(pieces) != len(items):
        return False
    used = [False] * len(items)

    def take(index):
        if index == len(pieces):
            return True
        for item_index, item in enumerate(items):
            if used[item_index] or not _colour_matches(pieces[index], item):
                continue
            used[item_index] = True
            if take(index + 1):
                return True
            used[item_index] = False
        return False

    return take(0)


def _colour_clue(grid, clue):
    marks = clue.get("marks") if isinstance(clue, dict) else None
    items = clue.get("items")
    if not isinstance(marks, list) or len(marks) != 3 or not isinstance(items, list):
        return False
    checks = []
    for row_index, row in enumerate(marks):
        if not isinstance(row, list) or len(row) != 3:
            return False
        for col_index, mark in enumerate(row):
            piece = grid[row_index][col_index]
            if mark == "V":
                checks.append(piece)
            elif mark == "X" and any(_colour_matches(piece, item) for item in items):
                return False
    if checks and not _colour_assigns(checks, items):
        return False
    return True


def _grade_metaforms(_difficulty, puzzle, answer):
    clues = (puzzle or {}).get("clues") if isinstance(puzzle, dict) else None
    grid = (answer or {}).get("grid") if isinstance(answer, dict) else None
    if not isinstance(clues, list) or not clues or not isinstance(grid, list) or len(grid) != 3:
        raise GradeError("Izgara boyutu uyuşmuyor")
    placed = []
    seen = set()
    for row_index, row in enumerate(grid):
        if not isinstance(row, list) or len(row) != 3:
            raise GradeError("Izgara boyutu uyuşmuyor")
        for col_index, cell in enumerate(row):
            if not isinstance(cell, dict):
                raise GradeError("Parça eksik")
            shape, color = cell.get("shape"), cell.get("color")
            if shape not in FORM_SHAPES or color not in FORM_COLORS:
                raise GradeError("Parça geçersiz")
            if (shape, color) in seen:
                raise GradeError("Parça tekrar ediyor")
            seen.add((shape, color))
            placed.append((shape, color, f"{row_index}-{col_index}"))
    if len(seen) != 9:
        raise GradeError("Parça eksik")
    for clue in clues:
        if not _form_clue_ok(placed, clue):
            raise GradeError("İpucu tutmuyor")


def _form_code(shape, color):
    color_code = {"red": "R", "blue": "B", "yellow": "Y"}.get(color)
    shape_code = {"square": "S", "triangle": "T", "circle": "C"}.get(shape)
    if not color_code or not shape_code:
        return None
    return color_code + shape_code


def _form_matches(code, subject):
    if not code or not isinstance(subject, str) or len(subject) != 2:
        return False
    if subject.startswith("?"):
        return code[1] == subject[1]
    if subject.endswith("?"):
        return code[0] == subject[0]
    return code == subject


def _form_clue_ok(placed, clue):
    if not isinstance(clue, dict):
        return False
    subject = clue.get("subject")
    pattern = clue.get("pattern")
    if not isinstance(subject, str) or not isinstance(pattern, list) or not pattern:
        return False
    grid = {(cell): _form_code(shape, color) for shape, color, cell in placed}
    height = len(pattern)
    width = max((len(row) if isinstance(row, list) else 0) for row in pattern)
    cells = []
    for row_index, row in enumerate(pattern):
        if not isinstance(row, list):
            return False
        for col_index, token in enumerate(row):
            if token != "-":
                cells.append((row_index, col_index, token))
    if height > 3 or width > 3 or not cells:
        return False
    positive = any(token == "#" for _row, _col, token in cells)

    def piece_at(origin_row, origin_col, row, col):
        return grid.get(f"{origin_row + row}-{origin_col + col}")

    if positive:
        for origin_row in range(4 - height):
            for origin_col in range(4 - width):
                if any(
                    token == "X" and _form_matches(piece_at(origin_row, origin_col, row, col), subject)
                    for row, col, token in cells
                ):
                    continue
                if all(
                    token in (".", "X") or _form_matches(piece_at(origin_row, origin_col, row, col), subject if token == "#" else token)
                    for row, col, token in cells
                ):
                    return True
        return False
    for origin_row in range(4 - height):
        for origin_col in range(4 - width):
            symbols = [(row, col, token) for row, col, token in cells if token not in (".", "X", "#")]
            if not all(_form_matches(piece_at(origin_row, origin_col, row, col), token) for row, col, token in symbols):
                continue
            if any(token == "X" and _form_matches(piece_at(origin_row, origin_col, row, col), subject) for row, col, token in cells):
                return False
    return True
