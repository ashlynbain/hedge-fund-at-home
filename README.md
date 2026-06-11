# Hedge Fund at Home

**Cloneable Python toolkit** for testing systematic strategies: simulated backtests,
then **paper trading** with your broker, cloud, and data (sample Yahoo bars included).

**Not financial advice.** See [DISCLAIMER.md](DISCLAIMER.md).

## Quick start

```bash
git clone https://github.com/ashlynbain/hedge-fund-at-home.git
cd hedge-fund-at-home
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
cp config/config.yaml.example config/config.yaml
python -m hedgekit.cli.run --once
```

```bash
python -m hedgekit.cli.backtest --start 2023-01-01 --end 2024-12-31
pytest -q
```

**Full setup:** [docs/PAPER_TRADING_SETUP.md](docs/PAPER_TRADING_SETUP.md)

## Your stack (defaults + placeholders)

| Piece | Included default | You plug in |
| ----- | ---------------- | ----------- |
| Data | Yahoo daily OHLCV (`yfinance`) | [hedgekit/data/README.md](hedgekit/data/README.md) |
| Broker | Simulated fills | IBKR adapter, or [custom module](hedgekit/broker/README.md) |
| Cloud | Run on laptop | [AWS Terraform](infrastructure/aws/), or your VPS |
| Strategy | Mean reversion example | Copy `strategies/` |

### Paper broker (IBKR)

```bash
# .env: IBKR_USE_REAL=true, ENABLE_LIVE_TRADING=false
# config.yaml: mode: paper
python -m hedgekit.cli.run --once
```

[docs/IBKR_SETUP.md](docs/IBKR_SETUP.md)

### Custom broker

```bash
BROKER_ADAPTER=custom
BROKER_CUSTOM_MODULE=my_brokers.alpaca:MyPaperBroker
```

Copy [hedgekit/broker/custom_broker.py.example](hedgekit/broker/custom_broker.py.example).

## The loop

```
market data → strategy → risk gate → broker
```

| Layer | Code |
| ----- | ---- |
| Data | `hedgekit/core/marketdata.py` |
| Signal | `strategies/`, `hedgekit/strategy/` |
| Risk | `hedgekit/risk/gate.py` |
| Execution | `hedgekit/broker/` |

## Modes

| Mode | Use |
| ---- | --- |
| `simulated` | Default — fake fills, no API keys |
| `paper` | Broker paper account |
| `live` | Real money — needs `ENABLE_LIVE_TRADING=true` |

## Documentation

See [docs/README.md](docs/README.md) for the full index.

## Project layout

```
hedge-fund-at-home/
  hedgekit/           # Runner, brokers, risk, market data
  strategies/         # Example + your strategies
  config/             # config.yaml
  docs/               # Setup & education guides
  infrastructure/     # AWS Terraform (+ cloud notes)
  tests/
```

The hosted learn site is maintained separately (not in this public repo).

## Safety

| Variable | Default |
| -------- | ------- |
| `ENABLE_LIVE_TRADING` | `false` |
| `KILL_SWITCH` | `false` |
| `IBKR_USE_REAL` | `false` |

MIT License. **Not financial advice.**
