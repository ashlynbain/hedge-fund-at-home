# Strategy guide

**Not financial advice.** Example strategies are for software demonstration only.
You are responsible for any strategy you deploy and any capital you risk.

## Interface

Subclass `hedgekit.strategy.Strategy` and implement:

```python
def on_bars(self, ctx: StrategyContext) -> List[OrderIntent]:
    ...
```

`StrategyContext` provides:

- `symbols`: configured universe
- `bars`: dict of symbol to list of `Bar` (daily OHLCV)
- `positions`: current simulated or tracked position sizes
- `params`: arbitrary dict from `config.yaml`

Return a list of `OrderIntent` objects (may be empty).

## Register your module

In `config/config.yaml`:

```yaml
strategy:
  module: strategies.my_strategy.strategy
  class_name: MyStrategy
  symbols:
    - AAPL
    - MSFT
  params:
    my_threshold: 1.5
```

Ensure the `strategies/` package is on `PYTHONPATH` (project root when installed
with `pip install -e .`).

## Order intents

Each intent includes one or more legs:

```python
OrderIntent(
    strategy_name="my_strategy",
    legs=[
        OrderLeg(symbol="AAPL", side=OrderSide.BUY, quantity=10, limit_price=150.0),
    ],
    reason="optional note for logs",
)
```

The runner sets `mode` from global configuration (`simulated`, `paper`, or
`live`). Do not assume live connectivity unless you have explicitly enabled it.

## Testing workflow

1. Unit-test your signal logic with synthetic bars.
2. Run `python -m hedgekit.cli.backtest` in **simulated** mode.
3. Run `python -m hedgekit.cli.run --once` and inspect logs.
4. Only then consider the optional IBKR paper lab: see [IBKR_SETUP.md](IBKR_SETUP.md).

Simulated fills do not prove an edge in real markets. **Not financial advice.**

## Example

See `strategies/example_mean_reversion/` and its README.
