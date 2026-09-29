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

from app.api_error import fail
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
        return fail("register_required", "E-posta, şifre ve ad soyad gerekli.")

    if not EMAIL_RE.match(email):
        return fail("email_invalid", "E-posta adresi geçerli görünmüyor. Adresi kontrol ediniz.")

    if len(password) < MIN_PASSWORD_LENGTH:
        return fail("password_short", f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır", count=MIN_PASSWORD_LENGTH)

    if len(full_name) > 255:
        return fail("name_long", "Ad soyad en fazla 255 karakter olabilir")
    if password in _name_candidates(full_name):
        return fail("name_is_password", "Lütfen ad soyad alanına şifrenizi yazmayınız.")

    if role == UserRole.PARENT.value:
        return fail("parent_closed", "Veli hesabı kapalı. Evde öğrenci hesabı açabilirsiniz.")

    if role not in (UserRole.STUDENT.value, UserRole.TEACHER.value, UserRole.INDIVIDUAL.value):
        return fail("role_invalid", "Seçilen rol geçerli değil.")

    if role != UserRole.STUDENT.value:
        grade_level = None

    reminder = data.get("reminder") or ""
    if len(normalize_reminder(reminder)) < MIN_REMINDER_LENGTH:
        return fail("reminder_short", "Hatırlatma kelimesi en az 3 karakter olmalıdır")

    if User.query.filter_by(email=email).first():
        return fail("email_taken", "Bu e-posta zaten kayıtlı. Giriş yapabilirsiniz.", 409)

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
        return fail("login_failed", "E-posta veya şifre eşleşmedi. Bilgilerinizi kontrol edip yeniden deneyebilirsiniz.", 401)

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
        return fail("user_missing", "Hesap bulunamadı.", 404)
    return jsonify(user.to_dict())


@auth_bp.patch("/me")
@jwt_required()
@limiter.limit("10 per minute")
def update_name():
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return fail("user_missing", "Hesap bulunamadı.", 404)
    data = request.get_json(silent=True) or {}
    raw_name = data.get("full_name") if isinstance(data, dict) else None
    full_name = " ".join(raw_name.split()) if isinstance(raw_name, str) else ""
    if not full_name or len(full_name) > 255:
        return fail("name_length", "Ad soyad 1–255 karakter olmalıdır")
    if any(user.check_password(candidate) for candidate in _name_candidates(full_name)):
        return fail("name_is_password", "Lütfen ad soyad alanına şifrenizi yazmayınız.")
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
        return fail("password_current", "Mevcut şifre eşleşmedi. Şifrenizi kontrol edip yeniden deneyebilirsiniz.")
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return fail("password_short", f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır", count=MIN_PASSWORD_LENGTH)

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
        return fail("password_current", "Mevcut şifre eşleşmedi. Şifrenizi kontrol edip yeniden deneyebilirsiniz.")
    if len(normalize_reminder(reminder)) < MIN_REMINDER_LENGTH:
        return fail("reminder_short", "Hatırlatma kelimesi en az 3 karakter olmalıdır")

    user.set_reminder(reminder)
    db.session.commit()
    return jsonify({"ok": True})


RECOVER_ERROR = "E-posta veya hatırlatma kelimesi eşleşmedi. İkisini de kontrol edip yeniden deneyebilirsiniz."
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
                "PUBLIC_APP_URL", "https://bildim.onrender.com"
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
        return fail("password_short", f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır", count=MIN_PASSWORD_LENGTH)

    user = User.query.filter_by(email=email).first() if email else None
    if not user or not user.check_reminder(reminder):
        return fail("reminder_mismatch", RECOVER_ERROR)

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
        return fail("reset_invalid", "Bağlantı geçersiz")
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return fail("password_short", f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır", count=MIN_PASSWORD_LENGTH)

    row = PasswordReset.query.filter_by(token_hash=hash_token(raw)).first()
    if not row or not row.is_open():
        return fail("reset_expired", "Bağlantının süresi dolmuş. Giriş sayfasından yeni bir bağlantı isteyebilirsiniz.")

    user = db.session.get(User, row.user_id)
    if not user:
        return fail("reset_invalid", "Bağlantı geçersiz")

    user.set_password(new_password)
    row.used_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"ok": True})
