from __future__ import annotations

import time

import click

from ..core.config import get_settings
from ..core.logging import configure_logging, get_logger
from ..execution.runner import TradingRunner

logger = get_logger(__name__)


@click.command()
@click.option("--once", is_flag=True, help="Run a single iteration and exit.")
def main(once: bool) -> None:
    """Run the trading loop (simulated mode by default)."""
    configure_logging()
    settings = get_settings()
    runner = TradingRunner()
    logger.info(
        "runner_start",
        extra={
            "mode": settings.effective_execution_mode(),
            "strategy": settings.strategy.class_name,
        },
    )
    if once:
        runner.run_once()
        return
    while True:
        runner.run_once()
        time.sleep(settings.poll_seconds)


if __name__ == "__main__":
    main()
