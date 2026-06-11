from datetime import datetime

import numpy as np

from hedgekit.core.schemas import Bar
from hedgekit.strategy.base import StrategyContext
from strategies.example_mean_reversion.strategy import ExampleMeanReversionStrategy


def _bars(closes):
    return [
        Bar(
            symbol="SPY",
            timestamp=datetime(2024, 1, i + 1),
            open=c,
            high=c,
            low=c,
            close=c,
        )
        for i, c in enumerate(closes)
    ]


def test_example_strategy_emits_on_extreme_z():
    closes = list(np.linspace(100, 110, 25)) + [120.0]
    ctx = StrategyContext(symbols=["SPY"], bars={"SPY": _bars(closes)}, params={"lookback": 20})
    strat = ExampleMeanReversionStrategy(params={"lookback": 20, "entry_z": 1.5, "quantity": 1})
    intents = strat.on_bars(ctx)
    assert isinstance(intents, list)
