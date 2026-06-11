from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List

from ..core.schemas import Bar, OrderIntent


@dataclass
class StrategyContext:
    """Read-only snapshot passed to your strategy on each tick."""

    symbols: List[str]
    bars: Dict[str, List[Bar]]
    positions: Dict[str, float] = field(default_factory=dict)
    params: dict = field(default_factory=dict)


class Strategy(ABC):
    """Implement this class in your own module and point config at it.

    The runner calls :meth:`on_bars` whenever new market data is available.
    Return zero or more :class:`OrderIntent` objects. The framework applies
    risk checks and routes orders to the configured broker (simulated by
    default).
    """

    name: str = "unnamed_strategy"

    def __init__(self, params: dict | None = None) -> None:
        self.params = params or {}

    @abstractmethod
    def on_bars(self, ctx: StrategyContext) -> List[OrderIntent]:
        """Produce order intents from the latest bar history."""
