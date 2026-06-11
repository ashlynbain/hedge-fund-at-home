# Learning studio UI (quest game)

**Not financial advice.** A local-only game-style UI for the education path. The
**Code lab** tab runs whitelisted commands on your machine and shows output. It
does not connect to live brokers.

## Run locally

```bash
cd hedge-fund-at-home
pip install -e ".[dev]"
cp config/config.yaml.example config/config.yaml
python -m hedgekit.cli.learn_ui
```

Optional flags:

```bash
python -m hedgekit.cli.learn_ui --port 9000 --no-open
```

## Doc links ([open])

Quest tasks open files via `/view/...` when using `learn_ui` (for example `/view/DISCLAIMER.md`).
Do not open `index.html` as a file URL; links will not work without the server.

For static hosting of the learn site, see [STATIC_DEPLOY.md](STATIC_DEPLOY.md).

## What it includes

- **Quests:** eight stages with XP bar and checkboxes (browser localStorage)
- **Trading floor:** candlestick, volume, and equity charts with simulated order replay (not live trading)
- **Code lab:** run simulated once, backtest, pytest, version check (see output console)
- **Study grimoire:** topics and research phrases
- **Journal:** notebook prompts

## Code lab actions (whitelisted only)

| Button | Command |
| ------ | ------- |
| Check install | `import hedgekit` version |
| Run once | `python -m hedgekit.cli.run --once` |
| Simulated backtest | `python -m hedgekit.cli.backtest` with your dates |
| Run tests | `pytest -q` |

The server accepts GET `/api/snapshot` (chart data), GET `/api/config`, and POST
`/api/run` with known action names. It binds to 127.0.0.1 for local use only.

If `pytest` fails with "No module named pytest", install dev dependencies:

```bash
pip install -e ".[dev]"
# or use the project venv:
.venv/bin/python -m pytest -q
```

The Code lab prefers `.venv/bin/python` when a `.venv` folder exists.

## Files

See [web/README.md](../web/README.md) for how `web/index.html` (quest studio) relates
to `web/learn/` (deployable learn site).

## Publishing the learn site

[STATIC_DEPLOY.md](STATIC_DEPLOY.md) and [RENDER_DEPLOY.md](RENDER_DEPLOY.md). The
trading runner does not require hosting any UI.
