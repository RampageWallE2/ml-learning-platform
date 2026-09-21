from uuid import uuid4

from ..extensions import db


class UserIdentity(db.Model):
    __tablename__ = "user_identities"
    __table_args__ = (
        db.UniqueConstraint(
            "provider",
            "provider_subject",
            name="uq_user_identities_provider_subject",
        ),
    )

    id = db.Column(db.Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id = db.Column(
        db.Uuid(as_uuid=True),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = db.Column(db.String(32), nullable=False)
    provider_subject = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(512), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
    )

    user = db.relationship("User", back_populates="identities")
