from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.api_error import fail
from app.extensions import db, limiter
from app.models import User
from app.services.exams import exam_payload, latest_exam, open_exam

exams_bp = Blueprint("exams", __name__, url_prefix="/api/exams")


@exams_bp.get("/current")
@jwt_required()
def current_exam():
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return fail("user_missing", "Kullanıcı bulunamadı", 404)
    return jsonify({"exam": exam_payload(latest_exam(user))})


@exams_bp.post("")
@jwt_required()
@limiter.limit("10 per minute")
def start_exam():
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return fail("user_missing", "Kullanıcı bulunamadı", 404)
    return jsonify({"exam": exam_payload(open_exam(user))}), 201
