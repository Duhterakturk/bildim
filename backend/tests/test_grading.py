import copy
import json
import subprocess
import time
from pathlib import Path

from app.models.game import GAME_CATALOG
from app.services.grading import GradeError, grade
from tests.helpers import auth_headers
from tests.payloads import post_score, reference


def test_every_catalog_round_grades():
    for index, entry in enumerate(GAME_CATALOG, start=1):
        puzzle, answer = reference(index)
        points, duration = grade(entry["slug"], "easy", puzzle, answer, 40)
        assert duration == 40
        assert points >= 100


def test_abc_accepts_a_cover_and_rejects_a_gap_or_swap():
    from copy import deepcopy

    assert GAME_CATALOG[8]["slug"] == "abc-baglama"
    puzzle, answer = reference(9)
    grade("abc-baglama", "easy", puzzle, answer, 12)

    gapped = deepcopy(answer)
    letter = next(iter(gapped["paths"]))
    gapped["paths"][letter] = gapped["paths"][letter][:-1]
    try:
        grade("abc-baglama", "easy", puzzle, gapped, 12)
    except GradeError:
        pass
    else:
        raise AssertionError("boş kare kabul edildi")

    keys = list(answer["paths"])
    swapped = deepcopy(answer)
    swapped["paths"][keys[0]], swapped["paths"][keys[1]] = swapped["paths"][keys[1]], swapped["paths"][keys[0]]
    try:
        grade("abc-baglama", "easy", puzzle, swapped, 12)
    except GradeError:
        return
    raise AssertionError("yer değiştiren yollar kabul edildi")


def test_tampered_answer_is_rejected(client, student, app):
    auth = auth_headers(student["token"])
    _puzzle, answer = reference(2)
    answer[0][0] = answer[0][1]
    resp = post_score(client, auth, 2, app, duration=40, answer=answer)
    assert resp.status_code == 400


def test_metaforms_rejects_a_cross_beside_the_subject_mark():
    pieces = [
        ("square", "red"), ("triangle", "red"), ("circle", "red"),
        ("square", "blue"), ("triangle", "blue"), ("circle", "blue"),
        ("square", "yellow"), ("triangle", "yellow"), ("circle", "yellow"),
    ]

    def layout(first, second):
        rest = [piece for piece in pieces if piece not in (first, second)]
        cells = [first, second, *rest]
        return [[{"shape": shape, "color": color} for shape, color in cells[index:index + 3]] for index in range(0, 9, 3)]

    puzzle = {"clues": [{"subject": "R?", "pattern": [["#", "X", "."], [".", ".", "."], [".", ".", "."]]}]}
    try:
        grade("metaforms", "easy", puzzle, {"grid": layout(("square", "red"), ("triangle", "red"))}, 10)
    except GradeError:
        pass
    else:
        raise AssertionError("çarpıdaki özne kabul edildi")
    grade("metaforms", "easy", puzzle, {"grid": layout(("square", "red"), ("triangle", "blue"))}, 10)


def test_metaforms_rejects_a_swapped_piece():
    assert GAME_CATALOG[16]["slug"] == "metaforms"
    puzzle, answer = reference(17)
    grid = answer["grid"]
    grid[0][0], grid[0][1] = grid[0][1], grid[0][0]
    try:
        grade("metaforms", "easy", puzzle, answer, 10)
    except GradeError:
        return
    raise AssertionError("yerleri değişen parçalar kabul edildi")


def test_numbers_book_layouts_pass_and_a_swap_fails():
    questions = [
        (
            [
                {"kind": "equation", "left": "A/I", "right": "H/D"},
                {"kind": "equation", "left": "D", "right": "B/F"},
                {"kind": "relation", "op": "+", "cells": ["C", "D", "G"]},
                {"kind": "total", "cells": ["A", "C"], "target": 16},
            ],
            [[9, 8, 7], [2, 1, 4], [5, 6, 3]],
        ),
        (
            [
                {"kind": "relation", "op": "*", "cells": ["B", "D", "F"]},
                {"kind": "equation", "left": "E", "right": "G+B"},
                {"kind": "total", "cells": ["A", "D", "G"], "target": 6},
                {"kind": "equation", "left": "H", "right": "C-A"},
                {"kind": "total", "cells": ["C", "F", "I"], "target": 24},
            ],
            [[3, 4, 9], [2, 5, 8], [1, 6, 7]],
        ),
        (
            [
                {"kind": "relation", "op": "+", "cells": ["E", "F", "I"]},
                {"kind": "relation", "op": "+", "cells": ["A", "C", "E"]},
                {"kind": "total", "cells": ["A", "D", "G"], "target": 7},
                {"kind": "equation", "left": "G", "right": "D-F"},
                {"kind": "total", "cells": ["B", "E", "H"], "target": 24},
                {"kind": "relation", "op": "+", "cells": ["D", "F", "H"]},
            ],
            [[2, 9, 6], [4, 8, 3], [1, 7, 5]],
        ),
    ]
    for clues, grid in questions:
        grade("numbers", "easy", {"clues": clues}, grid, 10)
        swapped = [row[:] for row in grid]
        swapped[0][0], swapped[0][1] = swapped[0][1], swapped[0][0]
        try:
            grade("numbers", "easy", {"clues": clues}, swapped, 10)
        except GradeError:
            continue
        raise AssertionError("yerleri değişen sayılar kabul edildi")


