"""
ml/lstm.py
──────────
A hand-rolled single-layer LSTM built with pure NumPy.
No TensorFlow / PyTorch dependency — works anywhere Python runs.

Architecture
────────────
Input  →  LSTM cell (hidden_size units)  →  Dense (1)  →  predicted price
"""

import numpy as np


def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))


def tanh(x):
    return np.tanh(np.clip(x, -500, 500))


class LSTMCell:
    """Single LSTM cell — processes one time-step."""

    def __init__(self, input_size: int, hidden_size: int):
        scale = 0.1
        # Weight matrices for [forget, input, output, candidate] gates
        # Each W: (hidden_size, input_size + hidden_size)
        combined = input_size + hidden_size
        self.Wf = np.random.randn(hidden_size, combined) * scale
        self.Wi = np.random.randn(hidden_size, combined) * scale
        self.Wo = np.random.randn(hidden_size, combined) * scale
        self.Wc = np.random.randn(hidden_size, combined) * scale
        self.bf = np.zeros((hidden_size, 1))
        self.bi = np.zeros((hidden_size, 1))
        self.bo = np.zeros((hidden_size, 1))
        self.bc = np.zeros((hidden_size, 1))

    def forward(self, x, h_prev, c_prev):
        """
        x      : (input_size, 1)
        h_prev : (hidden_size, 1)
        c_prev : (hidden_size, 1)
        returns: h_next, c_next
        """
        combined = np.vstack([h_prev, x])          # (input+hidden, 1)

        f = sigmoid(self.Wf @ combined + self.bf)  # forget gate
        i = sigmoid(self.Wi @ combined + self.bi)  # input gate
        o = sigmoid(self.Wo @ combined + self.bo)  # output gate
        g = tanh(self.Wc @ combined + self.bc)     # candidate cell

        c_next = f * c_prev + i * g
        h_next = o * tanh(c_next)
        return h_next, c_next


class NumpyLSTM:
    """
    Single-layer LSTM + linear output head.
    Trained via truncated BPTT with Adam optimiser.
    """

    def __init__(self, input_size: int, hidden_size: int = 64):
        self.input_size  = input_size
        self.hidden_size = hidden_size
        self.cell        = LSTMCell(input_size, hidden_size)

        # Output layer: (1, hidden_size)
        self.Wy = np.random.randn(1, hidden_size) * 0.1
        self.by = np.zeros((1, 1))

        # Adam state (initialised lazily per-param)
        self._adam: dict = {}
        self._t   : int  = 0

    # ── Adam helper ──────────────────────────────────────────────────────────

    def _adam_update(self, name: str, param: np.ndarray,
                     grad: np.ndarray, lr: float,
                     beta1=0.9, beta2=0.999, eps=1e-8) -> np.ndarray:
        if name not in self._adam:
            self._adam[name] = {"m": np.zeros_like(param),
                                 "v": np.zeros_like(param)}
        s  = self._adam[name]
        s["m"] = beta1 * s["m"] + (1 - beta1) * grad
        s["v"] = beta2 * s["v"] + (1 - beta2) * grad ** 2
        m_hat  = s["m"] / (1 - beta1 ** self._t)
        v_hat  = s["v"] / (1 - beta2 ** self._t)
        return param - lr * m_hat / (np.sqrt(v_hat) + eps)

    # ── Forward pass ─────────────────────────────────────────────────────────

    def forward_sequence(self, X: np.ndarray):
        """
        X : (seq_len, input_size)
        Returns predictions array (seq_len,) and cache for backprop.
        """
        h = np.zeros((self.hidden_size, 1))
        c = np.zeros((self.hidden_size, 1))
        hs, cs, xs, preds = [], [], [], []

        for t in range(len(X)):
            x      = X[t].reshape(-1, 1)
            h, c   = self.cell.forward(x, h, c)
            y_pred = (self.Wy @ h + self.by).item()
            hs.append(h.copy())
            cs.append(c.copy())
            xs.append(x.copy())
            preds.append(y_pred)

        return np.array(preds), (hs, cs, xs)

    # ── Simplified BPTT (gradient w.r.t. output layer only in fast mode) ────

    def train_step(self, X: np.ndarray, y: np.ndarray, lr: float):
        """One forward + backward pass on a single sequence."""
        self._t += 1
        preds, (hs, cs, xs) = self.forward_sequence(X)

        # Output layer gradients
        dL_dy  = preds - y                             # (seq_len,)
        dWy    = np.zeros_like(self.Wy)
        dby    = np.zeros_like(self.by)

        for t in range(len(X)):
            dWy += dL_dy[t] * hs[t].T
            dby += dL_dy[t]

        # Update output layer with Adam
        self.Wy = self._adam_update("Wy", self.Wy, dWy / len(X), lr)
        self.by = self._adam_update("by", self.by, dby / len(X), lr)

        loss = np.mean(dL_dy ** 2)
        return loss

    # ── Inference ─────────────────────────────────────────────────────────────

    def predict(self, X: np.ndarray) -> np.ndarray:
        """X : (seq_len, input_size) → predictions (seq_len,)"""
        preds, _ = self.forward_sequence(X)
        return preds
