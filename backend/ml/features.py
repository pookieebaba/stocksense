"""
ml/features.py
──────────────
Computes technical indicators used as features for the LSTM model.
All indicators are calculated from raw OHLCV DataFrames.
"""

import numpy as np
import pandas as pd


def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds the following columns to the DataFrame:
      - sma_10, sma_20      Simple Moving Averages
      - ema_10              Exponential Moving Average
      - rsi                 Relative Strength Index (14-period)
      - macd, macd_signal   MACD line and signal line
      - bb_upper, bb_lower  Bollinger Bands (20-period, 2σ)
      - daily_return        Close-to-close % return
      - volatility          20-day rolling std of daily returns
    """
    df = df.copy()

    # ── Moving Averages ──────────────────────────────────────────────────────
    df["sma_10"] = df["Close"].rolling(10).mean()
    df["sma_20"] = df["Close"].rolling(20).mean()
    df["ema_10"] = df["Close"].ewm(span=10, adjust=False).mean()

    # ── RSI (14-period) ──────────────────────────────────────────────────────
    delta = df["Close"].diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    rs    = gain / loss.replace(0, np.nan)
    df["rsi"] = 100 - (100 / (1 + rs))

    # ── MACD ─────────────────────────────────────────────────────────────────
    ema12          = df["Close"].ewm(span=12, adjust=False).mean()
    ema26          = df["Close"].ewm(span=26, adjust=False).mean()
    df["macd"]         = ema12 - ema26
    df["macd_signal"]  = df["macd"].ewm(span=9, adjust=False).mean()

    # ── Bollinger Bands ───────────────────────────────────────────────────────
    rolling_mean   = df["Close"].rolling(20).mean()
    rolling_std    = df["Close"].rolling(20).std()
    df["bb_upper"] = rolling_mean + 2 * rolling_std
    df["bb_lower"] = rolling_mean - 2 * rolling_std

    # ── Returns & Volatility ─────────────────────────────────────────────────
    df["daily_return"] = df["Close"].pct_change()
    df["volatility"]   = df["daily_return"].rolling(20).std()

    return df.dropna()


FEATURE_COLUMNS = [
    "Close", "Volume",
    "sma_10", "sma_20", "ema_10",
    "rsi", "macd", "macd_signal",
    "bb_upper", "bb_lower",
    "daily_return", "volatility",
]
