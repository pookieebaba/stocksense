"""
data_fetcher.py - Alpha Vantage API (replaces yfinance)
"""
import os, logging, requests
from datetime import datetime, timezone
import pandas as pd
from extensions import db
from models.stock import StockPrice

logger  = logging.getLogger(__name__)
AV_KEY  = os.getenv("ALPHA_VANTAGE_KEY", "demo")
AV_BASE = "https://www.alphavantage.co/query"

DEFAULT_SYMBOLS = ["AAPL","MSFT","GOOGL","AMZN","TSLA","META","NVDA","NFLX"]

def fetch_current_price(symbol: str) -> dict | None:
    try:
        r = requests.get(AV_BASE, params={
            "function": "GLOBAL_QUOTE",
            "symbol": symbol.upper(),
            "apikey": AV_KEY,
        }, timeout=10).json()
        q = r.get("Global Quote", {})
        if not q or not q.get("05. price"):
            return None
        return {
            "symbol": symbol.upper(),
            "open":   float(q.get("02. open", 0)),
            "high":   float(q.get("03. high", 0)),
            "low":    float(q.get("04. low",  0)),
            "close":  float(q.get("05. price", 0)),
            "volume": int(float(q.get("06. volume", 0))),
            "change": float(q.get("09. change", 0)),
            "change_pct": q.get("10. change percent", "0%"),
        }
    except Exception as e:
        logger.error("fetch_current_price(%s): %s", symbol, e)
        return None

def fetch_history(symbol: str, period: str = "6mo", interval: str = "1d") -> pd.DataFrame:
    try:
        size = "full" if period in ("1y","2y","5y","max") else "compact"
        r = requests.get(AV_BASE, params={
            "function": "TIME_SERIES_DAILY",
            "symbol": symbol.upper(),
            "outputsize": size,
            "apikey": AV_KEY,
        }, timeout=15).json()
        series = r.get("Time Series (Daily)", {})
        if not series:
            return pd.DataFrame()
        rows = [{"Date": pd.Timestamp(d), "Open": float(v["1. open"]),
                 "High": float(v["2. high"]), "Low": float(v["3. low"]),
                 "Close": float(v["4. close"]), "Volume": int(v["5. volume"])}
                for d, v in sorted(series.items())]
        df = pd.DataFrame(rows).set_index("Date")
        days = {"5d":5,"1mo":30,"3mo":90,"6mo":180,"1y":365,"2y":730}.get(period, 180)
        return df.tail(days)
    except Exception as e:
        logger.error("fetch_history(%s): %s", symbol, e)
        return pd.DataFrame()

def search_ticker(query: str) -> list[dict]:
    try:
        r = requests.get(AV_BASE, params={
            "function": "SYMBOL_SEARCH",
            "keywords": query,
            "apikey": AV_KEY,
        }, timeout=10).json()
        return [{"symbol": m.get("1. symbol",""), "name": m.get("2. name",""),
                 "exchange": m.get("4. region","")}
                for m in r.get("bestMatches", [])[:8] if m.get("1. symbol")]
    except Exception as e:
        logger.error("search_ticker(%s): %s", query, e)
        return []

def save_price_snapshot(symbol: str) -> bool:
    data = fetch_current_price(symbol)
    if not data or not data.get("close"):
        return False
    db.session.add(StockPrice(
        symbol=data["symbol"], open=data["open"], high=data["high"],
        low=data["low"], close=data["close"], volume=data["volume"],
        fetched_at=datetime.now(timezone.utc),
    ))
    db.session.commit()
    return True

def refresh_all_watched_symbols(app) -> None:
    with app.app_context():
        from models.stock import Watchlist
        symbols = [r.symbol for r in db.session.query(Watchlist.symbol).distinct().all()]
        for sym in (symbols or DEFAULT_SYMBOLS):
            save_price_snapshot(sym)