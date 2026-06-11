from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List

from ..broker.factory import build_broker
from ..cloud.aws import load_secrets_into_env
from ..core.config import get_settings
from ..core.logging import get_logger
from ..core.marketdata import fetch_daily_bars
from ..core.schemas import Bar, OrderIntent
from ..risk.gate import RiskGate
from ..strategy.base import StrategyContext
from ..strategy.registry import load_strategy

logger = get_logger(__name__)


class TradingRunner:
    """Single-process loop: market data -> strategy -> risk -> broker."""

    def __init__(self) -> None:
        load_secrets_into_env()
        self.settings = get_settings()
        self.strategy = load_strategy(self.settings.strategy)
        self.broker = build_broker()
        self.risk = RiskGate()
        self.positions: Dict[str, float] = {}

    def _last_prices(self, bars: Dict[str, List[Bar]]) -> Dict[str, float]:
        out: Dict[str, float] = {}
        for sym, series in bars.items():
            if series:
                out[sym] = series[-1].close
        return out

    def run_once(self) -> None:
        symbols = self.settings.strategy.symbols
        end = datetime.utcnow().date()
        start = end - timedelta(days=self.settings.bar_lookback_days)
        bars = fetch_daily_bars(symbols, start.isoformat(), end.isoformat())
        ctx = StrategyContext(
            symbols=symbols,
            bars=bars,
            positions=dict(self.positions),
            params=self.settings.strategy.params,
        )
        intents = self.strategy.on_bars(ctx)
        mode = self.settings.effective_execution_mode()
        last_px = self._last_prices(bars)
        for intent in intents:
            self._execute(intent, mode, last_px)

    def _execute(self, intent: OrderIntent, mode: str, last_px: Dict[str, float]) -> None:
        intent.mode = mode  # type: ignore[assignment]
        verdict = self.risk.evaluate(intent, self.positions, last_px)
        if not verdict.approved:
            logger.warning("order_rejected", extra={"reason": verdict.reason})
            return
        status = self.broker.submit(intent)
        logger.info(
            "order_result",
            extra={"status": status.status.value, "order_message": status.message},
        )
        if status.fills:
            self.risk.record_fill()
            for leg in status.fills:
                delta = leg.quantity if leg.side.value == "BUY" else -leg.quantity
                self.positions[leg.symbol] = self.positions.get(leg.symbol, 0.0) + delta
