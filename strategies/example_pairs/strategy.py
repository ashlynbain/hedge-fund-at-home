from __future__ import annotations

from typing import List

import numpy as np

from hedgekit.core.schemas import Bar, OrderIntent, OrderLeg, OrderSide, OrderType
from hedgekit.strategy.base import Strategy, StrategyContext


class ExamplePairsStrategy(Strategy):
    """Educational pairs strategy: z-score on OLS spread between two symbols.

  Long the cheap leg and short the rich leg when the spread is stretched.
  Copy and adapt — not a production-ready pairs system.
    """

    name = "example_pairs"

    def on_bars(self, ctx: StrategyContext) -> List[OrderIntent]:
        if len(ctx.symbols) < 2:
            return []
        sym_a, sym_b = ctx.symbols[0], ctx.symbols[1]
        series_a = ctx.bars.get(sym_a, [])
        series_b = ctx.bars.get(sym_b, [])
        lookback = int(self.params.get("lookback", 60))
        entry_z = float(self.params.get("entry_z", 2.0))
        exit_z = float(self.params.get("exit_z", 0.5))
        qty = float(self.params.get("quantity", 10))

        n = min(len(series_a), len(series_b))
        if n < lookback + 1:
            return []

        a = np.array([b.close for b in series_a[-lookback:]], dtype=float)
        b = np.array([b.close for b in series_b[-lookback:]], dtype=float)
        beta = self._ols_beta(b, a)
        spread = a - beta * b
        z = (spread[-1] - spread.mean()) / (spread.std() + 1e-9)

        pos_a = ctx.positions.get(sym_a, 0.0)
        pos_b = ctx.positions.get(sym_b, 0.0)
        last_a = series_a[-1].close
        last_b = series_b[-1].close

        if z > entry_z and pos_a <= 0 and pos_b >= 0:
            return [
                self._leg(sym_a, OrderSide.SELL, qty, last_a, "spread rich: short A"),
                self._leg(sym_b, OrderSide.BUY, qty * beta, last_b, "spread rich: long B"),
            ]
        if z < -entry_z and pos_a >= 0 and pos_b <= 0:
            return [
                self._leg(sym_a, OrderSide.BUY, qty, last_a, "spread cheap: long A"),
                self._leg(sym_b, OrderSide.SELL, qty * beta, last_b, "spread cheap: short B"),
            ]
        if abs(z) < exit_z and (abs(pos_a) > 0 or abs(pos_b) > 0):
            legs: List[OrderIntent] = []
            if abs(pos_a) > 0:
                side = OrderSide.SELL if pos_a > 0 else OrderSide.BUY
                legs.append(self._leg(sym_a, side, abs(pos_a), last_a, "spread exit A"))
            if abs(pos_b) > 0:
                side = OrderSide.SELL if pos_b > 0 else OrderSide.BUY
                legs.append(self._leg(sym_b, side, abs(pos_b), last_b, "spread exit B"))
            return legs
        return []

    @staticmethod
    def _ols_beta(x: np.ndarray, y: np.ndarray) -> float:
        xm, ym = x.mean(), y.mean()
        denom = ((x - xm) ** 2).sum()
        if denom < 1e-12:
            return 1.0
        return float(((x - xm) * (y - ym)).sum() / denom)

    def _leg(self, symbol: str, side: OrderSide, qty: float, px: float, reason: str) -> OrderIntent:
        return OrderIntent(
            strategy_name=self.name,
            legs=[OrderLeg(symbol=symbol, side=side, quantity=qty, limit_price=px)],
            order_type=OrderType.LMT,
            reason=reason,
        )
