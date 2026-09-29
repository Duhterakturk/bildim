import random


class HintError(Exception):
    pass


_FILL = {
    "sudoku",
    "bolgesel-sudoku",
    "apartman",
    "islem-karesi",
    "kendoku",
    "carpmaca",
    "futoshiki",
    "numbers",
}
_MARK_NOTE = {
    "amiral-batti": "ship",
    "yildiz-savaslari": "star",
    "kare-karalamaca": "shade",
}


def pick_hint(slug, public, proof, focus=None):
    public = public or {}
    proof = proof or {}
    solution = proof.get("solution")
    if slug == "kakuro":
        return _kakuro(public, solution)
    if slug in _FILL:
        return _fill(public, solution)
    if slug == "cit":
        return _edge(solution)
    if slug == "patika":
        return _loop_edge(solution)
    if slug == "abc-baglama":
        return _letter_path(public, solution)
    if slug == "pentominolar":
        return _piece(solution)
    if slug in _MARK_NOTE:
        return _mark(public, solution, _MARK_NOTE[slug])
    if slug == "colours":
        return _palette(solution)
    if slug == "metaforms":
        return _form(public, solution)
    if slug == "sihirli-piramit":
        return _pyramid(solution)
    raise HintError("Bu bulmacada kullanılacak bir ipucu yok.")


def _fill(public, solution):
    solution = _aligned(public, solution)
    if not isinstance(solution, list):
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    blanks = []
    for row_index, row in enumerate(solution):
        if not isinstance(row, list):
            continue
        for col_index, value in enumerate(row):
            if value in (0, None, ""):
                continue
            if _blank(public, row_index, col_index):
                blanks.append((row_index, col_index, value))
    if not blanks:
        raise HintError("İpucu verilecek boş kare kalmadı")
    row_index, col_index, value = random.choice(blanks)
    return {"kind": "fill", "row": row_index, "col": col_index, "value": value}


def _blank(public, row_index, col_index):
    givens = public.get("givens")
    if givens is None and _jagged(public.get("rows")):
        givens = public["rows"]
    if givens is None:
        return True
    try:
        value = givens[row_index][col_index]
    except (IndexError, TypeError, KeyError):
        return True
    return value in (0, None, "")


def _jagged(rows):
    return isinstance(rows, list) and rows and isinstance(rows[0], list)


def _kakuro(public, solution):
    grid = (public or {}).get("grid") or []
    if not isinstance(solution, list):
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    blanks = []
    for row_index, row in enumerate(solution):
        if not isinstance(row, list):
            continue
        for col_index, value in enumerate(row):
            if isinstance(value, bool) or not isinstance(value, int) or value < 1 or value > 9:
                continue
            cell = {}
            try:
                cell = grid[row_index][col_index]
            except (IndexError, TypeError):
                cell = {}
            if isinstance(cell, dict) and cell.get("given"):
                continue
            blanks.append((row_index, col_index, value))
    if not blanks:
        raise HintError("İpucu verilecek boş kare kalmadı")
    row_index, col_index, value = random.choice(blanks)
    return {"kind": "fill", "row": row_index, "col": col_index, "value": value}


def _aligned(_public, solution):
    return solution


def _edge(solution):
    if not isinstance(solution, dict):
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    spots = []
    for axis, key in (("horizontal", "h"), ("vertical", "v")):
        grid = solution.get(axis) or []
        for row_index, row in enumerate(grid):
            for col_index, flag in enumerate(row):
                if flag:
                    spots.append((key, row_index, col_index))
    if not spots:
        raise HintError("İpucu verilecek çizgi kalmadı")
    axis, row_index, col_index = random.choice(spots)
    return {"kind": "edge", "axis": axis, "row": row_index, "col": col_index}


def _mark(public, solution, note):
    cells = _cells(solution)
    if not cells:
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    fixed = set((public.get("fixedCells") or {}).keys())
    spots = []
    for key in cells:
        if key in fixed:
            continue
        parts = str(key).split("-")
        if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
            continue
        spots.append((int(parts[0]), int(parts[1])))
    if not spots:
        raise HintError("İpucu verilecek boş kare kalmadı")
    row_index, col_index = random.choice(spots)
    return {"kind": "mark", "row": row_index, "col": col_index, "note": note}


