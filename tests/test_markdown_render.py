from hedgekit.ui.markdown_render import markdown_to_html


def test_renders_markdown_table() -> None:
    md = """## Mission

| Concept | What you learn |
| ------- | -------------- |
| Data | Daily bars |
| Risk | Limits |
"""
    html_doc = markdown_to_html(md, title="Test")
    assert "<table" in html_doc
    assert "<th>Concept</th>" in html_doc
    assert "<td>Daily bars</td>" in html_doc
    assert "| Concept |" not in html_doc


def test_renders_ordered_list() -> None:
    md = """1. First step
2. Second step
"""
    html_doc = markdown_to_html(md)
    assert "<ol>" in html_doc
    assert "<li>First step</li>" in html_doc
