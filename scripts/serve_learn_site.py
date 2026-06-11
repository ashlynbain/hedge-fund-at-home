#!/usr/bin/env python3
"""Build dist/learn and start a local preview server."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "scripts" / "build_learn_site.py"
DIST = ROOT / "dist" / "learn"
PORT = 9876


def main() -> None:
    subprocess.run([sys.executable, str(BUILD)], cwd=str(ROOT), check=True)
    if not (DIST / "index.html").is_file():
        raise SystemExit(f"Build failed: missing {DIST / 'index.html'}")
    print(f"\nPreview: http://127.0.0.1:{PORT}/")
    print(f"Serving: {DIST}\n")
    subprocess.run(
        [sys.executable, "-m", "http.server", str(PORT)],
        cwd=str(DIST),
        check=True,
    )


if __name__ == "__main__":
    main()
