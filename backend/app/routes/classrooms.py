from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db, limiter
from app.models import Classroom, User, UserRole

classrooms_bp = Blueprint("classrooms", __name__, url_prefix="/api/classrooms")


@classrooms_bp.post("")
@jwt_required()
def create_classroom():
    teacher = db.session.get(User, get_jwt_identity())
    if not teacher or teacher.role != UserRole.TEACHER:
        return jsonify({"error": "Bu işlem yalnızca öğretmen hesabı içindir."}), 403

    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Sınıf adı gerekli."}), 400

    classroom = Classroom(name=name, teacher_id=teacher.id)
    db.session.add(classroom)
    db.session.commit()
    return jsonify(classroom.to_dict(include_join_code=True)), 201


@classrooms_bp.get("/mine")
@jwt_required()
def my_classrooms():
    teacher = db.session.get(User, get_jwt_identity())
    if not teacher or teacher.role != UserRole.TEACHER:
        return jsonify({"error": "Bu işlem yalnızca öğretmen hesabı içindir."}), 403

    classrooms = Classroom.query.filter_by(teacher_id=teacher.id).order_by(Classroom.created_at).all()
    return jsonify([c.to_dict(include_join_code=True) for c in classrooms])


@classrooms_bp.get("/<int:classroom_id>/students")
@jwt_required()
def classroom_students(classroom_id):
    teacher = db.session.get(User, get_jwt_identity())
    if not teacher or teacher.role != UserRole.TEACHER:
        return jsonify({"error": "Bu işlem yalnızca öğretmen hesabı içindir."}), 403

    classroom = db.session.get(Classroom, classroom_id)
    if not classroom or classroom.teacher_id != teacher.id:
        return jsonify({"error": "Bu sınıf size ait değil"}), 403

    students = classroom.students.order_by(User.full_name).all()
    return jsonify([s.to_dict() for s in students])


@classrooms_bp.post("/<int:classroom_id>/students/<string:student_id>/password")
@jwt_required()
@limiter.limit("20 per minute")
def set_student_password(classroom_id, student_id):
    teacher = db.session.get(User, get_jwt_identity())
    if not teacher or teacher.role != UserRole.TEACHER:
        return jsonify({"error": "Bu işlem yalnızca öğretmen hesabı içindir."}), 403

    classroom = db.session.get(Classroom, classroom_id)
    if not classroom or classroom.teacher_id != teacher.id:
        return jsonify({"error": "Bu sınıf size ait değil"}), 403

    student = db.session.get(User, student_id)
    if not student or student.role != UserRole.STUDENT or student.classroom_id != classroom.id:
        return jsonify({"error": "Bu öğrenci bu sınıfta değil"}), 404

    data = request.get_json(force=True) or {}
    password = data.get("password") or ""
    if len(password) < 8:
        return jsonify({"error": "Şifre en az 8 karakter olmalıdır"}), 400

    student.set_password(password)
    db.session.commit()
    return jsonify({"ok": True})


@classrooms_bp.post("/join")
@jwt_required()
@limiter.limit("10 per minute")
def join_classroom():
    student = db.session.get(User, get_jwt_identity())
    if not student or student.role != UserRole.STUDENT:
        return jsonify({"error": "Bu işlem yalnızca öğrenci hesabı içindir."}), 403

    data = request.get_json(force=True) or {}
    join_code = (data.get("join_code") or "").strip().upper()
    if not join_code:
        return jsonify({"error": "Sınıf kodu gerekli."}), 400

    classroom = Classroom.query.filter_by(join_code=join_code).first()
    if not classroom:
        return jsonify({"error": "Sınıf kodu eşleşmedi. Kodu kontrol edip yeniden deneyebilirsiniz."}), 404

    student.classroom_id = classroom.id
    db.session.commit()
    return jsonify(student.to_dict())


@classrooms_bp.post("/leave")
@jwt_required()
def leave_classroom():
    student = db.session.get(User, get_jwt_identity())
    if not student or student.role != UserRole.STUDENT:
        return jsonify({"error": "Bu işlem yalnızca öğrenci hesabı içindir."}), 403

    student.classroom_id = None
    db.session.commit()
    return jsonify(student.to_dict())
