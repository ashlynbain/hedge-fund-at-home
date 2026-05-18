from __future__ import annotations

import importlib

from ..core.config import StrategyCfg
from ..core.logging import get_logger
from .base import Strategy

logger = get_logger(__name__)


def load_strategy(cfg: StrategyCfg) -> Strategy:
    module = importlib.import_module(cfg.module)
    cls = getattr(module, cfg.class_name)
    if not issubclass(cls, Strategy):
        raise TypeError(f"{cfg.class_name} must subclass hedgekit.strategy.Strategy")
    instance = cls(params=cfg.params)
    instance.name = getattr(instance, "name", cfg.class_name)
    logger.info("strategy_loaded", extra={"strategy": instance.name, "module": cfg.module})
    return instance
