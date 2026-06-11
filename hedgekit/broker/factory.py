from __future__ import annotations

import importlib
import os

from ..core.config import get_settings
from .base import BrokerClient
from .ibkr import IbkrBroker
from .simulated import SimulatedBroker


def _load_custom_broker() -> BrokerClient:
    spec = os.getenv("BROKER_CUSTOM_MODULE", "").strip()
    if not spec:
        raise ValueError(
            "BROKER_ADAPTER=custom requires BROKER_CUSTOM_MODULE "
            "(e.g. my_brokers.alpaca:MyPaperBroker). See hedgekit/broker/custom_broker.py.example"
        )
    if ":" in spec:
        module_name, class_name = spec.split(":", 1)
    else:
        module_name, class_name = spec.rsplit(".", 1)
    mod = importlib.import_module(module_name)
    cls = getattr(mod, class_name)
    return cls()


def build_broker() -> BrokerClient:
    settings = get_settings()
    if settings.effective_execution_mode() == "simulated":
        return SimulatedBroker()

    adapter = os.getenv("BROKER_ADAPTER", "ibkr").lower()
    if adapter == "custom":
        return _load_custom_broker()

    use_real = settings.ibkr.use_real or os.getenv("IBKR_USE_REAL", "").lower() == "true"
    if not use_real:
        return SimulatedBroker()
    return IbkrBroker()
