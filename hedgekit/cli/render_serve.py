"""Render.com web service: learn site + interactive Python code lab API."""
from __future__ import annotations

import os
import socket
import webbrowser
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

import click

from .learn_ui import WEB_ROOT, _StudioHandler, _ensure_project_context

PROJECT_ROOT = WEB_ROOT.parent
DIST_LEARN = PROJECT_ROOT / "dist" / "learn"
LEARN_WEB = WEB_ROOT / "learn"


def _static_root() -> Path:
    if DIST_LEARN.is_dir() and (DIST_LEARN / "index.html").is_file():
        return DIST_LEARN
    return LEARN_WEB


def _write_render_static_config(root: Path) -> None:
    """Enable the code lab when API is co-hosted on the same origin."""
    cfg = """window.HFAH_STATIC = {
  enabled: true,
  snapshotScript: "data/snapshot-data.js",
  labDisabled: false,
  labMessage: "Code lab connects to this server. If it fails, wait for a cold start and retry."
};
"""
    (root / "static-config.js").write_text(cfg, encoding="utf-8")


def _port_busy(port: int, host: str) -> bool:
    try:
        with socket.create_connection((host if host != "0.0.0.0" else "127.0.0.1", port), timeout=0.4):
            return True
    except OSError:
        return False


def _default_host() -> str:
    return "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"


@click.command()
@click.option("--port", default=None, type=int, help="Port (Render sets $PORT).")
@click.option("--host", default=None, help="Bind address (default 127.0.0.1 local, 0.0.0.0 on Render).")
@click.option("--no-build", is_flag=True, help="Skip learn-site build step.")
@click.option("--open", "open_browser", is_flag=True, help="Open the site in your browser.")
def main(port: int | None, host: str | None, no_build: bool, open_browser: bool) -> None:
    """Serve the learn site with live Python examples for Render or local preview."""
    _ensure_project_context()
    host = host or _default_host()

    if not no_build:
        import subprocess
        import sys

        build = PROJECT_ROOT / "scripts" / "build_learn_site.py"
        if build.is_file():
            click.echo("Building learn site...")
            subprocess.run([sys.executable, str(build)], cwd=str(PROJECT_ROOT), check=False)

    static_root = _static_root()
    if not static_root.is_dir():
        raise click.ClickException(f"Learn site not found at {static_root}")

    _write_render_static_config(static_root)

    listen_port = port or int(os.environ.get("PORT", "8765"))
    if _port_busy(listen_port, host):
        raise click.ClickException(
            f"Port {listen_port} is already in use (often a stale learn_ui).\n"
            f"  lsof -ti :{listen_port} | xargs kill\n"
            f"  # or use another port: python -m hedgekit.cli.render_serve --port {listen_port + 1}"
        )

    _StudioHandler.api_only = False
    handler = partial(_StudioHandler, directory=str(static_root))
    httpd = ThreadingHTTPServer((host, listen_port), handler)

    browse_host = "127.0.0.1" if host == "0.0.0.0" else host
    url = f"http://{browse_host}:{listen_port}/"
    click.echo(f"Learn site + code lab: {url}")
    click.echo(f"Static root: {static_root}")
    click.echo("Endpoints: GET /api/config, GET /api/snapshot, POST /api/run")
    click.echo("Not financial advice. Press Ctrl+C to stop.")
    if open_browser or (browse_host in ("127.0.0.1", "localhost") and not os.environ.get("PORT")):
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        click.echo("\nStopped.")


if __name__ == "__main__":
    main()
