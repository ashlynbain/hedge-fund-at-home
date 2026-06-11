#!/usr/bin/env python3
"""Build the static learn site (education-focused, no code lab)."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEARN_WEB = ROOT / "web" / "learn"
SHARED_WEB = ROOT / "web"
OUT = ROOT / "dist" / "learn"

DOC_PATHS = [
    "DISCLAIMER.md",
    "README.md",
    "docs/EDUCATION.md",
    "docs/README.md",
    "docs/GETTING_STARTED.md",
    "docs/PAPER_TRADING_SETUP.md",
    "docs/IBKR_SETUP.md",
    "docs/AWS_SETUP.md",
    "docs/LEARNING_PATH.md",
    "docs/STRATEGY_GUIDE.md",
    "strategies/example_mean_reversion/README.md",
    "strategies/example_mean_reversion/strategy.py",
    "strategies/example_pairs/README.md",
    "strategies/example_pairs/strategy.py",
]


def _slug(doc_path: str) -> str:
    # Avoid ".py" in upload filenames (some shared hosts flag it).
    return doc_path.replace(".md", "").replace(".py", "_py").replace("/", "_") + ".html"


PARTIAL_TRADING = SHARED_WEB / "partials" / "trading-floor-panel.html"
TRADING_FLOOR_TEMPLATE = SHARED_WEB / "trading-floor.html"


LEARNING_DATA_TAG = '    <script src="learning-data.js" id="learn-data-script"></script>'


def _inline_learning_data(html: str) -> str:
    """Embed lesson JSON in index.html so shared hosts never 404 learning-data.js."""
    data_js = (LEARN_WEB / "learning-data.js").read_text(encoding="utf-8")
    if LEARNING_DATA_TAG not in html:
        raise SystemExit("index.html missing learning-data.js script tag")
    inline = f'    <script id="learn-data-script">\n{data_js}\n    </script>'
    return html.replace(LEARNING_DATA_TAG, inline, 1)


def _build_trading_floor_html(*, preload_snapshot: bool) -> str:
    partial = PARTIAL_TRADING.read_text(encoding="utf-8")
    html = TRADING_FLOOR_TEMPLATE.read_text(encoding="utf-8")
    marker = "    <div class=\"tf-shell\">\n"
    if partial.strip() not in html:
        html = html.replace(marker, marker + partial + "\n", 1)
    preload = '    <script src="data/snapshot-data.js"></script>\n' if preload_snapshot else ""
    html = html.replace("    <!-- SNAPSHOT_PRELOAD -->\n", preload)
    return html


def _capture_outputs() -> dict[str, str]:
    py = ROOT / ".venv" / "bin" / "python"
    if not py.is_file():
        py = Path(sys.executable)
    env = os.environ.copy()
    env.setdefault("HFAH_CONFIG", str(ROOT / "config" / "config.yaml.example"))
    out: dict[str, str] = {}

    def run(cmd: list[str]) -> str:
        r = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, timeout=120, env=env)
        return (r.stdout or "") + (r.stderr or "")

    try:
        out["run-once"] = run([str(py), "-m", "hedgekit.cli.run", "--once"])
    except Exception as exc:
        out["run-once"] = f"(capture failed: {exc})"
    try:
        out["backtest"] = run(
            [str(py), "-m", "hedgekit.cli.backtest", "--start", "2024-01-01", "--end", "2024-06-01"]
        )
    except Exception as exc:
        out["backtest"] = f"(capture failed: {exc})"
    try:
        out["pytest"] = run([str(py), "-m", "pytest", "-q"])
    except Exception as exc:
        out["pytest"] = f"(capture failed: {exc})"
    try:
        from hedgekit.ui.pairs_demo import run_pairs_demo

        out["pairs-demo"] = run_pairs_demo(pair="ko_pep", lookback=60, entry_z=2.0, use_live=False)
    except Exception as exc:
        out["pairs-demo"] = f"(capture failed: {exc})"
    return out


def main() -> None:
    sys.path.insert(0, str(ROOT))
    os.chdir(ROOT)
    os.environ.setdefault("HFAH_CONFIG", str(ROOT / "config" / "config.yaml.example"))

    from hedgekit.ui.doc_serve import render_view
    from hedgekit.ui.snapshot import build_trading_snapshot

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    if not LEARN_WEB.is_dir():
        raise SystemExit(f"Missing {LEARN_WEB}")

    for name in LEARN_WEB.iterdir():
        dest = OUT / name.name
        if name.is_dir():
            shutil.copytree(name, dest)
        else:
            shutil.copy2(name, dest)

    for shared in ("api-client.js", "trading-floor.js", "pairs-floor.js", "styles.css"):
        src = SHARED_WEB / shared
        if src.is_file():
            shutil.copy2(src, OUT / shared)
            if shared == "styles.css":
                shutil.copy2(src, LEARN_WEB / "styles.css")

    (OUT / "trading-floor.html").write_text(
        _build_trading_floor_html(preload_snapshot=True),
        encoding="utf-8",
    )

    assets_src = SHARED_WEB / "assets"
    if assets_src.is_dir():
        shutil.copytree(assets_src, OUT / "assets")

    docs_out = OUT / "docs"
    docs_out.mkdir(exist_ok=True)
    for doc in DOC_PATHS:
        try:
            html_bytes, _ = render_view(ROOT, doc)
            (docs_out / _slug(doc)).write_bytes(html_bytes)
            print(f"  doc: {doc}")
        except Exception as exc:
            print(f"  skip {doc}: {exc}")

    print("  capturing expected CLI output...")
    captured = _capture_outputs()

    data_dir = OUT / "data"
    data_dir.mkdir(exist_ok=True)
    (data_dir / "expected-outputs.js").write_text(
        "window.HFAH_EXPECTED_OUTPUTS = " + json.dumps(captured, indent=2) + ";\n",
        encoding="utf-8",
    )
    print("  building trading snapshot...")
    snap = build_trading_snapshot("2023-01-01", "2024-12-31")
    (data_dir / "snapshot-data.js").write_text(
        "window.HFAH_SNAPSHOT_DATA = " + json.dumps(snap) + ";\n",
        encoding="utf-8",
    )

    static_cfg = """window.HFAH_STATIC = {
  enabled: true,
  snapshotScript: "data/snapshot-data.js",
  labDisabled: true
};
"""
    (OUT / "static-config.js").write_text(static_cfg, encoding="utf-8")
    (LEARN_WEB / "static-config.js").write_text(static_cfg, encoding="utf-8")

    index_path = OUT / "index.html"
    index_html = _inline_learning_data(index_path.read_text(encoding="utf-8"))
    index_path.write_text(index_html, encoding="utf-8")

    (OUT / "UPLOAD_README.txt").write_text(
        "Extract this ZIP directly into your web root (e.g. public_html).\n"
        "You should see index.html HERE, not inside a learn-site/ subfolder.\n"
        "After extract: public_html/index.html, public_html/app.js, public_html/data/\n",
        encoding="utf-8",
    )

    for html_file in OUT.rglob("*.html"):
        text = html_file.read_text(encoding="utf-8")
        if "</motion>" in text or "<motion" in text:
            raise SystemExit(f"Invalid HTML tag in {html_file} — fix before deploy")

    zip_path = OUT.parent / "learn-site.zip"
    if zip_path.exists():
        zip_path.unlink()
    shutil.make_archive(str(OUT.parent / "learn-site"), "zip", OUT)

    print(f"\nBuilt learn site: {OUT}")
    print(f"ZIP (recommended): {zip_path}")
    print("Upload the ZIP to your web root (e.g. public_html), then extract.")


if __name__ == "__main__":
    main()
