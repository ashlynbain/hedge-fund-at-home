# Static learn site deployment

**Not financial advice.** How to host the **education UI** as static files (lessons,
glossary, chart replay). This is separate from the paper-trading runner in `hedgekit/`.

Build output: `dist/learn-site.zip` from `python scripts/build_learn_site.py`.

For **interactive Python** in the browser, use [RENDER_DEPLOY.md](RENDER_DEPLOY.md) instead.

## What is on the learn site

| Tab | Content |
| --- | ------- |
| Learning path | Data → signal → risk → execution |
| Strategy walkthrough | Mean reversion example, parameters, pseudocode |
| Stat arb | Statistical arbitrage concepts, patterns, research habits |
| Live stack | Kafka, Kubernetes, AWS, IBKR, Python services (wire diagram) |
| Glossary | Mean reversion, z-score, pairs trading, Kafka, K8s, OMS, etc. |
| Expected output | Real sample logs from `run --once`, backtest, pytest |
| Trading floor | Same `trading-floor.html` + `styles.css` as local quest studio (embedded iframe) |
| Run locally | Link to GitHub + install steps |

Code lab buttons are **not** on this site by design.

## Build the upload folder (on your Mac)

```bash
cd hedge-fund-at-home
source .venv/bin/activate
pip install -e ".[dev]"
cp config/config.yaml.example config/config.yaml   # for snapshot + sample output capture
python scripts/build_learn_site.py
```

Output: `dist/learn/` — upload **all files inside** that folder.

The build captures **expected terminal output** and downloads market data for chart replay.

## Upload (avoid 403 errors on some hosts)

Some file managers return **403 Forbidden** when uploading many files at once, or when uploading **dotfiles** like `.htaccess`. Use the **ZIP** instead.

### Recommended: upload one ZIP

1. Run the build (creates `dist/learn-site.zip`).
2. Open your host’s file manager (web root is often `public_html`).
3. Delete old site files if you are replacing a previous upload (keep backups if needed).
4. Upload **`learn-site.zip`** only (one file).
5. Extract the ZIP **into** `public_html` (choose “extract here”, not into a new subfolder).
6. Confirm `index.html` sits directly in `public_html` — **not** `public_html/learn-site/index.html`.
7. Open `UPLOAD_README.txt` in the file manager if unsure.
8. Visit your domain and hard-refresh (Cmd+Shift+R).

The production build **embeds lesson data inside `index.html`**, so the Map works even if a separate `learning-data.js` request fails.

### If you still see 403 while uploading

- Upload the **ZIP only**, not many separate files.
- Do not upload `.htaccess` unless you maintain it yourself; `index.html` is enough.
- Try **FTP/SFTP** and upload the contents of `dist/learn/`.
- Check folder permissions: web root **755**, files **644** where your host allows it.

### If the live site shows 403 (after upload)

- Permissions on the web root and `index.html` (644/755).
- No extra `.htaccess` blocking access.
- Domain points at the folder where you extracted the ZIP.

## Optional: subdomain

Create `learn.yourdomain.com` pointing at a subfolder, upload the same files there.

## Local full studio (Code lab + live snapshot)

```bash
python -m hedgekit.cli.learn_ui
```

Use `http://127.0.0.1:8765/` — doc links use `/view/...` and APIs work.

## Rebuild after changes

Re-run `python scripts/build_learn_site.py` and re-upload `dist/learn/`.

## Two UIs in this repo

| UI | Command | Static deploy |
| --- | --- | --- |
| **Learn site** | `python scripts/build_learn_site.py` then upload | Yes |
| **Quest studio** | `python -m hedgekit.cli.learn_ui` | Local only (unless you run a VPS yourself) |

Source for the learn site: `web/learn/`.

**Not financial advice.**
