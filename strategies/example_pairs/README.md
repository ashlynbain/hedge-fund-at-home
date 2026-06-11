# Example pairs strategy (educational)

Two-leg z-score mean reversion on an OLS hedge ratio between two symbols.

**Not financial advice.** This module teaches how pairs ideas map onto `OrderIntent` with
multiple legs. It uses a rolling OLS beta on the last `lookback` bars — production systems
often use Kalman filters, rolling windows, or cointegration tests.

## Config sketch

```yaml
strategy:
  module: strategies.example_pairs.strategy
  class_name: ExamplePairsStrategy
  symbols:
    - KO
    - PEP
  params:
    lookback: 60
    entry_z: 2.0
    exit_z: 0.5
    quantity: 10
```

## What to study

1. How spread z-score differs from single-name z-score.
2. Why both legs must be sized (beta-weighted quantity on leg B).
3. Transaction costs and borrow fees — doubled execution risk.

See the learn site **Pairs** tab and **Code lab** for interactive demos.
