from uuid import uuid4

from ..extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Uuid(as_uuid=True), primary_key=True, default=uuid4)
    email = db.Column(db.String(320), nullable=False, unique=True)
    display_name = db.Column(db.String(200), nullable=False)
    avatar_url = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )

    identities = db.relationship(
        "UserIdentity",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    sessions = db.relationship(
        "AuthSession",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    learning_profile = db.relationship(
        "LearningProfile",
        back_populates="user",
        uselist=False,
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "email": self.email,
            "displayName": self.display_name,
            "avatarUrl": self.avatar_url,
        }
