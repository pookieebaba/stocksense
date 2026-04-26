"""
alerts.py
─────────
Checks all active price alerts against current prices
and sends email notifications when triggered.
Called by the scheduler after each price refresh.
"""

import logging
import smtplib
from email.mime.text import MIMEText

from flask import current_app

from extensions import db
from models.stock import Alert, StockPrice

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    cfg      = current_app.config
    username = cfg.get("MAIL_USERNAME")
    password = cfg.get("MAIL_PASSWORD")
    sender   = cfg.get("MAIL_FROM", username)

    if not username or not password:
        logger.warning("Email credentials not configured — skipping send.")
        return False

    msg            = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"]    = sender
    msg["To"]      = to

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(username, password)
            smtp.sendmail(sender, [to], msg.as_string())
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def check_and_fire_alerts(app) -> None:
    """
    For every untriggered alert, fetch the latest DB price and compare.
    If the condition is met, mark triggered and email the user.
    """
    with app.app_context():
        alerts = Alert.query.filter_by(triggered=False).all()
        for alert in alerts:
            latest = (
                StockPrice.query
                .filter_by(symbol=alert.symbol)
                .order_by(StockPrice.fetched_at.desc())
                .first()
            )
            if not latest:
                continue

            hit = (
                (alert.direction == "above" and latest.close >= alert.target_price) or
                (alert.direction == "below" and latest.close <= alert.target_price)
            )

            if hit:
                alert.triggered = True
                db.session.commit()

                user  = alert.user
                body  = f"""
                <h2>StockSense Price Alert 🔔</h2>
                <p><strong>{alert.symbol}</strong> is now
                   <strong>${latest.close:.2f}</strong> —
                   your target of ${alert.target_price:.2f}
                   ({alert.direction}) has been reached.</p>
                <p><a href="#">View on StockSense →</a></p>
                """
                send_email(
                    to      = user.email,
                    subject = f"[StockSense] {alert.symbol} hit ${alert.target_price:.2f}",
                    body    = body,
                )
                logger.info("Alert fired for %s / %s", user.email, alert.symbol)
