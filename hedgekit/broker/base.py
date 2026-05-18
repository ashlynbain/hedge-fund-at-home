from __future__ import annotations

from typing import Protocol

from ..core.schemas import OrderIntent, OrderStatus


class BrokerClient(Protocol):
    def submit(self, intent: OrderIntent) -> OrderStatus: ...
