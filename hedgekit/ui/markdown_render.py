from __future__ import annotations

import html
import re

_TABLE_ROW_RE = re.compile(r"^\|.+\|$")
_TABLE_SEP_RE = re.compile(r"^\|[\s\-:|]+\|$")
_OL_RE = re.compile(r"^(\d+)\.\s+(.*)$")


def markdown_to_html(body: str, title: str = "Document") -> str:
    """Markdown to HTML for doc viewer (tables, lists, headings, code)."""
    lines = body.splitlines()
    blocks: list[str] = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i].rstrip()
        stripped = line.strip()

        if stripped.startswith("```"):
            block, i = _read_fenced_code(lines, i)
            blocks.append(block)
            continue

        if _TABLE_ROW_RE.match(stripped):
            block, i = _read_table(lines, i)
            blocks.append(block)
            continue

        if stripped.startswith("### "):
            blocks.append(f"<h3>{_inline(stripped[4:])}</h3>")
            i += 1
            continue
        if stripped.startswith("## "):
            blocks.append(f"<h2>{_inline(stripped[3:])}</h2>")
            i += 1
            continue
        if stripped.startswith("# "):
            blocks.append(f"<h1>{_inline(stripped[2:])}</h1>")
            i += 1
            continue

        if stripped.startswith("- "):
            block, i = _read_ul(lines, i)
            blocks.append(block)
            continue

        m = _OL_RE.match(stripped)
        if m:
            block, i = _read_ol(lines, i)
            blocks.append(block)
            continue

        if not stripped:
            i += 1
            continue

        para, i = _read_paragraph(lines, i)
        blocks.append(f"<p>{_inline(para)}</p>")

    content = "\n".join(blocks)
    safe_title = html.escape(title)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{safe_title} | Hedge Fund at Home</title>
  <link rel="stylesheet" href="/assets/doc.css" />
</head>
<body>
  <header class="doc-header">
    <a href="/">← Quest studio</a>
    <p class="doc-note">Educational material. Not financial advice.</p>
  </header>
  <main class="doc-body">
    <h1 class="doc-title">{safe_title}</h1>
    {content}
  </main>
</body>
</html>"""


def _read_fenced_code(lines: list[str], start: int) -> tuple[str, int]:
    i = start + 1
    buf: list[str] = []
    while i < len(lines):
        if lines[i].strip().startswith("```"):
            i += 1
            break
        buf.append(html.escape(lines[i]) + "\n")
        i += 1
    return f"<pre><code>{''.join(buf)}</code></pre>", i


def _read_table(lines: list[str], start: int) -> tuple[str, int]:
    rows: list[list[str]] = []
    i = start
    while i < len(lines):
        stripped = lines[i].strip()
        if not _TABLE_ROW_RE.match(stripped):
            break
        if _TABLE_SEP_RE.match(stripped):
            i += 1
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        rows.append(cells)
        i += 1

    if not rows:
        return "", start + 1

    header = rows[0]
    body_rows = rows[1:]
    parts = ['<table class="md-table">', "<thead><tr>"]
    for cell in header:
        parts.append(f"<th>{_inline(cell)}</th>")
    parts.append("</tr></thead><tbody>")
    for row in body_rows:
        parts.append("<tr>")
        for cell in row:
            parts.append(f"<td>{_inline(cell)}</td>")
        parts.append("</tr>")
    parts.append("</tbody></table>")
    return "".join(parts), i


def _read_ul(lines: list[str], start: int) -> tuple[str, int]:
    items: list[str] = []
    i = start
    while i < len(lines):
        stripped = lines[i].strip()
        if stripped.startswith("- "):
            items.append(f"<li>{_inline(stripped[2:])}</li>")
            i += 1
        else:
            break
    return "<ul>" + "".join(items) + "</ul>", i


def _read_ol(lines: list[str], start: int) -> tuple[str, int]:
    items: list[str] = []
    i = start
    while i < len(lines):
        m = _OL_RE.match(lines[i].strip())
        if m:
            items.append(f"<li>{_inline(m.group(2))}</li>")
            i += 1
        else:
            break
    return "<ol>" + "".join(items) + "</ol>", i


def _read_paragraph(lines: list[str], start: int) -> tuple[str, int]:
    parts: list[str] = []
    i = start
    while i < len(lines):
        stripped = lines[i].strip()
        if not stripped:
            break
        if (
            stripped.startswith("#")
            or stripped.startswith("- ")
            or stripped.startswith("```")
            or _TABLE_ROW_RE.match(stripped)
            or _OL_RE.match(stripped)
        ):
            break
        parts.append(stripped)
        i += 1
    return " ".join(parts), i


def _inline(text: str) -> str:
    s = html.escape(text)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", s)
    return s
