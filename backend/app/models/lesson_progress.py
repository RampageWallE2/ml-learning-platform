from uuid import uuid4

from ..extensions import db


class LessonProgress(db.Model):
    __tablename__ = "lesson_progress"
    __table_args__ = (
        db.UniqueConstraint(
            "profile_id",
            "lesson_id",
            name="uq_lesson_progress_profile_lesson",
        ),
        db.CheckConstraint(
            "status IN ('in_progress', 'completed')",
            name="valid_status",
        ),
        db.CheckConstraint("current_step >= 0", name="nonnegative_current_step"),
    )

    id = db.Column(db.Uuid(as_uuid=True), primary_key=True, default=uuid4)
    profile_id = db.Column(
        db.Uuid(as_uuid=True),
        db.ForeignKey("learning_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id = db.Column(db.String(100), nullable=False)
    status = db.Column(
        db.String(20),
        nullable=False,
        default="in_progress",
        server_default="in_progress",
    )
    current_step = db.Column(
        db.Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    started_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
    )
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )

    profile = db.relationship("LearningProfile", back_populates="lesson_progress")

    def to_dict(self) -> dict:
        return {
            "lessonId": self.lesson_id,
            "status": self.status,
            "currentStep": self.current_step,
            "startedAt": self.started_at.isoformat(),
            "completedAt": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            "updatedAt": self.updated_at.isoformat(),
        }
