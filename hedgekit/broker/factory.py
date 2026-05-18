from __future__ import annotations

import os

from ..core.config import get_settings
from .base import BrokerClient
from .ibkr import IbkrBroker
from .simulated import SimulatedBroker


def build_broker() -> BrokerClient:
    settings = get_settings()
    if settings.effective_execution_mode() == "simulated":
        return SimulatedBroker()
    use_real = settings.ibkr.use_real or os.getenv("IBKR_USE_REAL", "").lower() == "true"
    if not use_real:
        return SimulatedBroker()
    return IbkrBroker()
