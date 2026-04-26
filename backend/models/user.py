from datetime import datetime, timezone
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id         = db.Column(db.Integer, primary_key=True)
    email      = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password   = db.Column(db.String(255), nullable=False)        # bcrypt hash
    name       = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    watchlist = db.relationship("Watchlist", back_populates="user",
                                cascade="all, delete-orphan")
    alerts    = db.relationship("Alert", back_populates="user",
                                cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id":         self.id,
            "email":      self.email,
            "name":       self.name,
            "created_at": self.created_at.isoformat(),
        }
