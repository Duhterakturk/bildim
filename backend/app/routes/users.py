from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.get("/children")
@jwt_required()
def my_children():
    return jsonify({"error": "Veli hesabı kapalı."}), 403


@users_bp.post("/children/link")
@jwt_required()
def link_child():
    return jsonify({"error": "Veli hesabı kapalı. Evde öğrenci hesabı açabilirsiniz."}), 403
