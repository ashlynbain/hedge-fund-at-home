from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    MKT = "MKT"
    LMT = "LMT"


class OrderStatusValue(str, Enum):
    FILLED = "FILLED"
    SUBMITTED = "SUBMITTED"
    REJECTED = "REJECTED"
    ERROR = "ERROR"


class Bar(BaseModel):
    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


class OrderLeg(BaseModel):
    symbol: str
    side: OrderSide
    quantity: float
    limit_price: Optional[float] = None


class OrderIntent(BaseModel):
    idempotency_key: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = Field(default_factory=utcnow)
    strategy_name: str
    legs: List[OrderLeg]
    order_type: OrderType = OrderType.LMT
    mode: Literal["paper", "live", "simulated"] = "simulated"
    reason: str = ""


class OrderStatus(BaseModel):
    idempotency_key: str
    status: OrderStatusValue
    fills: List[OrderLeg] = Field(default_factory=list)
    avg_fill_price: Optional[float] = None
    broker_order_ids: List[str] = Field(default_factory=list)
    message: str = ""