def test_pyramid_rejects_a_repeated_digit():
    assert GAME_CATALOG[6]["slug"] == "sihirli-piramit"
    puzzle, answer = reference(7)
    answer["path"] = [0, 1, 1, 1]
    try:
        grade("sihirli-piramit", "easy", puzzle, answer, 10)
    except GradeError:
        return
    raise AssertionError("tekrarlayan sayılı yol kabul edildi")


def _client_answer(slug, proof):
    solution = proof["solution"]
    return solution


def _spoil(answer):
    data = copy.deepcopy(answer)
    if isinstance(data, list) and data and isinstance(data[0], list):
        cell = data[0][0]
        if isinstance(cell, int):
            data[0][0] = cell - 1 if cell > 1 else cell + 1
        else:
            data[0][0] = 1 if cell is None else None
        return data
    if isinstance(data, dict):
        if isinstance(data.get("cells"), list):
            data["cells"] = data["cells"][1:] if data["cells"] else ["0-0"]
            return data
        if isinstance(data.get("paths"), dict) and data["paths"]:
            letter = next(iter(data["paths"]))
            data["paths"][letter] = data["paths"][letter][:-1]
            return data
        if isinstance(data.get("edges"), list) and data["edges"]:
            data["edges"] = data["edges"][:-1]
            return data
        if isinstance(data.get("path"), list):
            data["path"] = [0, 0, 0]
            return data
        if isinstance(data.get("horizontal"), list):
            data["horizontal"][0][0] = not data["horizontal"][0][0]
            return data
        if isinstance(data.get("placements"), list) and data["placements"]:
            data["placements"][0]["cells"] = (data["placements"][0].get("cells") or [])[:-1]
            return data
        if isinstance(data.get("grid"), list) and data["grid"] and isinstance(data["grid"][0], list):
            data["grid"][0][0] = None if data["grid"][0][0] is not None else 0
            return data
    raise AssertionError("çözüm bozulamadı")


def test_kakuro_accepts_a_run_and_rejects_a_bad_cell():
    puzzle = {
        "grid": [
            [{"type": "block"}, {"type": "clue", "down": 3}, {"type": "clue", "down": 7}],
            [{"type": "clue", "right": 4}, {"type": "white"}, {"type": "white"}],
            [{"type": "clue", "right": 6}, {"type": "white"}, {"type": "white"}],
        ],
        "size": 3,
    }
    answer = [[None, None, None], [None, 1, 3], [None, 2, 4]]
    grade("kakuro", "easy", puzzle, answer, 10)
    wrong_sum = [[None, None, None], [None, 1, 2], [None, 2, 4]]
    repeated = [[None, None, None], [None, 1, 3], [None, 1, 6]]
    on_black = [[5, None, None], [None, 1, 3], [None, 2, 4]]
    for bad in (wrong_sum, repeated, on_black):
        try:
            grade("kakuro", "easy", puzzle, bad, 10)
        except GradeError:
            continue
        raise AssertionError("bozuk çapraz toplam kabul edildi")


def test_generated_solutions_grade_by_rules():
    root = Path(__file__).resolve().parents[2]
    frontend = root / "frontend"
    slugs = [entry["slug"] for entry in GAME_CATALOG]
    lines = [f"{slug} {difficulty}" for slug in slugs for difficulty in ("easy", "medium", "hard") for _ in range(5)]
    completed = subprocess.run(
            "npx vite-node scripts/open-puzzle.mjs",
            input="\n".join(lines) + "\n",
            text=True,
            capture_output=True,
            cwd=frontend,
            timeout=600,
            check=False,
            shell=True,
            encoding="utf-8",
        )
    assert completed.returncode == 0, completed.stderr
    issued = [json.loads(line) for line in completed.stdout.splitlines() if line.strip()]
    assert len(issued) == len(lines)
    for request, puzzle in zip(lines, issued):
        slug, difficulty = request.split()
        assert "error" not in puzzle, f"{slug} {difficulty} üretilemedi"
        proof = puzzle["proof"]
        answer = _client_answer(slug, proof)
        puzzle_body = {key: value for key, value in proof.items() if key != "solution"}
        started = time.perf_counter()
        grade(slug, difficulty, puzzle_body, answer, 12)
        assert time.perf_counter() - started < 0.5, f"{slug} {difficulty} yavaş"
        try:
            grade(slug, difficulty, puzzle_body, _spoil(answer), 12)
        except GradeError:
            continue
        raise AssertionError(f"{slug} {difficulty} bozuk çözüm kabul edildi")


def test_grade_rejects_empty_sudoku():
    try:
        grade("sudoku", "easy", {"givens": [[0] * 9 for _ in range(9)]}, [[1] * 9 for _ in range(9)], 10)
    except GradeError:
        return
    raise AssertionError("boş sudoku kabul edildi")
