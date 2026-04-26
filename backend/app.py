"""
app.py
──────
Flask application factory.
Run locally:  python app.py
Production:   gunicorn app:app
"""

import logging
from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from extensions import db, jwt
from models.user import User          # noqa: F401  (register model with SQLAlchemy)
from models.stock import StockPrice, Watchlist, Alert  # noqa: F401
from routes.auth import auth_bp
from routes.stocks import stocks_bp
from routes.watchlist import watchlist_bp
from routes.ml import ml_bp
from scheduler import init_scheduler

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Extensions
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, origins=[app.config["FRONTEND_URL"]], supports_credentials=True)

    # Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(stocks_bp)
    app.register_blueprint(watchlist_bp)
    app.register_blueprint(ml_bp)

    # Create tables on first run
    with app.app_context():
        db.create_all()

    # Health-check endpoint
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "StockSense API"})

    # Generic error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "internal server error"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    # Start background scheduler (only in dev / single-worker mode)
    init_scheduler(app)
    app.run(debug=True, port=5000)
