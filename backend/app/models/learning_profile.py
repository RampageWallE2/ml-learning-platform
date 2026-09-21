from uuid import uuid4

from ..extensions import db


class LearningProfile(db.Model):
    __tablename__ = "learning_profiles"

    id = db.Column(db.Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id = db.Column(
        db.Uuid(as_uuid=True),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
    )

    lesson_progress = db.relationship(
        "LessonProgress",
        back_populates="profile",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    user = db.relationship("User", back_populates="learning_profile")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "createdAt": self.created_at.isoformat(),
        }
