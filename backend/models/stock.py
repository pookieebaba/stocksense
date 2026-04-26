from datetime import datetime, timezone
from extensions import db


class StockPrice(db.Model):
    """Stores the OHLCV price snapshots fetched every 15 minutes."""
    __tablename__ = "stock_prices"

    id         = db.Column(db.Integer, primary_key=True)
    symbol     = db.Column(db.String(20), nullable=False, index=True)
    open       = db.Column(db.Float)
    high       = db.Column(db.Float)
    low        = db.Column(db.Float)
    close      = db.Column(db.Float, nullable=False)
    volume     = db.Column(db.BigInteger)
    fetched_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self):
        return {
            "symbol":     self.symbol,
            "open":       self.open,
            "high":       self.high,
            "low":        self.low,
            "close":      self.close,
            "volume":     self.volume,
            "fetched_at": self.fetched_at.isoformat(),
        }


class Watchlist(db.Model):
    """Stocks a user is tracking."""
    __tablename__ = "watchlists"

    id        = db.Column(db.Integer, primary_key=True)
    user_id   = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    symbol    = db.Column(db.String(20), nullable=False)
    added_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="watchlist")

    __table_args__ = (db.UniqueConstraint("user_id", "symbol"),)

    def to_dict(self):
        return {"id": self.id, "symbol": self.symbol, "added_at": self.added_at.isoformat()}


class Alert(db.Model):
    """Price alerts set by users."""
    __tablename__ = "alerts"

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    symbol       = db.Column(db.String(20), nullable=False)
    target_price = db.Column(db.Float, nullable=False)
    direction    = db.Column(db.String(5), nullable=False)   # "above" | "below"
    triggered    = db.Column(db.Boolean, default=False)
    created_at   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="alerts")

    def to_dict(self):
        return {
            "id":           self.id,
            "symbol":       self.symbol,
            "target_price": self.target_price,
            "direction":    self.direction,
            "triggered":    self.triggered,
        }
