/** Simulated trading floor charts (education only). */
(function () {
  const PASTEL_UP = "#a8e6c4";
  const PASTEL_UP_FILL = "#7ec9a8";
  const PASTEL_DOWN = "#f5b4c8";
  const PASTEL_DOWN_FILL = "#d88aa8";
  const PASTEL_VOL_UP = "rgba(168, 230, 196, 0.65)";
  const PASTEL_VOL_DOWN = "rgba(245, 180, 200, 0.65)";

  let snapshot = null;
  let playIndex = 0;
  let playTimer = null;
  let loaded = false;
  let resizeObserver = null;

  function $(id) {
    return document.getElementById(id);
  }

  function fmtMoney(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
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

  function drawCandles(ctx, bars, w, h, upto) {
    if (!bars.length) return;
    const pad = 28;
    const slice = bars.slice(0, upto + 1);
    const windowSize = Math.min(80, Math.max(40, slice.length));
    const view = slice.slice(-windowSize);
    const highs = view.map((b) => b.high);
    const lows = view.map((b) => b.low);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const range = max - min || 1;
    const cw = (w - 2 * pad) / view.length;

    drawGrid(ctx, w, h, pad);

    view.forEach((b, i) => {
      const x = pad + i * cw + cw / 2;
      const yOpen = pad + (h - 2 * pad) * (1 - (b.open - min) / range);
      const yClose = pad + (h - 2 * pad) * (1 - (b.close - min) / range);
      const yHigh = pad + (h - 2 * pad) * (1 - (b.high - min) / range);
      const yLow = pad + (h - 2 * pad) * (1 - (b.low - min) / range);
      const up = b.close >= b.open;
      ctx.strokeStyle = up ? PASTEL_UP : PASTEL_DOWN;
      ctx.fillStyle = up ? PASTEL_UP_FILL : PASTEL_DOWN_FILL;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();
      const top = Math.min(yOpen, yClose);
      const bodyH = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillRect(x - cw * 0.25, top, cw * 0.5, bodyH);
    });

    const last = view[view.length - 1];
    ctx.fillStyle = "#ffd56b";
    ctx.font = "16px VT323, monospace";
    ctx.fillText(`${last.close.toFixed(2)}`, w - pad - 70, pad + 14);
  }

  function drawVolume(ctx, bars, w, h, upto) {
    const pad = 24;
    const slice = bars.slice(0, upto + 1);
    const view = slice.slice(-80);
    if (!view.length) return;
    const maxV = Math.max(...view.map((b) => b.volume), 1);
    const bw = (w - 2 * pad) / view.length;
    drawGrid(ctx, w, h, pad);
    view.forEach((b, i) => {
      const x = pad + i * bw;
      const bh = ((h - 2 * pad) * b.volume) / maxV;
      ctx.fillStyle = b.close >= b.open ? PASTEL_VOL_UP : PASTEL_VOL_DOWN;
      ctx.fillRect(x, h - pad - bh, Math.max(1, bw - 1), bh);
    });
  }

  function drawEquity(ctx, points, w, h, upto) {
    const pad = 28;
    const slice = points.slice(0, upto + 1);
    if (slice.length < 2) return;
    const vals = slice.map((p) => p.equity);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    drawGrid(ctx, w, h, pad);
    ctx.strokeStyle = "#c9a8ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    slice.forEach((p, i) => {
      const x = pad + ((w - 2 * pad) * i) / (slice.length - 1);
      const y = pad + (h - 2 * pad) * (1 - (p.equity - min) / range);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = "#ffd56b";
    ctx.font = "16px VT323, monospace";
    ctx.fillText(fmtMoney(slice[slice.length - 1].equity), pad, pad + 14);
  }

  function renderCharts() {
    if (!snapshot?.ohlcv?.length) return;
    const idx = Math.min(playIndex, snapshot.ohlcv.length - 1);
    const price = $("chart-price");
    const vol = $("chart-volume");
    const eq = $("chart-equity");
    if (price) {
      const ctx = price.getContext("2d");
      ctx.clearRect(0, 0, price.width, price.height);
      drawCandles(ctx, snapshot.ohlcv, price.width, price.height, idx);
    }
    if (vol) {
      const ctx = vol.getContext("2d");
      ctx.clearRect(0, 0, vol.width, vol.height);
      drawVolume(ctx, snapshot.ohlcv, vol.width, vol.height, idx);
    }
    if (eq && snapshot.equity?.length) {
      const ctx = eq.getContext("2d");
      ctx.clearRect(0, 0, eq.width, eq.height);
      drawEquity(ctx, snapshot.equity, eq.width, eq.height, idx);
    }
    const bar = snapshot.ohlcv[idx];
    const q = $("quote-panel");
    if (q && bar) {
      const chg = idx > 0 ? bar.close - snapshot.ohlcv[idx - 1].close : 0;
      const sign = chg >= 0 ? "+" : "";
      q.innerHTML = `
        <span class="sym">${snapshot.primary}</span>
        <span class="px">${bar.close.toFixed(2)}</span>
        <span class="chg ${chg >= 0 ? "up" : "down"}">${sign}${chg.toFixed(2)}</span>
        <span class="dt">${bar.date}</span>
      `;
    }
    updateBlotter(idx);
  }

  function updateBlotter(uptoIdx) {
    const el = $("trade-blotter");
    if (!el || !snapshot?.events) return;
    const date = snapshot.ohlcv[uptoIdx]?.date;
    const visible = snapshot.events.filter((e) => e.date <= date).slice(-12).reverse();
    el.innerHTML = visible
      .map((e) => {
        if (e.type === "fill") {
          return `<div class="tape-row fill ${e.side === "BUY" ? "buy" : "sell"}">
            <span>${e.date}</span><span>${e.side}</span><span>${e.qty} ${e.symbol}</span><span>@ ${e.price}</span>
          </div>`;
        }
        return `<div class="tape-row reject">
            <span>${e.date}</span><span>RISK</span><span>${e.qty} ${e.symbol}</span><span>${e.reason}</span>
          </div>`;
      })
      .join("") || '<div class="tape-row muted">Waiting for signals...</div>';
  }

  function updateTicker() {
    const tape = $("ticker-tape");
    if (!tape || !snapshot) return;
    const last = snapshot.ohlcv[playIndex] || snapshot.ohlcv.at(-1);
    const events = snapshot.events.filter((e) => e.type === "fill").slice(-6);
    const bits = [
      `${snapshot.primary} ${last?.close?.toFixed(2) ?? "--"} SIM`,
      `FILLS ${snapshot.stats.fills}`,
      `REJECTS ${snapshot.stats.rejects}`,
      `EQUITY ${fmtMoney(snapshot.stats.final_equity)}`,
      ...events.map((e) => `${e.side} ${e.qty} ${e.symbol} @ ${e.price}`),
    ];
    tape.textContent = bits.join("   |   ") + "   |   ";
  }

  function stopPlay() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    const btn = $("btn-play");
    if (btn) btn.textContent = "PLAY REPLAY";
  }

  function startPlay() {
    if (!snapshot?.ohlcv?.length) return;
    if (playTimer) {
      stopPlay();
      return;
    }
    const btn = $("btn-play");
    if (btn) btn.textContent = "PAUSE";
    const speed = Number($("play-speed")?.value || 120);
    playTimer = setInterval(() => {
      if (playIndex >= snapshot.ohlcv.length - 1) {
        stopPlay();
        return;
      }
      playIndex += 1;
      $("play-scrub")?.setAttribute("value", String(playIndex));
      renderCharts();
      updateTicker();
      pulseActivity();
    }, speed);
  }

  function pulseActivity() {
    const led = $("status-led");
    if (!led) return;
    led.classList.add("pulse");
    setTimeout(() => led.classList.remove("pulse"), 200);
  }

  async function loadSnapshot() {
    const start = $("tf-start")?.value || "2023-01-01";
    const end = $("tf-end")?.value || "2024-12-31";
    const status = $("tf-status");
    if (status) status.textContent = "Loading simulated market replay...";
    try {
      const useLiveApi =
        !window.HFAH_STATIC?.enabled ||
        Boolean(window.HFAH_STATIC?.apiBase);
      if (useLiveApi) {
        const fj = window.HFAH_API?.fetchJson || fetchJson;
        snapshot = await fj(
          `/api/snapshot?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
      } else if (window.HFAH_STATIC?.snapshotScript) {
        await new Promise((resolve, reject) => {
          if (window.HFAH_SNAPSHOT_DATA) {
            snapshot = window.HFAH_SNAPSHOT_DATA;
            resolve();
            return;
          }
          const s = document.createElement("script");
          s.src = window.HFAH_STATIC.snapshotScript;
          s.onload = () => {
            snapshot = window.HFAH_SNAPSHOT_DATA || { ok: false };
            resolve();
          };
          s.onerror = () => reject(new Error("Could not load chart data script"));
          document.head.appendChild(s);
        });
      } else if (window.HFAH_STATIC?.snapshotUrl) {
        snapshot = await fetchJson(window.HFAH_STATIC.snapshotUrl);
        if (snapshot.ok && start !== "2023-01-01") {
          if (status) {
            status.textContent =
              "Static demo uses a fixed date range. Connect a lab API for custom dates.";
          }
        }
      } else {
        snapshot = await fetchJson(
          `/api/snapshot?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
      }
      if (!snapshot.ok) {
        if (status) status.textContent = snapshot.error || "Failed to load";
        loaded = false;
        return;
      }
      if (!snapshot.ohlcv?.length) {
        if (status) status.textContent = "No chart data for this range. Try longer dates.";
        loaded = false;
        return;
      }
      loaded = true;
      playIndex = 0;
      const scrub = $("play-scrub");
      if (scrub) {
        scrub.max = String(Math.max(0, snapshot.ohlcv.length - 1));
        scrub.value = "0";
      }
      const meta = $("tf-meta");
      if (meta) {
        meta.textContent = `${snapshot.strategy} | ${snapshot.symbols.join(", ")} | ${snapshot.stats.bars} bars | ${snapshot.stats.fills} fills`;
      }
      if (status) status.textContent = "Replay ready (simulated data only)";
      resizeCanvases();
      updateTicker();
    } catch (err) {
      loaded = false;
      if (status) status.textContent = String(err.message || err);
    }
  }

  function resizeCanvases() {
    document.querySelectorAll(".chart-canvas").forEach((c) => {
      const panel = c.closest(".chart-panel");
      const rect = panel?.getBoundingClientRect();
      const w = Math.max(200, Math.floor(rect?.width || c.clientWidth || 400));
      const isMain = panel?.classList.contains("main-chart");
      const h = Math.max(isMain ? 220 : 100, Math.floor((rect?.height || 0) - 28));
      if (w > 0 && h > 0) {
        c.width = w;
        c.height = h;
      }
    });
    if (snapshot?.ohlcv?.length) renderCharts();
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        "API did not return JSON. Start the studio with: python -m hedgekit.cli.learn_ui (do not open index.html as a file)."
      );
    }
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  function initTradingFloor() {
    $("btn-load-snapshot")?.addEventListener("click", () => loadSnapshot());
    $("btn-play")?.addEventListener("click", () => startPlay());
    $("play-scrub")?.addEventListener("input", (e) => {
      playIndex = Number(e.target.value);
      renderCharts();
      updateTicker();
    });
    $("play-speed")?.addEventListener("change", () => {
      if (playTimer) {
        stopPlay();
        startPlay();
      }
    });

    window.addEventListener("resize", resizeCanvases);

    const grid = document.querySelector(
      "#panel-trading .chart-grid, body.tf-page .chart-grid"
    );
    if (grid && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => resizeCanvases());
      });
      resizeObserver.observe(grid);
    }

    const useLiveConfig =
      !window.HFAH_STATIC?.enabled || Boolean(window.HFAH_STATIC?.apiBase);
    const configPromise = useLiveConfig
      ? (window.HFAH_API?.fetchJson || fetchJson)("/api/config")
      : Promise.resolve({
          ok: true,
          mode: "simulated",
          symbols: ["SPY"],
        });
    configPromise
      .then((cfg) => {
        if (cfg.ok && cfg.symbols?.length) {
          const sym = $("tf-symbol");
          if (sym) sym.textContent = cfg.symbols.join(" / ");
          const mode = $("tf-mode");
          if (mode) mode.textContent = (cfg.mode || "simulated").toUpperCase();
        } else if (cfg.error) {
          const status = $("tf-status");
          if (status) status.textContent = cfg.error;
        }
      })
      .catch((err) => {
        const status = $("tf-status");
        if (status) status.textContent = err.message || String(err);
      });

    const tradingTab = document.querySelector('.nav-btn[data-panel="panel-trading"]');
    const openTrading = () => {
      setTimeout(() => {
        resizeCanvases();
        if (!loaded) loadSnapshot();
      }, 80);
    };
    tradingTab?.addEventListener("click", openTrading);
    if (document.querySelector("#panel-trading.panel.active")) {
      openTrading();
    }
    const standalone =
      document.body.classList.contains("charts-only") ||
      document.body.classList.contains("tf-page");
    if (standalone) {
      setTimeout(() => {
        resizeCanvases();
        loadSnapshot();
      }, 80);
    }
  }

  window.initTradingFloor = initTradingFloor;
})();
