from ..extensions import db


class PasswordLoginLimit(db.Model):
    """One temporary window per normalized email, whether registered or unknown."""

    __tablename__ = "password_login_limits"
    __table_args__ = (
        db.CheckConstraint("attempts > 0", name="positive_attempts"),
        db.CheckConstraint("expires_at > 0", name="positive_expiry"),
    )

    # Lookup digest, not a secret or anonymization guarantee. No account FK.
    email_digest = db.Column(db.String(64), primary_key=True)
    attempts = db.Column(db.Integer, nullable=False)
    expires_at = db.Column(db.BigInteger, nullable=False, index=True)