def _loop_edge(solution):
    edges = solution.get("edges") if isinstance(solution, dict) else None
    if not isinstance(edges, list) or not edges:
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    edge = random.choice([str(item) for item in edges])
    left, right = edge.split("|")
    return {"kind": "edge", "a": left, "b": right}


def _step(public, solution):
    cells = [str(key) for key in _cells(solution)]
    fixed = _fixed(public)
    start = next((key for key, label in fixed.items() if label == "1"), None)
    if start not in cells:
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    previous = "1"
    for key in cells[cells.index(start) + 1:]:
        if key in fixed:
            previous = fixed[key]
            continue
        row_index, col_index = (int(part) for part in key.split("-"))
        return {"kind": "mark", "row": row_index, "col": col_index, "note": "step", "label": previous}
    raise HintError("İpucu verilecek boş kare kalmadı")


def _letter_path(_public, solution):
    paths = solution.get("paths") if isinstance(solution, dict) else None
    if not isinstance(paths, dict) or not paths:
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    label = random.choice(list(paths))
    path = [str(cell) for cell in paths[label]]
    if len(path) < 2:
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    return {"kind": "marks", "cells": path[:3], "label": str(label)}


def _piece(solution):
    placements = solution.get("placements") if isinstance(solution, dict) else None
    if not placements or not isinstance(placements, list):
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    piece = placements[0] or {}
    cells = [str(key) for key in (piece.get("cells") or [])]
    name = piece.get("name")
    if not name or len(cells) != 5:
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    return {"kind": "piece", "name": name, "cells": cells}


def _fixed(public):
    return {str(key): str(value) for key, value in (public.get("fixedCells") or {}).items()}


def _cells(solution):
    if not isinstance(solution, dict):
        return []
    if solution.get("cells"):
        return list(solution["cells"])
    cells = []
    for piece in solution.get("placements") or []:
        cells.extend(piece.get("cells") or [])
    return cells


def _pyramid(solution):
    path = solution.get("path") if isinstance(solution, dict) else None
    if not isinstance(path, list) or len(path) < 2:
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    row_index = random.randrange(1, len(path))
    col_index = path[row_index]
    if isinstance(col_index, bool) or not isinstance(col_index, int):
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    return {"kind": "mark", "row": row_index, "col": col_index, "note": "path"}


def _palette(solution):
    grid = solution.get("grid") if isinstance(solution, dict) else solution
    if not isinstance(grid, list):
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    spots = []
    for row_index, row in enumerate(grid):
        if not isinstance(row, list):
            continue
        for col_index, cell in enumerate(row):
            if isinstance(cell, dict) and cell.get("shape") and cell.get("color"):
                spots.append((row_index, col_index, cell))
    if not spots:
        raise HintError("İpucu verilecek parça kalmadı")
    row_index, col_index, cell = random.choice(spots)
    return {"kind": "form", "row": row_index, "col": col_index, "shape": cell["shape"], "color": cell["color"]}


def _form(public, solution):
    grid = solution.get("grid") if isinstance(solution, dict) else None
    if not isinstance(grid, list) or len(grid) != 3:
        raise HintError("Bu bulmaca ipucuna hazır değil. Yeni bir bulmaca açabilirsiniz.")
    pinned = set()
    for clue in (public or {}).get("clues") or []:
        if not isinstance(clue, dict):
            continue
        cells = clue.get("cells") or []
        if clue.get("sign") == "yes" and clue.get("shape") and clue.get("color") and len(cells) == 1:
            pinned.add(cells[0])
    spots = []
    for row_index, row in enumerate(grid):
        if not isinstance(row, list):
            continue
        for col_index, cell in enumerate(row):
            if not isinstance(cell, dict):
                continue
            if f"{row_index}-{col_index}" in pinned:
                continue
            spots.append((row_index, col_index, cell))
    if not spots:
        for row_index, row in enumerate(grid):
            for col_index, cell in enumerate(row):
                spots.append((row_index, col_index, cell))
    if not spots:
        raise HintError("İpucu verilecek boş kare kalmadı")
    row_index, col_index, cell = random.choice(spots)
    return {"kind": "form", "row": row_index, "col": col_index, "shape": cell.get("shape"), "color": cell.get("color")}
