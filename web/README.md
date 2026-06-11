# Education UI (optional)

Static front-ends for lessons, charts, and demos. **Paper trading and backtests
use the Python CLI** — see [docs/PAPER_TRADING_SETUP.md](../docs/PAPER_TRADING_SETUP.md).

## What is in this directory

| Path | Purpose | How to run |
| ---- | ------- | ---------- |
| `learn/` | Deployable learn site (pairs tab, code lab, setup guide) | `python -m hedgekit.cli.render_serve` or build with `scripts/build_learn_site.py` |
| `index.html` | Local quest studio (8-stage game UI) | `python -m hedgekit.cli.learn_ui` |
| `trading-floor.html` | Chart replay component (embedded in learn site) | Served with the learn site or quest studio |
| `pairs-floor.js` | Pairs spread replay (code lab) | Loaded by `learn/index.html` |

Shared assets: `styles.css`, `api-client.js`, `trading-floor.js`.

## Build static site

```bash
python scripts/build_learn_site.py    # → dist/learn-site.zip
python scripts/serve_learn_site.py    # preview on :9876
```

## Deploy

- [docs/RENDER_DEPLOY.md](../docs/RENDER_DEPLOY.md) — live Python code lab
- [docs/STATIC_DEPLOY.md](../docs/STATIC_DEPLOY.md) — ZIP hosting

**Not financial advice.**
