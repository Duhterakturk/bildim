import json
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request

from app.extensions import db, limiter
from app.models import Game, PuzzleAttempt, User, UserRole
from app.services.cell_hint import HintError, pick_hint
from app.services.difficulty import compute_unlocked_difficulties
from app.services.grading import GradeError, accepts
from app.services.hint_bank import balance_of, earn_once, spend
from app.services.issuer import IssueError, issue

_HINT_KEYS = {"kind", "row", "col", "value", "axis", "index", "round", "note", "label", "name", "cells", "shape", "color"}

puzzles_bp = Blueprint("puzzles", __name__, url_prefix="/api/puzzles")


@puzzles_bp.post("")
@limiter.limit("30 per minute")
def open_puzzle():
    verify_jwt_in_request(optional=True)
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    difficulty = data.get("difficulty") or "easy"
    if difficulty not in ("easy", "medium", "hard"):
        return jsonify({"error": "Seçilen zorluk geçerli değil."}), 400

    game = _find_game(data)
    if game is None:
        return jsonify({"error": "Oyun bulunamadı"}), 404
    if not _difficulty_allowed(user_id, game.slug, difficulty):
        return jsonify({"error": "Bu zorluk henüz açık değil"}), 403

    try:
        public, proof = issue(game.slug, difficulty)
    except IssueError as exc:
        return jsonify({"error": str(exc)}), 503

    attempt = PuzzleAttempt(
        user_id=user_id,
        game_id=game.id,
        difficulty=difficulty,
        public_json=json.dumps(public),
        proof_json=json.dumps(proof),
        started_at=datetime.utcnow(),
    )
    db.session.add(attempt)
    db.session.commit()
    return jsonify(_payload(attempt)), 201


@puzzles_bp.get("/<string:attempt_id>")
def read_puzzle(attempt_id):
    verify_jwt_in_request(optional=True)
    attempt = db.session.get(PuzzleAttempt, attempt_id)
    if attempt is None or attempt.consumed_at is not None:
        return jsonify({"error": "Bulmaca bulunamadı"}), 404
    if not _can_see(attempt):
        return jsonify({"error": "Bulmaca bulunamadı"}), 404
    return jsonify(_payload(attempt))


@puzzles_bp.post("/<string:attempt_id>/check")
def check_puzzle(attempt_id):
    verify_jwt_in_request(optional=True)
    attempt = db.session.get(PuzzleAttempt, attempt_id)
    if attempt is None or attempt.consumed_at is not None:
        return jsonify({"error": "Bulmaca bulunamadı"}), 404
    if not _can_see(attempt):
        return jsonify({"error": "Bulmaca bulunamadı"}), 404
    answer = (request.get_json(silent=True) or {}).get("answer")
    try:
        correct = accepts(attempt.game.slug, attempt.difficulty, attempt.proof_puzzle, answer)
    except GradeError:
        correct = False
    body = {"correct": correct}
    if correct:
        body["hint_balance"] = earn_once(attempt)
        from app.services.stars import breakdown
        from app.routes.scores import _elapsed
        body["stars"] = breakdown(attempt, _elapsed(attempt.started_at))
        db.session.commit()
    return jsonify(body)


@puzzles_bp.post("/<string:attempt_id>/cell")
@limiter.limit("20 per minute")
def reveal_cell(attempt_id):
    verify_jwt_in_request(optional=True)
    attempt = db.session.get(PuzzleAttempt, attempt_id)
    if attempt is None or attempt.consumed_at is not None:
        return jsonify({"error": "Bulmaca bulunamadı"}), 404
    if not _can_see(attempt):
        return jsonify({"error": "Bulmaca bulunamadı"}), 404
    if not attempt.user_id:
        return jsonify({"error": "İpuçları giriş yaptıktan sonra kullanılabilir.", "code": "hint_login"}), 403
    user = db.session.get(User, attempt.user_id)
    if user is None or not spend(user):
        return jsonify({
            "error": "İpucu hakkı kalmadı. Bir bulmaca çözülünce bir hak daha gelir.",
            "code": "hint_empty",
            "hint_balance": 0 if user is None else int(user.hint_balance or 0),
        }), 409
    focus = (request.get_json(silent=True) or {}).get("round")
    used = {_hint_key(item) for item in _stored_hints(attempt)}
    hint = None
    try:
        for _ in range(24):
            candidate = pick_hint(attempt.game.slug, attempt.public_puzzle, attempt.proof_puzzle, focus)
            candidate = {key: value for key, value in candidate.items() if key in _HINT_KEYS}
            if _hint_key(candidate) not in used:
                hint = candidate
                break
    except HintError as exc:
        db.session.rollback()
        return jsonify({"error": str(exc), "code": getattr(exc, "code", "hint_unavailable")}), 400
    if hint is None:
        db.session.rollback()
        return jsonify({
            "error": "Bu bulmacada açılacak başka kare kalmadı.",
            "code": "hint_done",
            "hint_balance": balance_of(attempt.user_id),
        }), 409
    stored = _stored_hints(attempt)
    stored.append(hint)
    attempt.hint_json = json.dumps(stored)
    db.session.commit()
    return jsonify({"hint": hint, "hints": stored, "hint_balance": int(user.hint_balance)})


def _find_game(data):
    if data.get("game_id") is not None:
        return db.session.get(Game, data.get("game_id"))
    slug = data.get("slug")
    if not slug:
        return None
    return Game.query.filter_by(slug=slug).first()


def _difficulty_allowed(user_id, slug, difficulty):
    if difficulty == "easy":
        return True
    if not user_id:
        return False
    user = db.session.get(User, user_id)
    if user and user.role == UserRole.TEACHER:
        return True
    progress = compute_unlocked_difficulties(user_id, slug)
    return bool(progress and progress["unlocked"].get(difficulty))


def _can_see(attempt):
    verify_jwt_in_request(optional=True)
    user_id = get_jwt_identity()
    if attempt.user_id is None:
        return user_id is None
    return attempt.user_id == user_id


def _stored_hints(attempt):
    if not attempt.hint_json:
        return []
    data = json.loads(attempt.hint_json)
    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def _hint_key(hint):
    parts = []
    for key in ("kind", "row", "col", "axis", "index", "round", "note", "label", "name", "shape", "color", "value", "cells"):
        if key not in hint:
            continue
        parts.append(json.dumps(hint[key], sort_keys=True, ensure_ascii=False))
    return tuple(parts)


def _payload(attempt):
    hints = _stored_hints(attempt)
    return {
        "id": attempt.id,
        "game_id": attempt.game_id,
        "slug": attempt.game.slug,
        "difficulty": attempt.difficulty,
        "puzzle": attempt.public_puzzle,
        "hint": hints[-1] if hints else None,
        "hints": hints,
        "hint_balance": balance_of(attempt.user_id),
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
    }
