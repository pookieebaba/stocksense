"""
data_fetcher.py
───────────────
Pulls live and historical stock data from Yahoo Finance via yfinance.
Called both manually and by the APScheduler job.
"""

import logging
from datetime import datetime, timezone

import yfinance as yf
import pandas as pd

from extensions import db
from models.stock import StockPrice

logger = logging.getLogger(__name__)


# ── Popular stocks seeded on first run ──────────────────────────────────────
DEFAULT_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA",
    "META",  "NVDA",  "NFLX",  "BRK-B", "JPM",
]


def fetch_current_price(symbol: str) -> dict | None:
    """
    Fetch the latest available price for a single ticker.
    Returns a dict with OHLCV fields, or None on error.
    """
    try:
        ticker = yf.Ticker(symbol)
        info   = ticker.fast_info          # lightweight – no full info call

        return {
            "symbol": symbol.upper(),
            "open":   getattr(info, "open",  None),
            "high":   getattr(info, "day_high", None),
            "low":    getattr(info, "day_low",  None),
            "close":  getattr(info, "last_price", None),
            "volume": getattr(info, "last_volume", None),
        }
    except Exception as exc:
        logger.error("fetch_current_price(%s) failed: %s", symbol, exc)
        return None


def fetch_history(symbol: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    """
    Fetch historical OHLCV data for a ticker.

    period   – yfinance period string: 1d 5d 1mo 3mo 6mo 1y 2y 5y 10y ytd max
    interval – yfinance interval string: 1m 2m 5m 15m 30m 60m 90m 1h 1d 5d 1wk 1mo 3mo
    """
    try:
        ticker = yf.Ticker(symbol)
        df     = ticker.history(period=period, interval=interval)
        df.index = pd.to_datetime(df.index)
        return df
    except Exception as exc:
        logger.error("fetch_history(%s) failed: %s", symbol, exc)
        return pd.DataFrame()


def search_ticker(query: str) -> list[dict]:
    """
    Search for ticker symbols matching a company name or symbol fragment.
    Returns a list of {symbol, name, exchange} dicts.
    """
    try:
        results = yf.Search(query, max_results=8)
        quotes  = results.quotes or []
        return [
            {
                "symbol":   q.get("symbol", ""),
                "name":     q.get("longname") or q.get("shortname", ""),
                "exchange": q.get("exchange", ""),
            }
            for q in quotes
            if q.get("symbol")
        ]
    except Exception as exc:
        logger.error("search_ticker(%s) failed: %s", query, exc)
        return []


def save_price_snapshot(symbol: str) -> bool:
    """
    Fetch the current price for *symbol* and persist it to the DB.
    Returns True on success, False on failure.
    """
    data = fetch_current_price(symbol)
    if not data or data.get("close") is None:
        logger.warning("No close price returned for %s – skipping", symbol)
        return False

    row = StockPrice(
        symbol     = data["symbol"],
        open       = data["open"],
        high       = data["high"],
        low        = data["low"],
        close      = data["close"],
        volume     = data["volume"],
        fetched_at = datetime.now(timezone.utc),
    )
    db.session.add(row)
    db.session.commit()
    logger.info("Saved price snapshot for %s: $%.2f", symbol, data["close"])
    return True


def refresh_all_watched_symbols(app) -> None:
    """
    Called by APScheduler every 15 minutes.
    Fetches a fresh snapshot for every unique symbol currently in the DB.
    """
    with app.app_context():
        from models.stock import Watchlist
        symbols = (
            db.session.query(Watchlist.symbol)
            .distinct()
            .all()
        )
        symbols = [row.symbol for row in symbols] or DEFAULT_SYMBOLS

        logger.info("Scheduler: refreshing %d symbols …", len(symbols))
        for sym in symbols:
            save_price_snapshot(sym)