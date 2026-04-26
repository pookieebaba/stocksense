"""
routes/watchlist.py
───────────────────
Add / remove / list stocks in a user's personal watchlist.
All routes require a valid JWT.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.stock import Watchlist, Alert
from data_fetcher import fetch_current_price

watchlist_bp = Blueprint("watchlist", __name__, url_prefix="/api/watchlist")


@watchlist_bp.get("/")
@jwt_required()
def get_watchlist():
    user_id = int(get_jwt_identity())
    items   = Watchlist.query.filter_by(user_id=user_id).all()

    # Enrich each item with the latest price
    result = []
    for item in items:
        entry = item.to_dict()
        quote = fetch_current_price(item.symbol)
        if quote:
            entry["price"] = quote.get("close")
        result.append(entry)
    return jsonify(result)


@watchlist_bp.post("/")
@jwt_required()
def add_to_watchlist():
    user_id = int(get_jwt_identity())
    data    = request.get_json(silent=True) or {}
    symbol  = data.get("symbol", "").upper().strip()

    if not symbol:
        return jsonify({"error": "symbol is required"}), 400

    if Watchlist.query.filter_by(user_id=user_id, symbol=symbol).first():
        return jsonify({"error": f"{symbol} is already in your watchlist"}), 409

    item = Watchlist(user_id=user_id, symbol=symbol)
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@watchlist_bp.delete("/<symbol>")
@jwt_required()
def remove_from_watchlist(symbol: str):
    user_id = int(get_jwt_identity())
    item    = Watchlist.query.filter_by(user_id=user_id, symbol=symbol.upper()).first()

    if not item:
        return jsonify({"error": "not found in watchlist"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": f"{symbol.upper()} removed from watchlist"})


# ── Alerts ───────────────────────────────────────────────────────────────────

@watchlist_bp.post("/alerts")
@jwt_required()
def create_alert():
    user_id = int(get_jwt_identity())
    data    = request.get_json(silent=True) or {}

    symbol       = data.get("symbol", "").upper().strip()
    target_price = data.get("target_price")
    direction    = data.get("direction", "above")   # "above" | "below"

    if not symbol or target_price is None:
        return jsonify({"error": "symbol and target_price are required"}), 400
    if direction not in ("above", "below"):
        return jsonify({"error": "direction must be 'above' or 'below'"}), 400

    alert = Alert(
        user_id      = user_id,
        symbol       = symbol,
        target_price = float(target_price),
        direction    = direction,
    )
    db.session.add(alert)
    db.session.commit()
    return jsonify(alert.to_dict()), 201


@watchlist_bp.get("/alerts")
@jwt_required()
def list_alerts():
    user_id = int(get_jwt_identity())
    alerts  = Alert.query.filter_by(user_id=user_id, triggered=False).all()
    return jsonify([a.to_dict() for a in alerts])
