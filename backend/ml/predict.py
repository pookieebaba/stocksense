"""
ml/predict.py
─────────────
Loads a saved model artifact and generates price predictions
for the next N trading days.
"""

import pickle
import logging
from pathlib import Path

import numpy as np

from ml.features import add_technical_indicators
from data_fetcher import fetch_history

logger    = logging.getLogger(__name__)
MODEL_DIR = Path(__file__).parent / "saved_models"


def load_model(symbol: str) -> dict:
    path = MODEL_DIR / f"{symbol.upper()}.pkl"
    if not path.exists():
        raise FileNotFoundError(
            f"No trained model found for {symbol}. "
            f"Run: python -m ml.train --symbol {symbol}"
        )
    with open(path, "rb") as f:
        return pickle.load(f)


def predict_next_days(symbol: str, days: int = 7) -> dict:
    """
    Predicts closing prices for the next *days* trading days.

    Returns
    ───────
    {
        "symbol":      "AAPL",
        "predictions": [{"day": 1, "price": 182.34}, ...],
        "metrics":     {"mae": ..., "rmse": ..., "mape": ...},
        "last_close":  180.00,
        "trend":       "up" | "down" | "flat",
    }
    """
    artifact = load_model(symbol)
    model    = artifact["model"]
    scaler_X = artifact["scaler_X"]
    scaler_y = artifact["scaler_y"]
    seq_len  = artifact["seq_len"]
    features = artifact["features"]

    # Fetch recent history to build the last input window
    df = fetch_history(symbol.upper(), period="6mo", interval="1d")
    if df.empty:
        raise ValueError(f"Cannot fetch recent data for {symbol}")

    df        = add_technical_indicators(df)
    feat_vals = df[features].values        # (N, n_features)

    if len(feat_vals) < seq_len:
        raise ValueError("Not enough historical data to build input window")

    X_scaled = scaler_X.transform(feat_vals)

    # Auto-regressive multi-step prediction
    window       = X_scaled[-seq_len:].copy()   # (seq_len, n_features)
    predictions  = []
    last_close   = float(df["Close"].iloc[-1])

    for day in range(1, days + 1):
        # Run the LSTM over the current window
        pred_scaled = model.predict(window)[-1]          # scalar (last step)
        price       = scaler_y.inverse_transform(
            np.array([[pred_scaled]])
        ).item()

        predictions.append({"day": day, "price": round(price, 2)})

        # Shift window: drop oldest row, append a synthetic new row
        # (copy last row, update Close column to predicted price)
        close_idx      = features.index("Close")
        new_row        = window[-1].copy()
        new_row[close_idx] = pred_scaled
        window         = np.vstack([window[1:], new_row])

    # Trend direction
    first_pred = predictions[0]["price"]
    last_pred  = predictions[-1]["price"]
    diff_pct   = (last_pred - first_pred) / first_pred * 100

    if diff_pct > 0.5:
        trend = "up"
    elif diff_pct < -0.5:
        trend = "down"
    else:
        trend = "flat"

    return {
        "symbol":      symbol.upper(),
        "predictions": predictions,
        "metrics":     artifact.get("metrics", {}),
        "last_close":  round(last_close, 2),
        "trend":       trend,
        "days":        days,
    }


def is_model_trained(symbol: str) -> bool:
    return (MODEL_DIR / f"{symbol.upper()}.pkl").exists()
