"""Shared static assets for the learn site (trading floor iframe, etc.)."""
from __future__ import annotations

import shutil
from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parents[2] / "web"
LEARN_WEB = WEB_ROOT / "learn"

SHARED_FILES = ("api-client.js", "trading-floor.js", "pairs-floor.js", "styles.css")
PARTIAL_TRADING = WEB_ROOT / "partials" / "trading-floor-panel.html"
TRADING_FLOOR_TEMPLATE = WEB_ROOT / "trading-floor.html"


def build_trading_floor_html(*, preload_snapshot: bool) -> str:
    partial = PARTIAL_TRADING.read_text(encoding="utf-8")
    html = TRADING_FLOOR_TEMPLATE.read_text(encoding="utf-8")
    marker = '    <div class="tf-shell">\n'
    if partial.strip() not in html:
        html = html.replace(marker, marker + partial + "\n", 1)
    preload = '    <script src="data/snapshot-data.js"></script>\n' if preload_snapshot else ""
    html = html.replace("    <!-- SNAPSHOT_PRELOAD -->\n", preload)
    return html


def sync_learn_runtime_assets(learn_dir: Path, *, preload_snapshot: bool = False) -> None:
    """Ensure learn/ has files the iframe and trading floor need (dev / --no-build)."""
    learn_dir.mkdir(parents=True, exist_ok=True)
    for name in SHARED_FILES:
        src = WEB_ROOT / name
        if src.is_file():
            shutil.copy2(src, learn_dir / name)
    assets_src = WEB_ROOT / "assets"
    if assets_src.is_dir():
        dest = learn_dir / "assets"
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(assets_src, dest)
    (learn_dir / "trading-floor.html").write_text(
        build_trading_floor_html(preload_snapshot=preload_snapshot),
        encoding="utf-8",
    )
