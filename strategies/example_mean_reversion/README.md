# Example mean reversion strategy (education)

This folder is a **teaching template**. Fork the repository, copy this directory,
and implement your own logic in a new module for practice.

## Not financial advice

This example is provided for **software and statistics education** only. It is
not investment advice, not a recommendation to buy or sell any security, and not
a promise of returns. Use **simulated** mode while learning. Study topics in
[docs/EDUCATION.md](../../docs/EDUCATION.md) before changing parameters.
**Do not use real money** to test this example.

## Configuration

Point `config/config.yaml` at your class:

```yaml
strategy:
  module: strategies.example_mean_reversion.strategy
  class_name: ExampleMeanReversionStrategy
  symbols:
    - SPY
  params:
    lookback: 20
    entry_z: 2.0
    exit_z: 0.5
    quantity: 10
```

## Parameters

| Parameter  | Default | Description                          |
| ---------- | ------- | ------------------------------------ |
| lookback   | 20      | Bars used for mean and std           |
| entry_z    | 2.0     | Enter when abs(z) exceeds this       |
| exit_z     | 0.5     | Flatten when abs(z) falls below this |
| quantity   | 10      | Share count per order (simulated)    |
