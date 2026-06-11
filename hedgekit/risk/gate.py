from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from ..core.config import RiskCfg, get_settings
from ..core.logging import get_logger
from ..core.schemas import OrderIntent, OrderSide

logger = get_logger(__name__)


@dataclass
class RiskVerdict:
    approved: bool
    reason: str = ""


class RiskGate:
    """Conservative pre-trade checks. Not a substitute for your own risk policy."""

    def __init__(self, cfg: RiskCfg | None = None) -> None:
        self.cfg = cfg or get_settings().risk
        self._trades_today = 0
        self._daily_pnl = 0.0

    def evaluate(self, intent: OrderIntent, positions: Dict[str, float],
                 last_prices: Dict[str, float]) -> RiskVerdict:
        settings = get_settings()
        if settings.kill_switch_engaged():
            return RiskVerdict(False, "KILL_SWITCH is engaged")

        if self._trades_today >= self.cfg.max_trades_per_day:
            return RiskVerdict(False, "max_trades_per_day exceeded")

        if self._daily_pnl <= -abs(self.cfg.max_daily_loss):
            return RiskVerdict(False, "max_daily_loss breached")

        gross = 0.0
        for leg in intent.legs:
            px = last_prices.get(leg.symbol, leg.limit_price or 0.0)
            notional = abs(leg.quantity * px)
            gross += notional
            projected = positions.get(leg.symbol, 0.0)
            if leg.side == OrderSide.BUY:
                projected += leg.quantity
            else:
                projected -= leg.quantity
            if abs(projected * px) > self.cfg.max_position_per_symbol:
                return RiskVerdict(False, f"max_position_per_symbol exceeded for {leg.symbol}")

        if gross > self.cfg.max_gross_exposure:
            return RiskVerdict(False, "max_gross_exposure exceeded")

        return RiskVerdict(True, "approved")

    def record_fill(self) -> None:
        self._trades_today += 1
