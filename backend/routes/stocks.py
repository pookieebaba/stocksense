"""
routes/stocks.py
────────────────
All public stock-data endpoints. No auth required to browse prices.
"""

from flask import Blueprint, jsonify, request
from models.stock import StockPrice
from data_fetcher import fetch_history, fetch_current_price, search_ticker
from extensions import db
import pandas as pd

stocks_bp = Blueprint("stocks", __name__, url_prefix="/api/stocks")


@stocks_bp.get("/search")
def search():
    """GET /api/stocks/search?q=Apple  →  list of matching tickers"""
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"error": "query param 'q' is required"}), 400
    results = search_ticker(q)
    return jsonify(results)


@stocks_bp.get("/<symbol>/quote")
def quote(symbol: str):
    """GET /api/stocks/AAPL/quote  →  latest OHLCV"""
    data = fetch_current_price(symbol.upper())
    if not data:
        return jsonify({"error": "could not fetch quote"}), 502
    return jsonify(data)


@stocks_bp.get("/<symbol>/history")
def history(symbol: str):
    """
    GET /api/stocks/AAPL/history?period=6mo&interval=1d
    Returns OHLCV rows as a JSON array sorted oldest → newest.
    """
    period   = request.args.get("period",   "6mo")
    interval = request.args.get("interval", "1d")

    df = fetch_history(symbol.upper(), period=period, interval=interval)
    if df.empty:
        return jsonify({"error": "no history found"}), 404

    df = df.reset_index()
    # Normalise the datetime column name (yfinance uses 'Datetime' for intraday)
    date_col = "Date" if "Date" in df.columns else "Datetime"
    df[date_col] = df[date_col].astype(str)

    rows = df[[date_col, "Open", "High", "Low", "Close", "Volume"]].rename(
        columns={date_col: "date", "Open": "open", "High": "high",
                 "Low": "low", "Close": "close", "Volume": "volume"}
    ).to_dict(orient="records")

    return jsonify(rows)


@stocks_bp.get("/<symbol>/snapshots")
def snapshots(symbol: str):
    """
    GET /api/stocks/AAPL/snapshots?limit=100
    Returns the last N price snapshots stored in our DB (saved every 15 min).
    """
    limit = min(int(request.args.get("limit", 100)), 1000)
    rows  = (
        StockPrice.query
        .filter_by(symbol=symbol.upper())
        .order_by(StockPrice.fetched_at.desc())
        .limit(limit)
        .all()
    )
    return jsonify([r.to_dict() for r in reversed(rows)])
@stocks_bp.get("/debug")
def debug():
    import os, requests
    key = os.getenv("ALPHA_VANTAGE_KEY", "NOT_SET")
    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey={key}"
    try:
        r = requests.get(url, timeout=10).json()
        return jsonify({"key_preview": key[:6] + "...", "response": r})
    except Exception as e:
        return jsonify({"error": str(e)})