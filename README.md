# Hedge Fund at Home

**Educational software** that brings hedge-fund-style systematic trading concepts
to individual learners on their own computers. You study how data, signals, risk,
and execution fit together. You practice with **simulated** trades by default.

This is **not** a registered fund, investment product, or financial advice. It is
**not** a recommendation to use real money. Simulated and paper modes exist for
learning. See [DISCLAIMER.md](DISCLAIMER.md) before use.

## Educational mission

Institutional systematic teams split work into clear steps so ideas can be tested
safely and repeated. This repository teaches that structure in a small Python
codebase you can read end to end:

| Concept | What you learn | Where in the repo |
| ------- | -------------- | ----------------- |
| Data | Daily bars and history limits | `hedgekit/core/marketdata.py` |
| Signal | Your rules as pluggable code | `hedgekit/strategy/` |
| Risk | Limits before any order fires | `hedgekit/risk/` |
| Execution | Simulated fills vs optional IBKR | `hedgekit/broker/` |
| Operations | Config, kill switch, logging | `config/`, `.env.example` |

**Start here for curriculum:** [docs/EDUCATION.md](docs/EDUCATION.md) and
[docs/LEARNING_PATH.md](docs/LEARNING_PATH.md).

**Not financial advice.** Past simulated results do not predict future performance.

## Who this is for

- Learners who want to understand systematic trading **workflows**, not hot tips.
- Developers who learn by reading and forking small, inspectable projects.
- Anyone willing to stay on **simulated** (and optionally **paper**) trading while studying.

This is **not** for anyone seeking guaranteed returns, fund management, or
permission to skip risk education.

## Quick start (simulated only, no real money)

```bash
git clone https://github.com/ashlynbain/hedge-fund-at-home.git
cd hedge-fund-at-home
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
cp config/config.yaml.example config/config.yaml
python -m hedgekit.cli.run --once
```

Orders are **simulated** inside the process. No brokerage connection is made unless
you deliberately change configuration for the optional paper lab.

```bash
python -m hedgekit.cli.backtest --start 2023-01-01 --end 2024-12-31
```

## Add your own strategy (learning exercise)

1. Copy `strategies/example_mean_reversion/`.
2. Subclass `hedgekit.strategy.Strategy` and implement `on_bars()`.
3. Point `config/config.yaml` at your module.
4. Stay in **simulated** mode until you complete [docs/LEARNING_PATH.md](docs/LEARNING_PATH.md).

See [docs/STRATEGY_GUIDE.md](docs/STRATEGY_GUIDE.md). **Not financial advice.**

## Documentation

| Document | Description |
| -------- | ----------- |
| [DISCLAIMER.md](DISCLAIMER.md) | Legal and risk notice (read first) |
| [docs/EDUCATION.md](docs/EDUCATION.md) | Topics to study and self-directed research prompts |
| [docs/LEARNING_PATH.md](docs/LEARNING_PATH.md) | Step-by-step education path (simulated first) |
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Install and first run |
| [docs/STRATEGY_GUIDE.md](docs/STRATEGY_GUIDE.md) | Implement a strategy module |
| [docs/IBKR_SETUP.md](docs/IBKR_SETUP.md) | Optional paper account lab (not real money) |
| [docs/AWS_SETUP.md](docs/AWS_SETUP.md) | Optional cloud secrets scaffold |
| [infrastructure/aws/README.md](infrastructure/aws/README.md) | Terraform reference |

## Execution modes (education emphasis)

| Mode | Config `mode` | Purpose |
| ---- | ------------- | ------- |
| **Simulated (default)** | `simulated` | Learn the loop; synthetic fills only |
| Paper (optional lab) | `paper` + `IBKR_USE_REAL=true` | Practice broker API with IBKR paper account |
| Live (discouraged) | `live` + `ENABLE_LIVE_TRADING=true` | Real money at risk; not part of the curriculum |

**Not financial advice.** The learning path does not require paper or live modes.
Do not use real money to complete this curriculum.

## Safety switches

| Variable | Default | Effect |
| -------- | ------- | ------ |
| `ENABLE_LIVE_TRADING` | `false` | Blocks live IBKR orders unless explicitly enabled |
| `KILL_SWITCH` | `false` | When `true`, risk gate rejects every order |
| `IBKR_USE_REAL` | `false` | No IBKR connection until you enable paper lab |

## Project layout

```
hedge-fund-at-home/
  hedgekit/             # Framework: strategy, broker, risk, runner
  strategies/           # Example and your strategies
  config/               # YAML configuration
  docs/                 # Education and setup guides
  infrastructure/aws/   # Optional Terraform scaffold
  tests/
```

## Tests

```bash
pytest -q
```

## License

MIT. See [LICENSE](LICENSE). Provided for education without warranty. **Not
financial advice.**
