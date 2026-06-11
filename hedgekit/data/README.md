# Market data

## Default (sample): Yahoo Finance

`hedgekit/core/marketdata.py` → `fetch_daily_bars(symbols, start, end)` uses
**yfinance** for daily OHLCV. Symbols come from `config/config.yaml` under
`strategy.symbols`.

This is **sample data for education and backtests** — not a live production feed.

## Your data source (placeholder)

To use your own stack:

1. Keep the `Bar` schema in `hedgekit/core/schemas.py`.
2. Add a function that returns `dict[str, list[Bar]]` keyed by symbol.
3. Call it from the runner instead of (or behind) `fetch_daily_bars`.

Examples you might plug in:

- CSV files in `data/history/` (pandas `read_csv`)
- Polygon, Alpaca, IBKR historical API
- Your firm's internal bar store

Strategies only see `Bar` lists — the data vendor is swappable.

**Not financial advice.**
