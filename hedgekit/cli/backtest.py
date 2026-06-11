from __future__ import annotations

from datetime import datetime, timedelta

import click
from rich.console import Console
from rich.table import Table

from ..broker.simulated import SimulatedBroker
from ..core.config import get_settings
from ..core.logging import configure_logging
from ..core.marketdata import fetch_daily_bars
from ..risk.gate import RiskGate
from ..strategy.base import StrategyContext
from ..strategy.registry import load_strategy

console = Console()


@click.command()
@click.option("--start", default=None, help="YYYY-MM-DD")
@click.option("--end", default=None, help="YYYY-MM-DD")
def main(start: str | None, end: str | None) -> None:
    """Walk historical bars and route orders through the simulated broker only."""
    configure_logging()
    settings = get_settings()
    if end is None:
        end = datetime.utcnow().date().isoformat()
    if start is None:
        start = (datetime.utcnow().date() - timedelta(days=365)).isoformat()

    strategy = load_strategy(settings.strategy)
    broker = SimulatedBroker()
    risk = RiskGate()
    symbols = settings.strategy.symbols
    bars_by_sym = fetch_daily_bars(symbols, start, end)
    if not bars_by_sym or not bars_by_sym.get(symbols[0]):
        raise SystemExit("No market data returned. Check symbols and date range.")

    n_bars = len(bars_by_sym[symbols[0]])
    fills = 0
    rejects = 0
    positions: dict[str, float] = {}

    for i in range(60, n_bars):
        window = {sym: series[: i + 1] for sym, series in bars_by_sym.items()}
        ctx = StrategyContext(
            symbols=symbols,
            bars=window,
            positions=dict(positions),
            params=settings.strategy.params,
        )
        last_px = {sym: window[sym][-1].close for sym in symbols if window.get(sym)}
        for intent in strategy.on_bars(ctx):
            intent.mode = "simulated"  # type: ignore[assignment]
            verdict = risk.evaluate(intent, positions, last_px)
            if not verdict.approved:
                rejects += 1
                continue
            status = broker.submit(intent)
            if status.fills:
                fills += 1
                risk.record_fill()
                for leg in status.fills:
                    delta = leg.quantity if leg.side.value == "BUY" else -leg.quantity
                    positions[leg.symbol] = positions.get(leg.symbol, 0.0) + delta

    table = Table(title=f"Simulated backtest {start} to {end}")
    table.add_column("Metric")
    table.add_column("Value", justify="right")
    table.add_row("Bars evaluated", str(n_bars - 60))
    table.add_row("Fills (simulated)", str(fills))
    table.add_row("Risk rejects", str(rejects))
    table.add_row("Open positions", str(len([p for p in positions.values() if abs(p) > 1e-6])))
    console.print(table)
    console.print(
        "\nReminder: This is a simulated exercise only. Not financial advice. "
        "Past simulated results do not predict future performance."
    )


if __name__ == "__main__":
    main()
