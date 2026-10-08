from ..extensions import db


class ScenarioProgress(db.Model):
    """Narrative milestones, independent of lesson completion and percentages."""

    __tablename__ = "scenario_progress"

    profile_id = db.Column(
        db.Uuid(as_uuid=True),
        db.ForeignKey("learning_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    scenario_key = db.Column(db.String(100), primary_key=True)
    intro_completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    profile = db.relationship("LearningProfile", back_populates="scenario_progress")

    def to_dict(self) -> dict:
        return {
            "scenarioKey": self.scenario_key,
            "introCompletedAt": (
                self.intro_completed_at.isoformat() if self.intro_completed_at else None
            ),
        }
