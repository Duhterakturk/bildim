import enum
import uuid
from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db


class UserRole(str, enum.Enum):
    STUDENT = "student"
    PARENT = "parent"
    TEACHER = "teacher"
    INDIVIDUAL = "individual"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    reminder_hash = db.Column(db.String(255), nullable=True)
    full_name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    grade_level = db.Column(db.Integer, nullable=True)

    parent_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    children = db.relationship(
        "User", backref=db.backref("parent", remote_side=[id]), lazy="dynamic"
    )

    classroom_id = db.Column(db.Integer, db.ForeignKey("classrooms.id"), nullable=True)
    hint_balance = db.Column(db.Integer, nullable=False, default=3, server_default="3")
    star_balance = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    stars_earned_total = db.Column(db.Integer, nullable=False, default=0, server_default="0")
    active_title = db.Column(db.String(80), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scores = db.relationship("Score", backref="user", lazy="dynamic")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def set_reminder(self, reminder: str) -> None:
        from app.services.reminder import normalize_reminder

        self.reminder_hash = generate_password_hash(normalize_reminder(reminder))

    def check_reminder(self, reminder: str) -> bool:
        from app.services.reminder import normalize_reminder

        if not self.reminder_hash:
            return False
        return check_password_hash(self.reminder_hash, normalize_reminder(reminder))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role.value,
            "grade_level": self.grade_level,
            "parent_id": self.parent_id,
            "classroom_id": self.classroom_id,
            "has_reminder": bool(self.reminder_hash),
            "hint_balance": self.hint_balance,
            "star_balance": self.star_balance,
            "stars_earned_total": self.stars_earned_total,
            "active_title": self.active_title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
