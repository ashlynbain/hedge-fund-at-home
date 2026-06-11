from __future__ import annotations

from typing import Any

from ..core.config import get_settings


def build_config_payload() -> dict[str, Any]:
    settings = get_settings()
    return {
        "ok": True,
        "mode": settings.effective_execution_mode(),
        "symbols": list(settings.strategy.symbols),
        "strategy_module": settings.strategy.module,
        "strategy_class": settings.strategy.class_name,
    }
