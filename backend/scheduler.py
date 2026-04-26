"""
scheduler.py
────────────
Background job that refreshes stock prices every 15 minutes.
Imported and started in app.py after the Flask app is created.
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


def init_scheduler(app):
    """
    Creates and starts the background scheduler.
    Call this once after `create_app()`.
    """
    from data_fetcher import refresh_all_watched_symbols

    scheduler = BackgroundScheduler(daemon=True)

    scheduler.add_job(
        func     = refresh_all_watched_symbols,
        args     = [app],
        trigger  = IntervalTrigger(minutes=15),
        id       = "refresh_stock_prices",
        name     = "Refresh all watched stock prices",
        replace_existing = True,
    )

    scheduler.start()
    logger.info("Scheduler started — stock prices will refresh every 15 minutes.")
    return scheduler
