# Deploy the interactive learn site on Render

**Not financial advice.** This hosts the learn site **with a live Python code lab** so visitors
can run teaching snippets (pairs spread demo, hedge ratio, backtest) in the browser.

Static ZIP hosting (Hostinger, etc.) cannot run Python — use Render for the interactive version.

## What you get

| Tab | Hosted on Render |
| --- | ---------------- |
| Map / Strategy / Pairs / Stat arb | Full learn curriculum |
| Code lab | **Live Python** via `/api/run` on the same service |
| Trading floor | Chart replay (live `/api/snapshot` on Render) |
| Lofi player | Background SomaFM streams (browser click-to-play) |
| Scrolls | Captured sample output at build time |

## One-click blueprint

1. Push this repo to GitHub.
2. In [Render](https://render.com), **New → Blueprint** and point at `render.yaml`.
3. Wait for build + deploy (free tier may cold-start after idle).
4. Open your `*.onrender.com` URL → **Code lab** tab → run **Pairs spread report**.

## Manual web service

| Setting | Value |
| --- | --- |
| Runtime | Python 3.11 |
| Build | `pip install -e ".[dev]" && cp config/config.yaml.example config/config.yaml && python scripts/build_learn_site.py` |
| Start | `python -m hedgekit.cli.render_serve --no-build` |
| Health check | `/` |

Environment variables (optional):

- `HFAH_CONFIG` = `config/config.yaml.example`
- `HFAH_UI_QUIET` = `true`
- `HFAH_API_KEY` + `HFAH_CORS_ORIGIN` — only if you split static + API later

## Local preview (same as Render)

```bash
cd hedge-fund-at-home
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp config/config.yaml.example config/config.yaml
python -m hedgekit.cli.render_serve
```

Open `http://127.0.0.1:8765/` — Code lab should show **API connected**.

## Security note

The code lab runs **whitelisted** actions only (`pairs_demo`, `run_snippet`, `run_once`, `backtest`, `pytest`).
It does not execute arbitrary user Python. For a public deploy, keep it that way.

## Static-only deploy (no Python)

If you only need read-only content, use `docs/STATIC_DEPLOY.md` and upload `dist/learn-site.zip`.
Code lab buttons will show offline instructions.

## Rebuild after content changes

Edit `web/learn/learning-data.js` or lessons, then redeploy (Render rebuilds from `render.yaml`)
or run `python scripts/build_learn_site.py` locally.

**Not financial advice.**
