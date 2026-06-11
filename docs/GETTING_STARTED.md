# Getting started

**Not financial advice.** Cloneable toolkit: simulated mode first, then **paper trading**
with your broker and cloud.

**Main guide:** [PAPER_TRADING_SETUP.md](PAPER_TRADING_SETUP.md) · **All docs:** [README.md](README.md)

Optional curriculum: [EDUCATION.md](EDUCATION.md) and [LEARNING_PATH.md](LEARNING_PATH.md).

## Prerequisites

- Python 3.11 or newer
- (Optional) Docker for containerized runs
- (Optional) Interactive Brokers TWS or Gateway for paper lab: see [IBKR_SETUP.md](IBKR_SETUP.md)
- (Optional) AWS account for cloud secrets: see [AWS_SETUP.md](AWS_SETUP.md)

## Install

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
cp config/config.yaml.example config/config.yaml
```

## First run (simulated)

```bash
python -m hedgekit.cli.run --once
```

You should see JSON logs including `simulated_fill`. No broker credentials are
required for this step.

## Continuous loop

```bash
python -m hedgekit.cli.run
```

The runner sleeps `poll_seconds` between iterations (default 300 in the example
config). Each iteration fetches recent daily bars, calls your strategy, runs
risk checks, and submits approved orders to the simulated broker.

## Simulated backtest

```bash
python -m hedgekit.cli.backtest --start 2023-01-01 --end 2024-12-31
```

This walks historical bars and counts simulated fills and risk rejections. It is
a software test harness, not a promise of returns. **Not financial advice.**

## Docker (simulated)

```bash
cp config/config.yaml.example config/config.yaml
docker compose up --build
```

## Next steps

1. Continue [LEARNING_PATH.md](LEARNING_PATH.md) stage 3 (trace the code).
2. Copy the example strategy and implement your own logic (stages 5 and 6).
3. Study two topics per week from [EDUCATION.md](EDUCATION.md).
4. Optional: paper lab per [IBKR_SETUP.md](IBKR_SETUP.md) after stages 1 through 6.
5. Read [DISCLAIMER.md](../DISCLAIMER.md) again. **Not financial advice.**
