import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.api_error import fail
from app.extensions import db
from app.models import Assignment, Classroom, Game, User, UserRole
from app.services.assignments import DIFFICULTY_LABELS, assignment_payload, board, completed_count

assignments_bp = Blueprint("assignments", __name__, url_prefix="/api")


def _teacher_classroom(classroom_id):
    teacher = db.session.get(User, get_jwt_identity())
    if not teacher or teacher.role != UserRole.TEACHER:
        return None, fail("teacher_only", "Bu işlem yalnızca öğretmen hesabı içindir.", 403)
    classroom = db.session.get(Classroom, classroom_id)
    if not classroom or classroom.teacher_id != teacher.id:
        return None, fail("class_forbidden", "Bu sınıf size ait değil", 403)
    return classroom, None


def _latest(classroom_id):
    return (
        Assignment.query.filter_by(classroom_id=classroom_id)
        .order_by(Assignment.created_at.desc(), Assignment.id.desc())
        .first()
    )


def _current(classroom_id):
    latest = _latest(classroom_id)
    if latest is None:
        return []
    if not latest.batch_id:
        return [latest]
    return (
        Assignment.query.filter_by(classroom_id=classroom_id, batch_id=latest.batch_id)
        .order_by(Assignment.id.asc())
        .all()
    )


@assignments_bp.post("/classrooms/<int:classroom_id>/assignment")
@jwt_required()
def create_assignment(classroom_id):
    classroom, error = _teacher_classroom(classroom_id)
    if error:
        return error

    data = request.get_json(force=True) or {}
    slugs = data.get("slugs")
    if not slugs:
        single = (data.get("slug") or "").strip()
        slugs = [single] if single else []
    slugs = list(dict.fromkeys(str(item).strip() for item in slugs if str(item).strip()))
    difficulty = (data.get("difficulty") or "").strip()
    try:
        target_count = int(data.get("target_count"))
    except (TypeError, ValueError):
        target_count = 0

    if not slugs:
        return fail("assignment_games", "En az bir oyun seçiniz.")
    if difficulty not in DIFFICULTY_LABELS:
        return fail("difficulty_invalid", "Seçilen zorluk geçerli değil.")
    if target_count < 1 or target_count > 10:
        return fail("assignment_target", "Hedef 1 ile 10 arasında olmalıdır")

    games = []
    for slug in slugs:
        game = Game.query.filter_by(slug=slug, is_active=True).first()
        if not game:
            return fail("game_missing", "Oyun bulunamadı", 404)
        games.append(game)

    stamp = datetime.utcnow()
    batch_id = str(uuid.uuid4())
    rows = []
    for game in games:
        row = Assignment(
            classroom_id=classroom.id,
            game_id=game.id,
            difficulty=difficulty,
            target_count=target_count,
            batch_id=batch_id,
            created_at=stamp,
        )
        db.session.add(row)
        rows.append(row)
    db.session.commit()
    return jsonify(board(rows)), 201


@assignments_bp.get("/classrooms/<int:classroom_id>/assignment")
@jwt_required()
def current_assignment(classroom_id):
    _, error = _teacher_classroom(classroom_id)
    if error:
        return error
    rows = _current(classroom_id)
    if not rows:
        return jsonify({
            "assignment": None,
            "assignments": [],
            "finished": [],
            "pending_count": 0,
            "class_total": 0,
            "sentence": "",
        })
    return jsonify(board(rows))


@assignments_bp.get("/assignments/mine")
@jwt_required()
def my_assignment():
    student = db.session.get(User, get_jwt_identity())
    if not student or student.role != UserRole.STUDENT:
        return fail("student_only", "Bu işlem yalnızca öğrenci hesabı içindir.", 403)
    if not student.classroom_id:
        return jsonify({"assignment": None, "assignments": []})
    rows = _current(student.classroom_id)
    if not rows:
        return jsonify({"assignment": None, "assignments": []})
    payloads = []
    for item in rows:
        done = completed_count(item, student.id)
        payload = assignment_payload(item, done)
        payload["finished"] = done >= item.target_count
        payloads.append(payload)
    return jsonify({
        "assignment": payloads[0],
        "assignments": payloads,
        "finished": all(item["finished"] for item in payloads),
    })
