"""Learning studio: game UI + local API to run whitelisted demo commands."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import webbrowser
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import click

WEB_ROOT = Path(__file__).resolve().parents[2] / "web"
PROJECT_ROOT = WEB_ROOT.parent


def _ensure_project_context() -> None:
    """Config + strategy imports resolve from repo root regardless of caller cwd."""
    os.chdir(PROJECT_ROOT)
    cfg = PROJECT_ROOT / "config" / "config.yaml"
    if cfg.is_file():
        os.environ.setdefault("HFAH_CONFIG", str(cfg))
    try:
        from ..core.config import get_settings

        get_settings.cache_clear()
    except Exception:
        pass


def _resolve_python() -> str:
    """Prefer project .venv so dev tools (pytest) match pip install -e '.[dev]'."""
    venv_py = PROJECT_ROOT / ".venv" / "bin" / "python"
    if venv_py.is_file():
        return str(venv_py)
    if os.name == "nt":
        win_py = PROJECT_ROOT / ".venv" / "Scripts" / "python.exe"
        if win_py.is_file():
            return str(win_py)
    return sys.executable


def _allowed_commands() -> dict[str, list[str]]:
    py = _resolve_python()
    return {
        "run_once": [py, "-m", "hedgekit.cli.run", "--once"],
        "backtest": [py, "-m", "hedgekit.cli.backtest"],
        "pytest": [py, "-m", "pytest", "-q"],
        "version": [py, "-c", "import hedgekit; print(hedgekit.__version__)"],
    }


def _pytest_hint(python: str) -> str:
    return (
        "pytest is not installed for this Python interpreter.\n\n"
        f"Using: {python}\n\n"
        "Fix (pick one):\n"
        "  source .venv/bin/activate && pip install -e \".[dev]\"\n"
        "  pip install -e \".[dev]\"\n\n"
        "Then run:\n"
        "  python -m pytest -q\n"
    )


def _run_snippet(body: dict) -> dict:
    snippet_id = str(body.get("snippet_id", ""))
    params = body.get("params")
    if not isinstance(params, dict):
        params = {}
    try:
        from ..ui.pairs_demo import run_snippet

        stdout = run_snippet(snippet_id, params)
        return {
            "ok": True,
            "stdout": stdout,
            "stderr": "",
            "exit_code": 0,
            "command": f"snippet:{snippet_id}",
        }
    except ValueError as exc:
        return {"ok": False, "error": str(exc), "stdout": "", "stderr": "", "exit_code": -1}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "stdout": "", "stderr": "", "exit_code": -1}


def _run_pairs_demo(body: dict) -> dict:
    params = body.get("params") if isinstance(body.get("params"), dict) else {}
    try:
        from ..ui.pairs_demo import run_pairs_demo

        stdout = run_pairs_demo(
            pair=str(params.get("pair", "ko_pep")),
            lookback=int(params.get("lookback", 60)),
            entry_z=float(params.get("entry_z", 2.0)),
            use_live=bool(params.get("use_live", False)),
        )
        return {
            "ok": True,
            "stdout": stdout,
            "stderr": "",
            "exit_code": 0,
            "command": "pairs_demo",
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc), "stdout": "", "stderr": "", "exit_code": -1}


def _run_action(action: str, extra_args: list[str] | None = None, body: dict | None = None) -> dict:
    if action == "run_snippet":
        return _run_snippet(body or {})
    if action == "pairs_demo":
        return _run_pairs_demo(body or {})

    allowed = _allowed_commands()
    python = _resolve_python()
    if action not in allowed:
        return {
            "ok": False,
            "error": f"Unknown action: {action}",
            "stdout": "",
            "stderr": "",
            "exit_code": -1,
        }

    if action == "pytest":
        check = subprocess.run(
            [python, "-c", "import pytest"],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
        )
        if check.returncode != 0:
            return {
                "ok": False,
                "stdout": "",
                "stderr": _pytest_hint(python),
                "exit_code": 1,
                "command": f"{python} -m pytest -q",
            }

    cmd = list(allowed[action])
    if extra_args:
        if action != "backtest":
            return {"ok": False, "error": "extra_args only allowed for backtest", "stdout": "", "stderr": "", "exit_code": -1}
        cmd.extend(extra_args)

    env = os.environ.copy()
    env.setdefault("PYTHONUNBUFFERED", "1")
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=180,
            env=env,
        )
        return {
            "ok": proc.returncode == 0,
            "stdout": proc.stdout or "",
            "stderr": proc.stderr or "",
            "exit_code": proc.returncode,
            "command": " ".join(cmd),
            "python": python,
        }
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "error": "Command timed out after 180 seconds",
            "stdout": "",
            "stderr": "",
            "exit_code": -1,
        }
    except Exception as exc:
        return {
            "ok": False,
            "error": str(exc),
            "stdout": "",
            "stderr": "",
            "exit_code": -1,
        }


def _api_snapshot(query: dict[str, list[str]]) -> dict:
    _ensure_project_context()
    start = (query.get("start") or ["2023-01-01"])[0]
    end = (query.get("end") or ["2024-12-31"])[0]
    try:
        from ..ui.snapshot import build_trading_snapshot

        return build_trading_snapshot(start, end)
    except FileNotFoundError:
        return {"ok": False, "error": "config/config.yaml not found. Copy from config/config.yaml.example."}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def _api_pairs_snapshot(query: dict[str, list[str]]) -> dict:
    pair = (query.get("pair") or ["ko_pep"])[0]
    lookback = int((query.get("lookback") or ["60"])[0])
    entry_z = float((query.get("entry_z") or ["2.0"])[0])
    exit_z = float((query.get("exit_z") or ["0.5"])[0])
    use_live = (query.get("use_live") or ["0"])[0].lower() in ("1", "true", "yes")
    try:
        from ..ui.pairs_demo import build_pairs_snapshot

        return build_pairs_snapshot(
            pair=pair,
            lookback=lookback,
            entry_z=entry_z,
            exit_z=exit_z,
            use_live=use_live,
        )
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def _api_config() -> dict:
    _ensure_project_context()
    try:
        from ..ui.config_api import build_config_payload

        return build_config_payload()
    except FileNotFoundError:
        return {"ok": False, "error": "config/config.yaml not found."}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def _required_api_key() -> str | None:
    key = os.getenv("HFAH_API_KEY", "").strip()
    return key or None


def _cors_origin() -> str | None:
    origin = os.getenv("HFAH_CORS_ORIGIN", "").strip()
    return origin or None


class _StudioHandler(SimpleHTTPRequestHandler):
    api_only: bool = False

    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=directory or str(WEB_ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:
        if os.getenv("HFAH_UI_QUIET", "").lower() != "true":
            super().log_message(format, *args)

    def _send_cors(self) -> None:
        origin = _cors_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-HFAH-Key")

    def _api_authorized(self) -> bool:
        required = _required_api_key()
        if not required:
            return True
        return self.headers.get("X-HFAH-Key", "") == required

    def _reject_api_unauthorized(self) -> None:
        self._json_response(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Invalid or missing X-HFAH-Key"})

    def do_OPTIONS(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.send_response(HTTPStatus.NO_CONTENT)
            self._send_cors()
            self.end_headers()
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/config":
            if not self._api_authorized():
                self._reject_api_unauthorized()
                return
            self._json_response(HTTPStatus.OK, _api_config())
            return
        if parsed.path == "/api/snapshot":
            if not self._api_authorized():
                self._reject_api_unauthorized()
                return
            qs = parse_qs(parsed.query)
            self._json_response(HTTPStatus.OK, _api_snapshot(qs))
            return
        if parsed.path == "/api/pairs-snapshot":
            if not self._api_authorized():
                self._reject_api_unauthorized()
                return
            qs = parse_qs(parsed.query)
            self._json_response(HTTPStatus.OK, _api_pairs_snapshot(qs))
            return
        if parsed.path.startswith("/view/"):
            if self.api_only:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            rel = parsed.path[len("/view/") :]
            self._serve_view(rel)
            return
        if self.api_only:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        super().do_GET()

    def _serve_view(self, rel_path: str) -> None:
        from urllib.parse import unquote

        from ..ui.doc_serve import render_view

        _ensure_project_context()
        try:
            body, content_type = render_view(PROJECT_ROOT, unquote(rel_path))
        except FileNotFoundError:
            self.send_error(HTTPStatus.NOT_FOUND, "Document not found")
            return
        except ValueError as exc:
            self.send_error(HTTPStatus.FORBIDDEN, str(exc))
            return
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/run":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not self._api_authorized():
            self._reject_api_unauthorized()
            return

        length = int(self.headers.get("Content-Length", 0))
        try:
            raw = self.rfile.read(length) if length else b"{}"
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._json_response(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Invalid JSON"})
            return

        action = str(body.get("action", ""))
        extra = body.get("extra_args")
        extra_args = [str(x) for x in extra] if isinstance(extra, list) else None
        result = _run_action(action, extra_args, body)
        self._json_response(HTTPStatus.OK, result)

    def _json_response(self, status: HTTPStatus, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self._send_cors()
        self.end_headers()
        self.wfile.write(data)


@click.command()
@click.option("--port", default=8765, show_default=True)
@click.option("--no-open", is_flag=True)
@click.option("--host", default="127.0.0.1", show_default=True)
@click.option(
    "--allow-remote",
    is_flag=True,
    help="Bind to 0.0.0.0 (requires HFAH_API_KEY). For VPS / lab subdomain.",
)
@click.option(
    "--api-only",
    is_flag=True,
    help="Serve /api/* only (no static UI). Pair with the static learn site build.",
)
def main(port: int, no_open: bool, host: str, allow_remote: bool, api_only: bool) -> None:
    """Run the game-style learning studio (UI + code runner API)."""
    if allow_remote:
        if not _required_api_key():
            raise click.ClickException("Remote mode requires HFAH_API_KEY in the environment.")
        host = "0.0.0.0"
    elif host not in ("127.0.0.1", "localhost"):
        raise click.ClickException("For safety, only bind to 127.0.0.1 unless --allow-remote is set.")

    if not api_only and not WEB_ROOT.is_dir():
        raise click.ClickException(f"web/ folder not found at {WEB_ROOT}")

    _ensure_project_context()
    py = _resolve_python()
    _StudioHandler.api_only = api_only
    handler = partial(_StudioHandler, directory=str(WEB_ROOT))
    httpd = ThreadingHTTPServer((host, port), handler)

    if api_only:
        click.echo(f"Lab API only: http://{host}:{port}/api/")
    else:
        url = f"http://127.0.0.1:{port}/" if host == "0.0.0.0" else f"http://{host}:{port}/"
        click.echo(f"Quest studio: {url}")
    click.echo(f"Lab Python: {py}")
    if _required_api_key():
        click.echo("API key: required (X-HFAH-Key header)")
    if _cors_origin():
        click.echo(f"CORS origin: {_cors_origin()}")
    click.echo("Endpoints: GET /api/config, GET /api/snapshot, POST /api/run")
    click.echo("Not financial advice. Press Ctrl+C to stop.")
    if not no_open and not api_only and host != "0.0.0.0":
        webbrowser.open(f"http://127.0.0.1:{port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        click.echo("\nStopped.")


if __name__ == "__main__":
    main()
