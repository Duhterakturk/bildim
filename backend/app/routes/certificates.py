from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Certificate, User
from app.services.certificates import can_read, catalog_for, render_pdf

certificates_bp = Blueprint("certificates", __name__, url_prefix="/api/certificates")


@certificates_bp.get("/me")
@jwt_required()
def mine():
    user = db.session.get(User, get_jwt_identity())
    if user is None:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404
    return jsonify(catalog_for(user.id))


@certificates_bp.get("/student/<string:student_id>")
@jwt_required()
def student_list(student_id):
    viewer = db.session.get(User, get_jwt_identity())
    if not can_read(viewer, student_id):
        return jsonify({"error": "Bu sertifikalara erişiminiz yok."}), 403
    return jsonify(catalog_for(student_id))


@certificates_bp.get("/<string:certificate_id>/pdf")
@jwt_required()
def download(certificate_id):
    viewer = db.session.get(User, get_jwt_identity())
    row = db.session.get(Certificate, certificate_id)
    if row is None or not can_read(viewer, row.user_id):
        return jsonify({"error": "Bu sertifikaya erişiminiz yok."}), 403
    owner = db.session.get(User, row.user_id)
    try:
        payload = render_pdf(owner, row)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    return send_file(
        payload,
        as_attachment=True,
        download_name="bildim-sertifika.pdf",
        mimetype="application/pdf",
    )
