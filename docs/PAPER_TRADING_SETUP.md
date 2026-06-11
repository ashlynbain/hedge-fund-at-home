# Paper trading setup (clone → test → your stack)

**Not financial advice.** Clone this repository to test systematic strategies in
**simulated** mode first, then **paper** trading with **your broker** and **your cloud**.

## What you get out of the box

| Piece | Default | Your override |
| ----- | ------- | ------------- |
| Market data | Yahoo Finance (`yfinance`) daily OHLCV | Your CSV/API — see `hedgekit/core/marketdata.py` |
| Broker | Simulated in-process fills | IBKR adapter included; others via custom module |
| Cloud | None (runs on your laptop) | AWS Terraform scaffold; GCP/Azure = your secrets pattern |
| Strategy | Example mean reversion | Copy `strategies/` and point config at your module |

## 1. Clone and simulated smoke test

```bash
git clone https://github.com/ashlynbain/hedge-fund-at-home.git
cd hedge-fund-at-home
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
cp config/config.yaml.example config/config.yaml
python -m hedgekit.cli.run --once
```

Expect `simulated_fill` in logs. **No broker account required.**

```bash
python -m hedgekit.cli.backtest --start 2023-01-01 --end 2024-12-31
python -m pytest -q
```

## 2. Paper trading with your broker

### Interactive Brokers (included)

1. Install TWS or IB Gateway (paper account).
2. Enable API connections in TWS settings.
3. Set `.env`:

```bash
IBKR_USE_REAL=true
IBKR_HOST=127.0.0.1
IBKR_PORT=7497          # paper TWS; live 7496; Gateway paper 4002
IBKR_CLIENT_ID=1
ENABLE_LIVE_TRADING=false
```

4. Set `config/config.yaml`:

```yaml
mode: paper
```

5. Start TWS/Gateway, then:

```bash
python -m hedgekit.cli.run --once
```

See [IBKR_SETUP.md](IBKR_SETUP.md).

### Any other broker (placeholder)

1. Copy `hedgekit/broker/custom_broker.py.example` → your package (e.g. `my_brokers/alpaca.py`).
2. Implement `submit(intent) -> OrderStatus` per `hedgekit/broker/base.py`.
3. Set `.env`:

```bash
mode: paper   # in config.yaml
BROKER_ADAPTER=custom
BROKER_CUSTOM_MODULE=my_brokers.alpaca:AlpacaBroker
```

4. Wire imports on `PYTHONPATH` or install your package editable.

See [hedgekit/broker/README.md](../hedgekit/broker/README.md).

## 3. Market data (sample vs yours)

**Default:** `hedgekit/core/marketdata.py` pulls daily bars from Yahoo via `yfinance`
for symbols in `config.yaml` (e.g. `SPY`, `KO`, `PEP`). Good for learning and
backtests — not a production data feed.

**Your data:** Replace or wrap `fetch_daily_bars()` to read CSV, Parquet, Polygon,
Alpaca, etc. Keep returning `list[Bar]` so strategies stay unchanged.

See [hedgekit/data/README.md](../hedgekit/data/README.md).

## 4. Your cloud (optional)

The runner is a plain Python process. Deploy wherever you run cron, systemd, ECS, or a VM.

| Provider | In this repo | What you do |
| -------- | ------------ | ----------- |
| **AWS** | `infrastructure/aws/` Terraform | Secrets Manager + ECS Fargate scaffold |
| **GCP** | Placeholder docs only | Secret Manager + Cloud Run / GCE |
| **Azure** | Placeholder docs only | Key Vault + Container Apps / VM |
| **None** | Default | Laptop or home server |

Inject the same `.env` keys via your cloud's secret store. IBKR still needs a
network path to TWS/Gateway (often a VPN or bridge host).

See [AWS_SETUP.md](AWS_SETUP.md) and [infrastructure/README.md](../infrastructure/README.md).

## 5. Docker (any host)

```bash
docker compose up --build
```

Runs **simulated** mode by default. Override env for paper when your broker endpoint is reachable from the container.

## 6. Before real money

- Complete weeks of **paper** testing.
- Tune `hedgekit/risk/gate.py` limits in config.
- Live mode requires `mode: live` **and** `ENABLE_LIVE_TRADING=true` — not part of the learning path.

**Not financial advice.** Simulated and paper results do not predict live performance.
