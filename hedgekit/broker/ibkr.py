from __future__ import annotations

import os
import threading
from typing import List, Optional

from ..core.config import get_settings
from ..core.logging import get_logger
from ..core.schemas import (
    OrderIntent,
    OrderLeg,
    OrderSide,
    OrderStatus,
    OrderStatusValue,
    OrderType,
)

logger = get_logger(__name__)


class IbkrBroker:
    """Interactive Brokers client via ib_insync.

    Live orders require ``mode: live`` in config and
    ``ENABLE_LIVE_TRADING=true`` in the environment. Paper mode uses TWS
    paper port (default 7497). You are responsible for credentials, API
    permissions, and compliance with IBKR terms.
    """

    def __init__(self, host: Optional[str] = None, port: Optional[int] = None,
                 client_id: Optional[int] = None) -> None:
        settings = get_settings()
        self.host = host or settings.ibkr.host
        self.port = int(port or settings.ibkr.port)
        self.client_id = int(client_id or settings.ibkr.client_id)
        self._ib = None
        self._lock = threading.Lock()

    def _connect(self):
        if self._ib is not None:
            return self._ib
        from ib_insync import IB

        ib = IB()
        ib.connect(self.host, self.port, clientId=self.client_id, readonly=False)
        self._ib = ib
        logger.info("ib_connected", extra={"host": self.host, "port": self.port})
        return ib

    def submit(self, intent: OrderIntent) -> OrderStatus:
        settings = get_settings()
        if intent.mode == "live" and not settings.live_trading_enabled():
            return OrderStatus(
                idempotency_key=intent.idempotency_key,
                status=OrderStatusValue.REJECTED,
                message="Live trading not enabled (set ENABLE_LIVE_TRADING=true and mode: live).",
            )

        from ib_insync import LimitOrder, MarketOrder, Stock

        with self._lock:
            ib = self._connect()
            broker_ids: List[str] = []
            fills: List[OrderLeg] = []
            avg_prices: List[float] = []
            try:
                for leg in intent.legs:
                    contract = Stock(leg.symbol, "SMART", "USD")
                    ib.qualifyContracts(contract)
                    action = "BUY" if leg.side == OrderSide.BUY else "SELL"
                    qty = max(int(round(leg.quantity)), 1)
                    if intent.order_type == OrderType.MKT or leg.limit_price is None:
                        order = MarketOrder(action, qty)
                    else:
                        order = LimitOrder(action, qty, float(leg.limit_price))
                    trade = ib.placeOrder(contract, order)
                    ib.sleep(0.2)
                    broker_ids.append(str(trade.order.orderId))
                    fills.append(
                        OrderLeg(
                            symbol=leg.symbol,
                            side=leg.side,
                            quantity=float(qty),
                            limit_price=leg.limit_price,
                        )
                    )
                    if trade.orderStatus and trade.orderStatus.avgFillPrice:
                        avg_prices.append(float(trade.orderStatus.avgFillPrice))
                status = OrderStatusValue.SUBMITTED
                if avg_prices:
                    status = OrderStatusValue.FILLED
                return OrderStatus(
                    idempotency_key=intent.idempotency_key,
                    status=status,
                    fills=fills,
                    avg_fill_price=(sum(avg_prices) / len(avg_prices)) if avg_prices else None,
                    broker_order_ids=broker_ids,
                    message="Routed via Interactive Brokers (ib_insync).",
                )
            except Exception as exc:
                logger.exception("ib_submit_failed")
                return OrderStatus(
                    idempotency_key=intent.idempotency_key,
                    status=OrderStatusValue.ERROR,
                    message=str(exc),
                )
