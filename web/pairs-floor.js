/** Pairs trading replay floor for the code lab (education only). */
(function () {
  const LINE_A = "#a8e6c4";
  const LINE_B = "#c9a8ff";
  const SPREAD_COLOR = "#ffd56b";
  const Z_COLOR = "#f5b4c8";
  const ENTRY_LINE = "rgba(245, 166, 207, 0.55)";

  let snapshot = null;
  let playIndex = 0;
  let playTimer = null;
  let loaded = false;

  function $(id) {
    return document.getElementById(id);
  }

  function drawGrid(ctx, w, h, pad) {
    ctx.strokeStyle = "rgba(120, 200, 255, 0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad + ((h - 2 * pad) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }
  }

  function drawDualLines(ctx, seriesA, seriesB, w, h, upto) {
    const pad = 28;
    const n = Math.min(upto + 1, seriesA.length);
    if (n < 2) return;
    const a = seriesA.slice(0, n);
    const b = seriesB.slice(0, n);
    const min = Math.min(...a, ...b);
    const max = Math.max(...a, ...b);
    const range = max - min || 1;
    drawGrid(ctx, w, h, pad);

    function strokeLine(data, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = pad + ((w - 2 * pad) * i) / (data.length - 1);
        const y = pad + (h - 2 * pad) * (1 - (v - min) / range);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    strokeLine(a, LINE_A);
    strokeLine(b, LINE_B);
    ctx.fillStyle = "#c8f2dc";
    ctx.font = "14px VT323, monospace";
    ctx.fillText(`${snapshot.symbol_a} ${a.at(-1).toFixed(2)}`, pad, pad + 12);
    ctx.fillText(`${snapshot.symbol_b} ${b.at(-1).toFixed(2)}`, pad, pad + 28);
  }

  function drawSpread(ctx, spreads, w, h, upto) {
    const pad = 28;
    const data = spreads.slice(0, upto + 1);
    if (data.length < 2) return;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const mean = data.reduce((x, y) => x + y, 0) / data.length;
    drawGrid(ctx, w, h, pad);

    const yMean = pad + (h - 2 * pad) * (1 - (mean - min) / range);
    ctx.strokeStyle = ENTRY_LINE;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, yMean);
    ctx.lineTo(w - pad, yMean);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = SPREAD_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad + ((w - 2 * pad) * i) / (data.length - 1);
      const y = pad + (h - 2 * pad) * (1 - (v - min) / range);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = SPREAD_COLOR;
    ctx.font = "14px VT323, monospace";
    ctx.fillText(`spread ${data.at(-1).toFixed(2)}`, w - pad - 100, pad + 14);
  }

  function drawZScore(ctx, zseries, w, h, upto, entryZ) {
    const pad = 28;
    const vals = [];
    for (let i = 0; i <= upto; i++) {
      if (zseries[i] != null) vals.push(zseries[i]);
    }
    if (vals.length < 2) return;
    const min = Math.min(-entryZ - 0.5, ...vals);
    const max = Math.max(entryZ + 0.5, ...vals);
    const range = max - min || 1;
    drawGrid(ctx, w, h, pad);

    [entryZ, -entryZ, 0].forEach((level) => {
      const y = pad + (h - 2 * pad) * (1 - (level - min) / range);
      ctx.strokeStyle = level === 0 ? "rgba(200,200,200,0.35)" : ENTRY_LINE;
      ctx.setLineDash(level === 0 ? [2, 6] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    ctx.strokeStyle = Z_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= upto; i++) {
      const z = zseries[i];
      if (z == null) continue;
      const x = pad + ((w - 2 * pad) * i) / (zseries.length - 1);
      const y = pad + (h - 2 * pad) * (1 - (z - min) / range);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const last = zseries[upto];
    if (last != null) {
      ctx.fillStyle = Math.abs(last) > entryZ ? "#f5a6cf" : "#ffd4e8";
      const x = pad + ((w - 2 * pad) * upto) / (zseries.length - 1);
      const y = pad + (h - 2 * pad) * (1 - (last - min) / range);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c8f2dc";
      ctx.font = "14px VT323, monospace";
      ctx.fillText(`z ${last.toFixed(2)}`, w - pad - 70, pad + 14);
    }
  }

  function renderCharts() {
    if (!snapshot?.dates?.length) return;
    const idx = Math.min(playIndex, snapshot.dates.length - 1);
    const legs = $("pf-chart-legs");
    const spread = $("pf-chart-spread");
    const zc = $("pf-chart-z");
    if (legs) {
      const ctx = legs.getContext("2d");
      ctx.clearRect(0, 0, legs.width, legs.height);
      drawDualLines(ctx, snapshot.leg_a, snapshot.leg_b, legs.width, legs.height, idx);
    }
    if (spread) {
      const ctx = spread.getContext("2d");
      ctx.clearRect(0, 0, spread.width, spread.height);
      drawSpread(ctx, snapshot.spread, spread.width, spread.height, idx);
    }
    if (zc) {
      const ctx = zc.getContext("2d");
      ctx.clearRect(0, 0, zc.width, zc.height);
      drawZScore(ctx, snapshot.zscore, zc.width, zc.height, idx, snapshot.entry_z);
    }

    const q = $("pf-quote");
    if (q) {
      const z = snapshot.zscore[idx];
      q.innerHTML = `
        <span class="sym">${snapshot.symbol_a} / ${snapshot.symbol_b}</span>
        <span class="px">β ${snapshot.beta.toFixed(3)}</span>
        <span class="chg ${z != null && Math.abs(z) > snapshot.entry_z ? "down" : "up"}">z ${z != null ? z.toFixed(2) : "—"}</span>
        <span class="dt">${snapshot.dates[idx]}</span>
      `;
    }
    updateBlotter(idx);
  }

  function updateBlotter(uptoIdx) {
    const el = $("pf-blotter");
    if (!el || !snapshot?.events) return;
    const date = snapshot.dates[uptoIdx];
    const visible = snapshot.events.filter((e) => e.date <= date).slice(-10).reverse();
    el.innerHTML =
      visible
        .map((e) => {
          const cls =
            e.action === "LONG_SPREAD" ? "buy" : e.action === "SHORT_SPREAD" ? "sell" : "exit";
          return `<div class="tape-row fill ${cls}">
          <span>${e.date}</span><span>${e.action}</span><span>z ${e.z?.toFixed(2) ?? "—"}</span><span>${e.detail}</span>
        </div>`;
        })
        .join("") || '<div class="tape-row muted">Scrub replay — signals appear when |z| stretches…</div>';
  }

  function updateTicker() {
    const tape = $("pf-ticker");
    if (!tape || !snapshot) return;
    const idx = Math.min(playIndex, snapshot.dates.length - 1);
    const z = snapshot.zscore[idx];
    const bits = [
      `${snapshot.label}`,
      `β ${snapshot.beta}`,
      `z ${z != null ? z.toFixed(2) : "—"}`,
      `SIGNALS ${snapshot.stats.signals}`,
      `${snapshot.source.toUpperCase()}`,
      "EDUCATIONAL ONLY",
    ];
    tape.textContent = bits.join("   |   ") + "   |   ";
  }

  function stopPlay() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    const btn = $("pf-btn-play");
    if (btn) btn.textContent = "PLAY REPLAY";
  }

  function startPlay() {
    if (!snapshot?.dates?.length) return;
    if (playTimer) {
      stopPlay();
      return;
    }
    const btn = $("pf-btn-play");
    if (btn) btn.textContent = "PAUSE";
    const speed = Number($("pf-play-speed")?.value || 120);
    playTimer = setInterval(() => {
      if (playIndex >= snapshot.dates.length - 1) {
        stopPlay();
        return;
      }
      playIndex += 1;
      $("pf-play-scrub")?.setAttribute("value", String(playIndex));
      renderCharts();
      updateTicker();
      $("pf-status-led")?.classList.add("pulse");
      setTimeout(() => $("pf-status-led")?.classList.remove("pulse"), 200);
    }, speed);
  }

  function resizeCanvases() {
    document.querySelectorAll(".pf-chart-canvas").forEach((c) => {
      const panel = c.closest(".chart-panel");
      const rect = panel?.getBoundingClientRect();
      const w = Math.max(200, Math.floor(rect?.width || c.clientWidth || 400));
      const isMain = panel?.classList.contains("main-chart");
      const h = Math.max(isMain ? 200 : 100, Math.floor((rect?.height || 0) - 28));
      if (w > 0 && h > 0) {
        c.width = w;
        c.height = h;
      }
    });
    if (snapshot?.dates?.length) renderCharts();
  }

  function readParams() {
    return {
      pair: $("pf-pair")?.value || "ko_pep",
      lookback: Number($("pf-lookback")?.value || 60),
      entry_z: Number($("pf-entry-z")?.value || 2),
      use_live: Boolean($("pf-use-live")?.checked),
    };
  }

  async function loadSnapshot() {
    const status = $("pf-status");
    const params = readParams();
    if (status) status.textContent = "Loading pair replay…";
    stopPlay();

    try {
      const useApi = !window.HFAH_STATIC?.enabled || Boolean(window.HFAH_STATIC?.apiBase) || !window.HFAH_STATIC?.labDisabled;
      if (useApi && window.HFAH_API?.fetchJson) {
        const qs = new URLSearchParams({
          pair: params.pair,
          lookback: String(params.lookback),
          entry_z: String(params.entry_z),
          use_live: params.use_live ? "1" : "0",
        });
        snapshot = await window.HFAH_API.fetchJson(`/api/pairs-snapshot?${qs}`);
      } else {
        snapshot = buildClientSnapshot(params);
      }
      if (!snapshot.ok) {
        if (status) status.textContent = snapshot.error || "Failed to load";
        loaded = false;
        return;
      }
      loaded = true;
      playIndex = Math.max(0, params.lookback);
      const scrub = $("pf-play-scrub");
      if (scrub) {
        scrub.max = String(Math.max(0, snapshot.dates.length - 1));
        scrub.value = String(playIndex);
      }
      const meta = $("pf-meta");
      if (meta) {
        meta.textContent = `${snapshot.label} | β ${snapshot.beta} | ${snapshot.stats.bars} bars | ${snapshot.stats.signals} signals | ${snapshot.source}`;
      }
      if (status) status.textContent = "Pairs replay ready (educational only)";
      resizeCanvases();
      updateTicker();
    } catch (err) {
      loaded = false;
      if (status) status.textContent = String(err.message || err);
    }
  }

  function buildClientSnapshot(params) {
    const presets = {
      ko_pep: { label: "KO / PEP", a: "KO", b: "PEP" },
      xom_cvx: { label: "XOM / CVX", a: "XOM", b: "CVX" },
      gld_gdx: { label: "GLD / GDX", a: "GLD", b: "GDX" },
    };
    const preset = presets[params.pair] || presets.ko_pep;
    const n = 200;
    let spread = 0;
    const legA = [];
    const legB = [];
    let a = 100;
    let b = 82;
    const beta = 0.85;
    for (let t = 0; t < n; t++) {
      spread = 0.9 * spread + (Math.random() - 0.5) * 0.6;
      const shock = (Math.random() - 0.5) * 0.8;
      a += shock + spread * 0.12;
      b += beta * shock - spread * 0.1 + (Math.random() - 0.5) * 0.2;
      legA.push(a);
      legB.push(b);
    }
    const spreads = legA.map((av, i) => av - beta * legB[i]);
    const dates = [];
    const start = new Date("2023-01-01");
    for (let i = 0; i < n; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    const zscore = spreads.map(() => null);
    const lookback = params.lookback;
    for (let i = lookback - 1; i < n; i++) {
      const window = spreads.slice(i - lookback + 1, i + 1);
      const mu = window.reduce((x, y) => x + y, 0) / window.length;
      const sigma = Math.sqrt(window.reduce((x, y) => x + (y - mu) ** 2, 0) / window.length) || 1e-6;
      zscore[i] = Math.round(((spreads[i] - mu) / sigma) * 10000) / 10000;
    }
    const events = [];
    let position = 0;
    const entryZ = params.entry_z;
    const exitZ = 0.5;
    for (let i = 0; i < n; i++) {
      const z = zscore[i];
      if (z == null) continue;
      if (position === 0) {
        if (z > entryZ) {
          position = -1;
          events.push({ date: dates[i], type: "signal", action: "SHORT_SPREAD", z, detail: `Short ${preset.a}, long ${preset.b}` });
        } else if (z < -entryZ) {
          position = 1;
          events.push({ date: dates[i], type: "signal", action: "LONG_SPREAD", z, detail: `Long ${preset.a}, short ${preset.b}` });
        }
      } else if (Math.abs(z) < exitZ) {
        events.push({ date: dates[i], type: "signal", action: "EXIT", z, detail: "Flatten both legs" });
        position = 0;
      }
    }
    return {
      ok: true,
      pair: params.pair,
      label: preset.label,
      symbol_a: preset.a,
      symbol_b: preset.b,
      source: "browser",
      beta,
      lookback,
      entry_z: entryZ,
      exit_z: exitZ,
      stats: { bars: n, signals: events.length, z_last: zscore.at(-1) || 0 },
      dates,
      leg_a: legA,
      leg_b: legB,
      spread: spreads,
      zscore,
      events,
    };
  }

  function initPairsFloor() {
    $("pf-btn-load")?.addEventListener("click", () => loadSnapshot());
    $("pf-btn-play")?.addEventListener("click", () => startPlay());
    $("pf-play-scrub")?.addEventListener("input", (e) => {
      playIndex = Number(e.target.value);
      renderCharts();
      updateTicker();
    });
    $("pf-play-speed")?.addEventListener("change", () => {
      if (playTimer) {
        stopPlay();
        startPlay();
      }
    });

    window.addEventListener("resize", resizeCanvases);
    const grid = document.querySelector("#pairs-floor .chart-grid");
    if (grid && typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => {
        requestAnimationFrame(() => resizeCanvases());
      }).observe(grid);
    }

    const labTab = document.querySelector('.nav-btn[data-panel="panel-lab"]');
    const openLab = () => {
      setTimeout(() => {
        resizeCanvases();
        if (!loaded) loadSnapshot();
      }, 80);
    };
    labTab?.addEventListener("click", openLab);
    if (document.querySelector("#panel-lab.panel.active")) openLab();
  }

  window.initPairsFloor = initPairsFloor;
  window.reloadPairsFloor = loadSnapshot;
})();
