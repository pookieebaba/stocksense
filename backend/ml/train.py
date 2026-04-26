"""
ml/train.py
───────────
Trains the NumpyLSTM on historical stock data fetched via yfinance.
Saves the trained model + scaler to disk as .pkl files.

Usage:
    python -m ml.train --symbol AAPL --epochs 30
"""

import os
import pickle
import logging
import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error

from ml.lstm import NumpyLSTM
from ml.features import add_technical_indicators, FEATURE_COLUMNS
from data_fetcher import fetch_history

logger    = logging.getLogger(__name__)
MODEL_DIR = Path(__file__).parent / "saved_models"
MODEL_DIR.mkdir(exist_ok=True)

SEQ_LEN = 30   # look-back window (days)


# ── Data preparation ─────────────────────────────────────────────────────────

def prepare_data(symbol: str, period: str = "2y"):
    df = fetch_history(symbol, period=period, interval="1d")
    if df.empty:
        raise ValueError(f"No data returned for {symbol}")

    df = add_technical_indicators(df)

    features = df[FEATURE_COLUMNS].values          # (N, n_features)
    target   = df["Close"].values                  # (N,)

    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()

    X_scaled = scaler_X.fit_transform(features)
    y_scaled = scaler_y.fit_transform(target.reshape(-1, 1)).flatten()

    # Build sliding windows
    X_seq, y_seq = [], []
    for i in range(SEQ_LEN, len(X_scaled)):
        X_seq.append(X_scaled[i - SEQ_LEN:i])     # (SEQ_LEN, n_features)
        y_seq.append(y_scaled[i - SEQ_LEN:i])     # (SEQ_LEN,)

    X_arr = np.array(X_seq)   # (samples, SEQ_LEN, n_features)
    y_arr = np.array(y_seq)   # (samples, SEQ_LEN)

    split   = int(len(X_arr) * 0.8)
    X_train, X_test = X_arr[:split], X_arr[split:]
    y_train, y_test = y_arr[:split], y_arr[split:]

    return X_train, X_test, y_train, y_test, scaler_X, scaler_y, df


# ── Training loop ─────────────────────────────────────────────────────────────

def train(symbol: str, epochs: int = 20, lr: float = 1e-3, hidden: int = 64):
    logger.info("Fetching data for %s …", symbol)
    X_train, X_test, y_train, y_test, scaler_X, scaler_y, df = prepare_data(symbol)

    n_features = X_train.shape[2]
    model      = NumpyLSTM(input_size=n_features, hidden_size=hidden)

    logger.info("Training LSTM — %d samples, %d epochs …", len(X_train), epochs)
    for epoch in range(1, epochs + 1):
        losses = []
        for i in range(len(X_train)):
            loss = model.train_step(X_train[i], y_train[i], lr)
            losses.append(loss)

        if epoch % 5 == 0 or epoch == 1:
            logger.info("Epoch %2d/%d — loss: %.6f", epoch, epochs, np.mean(losses))

    # ── Evaluation ───────────────────────────────────────────────────────────
    preds_scaled = np.array([model.predict(X_test[i])[-1] for i in range(len(X_test))])
    true_scaled  = y_test[:, -1]

    preds = scaler_y.inverse_transform(preds_scaled.reshape(-1, 1)).flatten()
    true  = scaler_y.inverse_transform(true_scaled.reshape(-1, 1)).flatten()

    mae   = mean_absolute_error(true, preds)
    rmse  = mean_squared_error(true, preds) ** 0.5
    mape  = np.mean(np.abs((true - preds) / true)) * 100

    logger.info("── Test metrics ──────────────────")
    logger.info("  MAE  : $%.2f", mae)
    logger.info("  RMSE : $%.2f", rmse)
    logger.info("  MAPE : %.2f%%", mape)

    # ── Save ────────────────────────────────────────────────────────────────
    artifact = {
        "model":     model,
        "scaler_X":  scaler_X,
        "scaler_y":  scaler_y,
        "seq_len":   SEQ_LEN,
        "features":  FEATURE_COLUMNS,
        "symbol":    symbol,
        "metrics":   {"mae": mae, "rmse": rmse, "mape": mape},
    }
    path = MODEL_DIR / f"{symbol}.pkl"
    with open(path, "wb") as f:
        pickle.dump(artifact, f)

    logger.info("Model saved → %s", path)
    return artifact


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s  %(levelname)-8s  %(message)s")

    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol",  default="AAPL")
    parser.add_argument("--epochs",  type=int, default=20)
    parser.add_argument("--lr",      type=float, default=1e-3)
    parser.add_argument("--hidden",  type=int, default=64)
    args = parser.parse_args()

    train(args.symbol, args.epochs, args.lr, args.hidden)
