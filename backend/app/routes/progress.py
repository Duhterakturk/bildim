import io
import os
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, send_file
from fpdf import FPDF
from flask_jwt_extended import jwt_required, get_jwt_identity
from openpyxl import Workbook

from app.extensions import db
from app.models import Score, Game, User, UserRole, Classroom
from app.services.difficulty import compute_all_unlocked, compute_unlocked_difficulties

progress_bp = Blueprint("progress", __name__, url_prefix="/api/progress")


@progress_bp.get("/unlocked-all")
@jwt_required()
def unlocked_all():
    return jsonify(compute_all_unlocked(get_jwt_identity()))


@progress_bp.get("/unlocked/<string:game_slug>")
@jwt_required()
def unlocked_difficulties(game_slug):
    user_id = get_jwt_identity()
    result = compute_unlocked_difficulties(user_id, game_slug)
    if result is None:
        return jsonify({"error": "Oyun bulunamadı"}), 404
    return jsonify(result)


def _parse_date_range():
    """Query string'den `start_date`/`end_date` (YYYY-MM-DD) okur. Geçersiz
    bir tarih sessizce yoksayılır (filtre uygulanmaz)."""
    start_date = None
    end_date = None
    raw_start = request.args.get("start_date")
    raw_end = request.args.get("end_date")
    if raw_start:
        try:
            start_date = datetime.strptime(raw_start, "%Y-%m-%d")
        except ValueError:
            pass
    if raw_end:
        try:
            # Bitiş tarihini gün sonuna kadar kapsayacak şekilde bir sonraki
            # güne öteleyip "küçüktür" ile karşılaştırıyoruz.
            end_date = datetime.strptime(raw_end, "%Y-%m-%d") + timedelta(days=1)
        except ValueError:
            pass
    return start_date, end_date


def _load_scores_and_games(user_id, start_date=None, end_date=None):
    query = Score.query.filter_by(user_id=user_id)
    if start_date:
        query = query.filter(Score.created_at >= start_date)
    if end_date:
        query = query.filter(Score.created_at < end_date)
    scores = query.order_by(Score.created_at).all()
    games = {g.id: g for g in Game.query.all()}
    return scores, games


def _build_summary(scores, games):
    completed = [s for s in scores if s.completed]
    total_points = sum(s.points for s in completed)
    distinct_games_completed = len({s.game_id for s in completed})

    per_game = {}
    for s in completed:
        game = games.get(s.game_id)
        slug = game.slug if game else "unknown"
        entry = per_game.setdefault(
            slug,
            {
                "game_slug": slug,
                "name_tr": game.name_tr if game else slug,
                "name_en": game.name_en if game else slug,
                "attempts": 0,
                "best_points": 0,
            },
        )
        entry["attempts"] += 1
        entry["best_points"] = max(entry["best_points"], s.points)

    timeline = [
        {
            "date": s.created_at.date().isoformat(),
            "points": s.points,
            "game_slug": games[s.game_id].slug if s.game_id in games else None,
        }
        for s in completed[-20:]
    ]

    return {
        "total_attempts": len(scores),
        "total_completed": len(completed),
        "total_points": total_points,
        "distinct_games_completed": distinct_games_completed,
        "per_game": sorted(per_game.values(), key=lambda e: -e["best_points"]),
        "timeline": timeline,
    }


def _build_export_workbook(scores, games):
    wb = Workbook()
    ws = wb.active
    ws.title = "İlerleme"
    ws.append(["Tarih", "Oyun", "Puan", "Zorluk", "Süre (sn)", "Tamamlandı"])
    for s in scores:
        game = games.get(s.game_id)
        ws.append(
            [
                s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "-",
                game.name_tr if game else "-",
                s.points,
                s.difficulty or "-",
                s.duration_seconds if s.duration_seconds is not None else "-",
                "Evet" if s.completed else "Hayır",
            ]
        )
    for column_cells in ws.columns:
        max_len = max(len(str(c.value)) for c in column_cells)
        ws.column_dimensions[column_cells[0].column_letter].width = max(10, max_len + 2)
    return wb


@progress_bp.get("/me")
@jwt_required()
def my_progress():
    user_id = get_jwt_identity()
    start_date, end_date = _parse_date_range()
    scores, games = _load_scores_and_games(user_id, start_date, end_date)
    return jsonify(_build_summary(scores, games))


@progress_bp.get("/export")
@jwt_required()
def export_progress():
    user_id = get_jwt_identity()
    start_date, end_date = _parse_date_range()
    scores, games = _load_scores_and_games(user_id, start_date, end_date)
    wb = _build_export_workbook(scores, games)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="bildim-ilerleme.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


def _font_path():
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None


def _build_pdf(user, scores, games):
    font = _font_path()
    if not font:
        return None
    pdf = FPDF()
    pdf.add_font("Body", "", font)
    pdf.set_font("Body", size=16)
    pdf.add_page()
    pdf.cell(0, 10, f"Bildim — {user.full_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Body", size=11)
    pdf.cell(0, 8, "İlerleme raporu", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    if not scores:
        pdf.cell(0, 8, "Henüz skor yok.", new_x="LMARGIN", new_y="NEXT")
    for score in scores:
        game = games.get(score.game_id)
        name = game.name_tr if game else "-"
        when = score.created_at.strftime("%Y-%m-%d %H:%M") if score.created_at else "-"
        state = "bitti" if score.completed else "yarım"
        line = f"{when}  {name}  {score.points} puan  {score.difficulty or '-'}  {state}"
        pdf.multi_cell(0, 7, line)
    return pdf.output()


@progress_bp.get("/export.pdf")
@jwt_required()
def export_progress_pdf():
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404
    start_date, end_date = _parse_date_range()
    scores, games = _load_scores_and_games(user.id, start_date, end_date)
    payload = _build_pdf(user, scores, games)
    if payload is None:
        return jsonify({"error": "PDF yazı tipi bulunamadı. Bir süre sonra yeniden deneyebilirsiniz."}), 503
    return send_file(
        io.BytesIO(payload),
        as_attachment=True,
        download_name="bildim-ilerleme.pdf",
        mimetype="application/pdf",
    )


@progress_bp.get("/child/<string:child_id>")
@jwt_required()
def child_progress(child_id):
    return jsonify({"error": "Veli hesabı kapalı."}), 403


@progress_bp.get("/students")
@jwt_required()
def students_overview():
    teacher = db.session.get(User, get_jwt_identity())
    if not teacher or teacher.role != UserRole.TEACHER:
        return jsonify({"error": "Bu işlem yalnızca öğretmen hesabı içindir."}), 403

    classroom_ids = [
        c.id for c in Classroom.query.filter_by(teacher_id=teacher.id).all()
    ]

    classroom_id_param = request.args.get("classroom_id", type=int)
    if classroom_id_param is not None:
        if classroom_id_param not in classroom_ids:
            return jsonify({"error": "Bu sınıf size ait değil"}), 403
        classroom_ids = [classroom_id_param]

    if not classroom_ids:
        return jsonify([])

    students = (
        User.query.filter(User.role == UserRole.STUDENT, User.classroom_id.in_(classroom_ids))
        .order_by(User.full_name)
        .all()
    )
    games = {g.id: g for g in Game.query.all()}

    overview = []
    for student in students:
        scores = Score.query.filter_by(user_id=student.id).all()
        summary = _build_summary(scores, games)
        overview.append(
            {
                "student": student.to_dict(),
                "total_completed": summary["total_completed"],
                "total_points": summary["total_points"],
                "distinct_games_completed": summary["distinct_games_completed"],
            }
        )
    return jsonify(overview)
