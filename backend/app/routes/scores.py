from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.api_error import fail
from app.extensions import db
from app.models import Score, Game, PuzzleAttempt, User, UserRole, Classroom
from app.services.badges import check_and_award_badges
from app.services.grading import GradeError, grade
from app.services.hint_bank import balance_of, earn_once
from app.services.stars import award

scores_bp = Blueprint("scores", __name__, url_prefix="/api/scores")


def _elapsed(started_at):
    seconds = int((datetime.utcnow() - started_at).total_seconds())
    return max(0, min(seconds, 3 * 60 * 60))


@scores_bp.post("")
@jwt_required()
def submit_score():
    user_id = get_jwt_identity()
    data = request.get_json(force=True) or {}

    attempt = db.session.get(PuzzleAttempt, data.get("attempt_id"))
    if attempt is None or attempt.user_id != user_id:
        return fail("puzzle_missing", "Bulmaca bulunamadı", 404)
    if attempt.consumed_at is not None:
        return fail("score_already", "Bu bulmacanın skoru zaten yazıldı", 409)

    game = attempt.game
    duration = _elapsed(attempt.started_at)
    if data.get("answer") is None:
        score = Score(
            user_id=user_id,
            game_id=game.id,
            points=0,
            duration_seconds=duration,
            difficulty=attempt.difficulty,
            completed=False,
        )
    else:
        try:
            points, duration = grade(game.slug, attempt.difficulty, attempt.proof_puzzle, data.get("answer"), duration)
        except GradeError as exc:
            return fail(exc.code, str(exc), 400)
        score = Score(
            user_id=user_id,
            game_id=game.id,
            points=points,
            duration_seconds=duration,
            difficulty=attempt.difficulty,
            completed=True,
        )
    attempt.consumed_at = datetime.utcnow()
    db.session.add(score)
    hint_balance = earn_once(attempt) if score.completed else balance_of(user_id)
    stars = award(attempt, duration) if score.completed else None
    if score.completed and stars is not None:
        from app.services.motivation import notice_for

        stars.update(notice_for(user_id, game.slug))
    db.session.commit()

    new_badges = check_and_award_badges(user_id) if score.completed else []

    return jsonify({
        "score": score.to_dict(),
        "new_badges": [b.to_dict() for b in new_badges],
        "hint_balance": hint_balance,
        "stars": stars,
    }), 201


@scores_bp.get("/me")
@jwt_required()
def my_scores():
    user_id = get_jwt_identity()
    game_slug = request.args.get("game")

    query = Score.query.filter_by(user_id=user_id)
    if game_slug:
        game = Game.query.filter_by(slug=game_slug).first()
        if not game:
            return jsonify({"error": "Oyun bulunamadı"}), 404
        query = query.filter_by(game_id=game.id)

    scores = query.order_by(Score.created_at.desc()).limit(100).all()
    return jsonify([s.to_dict() for s in scores])


@scores_bp.get("/leaderboard/<string:game_slug>")
@jwt_required()
def leaderboard(game_slug):
    teacher = db.session.get(User, get_jwt_identity())
    if not teacher or teacher.role != UserRole.TEACHER:
        return jsonify({"error": "Bu liste yalnızca öğretmen hesabı içindir."}), 403

    game = Game.query.filter_by(slug=game_slug).first()
    if not game:
        return jsonify({"error": "Oyun bulunamadı"}), 404

    classroom_ids = [c.id for c in Classroom.query.filter_by(teacher_id=teacher.id).all()]
    if not classroom_ids:
        return jsonify([])

    student_ids = [
        user.id
        for user in User.query.filter(
            User.role == UserRole.STUDENT,
            User.classroom_id.in_(classroom_ids),
        ).all()
    ]
    if not student_ids:
        return jsonify([])

    top_scores = (
        Score.query.filter(
            Score.game_id == game.id,
            Score.completed.is_(True),
            Score.user_id.in_(student_ids),
        )
        .order_by(Score.points.desc())
        .limit(10)
        .all()
    )
    rows = []
    for score in top_scores:
        payload = score.to_dict()
        payload.pop("user_id", None)
        full_name = score.user.full_name.strip() if score.user and score.user.full_name else ""
        payload["display_name"] = full_name.split()[0] if full_name else "Oyuncu"
        rows.append(payload)
    return jsonify(rows)
