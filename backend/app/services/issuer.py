import json
import os
import shutil
import subprocess
import threading
from copy import deepcopy
from pathlib import Path

from flask import current_app


class IssueError(RuntimeError):
    pass


_BACKEND = Path(__file__).resolve().parents[2]
_FIXTURES = _BACKEND / "tests" / "fixtures" / "rounds.json"
_FRONTEND = _BACKEND.parent / "frontend"
_SCRIPT = _FRONTEND / "scripts" / "open-puzzle.mjs"
_ROUNDS = None


_LOCK = threading.Lock()
_NODE = threading.Lock()
_SHELF = {}
_PENDING = set()
_PROC = None
_SHELF_LIMIT = 1


def issue(slug, difficulty):
    if current_app.config.get("TESTING"):
        row = _fixture(slug)
        public = deepcopy(row["puzzle"])
        proof = deepcopy(row["puzzle"])
        proof["solution"] = deepcopy(row["answer"])
        return public, proof
    ready = _take(slug, difficulty)
    if ready is None:
        failure = None
        for _ in range(3):
            try:
                ready = _from_node(slug, difficulty)
                break
            except IssueError as exc:
                failure = exc
                ready = None
        if ready is None:
            raise failure
    threading.Thread(target=_refill, args=(slug, difficulty), daemon=True).start()
    return ready


def warm_shelf():
    from app.models.game import GAME_CATALOG

    for difficulty in ("easy", "medium", "hard"):
        for row in GAME_CATALOG:
            _refill(row["slug"], difficulty)


def _take(slug, difficulty):
    with _LOCK:
        pile = _SHELF.get((slug, difficulty))
        if not pile:
            return None
        return pile.pop()


def _refill(slug, difficulty):
    key = (slug, difficulty)
    with _LOCK:
        pile = _SHELF.get(key)
        if (pile and len(pile) >= _SHELF_LIMIT) or key in _PENDING:
            return
        _PENDING.add(key)
    try:
        public, proof = _from_node(slug, difficulty)
    except IssueError:
        return
    finally:
        with _LOCK:
            _PENDING.discard(key)
    with _LOCK:
        pile = _SHELF.setdefault(key, [])
        if len(pile) < _SHELF_LIMIT:
            pile.append((public, proof))


def _fixture(slug):
    global _ROUNDS
    if _ROUNDS is None:
        _ROUNDS = json.loads(_FIXTURES.read_text(encoding="utf-8"))
    if slug not in _ROUNDS:
        raise IssueError("Bulmaca açılamadı")
    return _ROUNDS[slug]


def _from_node(slug, difficulty):
    with _NODE:
        proc = _process()
        try:
            proc.stdin.write(f"{slug} {difficulty}\n")
            proc.stdin.flush()
        except (OSError, BrokenPipeError) as exc:
            _stop()
            raise IssueError("Bulmaca açılamadı") from exc
        box = {}

        def read():
            try:
                box["line"] = proc.stdout.readline()
            except OSError:
                box["line"] = ""

        reader = threading.Thread(target=read, daemon=True)
        reader.start()
        reader.join(45)
        if reader.is_alive():
            _stop()
            raise IssueError("Bulmaca açılamadı")
        line = (box.get("line") or "").strip()
        if not line:
            _stop()
            raise IssueError("Bulmaca açılamadı")
    try:
        payload = json.loads(line)
    except json.JSONDecodeError as exc:
        raise IssueError("Bulmaca açılamadı") from exc
    if payload.get("error") or "public" not in payload or "proof" not in payload:
        raise IssueError("Bulmaca açılamadı")
    return payload["public"], payload["proof"]


def _process():
    global _PROC
    if _PROC is not None and _PROC.poll() is None:
        return _PROC
    runner = os.environ.get("PUZZLE_RUNNER")
    if runner:
        node = shutil.which("node")
        if node is None or not Path(runner).is_file():
            raise IssueError("Bulmaca üretici bulunamadı")
        command = [node, runner]
        cwd = None
    else:
        npx = shutil.which("npx")
        if npx is None or not _SCRIPT.exists():
            raise IssueError("Bulmaca üretici bulunamadı")
        command = [npx, "vite-node", str(_SCRIPT)]
        cwd = _FRONTEND
    try:
        _PROC = subprocess.Popen(
            command,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
        )
    except OSError as exc:
        raise IssueError("Bulmaca üretici bulunamadı") from exc
    return _PROC


def _stop():
    global _PROC
    proc = _PROC
    _PROC = None
    if proc is not None and proc.poll() is None:
        proc.kill()
