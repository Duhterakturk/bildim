import os
import re
import secrets
from datetime import datetime

from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)

from app.extensions import db, limiter
from app.models import User, UserRole
from app.models.password_reset import PasswordReset, fresh_expiry, hash_token
from app.services.mail import send_password_reset
from app.services.reminder import MIN_REMINDER_LENGTH, normalize_reminder

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


def _name_candidates(full_name):
    # Also catch a password accidentally repeated by autofill in the name field.
    yield full_name
    words = full_name.split()
    if len(words) > 1 and len(set(words)) == 1:
        yield words[0]


@auth_bp.post("/register")
@limiter.limit("10 per minute")
def register():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    raw_name = data.get("full_name")
    full_name = " ".join(raw_name.split()) if isinstance(raw_name, str) else ""
    role = data.get("role", UserRole.STUDENT.value)
    grade_level = data.get("grade_level")

    if not email or not password or not full_name:
        return jsonify({"error": "email, password ve full_name zorunludur"}), 400

    if not EMAIL_RE.match(email):
        return jsonify({"error": "Geçersiz e-posta adresi"}), 400

    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır"}), 400

    if len(full_name) > 255:
        return jsonify({"error": "Ad soyad en fazla 255 karakter olabilir"}), 400
    if password in _name_candidates(full_name):
        return jsonify({"error": "Ad soyad alanına şifrenizi yazmayın"}), 400

    if role == UserRole.PARENT.value:
        return jsonify({"error": "Veli hesabı yok. Evde öğrenci hesabı açın."}), 400

    if role not in (UserRole.STUDENT.value, UserRole.TEACHER.value):
        return jsonify({"error": "Geçersiz rol"}), 400

    reminder = data.get("reminder") or ""
    if len(normalize_reminder(reminder)) < MIN_REMINDER_LENGTH:
        return jsonify({"error": "Hatırlatma kelimesi en az 3 karakter olmalıdır"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Bu e-posta zaten kayıtlı"}), 409

    user = User(email=email, full_name=full_name, role=UserRole(role), grade_level=grade_level)
    user.set_password(password)
    user.set_reminder(reminder)
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    return jsonify(
        {"user": user.to_dict(), "access_token": access_token, "refresh_token": refresh_token}
    ), 201


@auth_bp.post("/login")
@limiter.limit("10 per minute")
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "E-posta veya şifre hatalı"}), 401

    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    return jsonify(
        {"user": user.to_dict(), "access_token": access_token, "refresh_token": refresh_token}
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)
    return jsonify({"access_token": access_token, "refresh_token": refresh_token})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404
    return jsonify(user.to_dict())


@auth_bp.patch("/me")
@jwt_required()
@limiter.limit("10 per minute")
def update_name():
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404
    data = request.get_json(silent=True) or {}
    raw_name = data.get("full_name") if isinstance(data, dict) else None
    full_name = " ".join(raw_name.split()) if isinstance(raw_name, str) else ""
    if not full_name or len(full_name) > 255:
        return jsonify({"error": "Ad soyad 1–255 karakter olmalıdır"}), 400
    if any(user.check_password(candidate) for candidate in _name_candidates(full_name)):
        return jsonify({"error": "Ad soyad alanına şifrenizi yazmayın"}), 400
    user.full_name = full_name
    db.session.commit()
    return jsonify(user.to_dict())


@auth_bp.post("/password")
@jwt_required()
@limiter.limit("10 per minute")
def change_password():
    data = request.get_json(force=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    user = db.session.get(User, get_jwt_identity())
    if not user or not user.check_password(current_password):
        return jsonify({"error": "Mevcut şifre hatalı"}), 400
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır"}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"ok": True})


@auth_bp.post("/reminder")
@jwt_required()
@limiter.limit("10 per minute")
def set_reminder():
    data = request.get_json(force=True) or {}
    current_password = data.get("current_password") or ""
    reminder = data.get("reminder") or ""

    user = db.session.get(User, get_jwt_identity())
    if not user or not user.check_password(current_password):
        return jsonify({"error": "Mevcut şifre hatalı"}), 400
    if len(normalize_reminder(reminder)) < MIN_REMINDER_LENGTH:
        return jsonify({"error": "Hatırlatma kelimesi en az 3 karakter olmalıdır"}), 400

    user.set_reminder(reminder)
    db.session.commit()
    return jsonify({"ok": True})


RECOVER_ERROR = "E-posta veya hatırlatma kelimesi uymadı."
FORGOT_MESSAGE = "Bu e-posta kayıtlıysa şifre bağlantısı gönderildi."


@auth_bp.post("/forgot")
@limiter.limit("5 per minute")
def forgot_password():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    current_app.config["LAST_RESET_TOKEN"] = None

    user = User.query.filter_by(email=email).first() if email else None
    if user:
        raw = secrets.token_urlsafe(32)
        PasswordReset.query.filter_by(user_id=user.id, used_at=None).update(
            {"used_at": datetime.utcnow()}
        )
        db.session.add(
            PasswordReset(user_id=user.id, token_hash=hash_token(raw), expires_at=fresh_expiry())
        )
        db.session.commit()
        if current_app.config.get("TESTING"):
            current_app.config["LAST_RESET_TOKEN"] = raw
        else:
            base = os.environ.get(
                "PUBLIC_APP_URL", "https://mindarena-app.onrender.com"
            ).rstrip("/")
            send_password_reset(user.email, f"{base}/reset?token={raw}")

    return jsonify({"message": FORGOT_MESSAGE})


@auth_bp.post("/recover")
@limiter.limit("5 per minute")
def recover_password():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    reminder = data.get("reminder") or ""
    new_password = data.get("password") or ""
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır"}), 400

    user = User.query.filter_by(email=email).first() if email else None
    if not user or not user.check_reminder(reminder):
        return jsonify({"error": RECOVER_ERROR}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"ok": True})


@auth_bp.post("/reset")
@limiter.limit("10 per minute")
def reset_password():
    data = request.get_json(force=True) or {}
    raw = (data.get("token") or "").strip()
    new_password = data.get("password") or ""
    if not raw:
        return jsonify({"error": "Bağlantı geçersiz"}), 400
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır"}), 400

    row = PasswordReset.query.filter_by(token_hash=hash_token(raw)).first()
    if not row or not row.is_open():
        return jsonify({"error": "Bağlantının süresi dolmuş. Yeniden iste."}), 400

    user = db.session.get(User, row.user_id)
    if not user:
        return jsonify({"error": "Bağlantı geçersiz"}), 400

    user.set_password(new_password)
    row.used_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"ok": True})
