"""
routes/ml.py
────────────
Flask endpoints that expose the ML model to the frontend.
"""

import threading
import logging

from flask import Blueprint, jsonify, request

from ml.predict import predict_next_days, is_model_trained
from ml.train import train as train_model

logger = logging.getLogger(__name__)
ml_bp  = Blueprint("ml", __name__, url_prefix="/api/ml")

# Track which symbols are currently being trained
_training: set[str] = set()


@ml_bp.get("/<symbol>/predict")
def predict(symbol: str):
    """
    GET /api/ml/AAPL/predict?days=7
    Returns next N-day price predictions.
    If model isn't trained yet, triggers background training and returns 202.
    """
    symbol = symbol.upper()
    days   = min(int(request.args.get("days", 7)), 30)

    if not is_model_trained(symbol):
        if symbol not in _training:
            _start_training(symbol)
            return jsonify({
                "status":  "training",
                "message": f"Model for {symbol} is being trained. "
                           f"Try again in ~60 seconds.",
            }), 202
        return jsonify({
            "status":  "training",
            "message": f"Model for {symbol} is still training…",
        }), 202

    try:
        result = predict_next_days(symbol, days=days)
        return jsonify(result)
    except Exception as exc:
        logger.error("Prediction failed for %s: %s", symbol, exc)
        return jsonify({"error": str(exc)}), 500


@ml_bp.post("/<symbol>/train")
def trigger_train(symbol: str):
    """
    POST /api/ml/AAPL/train
    Manually triggers (re)training for a symbol.
    """
    symbol = symbol.upper()
    if symbol in _training:
        return jsonify({"status": "already_training",
                        "message": f"{symbol} is already being trained."}), 409

    _start_training(symbol)
    return jsonify({"status": "started",
                    "message": f"Training started for {symbol}."})


@ml_bp.get("/<symbol>/status")
def model_status(symbol: str):
    """GET /api/ml/AAPL/status  →  whether model is trained / training"""
    symbol = symbol.upper()
    return jsonify({
        "symbol":   symbol,
        "trained":  is_model_trained(symbol),
        "training": symbol in _training,
    })


# ── Internal helpers ─────────────────────────────────────────────────────────

def _start_training(symbol: str, epochs: int = 20):
    _training.add(symbol)

    def _run():
        try:
            logger.info("Background training started for %s", symbol)
            train_model(symbol, epochs=epochs)
            logger.info("Background training finished for %s", symbol)
        except Exception as exc:
            logger.error("Training failed for %s: %s", symbol, exc)
        finally:
            _training.discard(symbol)

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
