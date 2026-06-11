/** Shared API helpers for local learn_ui and hosted static site + remote lab. */
(function () {
  function cfg() {
    return window.HFAH_STATIC || {};
  }

  function apiBase() {
    const b = cfg().apiBase || "";
    return b.replace(/\/$/, "");
  }

  function apiUrl(path) {
    const base = apiBase();
    const p = path.startsWith("/") ? path : `/${path}`;
    return base ? `${base}${p}` : p;
  }

  function labAvailable() {
    const c = cfg();
    if (!c.enabled) return true;
    if (c.apiBase) return true;
    return !c.labDisabled;
  }

  async function fetchJson(path, options) {
    const headers = { ...(options?.headers || {}) };
    if (cfg().apiKey) {
      headers["X-HFAH-Key"] = cfg().apiKey;
    }
    const res = await fetch(apiUrl(path), { ...options, headers });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      if (cfg().enabled && !cfg().apiBase) {
        throw new Error(
          "Code lab needs a Python API server. See docs/STATIC_DEPLOY.md (VPS or lab subdomain)."
        );
      }
      throw new Error(
        "API did not return JSON. Run: python -m hedgekit.cli.learn_ui (or configure apiBase)."
      );
    }
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  window.HFAH_API = { apiBase, apiUrl, labAvailable, fetchJson };
})();
