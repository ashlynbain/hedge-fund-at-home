from __future__ import annotations

from pathlib import Path

from .markdown_render import markdown_to_html

_ALLOWED_SUFFIXES = {".md", ".py", ".txt", ".yaml", ".example"}
_VIEW_ROOTS = ("DISCLAIMER.md", "README.md", "LICENSE", "docs", "hedgekit", "strategies", "config")


def safe_repo_path(project_root: Path, rel_path: str) -> Path:
    rel = rel_path.lstrip("/").replace("\\", "/")
    if ".." in rel.split("/"):
        raise ValueError("Invalid path")
    target = (project_root / rel).resolve()
    root = project_root.resolve()
    if not str(target).startswith(str(root)):
        raise ValueError("Path outside project")
    if target.suffix.lower() not in _ALLOWED_SUFFIXES and target.name not in ("DISCLAIMER.md", "README.md"):
        raise ValueError("File type not allowed")
    allowed = False
    for prefix in _VIEW_ROOTS:
        if rel == prefix or rel.startswith(prefix + "/"):
            allowed = True
            break
    if not allowed:
        raise ValueError("Path not in allowlist")
    if not target.is_file():
        raise FileNotFoundError(rel)
    return target


def render_view(project_root: Path, rel_path: str) -> tuple[bytes, str]:
    path = safe_repo_path(project_root, rel_path)
    text = path.read_text(encoding="utf-8", errors="replace")
    title = path.name
    if path.suffix == ".md":
        html_doc = markdown_to_html(text, title=title)
        return html_doc.encode("utf-8"), "text/html; charset=utf-8"
    import html as html_mod

    safe = html_mod.escape(text)
    html_doc = markdown_to_html(f"```\n{text}\n```", title=title)
    return html_doc.encode("utf-8"), "text/html; charset=utf-8"
