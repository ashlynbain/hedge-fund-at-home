from __future__ import annotations

from ..core.logging import get_logger
from ..core.schemas import OrderLeg, OrderIntent, OrderStatus, OrderStatusValue

logger = get_logger(__name__)


class SimulatedBroker:
    """Default broker: immediate synthetic fills at limit or last close.

    No connection to Interactive Brokers or any exchange is made.
    Use this mode for development, backtests, and paper-style workflows
    without market connectivity.
    """

    def submit(self, intent: OrderIntent) -> OrderStatus:
        fills: list[OrderLeg] = []
        prices: list[float] = []
        for leg in intent.legs:
            px = leg.limit_price or 0.0
            fills.append(
                OrderLeg(
                    symbol=leg.symbol,
                    side=leg.side,
                    quantity=leg.quantity,
                    limit_price=px or None,
                )
            )
            if px:
                prices.append(px)
        avg = sum(prices) / len(prices) if prices else None
        logger.info(
            "simulated_fill",
            extra={"strategy": intent.strategy_name, "legs": len(intent.legs)},
        )
        return OrderStatus(
            idempotency_key=intent.idempotency_key,
            status=OrderStatusValue.FILLED,
            fills=fills,
            avg_fill_price=avg,
            broker_order_ids=[f"SIM-{intent.idempotency_key[:8]}-{i}" for i in range(len(fills))],
            message="Filled by simulated broker (no real market access).",
        )
