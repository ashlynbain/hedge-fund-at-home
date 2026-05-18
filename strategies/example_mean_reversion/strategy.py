from __future__ import annotations

from typing import List

import numpy as np

from hedgekit.core.schemas import Bar, OrderIntent, OrderLeg, OrderSide, OrderType
from hedgekit.strategy.base import Strategy, StrategyContext


class ExampleMeanReversionStrategy(Strategy):
    """Example strategy: z-score mean reversion on a single symbol.

    Copy this folder, rename the class, and point ``config.yaml`` at your module.
    This example is for education only and is not a recommended live strategy.
    """

    name = "example_mean_reversion"

    def on_bars(self, ctx: StrategyContext) -> List[OrderIntent]:
        symbol = ctx.symbols[0]
        series = ctx.bars.get(symbol, [])
        lookback = int(self.params.get("lookback", 20))
        entry_z = float(self.params.get("entry_z", 2.0))
        exit_z = float(self.params.get("exit_z", 0.5))
        qty = float(self.params.get("quantity", 10))

        if len(series) < lookback + 1:
            return []

        closes = np.array([b.close for b in series[-lookback:]], dtype=float)
        z = (closes[-1] - closes.mean()) / (closes.std() + 1e-9)
        pos = ctx.positions.get(symbol, 0.0)
        last = series[-1].close

        if z > entry_z and pos >= 0:
            return [
                self._intent(symbol, OrderSide.SELL, qty, last, "z above entry")
            ]
        if z < -entry_z and pos <= 0:
            return [
                self._intent(symbol, OrderSide.BUY, qty, last, "z below entry")
            ]
        if abs(z) < exit_z and abs(pos) > 0:
            side = OrderSide.SELL if pos > 0 else OrderSide.BUY
            return [
                self._intent(symbol, side, abs(pos), last, "z mean reversion exit")
            ]
        return []

    def _intent(self, symbol: str, side: OrderSide, qty: float, px: float,
                reason: str) -> OrderIntent:
        return OrderIntent(
            strategy_name=self.name,
            legs=[OrderLeg(symbol=symbol, side=side, quantity=qty, limit_price=px)],
            order_type=OrderType.LMT,
            reason=reason,
        )
