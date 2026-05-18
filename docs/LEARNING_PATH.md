# Learning path (education only)

**This is not financial advice.** Follow this path to learn how systematic
trading systems work. Stay in **simulated** mode for stages 1 through 6. Treat
paper trading in stage 7 as an optional lab, not a profit test. **Do not use
real money** as part of this curriculum.

## Stage 1: Read the safety and scope documents

1. [DISCLAIMER.md](../DISCLAIMER.md)
2. [EDUCATION.md](EDUCATION.md)
3. [README.md](../README.md) (execution modes table)

**Checkpoint:** You can explain in your own words why simulated mode is the
default and why this project is not investment advice.

## Stage 2: Run without a broker

```bash
pip install -e ".[dev]"
cp config/config.yaml.example config/config.yaml
python -m hedgekit.cli.run --once
```

**Checkpoint:** You see `simulated_fill` in logs and understand no brokerage was
contacted.

## Stage 3: Trace the code path

Read in order:

1. `hedgekit/execution/runner.py` (main loop)
2. `hedgekit/strategy/base.py` (your hook)
3. `hedgekit/risk/gate.py` (pre-trade checks)
4. `hedgekit/broker/simulated.py` (synthetic fills)

**Checkpoint:** You can draw a one-page diagram: bars → strategy → risk → broker.

## Stage 4: Run a simulated historical walk

```bash
python -m hedgekit.cli.backtest --start 2023-01-01 --end 2024-12-31
```

**Checkpoint:** You can interpret fill count vs risk rejects and you understand
this is not a forecast of returns.

## Stage 5: Study the example strategy

Open `strategies/example_mean_reversion/strategy.py`. Change `entry_z` in
`config/config.yaml` and re-run the backtest.

**Checkpoint:** You predict the direction of change in trade count before you run.

## Stage 6: Build a toy strategy

Copy the example folder, implement a trivial rule (for example: no trades, or
one fixed paper intent you never send live). Register it in config.

**Checkpoint:** Your module loads via `load_strategy` and pytest passes.

## Stage 7 (optional): Paper trading lab

Only after stages 1 through 6. Read [IBKR_SETUP.md](IBKR_SETUP.md). Use IBKR
**paper** port only. Keep `ENABLE_LIVE_TRADING=false`.

**Checkpoint:** You can describe three differences between simulated fills and
paper fills.

## Stage 8 (not recommended for learners): Live trading

The repository gates live trading behind `mode: live` and
`ENABLE_LIVE_TRADING=true`. The learning path **does not** include live trading.
Real capital can be lost. Consult qualified professionals if you consider it.

## Self-study after the path

Pick two topics from [EDUCATION.md](EDUCATION.md) each week. Write a one-page
summary in your own journal. **Not financial advice.**
