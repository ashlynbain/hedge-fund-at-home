function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const XP_KEY = "hfah-learn-xp-v1";
const STEPS_KEY = "hfah-learn-steps-v1";
const GLOSSARY_KEY = "hfah-learn-glossary-v1";
function learnData() {
  return window.HFAH_LEARN || window.HFAH_HOSTINGER || null;
}

const SETUP_KEY = "hfah-learn-setup-v1";

const TAB_IDS = [
  "panel-path",
  "panel-strategy",
  "panel-pairs",
  "panel-stat-arb",
  "panel-architecture",
  "panel-lab",
  "panel-glossary",
  "panel-resources",
  "panel-outputs",
  "panel-trading",
  "panel-setup",
  "panel-hands-on",
];

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadXp() {
  return loadJson(XP_KEY, {});
}

function saveXp(xp) {
  saveJson(XP_KEY, xp);
}

function updateXp() {
  const xp = loadXp();
  const done = TAB_IDS.filter((id) => xp[id]).length;
  const pct = Math.round((done / TAB_IDS.length) * 100);
  const fill = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = `${done} / ${TAB_IDS.length} areas explored (${pct}% Study XP)`;
}

function showLoadError(message) {
  const el = document.getElementById("load-error");
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
}

function initTabs() {
  const xp = loadXp();
  xp["panel-path"] = true;
  saveXp(xp);
  updateXp();

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.panel;
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === target));
      const x = loadXp();
      x[target] = true;
      saveXp(x);
      updateXp();
    });
  });
}

function bindPipelineInteractivity(container, lesson) {
  const completed = loadJson(STEPS_KEY, {});

  container.querySelectorAll(".pipe-node").forEach((node) => {
    node.addEventListener("click", () => {
      const idx = node.dataset.step;
      container.querySelectorAll(".pipe-node").forEach((n) => n.classList.remove("active"));
      node.classList.add("active");
      container.querySelectorAll(".step-card").forEach((card) => {
        card.classList.toggle("highlight", card.dataset.step === idx);
      });
      cardScroll(container, idx);
    });
  });

  container.querySelectorAll(".step-check").forEach((input) => {
    const idx = input.dataset.step;
    input.checked = Boolean(completed[idx]);
    input.addEventListener("change", () => {
      completed[idx] = input.checked;
      saveJson(STEPS_KEY, completed);
      const card = input.closest(".step-card");
      if (card) card.classList.toggle("done", input.checked);
      updateStepProgress(container, lesson.steps.length);
    });
    const card = input.closest(".step-card");
    if (card) card.classList.toggle("done", input.checked);
  });

  updateStepProgress(container, lesson.steps.length);
}

function cardScroll(container, idx) {
  const card = container.querySelector(`.step-card[data-step="${idx}"]`);
  if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function updateStepProgress(container, total) {
  const completed = loadJson(STEPS_KEY, {});
  const done = Object.values(completed).filter(Boolean).length;
  const label = container.querySelector(".step-progress");
  if (label) label.textContent = `${done} / ${total} quest steps checked off`;
}

function renderPipeline() {
  const el = document.getElementById("lesson-pipeline");
  const data = learnData();
  if (!el || !data) return;
  const lesson = data.lessons.find((l) => l.id === "pipeline");
  if (!lesson) return;

  const pipes = lesson.steps
    .map((s, i) => {
      const label = escapeHtml(s.title.replace(/^\d+\.\s*/, ""));
      const plus = i < lesson.steps.length - 1 ? '<span class="pipe-plus">+</span>' : "";
      return `<button type="button" class="pipe-node" data-step="${i}" aria-label="Jump to ${label}">${label}</button>${plus}`;
    })
    .join("");

  el.innerHTML = `
    <h2>${escapeHtml(lesson.title)}</h2>
    <p class="lesson-summary">${escapeHtml(lesson.summary)}</p>
    <p class="panel-hint">Click a pipe on the map, then check off each step when you understand it.</p>
    <p class="step-progress" aria-live="polite"></p>
    <div class="pipeline-quest">${pipes}</div>
    <div class="steps">
      ${lesson.steps
        .map(
          (s, i) => `
        <article class="step-card" data-step="${i}">
          <label class="step-check-label">
            <input type="checkbox" class="step-check" data-step="${i}" />
            <span>Quest complete</span>
          </label>
          <h3>${escapeHtml(s.title)}</h3>
          <p>${escapeHtml(s.body)}</p>
          <p class="callout">${escapeHtml(s.callout)}</p>
        </article>`
        )
        .join("")}
    </div>`;

  bindPipelineInteractivity(el, lesson);
  const first = el.querySelector(".pipe-node");
  if (first) first.click();
}

function renderZPlayground() {
  const el = document.getElementById("z-playground");
  if (!el) return;

  const sampleCloses = [100, 101, 99, 102, 98, 103, 97, 104, 96, 105, 95, 106, 94, 107, 93, 108, 92, 109, 91, 120];
  const lookback = 20;

  el.innerHTML = `
    <h2>Z-score playground</h2>
    <p class="lesson-summary">Drag the slider to see how a stretched close becomes a z-score. Educational only — not a trade signal.</p>
    <label class="z-label" for="z-close">Last close (vs recent ${lookback} bars)</label>
    <input id="z-close" class="z-slider" type="range" min="85" max="125" value="120" />
    <p class="z-readout"><strong>z ≈ <span id="z-value">—</span></strong> · mean <span id="z-mean">—</span> · std <span id="z-std">—</span></p>
    <p id="z-hint" class="z-hint"></p>
    <p class="note-box">Entry at |z| &gt; 2.0 and exit when |z| &lt; 0.5 in the example config — try values above and below those lines.</p>`;

  const closes = sampleCloses.slice();
  const slider = el.querySelector("#z-close");
  const zVal = el.querySelector("#z-value");
  const zMean = el.querySelector("#z-mean");
  const zStd = el.querySelector("#z-std");
  const zHint = el.querySelector("#z-hint");

  function compute(last) {
    const window = closes.slice(0, lookback);
    window[window.length - 1] = last;
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length;
    const std = Math.sqrt(variance) || 1e-6;
    const z = (last - mean) / std;
    return { z, mean, std };
  }

  function refresh() {
    const last = Number(slider.value);
    const { z, mean, std } = compute(last);
    zVal.textContent = z.toFixed(2);
    zMean.textContent = mean.toFixed(2);
    zStd.textContent = std.toFixed(2);
    let hint = "Near the recent mean — example strategy would likely stay flat.";
    if (z > 2) hint = "z above +2 — example config considers a short (mean reversion down).";
    else if (z < -2) hint = "z below −2 — example config considers a long (mean reversion up).";
    else if (Math.abs(z) < 0.5) hint = "|z| under 0.5 — example exit zone if you already hold a position.";
    zHint.textContent = hint;
  }

  slider.addEventListener("input", refresh);
  refresh();
}

function renderStrategy() {
  const el = document.getElementById("lesson-strategy");
  const data = learnData();
  if (!el || !data) return;
  const lesson = data.lessons.find((l) => l.id === "mean-reversion");
  if (!lesson) return;

  const params = lesson.params
    .map(
      (p) =>
        `<tr><td><code>${escapeHtml(p.name)}</code></td><td>${escapeHtml(p.default)}</td><td>${escapeHtml(p.meaning)}</td></tr>`
    )
    .join("");

  const logic = lesson.logic
    .map(
      (l, i) => `
      <article class="step-card logic-card" data-logic="${i}">
        <button type="button" class="logic-toggle" aria-expanded="false">Show rule</button>
        <h3>${escapeHtml(l.title)}</h3>
        <div class="logic-body" hidden>
          ${l.formula ? `<p class="formula">${escapeHtml(l.formula)}</p>` : ""}
          <p>${escapeHtml(l.body)}</p>
        </div>
      </article>`
    )
    .join("");

  el.innerHTML = `
    <h2>${escapeHtml(lesson.title)}</h2>
    <p class="lesson-summary">${escapeHtml(lesson.summary)}</p>
    <h3 class="subhead">Config parameters</h3>
    <table class="learn-table">
      <thead><tr><th>Parameter</th><th>Default</th><th>Meaning</th></tr></thead>
      <tbody>${params}</tbody>
    </table>
    <h3 class="subhead">Decision rules (tap to reveal)</h3>
    <div class="steps">${logic}</div>
    <h3 class="subhead">Pseudocode</h3>
    <pre class="code-sample">${escapeHtml(lesson.pseudocode)}</pre>
    <p class="try-it"><strong>Try it:</strong> ${escapeHtml(lesson.tryIt)}</p>`;

  el.querySelectorAll(".logic-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".logic-card");
      const body = card?.querySelector(".logic-body");
      if (!body) return;
      const open = body.hidden;
      body.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Hide rule" : "Show rule";
    });
  });
}

function renderGuideLesson(elId, lessonId) {
  const el = document.getElementById(elId);
  const data = learnData();
  if (!el || !data) return;
  const lesson = data.lessons.find((l) => l.id === lessonId);
  if (!lesson || !lesson.sections) return;

  const sections = lesson.sections
    .map(
      (s, i) => `
    <article class="step-card" data-section="${i}">
      <h3>${escapeHtml(s.title)}</h3>
      <p>${escapeHtml(s.body)}</p>
      ${s.bullets?.length ? `<ul>${s.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>` : ""}
      ${s.callout ? `<p class="callout">${escapeHtml(s.callout)}</p>` : ""}
    </article>`
    )
    .join("");

  el.innerHTML = `
    <h2>${escapeHtml(lesson.title)}</h2>
    <p class="lesson-summary">${escapeHtml(lesson.summary)}</p>
    <div class="steps">${sections}</div>
    ${lesson.note ? `<p class="note-box">${escapeHtml(lesson.note)}</p>` : ""}`;
}

function renderStatArb() {
  renderGuideLesson("lesson-stat-arb", "stat-arb");
}

function renderArchitecture() {
  const el = document.getElementById("lesson-architecture");
  const data = learnData();
  if (!el || !data) return;
  const lesson = data.lessons.find((l) => l.id === "live-architecture");
  if (!lesson) return;

  const pipes = lesson.flow
    .map((s, i) => {
      const label = escapeHtml(s.label);
      const plus = i < lesson.flow.length - 1 ? '<span class="pipe-plus">→</span>' : "";
      return `<button type="button" class="pipe-node arch-node" data-step="${i}" aria-label="${label}">${label}</button>${plus}`;
    })
    .join("");

  const details = lesson.flow
    .map(
      (s, i) => `
    <article class="step-card arch-card" data-step="${i}">
      <h3>${escapeHtml(s.label)}</h3>
      <p>${escapeHtml(s.body)}</p>
      ${s.tech?.length ? `<p class="callout"><strong>Typical tech:</strong> ${escapeHtml(s.tech.join(", "))}</p>` : ""}
    </article>`
    )
    .join("");

  const kBox = lesson.kafkaVsK8s
    ? `
    <div class="compare-grid k-compare">
      <article class="compare-card">
        <h3>${escapeHtml(lesson.kafkaVsK8s.kafkaTitle)}</h3>
        <p>${escapeHtml(lesson.kafkaVsK8s.kafkaBody)}</p>
      </article>
      <article class="compare-card">
        <h3>${escapeHtml(lesson.kafkaVsK8s.k8sTitle)}</h3>
        <p>${escapeHtml(lesson.kafkaVsK8s.k8sBody)}</p>
      </article>
    </div>`
    : "";

  const roles = lesson.roles
    ? `
    <h3 class="subhead">Who does what</h3>
    <table class="learn-table">
      <thead><tr><th>Piece</th><th>Role</th></tr></thead>
      <tbody>${lesson.roles
        .map((r) => `<tr><td><code>${escapeHtml(r.name)}</code></td><td>${escapeHtml(r.role)}</td></tr>`)
        .join("")}</tbody>
    </table>`
    : "";

  el.innerHTML = `
    <h2>${escapeHtml(lesson.title)}</h2>
    <p class="lesson-summary">${escapeHtml(lesson.summary)}</p>
    <p class="panel-hint">Click a stage on the wire diagram, then read the detail card below.</p>
    <div class="pipeline-quest arch-pipeline">${pipes}</div>
    <div class="steps arch-steps">${details}</div>
    ${kBox}
    ${roles}
    <p class="note-box">${escapeHtml(lesson.note)}</p>`;

  el.querySelectorAll(".arch-node").forEach((node) => {
    node.addEventListener("click", () => {
      const idx = node.dataset.step;
      el.querySelectorAll(".arch-node").forEach((n) => n.classList.remove("active"));
      node.classList.add("active");
      el.querySelectorAll(".arch-card").forEach((card) => {
        card.classList.toggle("highlight", card.dataset.step === idx);
      });
      const card = el.querySelector(`.arch-card[data-step="${idx}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
  const first = el.querySelector(".arch-node");
  if (first) first.click();
}

function renderPairs() {
  const el = document.getElementById("lesson-pairs");
  const data = learnData();
  if (!el || !data) return;
  const lesson = data.lessons.find((l) => l.id === "pairs-contrast");
  if (!lesson) return;

  const examples = (lesson.examples || [])
    .map(
      (ex) => `
    <article class="compare-card">
      <h3>${escapeHtml(ex.pair)}</h3>
      <p>${escapeHtml(ex.why)}</p>
      <p class="callout">${escapeHtml(ex.caveat)}</p>
    </article>`
    )
    .join("");

  const formulas = (lesson.formulas || [])
    .map(
      (f) => `
    <article class="step-card">
      <h3>${escapeHtml(f.title)}</h3>
      <p class="formula">${escapeHtml(f.formula)}</p>
      <p>${escapeHtml(f.body)}</p>
    </article>`
    )
    .join("");

  el.innerHTML = `
    <h2>${escapeHtml(lesson.title)}</h2>
    <p class="lesson-summary">${escapeHtml(lesson.summary)}</p>
    <div class="compare-grid">
      ${lesson.compare
        .map(
          (c) => `
        <article class="compare-card">
          <h3>${escapeHtml(c.term)}</h3>
          <p>${escapeHtml(c.detail)}</p>
        </article>`
        )
        .join("")}
    </div>
    <h3 class="subhead">Classic teaching pairs</h3>
    <div class="compare-grid">${examples}</div>
    <h3 class="subhead">Typical pairs workflow</h3>
    <ol>${lesson.pairsSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
    <h3 class="subhead">Key formulas</h3>
    <div class="steps">${formulas}</div>
    ${
      lesson.pythonSketch
        ? `<h3 class="subhead">Python sketch</h3><pre class="code-sample">${escapeHtml(lesson.pythonSketch)}</pre>`
        : ""
    }
    <p class="note-box">${escapeHtml(lesson.note)}</p>`;
}

function renderSpreadPlayground() {
  const el = document.getElementById("spread-playground");
  if (!el) return;

  const n = 80;
  const beta = 0.85;
  let spread = 0;
  const seriesA = [];
  const seriesB = [];
  const spreads = [];
  let a = 100;
  let b = 85;

  for (let t = 0; t < n; t++) {
    const shock = (Math.random() - 0.5) * 0.8;
    spread = 0.9 * spread + (Math.random() - 0.5) * 0.6;
    a += shock + spread * 0.12;
    b += beta * shock - spread * 0.1 + (Math.random() - 0.5) * 0.2;
    seriesA.push(a);
    seriesB.push(b);
    spreads.push(a - beta * b);
  }

  el.innerHTML = `
    <h2>Spread playground</h2>
    <p class="lesson-summary">Synthetic cointegrated pair. Drag sliders to see how hedge ratio and entry threshold change the spread z-score.</p>
    <canvas id="spread-canvas" class="spread-canvas" width="640" height="220" role="img" aria-label="Spread chart"></canvas>
    <div class="spread-controls">
      <label class="z-label" for="spread-beta">Hedge ratio β <span id="beta-val">${beta.toFixed(2)}</span></label>
      <input id="spread-beta" class="z-slider" type="range" min="0.5" max="1.2" step="0.01" value="${beta}" />
      <label class="z-label" for="spread-entry">Entry |z| <span id="entry-val">2.0</span></label>
      <input id="spread-entry" class="z-slider" type="range" min="1" max="3" step="0.1" value="2" />
      <label class="z-label" for="spread-lookback">Lookback <span id="look-val">30</span> bars</label>
      <input id="spread-lookback" class="z-slider" type="range" min="15" max="60" step="1" value="30" />
    </div>
    <p class="z-readout"><strong>Spread z ≈ <span id="spread-z">—</span></strong> · mean <span id="spread-mean">—</span> · std <span id="spread-std">—</span></p>
    <p id="spread-hint" class="z-hint"></p>
    <p class="note-box">Long cheap / short rich is the teaching rule when |z| is large. Try the <strong>Code lab</strong> tab for real Python output.</p>`;

  const canvas = el.querySelector("#spread-canvas");
  const ctx = canvas.getContext("2d");
  const betaSlider = el.querySelector("#spread-beta");
  const entrySlider = el.querySelector("#spread-entry");
  const lookSlider = el.querySelector("#spread-lookback");

  function computeSpread(b) {
    return seriesA.map((av, i) => av - b * seriesB[i]);
  }

  function drawSpread(spreadSeries, z, entryZ) {
    const w = canvas.width;
    const h = canvas.height;
    const pad = 28;
    ctx.fillStyle = "#1a1224";
    ctx.fillRect(0, 0, w, h);
    const slice = spreadSeries;
    const min = Math.min(...slice);
    const max = Math.max(...slice);
    const range = max - min || 1;
    ctx.strokeStyle = "#c8f2dc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    slice.forEach((v, i) => {
      const x = pad + (i / (slice.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const last = slice[slice.length - 1];
    const ly = h - pad - ((last - min) / range) * (h - pad * 2);
    ctx.fillStyle = Math.abs(z) > entryZ ? "#f5a6cf" : "#ffd4e8";
    ctx.beginPath();
    ctx.arc(w - pad, ly, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c8f2dc";
    ctx.font = "14px VT323, monospace";
    ctx.fillText("spread", pad, 18);
  }

  function refresh() {
    const b = Number(betaSlider.value);
    const entryZ = Number(entrySlider.value);
    const look = Number(lookSlider.value);
    el.querySelector("#beta-val").textContent = b.toFixed(2);
    el.querySelector("#entry-val").textContent = entryZ.toFixed(1);
    el.querySelector("#look-val").textContent = String(look);

    const spr = computeSpread(b);
    const window = spr.slice(-look);
    const mean = window.reduce((x, y) => x + y, 0) / window.length;
    const variance = window.reduce((x, y) => x + (y - mean) ** 2, 0) / window.length;
    const std = Math.sqrt(variance) || 1e-6;
    const z = (spr[spr.length - 1] - mean) / std;

    el.querySelector("#spread-z").textContent = z.toFixed(2);
    el.querySelector("#spread-mean").textContent = mean.toFixed(2);
    el.querySelector("#spread-std").textContent = std.toFixed(2);

    let hint = "Spread near its recent mean — toy strategy stays flat.";
    if (z > entryZ) hint = `z above +${entryZ} — spread rich: teaching rule shorts A, longs B.`;
    else if (z < -entryZ) hint = `z below −${entryZ} — spread cheap: teaching rule longs A, shorts B.`;
    el.querySelector("#spread-hint").textContent = hint;
    drawSpread(spr, z, entryZ);
  }

  [betaSlider, entrySlider, lookSlider].forEach((s) => s.addEventListener("input", refresh));
  refresh();
}

function renderInnovative() {
  renderGuideLesson("lesson-innovative", "innovative-strategies");
}

function renderResources() {
  const el = document.getElementById("resources");
  const items = learnData()?.resources || [];
  if (!el) return;

  el.innerHTML = `
    <h2>Study resources</h2>
    <p class="lesson-summary">Continue with books and docs. Links open in a new tab.</p>
    <div class="resource-grid">
      ${items
        .map(
          (r) => `
        <article class="resource-card">
          <span class="resource-type">${escapeHtml(r.type)}</span>
          <h3><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a></h3>
          <p>${escapeHtml(r.note)}</p>
        </article>`
        )
        .join("")}
    </div>`;
}

function setLabConsole(card, text, state) {
  const el = card?.querySelector(".lab-console-out");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("running", "error");
  if (state) el.classList.add(state);
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function runLabSnippet(snippet) {
  const card = document.querySelector(`.lab-snippet[data-id="${snippet.id}"]`);

  if (window.HFAH_API && !window.HFAH_API.labAvailable()) {
    setLabConsole(
      card,
      window.HFAH_STATIC?.labMessage ||
        "Code lab needs a Python server. Deploy on Render (see docs/RENDER_DEPLOY.md) or run: python -m hedgekit.cli.render_serve",
      "error"
    );
    return;
  }

  const runBtn = card?.querySelector(".lab-run");
  if (runBtn) runBtn.disabled = true;
  setLabConsole(card, "Running…\n", "running");

  const params = {};
  (snippet.params || []).forEach((p) => {
    const input = card?.querySelector(`[data-param="${p.name}"]`);
    if (!input) return;
    if (p.type === "checkbox") params[p.name] = input.checked;
    else if (p.type === "number") params[p.name] = Number(input.value);
    else params[p.name] = input.value;
  });

  const body = { action: snippet.action };
  if (snippet.action === "run_snippet") body.snippet_id = snippet.snippetId || snippet.id;
  if (snippet.action === "backtest") {
    body.extra_args = ["--start", params.start || "2023-01-01", "--end", params.end || "2024-06-01"];
  } else if (Object.keys(params).length) {
    body.params = params;
  }

  try {
    const fetcher = window.HFAH_API?.fetchJson || ((p, o) => fetch(p, o).then((r) => r.json()));
    const data = await fetcher("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let out = "";
    if (data.command) out += `$ ${data.command}\n\n`;
    if (data.error) out += `ERROR: ${data.error}\n\n`;
    if (data.stdout) out += data.stdout;
    if (data.stderr) out += (out ? "\n" : "") + data.stderr;
    if (data.exit_code !== undefined) out += `\n[exit ${data.exit_code}]`;
    setLabConsole(card, out || "(no output)", data.ok ? "" : "error");
    if (snippet.id === "pairs_demo" && window.reloadPairsFloor) {
      syncPairsFloorFromSnippet(card);
      window.reloadPairsFloor();
    }
  } catch (err) {
    setLabConsole(card, `Could not reach code lab API.\n${err}`, "error");
  } finally {
    if (runBtn) runBtn.disabled = false;
  }
}

function syncPairsFloorFromSnippet(card) {
  const pair = card?.querySelector('[data-param="pair"]');
  const lookback = card?.querySelector('[data-param="lookback"]');
  const entryZ = card?.querySelector('[data-param="entry_z"]');
  const live = card?.querySelector('[data-param="use_live"]');
  if (pair && document.getElementById("pf-pair")) document.getElementById("pf-pair").value = pair.value;
  if (lookback && document.getElementById("pf-lookback")) document.getElementById("pf-lookback").value = lookback.value;
  if (entryZ && document.getElementById("pf-entry-z")) document.getElementById("pf-entry-z").value = entryZ.value;
  if (live && document.getElementById("pf-use-live")) document.getElementById("pf-use-live").checked = live.checked;
}

function renderCodeLab() {
  const el = document.getElementById("code-lab");
  const lab = learnData()?.codeLab;
  if (!el || !lab) return;

  const available = window.HFAH_API?.labAvailable?.() ?? false;
  const status = available
    ? "API connected — you can run snippets below."
    : "Offline mode — static host only. Deploy with Render or run python -m hedgekit.cli.render_serve locally.";

  el.innerHTML = `
    <h2>Python code lab</h2>
    <p class="lesson-summary">${escapeHtml(lab.intro)}</p>
    <p class="lab-status ${available ? "lab-ok" : "lab-off"}">${escapeHtml(status)}</p>
    <div class="lab-snippet-list">
      ${lab.snippets
        .map((s) => {
          const fields = (s.params || [])
            .map((p) => {
              if (p.type === "select") {
                const opts = (p.options || [])
                  .map((o) => `<option value="${escapeHtml(o)}"${o === p.default ? " selected" : ""}>${escapeHtml(o)}</option>`)
                  .join("");
                return `<label>${escapeHtml(p.name)} <select data-param="${escapeHtml(p.name)}">${opts}</select></label>`;
              }
              if (p.type === "checkbox") {
                return `<label><input type="checkbox" data-param="${escapeHtml(p.name)}" ${p.default ? "checked" : ""} /> ${escapeHtml(p.label || p.name)}</label>`;
              }
              if (p.type === "number") {
                return `<label>${escapeHtml(p.name)} <input type="number" data-param="${escapeHtml(p.name)}" value="${escapeHtml(String(p.default))}" min="${p.min ?? ""}" max="${p.max ?? ""}" step="${p.step ?? 1}" /></label>`;
              }
              return `<label>${escapeHtml(p.name)} <input type="text" data-param="${escapeHtml(p.name)}" value="${escapeHtml(String(p.default))}" /></label>`;
            })
            .join("");
          return `
        <article class="lab-snippet output-card" data-id="${escapeHtml(s.id)}">
          <h3>${escapeHtml(s.title)}</h3>
          <p>${escapeHtml(s.description)}</p>
          ${fields ? `<div class="lab-params">${fields}</div>` : ""}
          <button type="button" class="action-btn primary lab-run">Run</button>
          <div class="console-wrap lab-console-wrap">
            <div class="console-title">Output</div>
            <pre class="console lab-console-out" aria-live="polite">Press Run to see output here…</pre>
          </div>
        </article>`;
        })
        .join("")}
    </div>`;

  el.querySelectorAll(".lab-snippet").forEach((card) => {
    const id = card.dataset.id;
    const snippet = lab.snippets.find((s) => s.id === id);
    card.querySelector(".lab-run")?.addEventListener("click", () => snippet && runLabSnippet(snippet));
  });
}

function renderGlossary() {
  const el = document.getElementById("glossary");
  const terms = learnData()?.glossary || [];
  if (!el) return;

  const known = loadJson(GLOSSARY_KEY, {});

  el.innerHTML = terms
    .map(
      (t, i) => `
    <article class="glossary-card" data-term="${i}" tabindex="0" role="button" aria-expanded="false">
      <label class="glossary-known" onclick="event.stopPropagation()">
        <input type="checkbox" class="glossary-check" data-term="${i}" />
        <span>I know this</span>
      </label>
      <h3>${escapeHtml(t.term)}</h3>
      <p class="glossary-def" hidden>${escapeHtml(t.def)}</p>
      <p class="glossary-tap">Tap to reveal</p>
    </article>`
    )
    .join("");

  el.querySelectorAll(".glossary-card").forEach((card) => {
    const idx = card.dataset.term;
    const def = card.querySelector(".glossary-def");
    const tap = card.querySelector(".glossary-tap");
    const check = card.querySelector(".glossary-check");

    if (known[idx]) check.checked = true;

    function reveal() {
      const open = def.hidden;
      def.hidden = !open;
      if (tap) tap.hidden = open;
      card.setAttribute("aria-expanded", String(open));
      card.classList.toggle("open", open);
    }

    card.addEventListener("click", (e) => {
      if (e.target.closest(".glossary-known")) return;
      reveal();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        reveal();
      }
    });

    check.addEventListener("change", () => {
      known[idx] = check.checked;
      saveJson(GLOSSARY_KEY, known);
      card.classList.toggle("known", check.checked);
    });
    card.classList.toggle("known", check.checked);
  });
}

function renderExpectedOutputs(samples) {
  const el = document.getElementById("expected-outputs");
  const outputs = learnData()?.expectedOutputs || [];
  if (!el) return;

  el.innerHTML = outputs
    .map((o, i) => {
      const look = o.whatToLookFor.map((x) => `<li>${escapeHtml(x)}</li>`).join("");
      const text = (o.outputKey && samples?.[o.outputKey]) || o.output || "";
      const out = text
        ? `<pre class="expected-console" id="out-${i}" hidden>${escapeHtml(text)}</pre>`
        : `<p class="muted">Run build_learn_site.py to capture sample output.</p>`;
      const toggle = text
        ? `<button type="button" class="reveal-output" data-target="out-${i}">Reveal example output</button>`
        : "";
      return `
      <article class="output-card">
        <h3>${escapeHtml(o.title)}</h3>
        <pre class="cmd">$ ${escapeHtml(o.command)}</pre>
        <h4>What to look for</h4>
        <ul>${look}</ul>
        <h4>Example output</h4>
        ${toggle}
        ${out}
      </article>`;
    })
    .join("");

  el.querySelectorAll(".reveal-output").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const show = target.hidden;
      target.hidden = !show;
      btn.textContent = show ? "Hide example output" : "Reveal example output";
    });
  });
}

function setupGithubHref(path) {
  const base = learnData()?.githubUrl || "https://github.com/ashlynbain/hedge-fund-at-home";
  if (path.endsWith(".example") || path.endsWith(".yaml")) {
    return `${base}/blob/main/${path}`;
  }
  if (window.HFAH_STATIC?.enabled && !window.HFAH_STATIC?.apiBase && path.endsWith(".md")) {
    const slug = path.replace(/\.md$/i, "").replace(/\//g, "_") + ".html";
    return `/docs/${slug}`;
  }
  return `${base}/blob/main/${path}`;
}

function renderSetupGuide() {
  const el = document.getElementById("lesson-setup");
  const guide = learnData()?.setupGuide;
  if (!el || !guide) return;

  const completed = loadJson(SETUP_KEY, {});

  const docLinks = (guide.githubDocs || [])
    .map(
      (d) =>
        `<a class="setup-doc-link" href="${escapeHtml(setupGithubHref(d.path))}" target="_blank" rel="noopener noreferrer">${escapeHtml(d.label)}</a>`
    )
    .join("");

  const phases = guide.phases || [];
  const pipes = phases
    .map((p, i) => {
      const label = escapeHtml(p.title.replace(/^\d+\.\s*/, ""));
      const plus = i < phases.length - 1 ? '<span class="pipe-plus">→</span>' : "";
      return `<button type="button" class="pipe-node setup-node" data-phase="${i}" aria-label="${label}">${label}</button>${plus}`;
    })
    .join("");

  const phasePanels = phases
    .map((phase, pi) => {
      const brokerCards =
        phase.brokers?.length ?
          `<h3 class="subhead">Broker options</h3>
           <div class="compare-grid">${phase.brokers
             .map(
               (b) => `
             <article class="compare-card setup-option-card">
               <span class="setup-status setup-status-${b.status.toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(b.status)}</span>
               <h3>${escapeHtml(b.name)}</h3>
               <p>${escapeHtml(b.detail)}</p>
               ${b.ports ? `<p class="callout">${escapeHtml(b.ports)}</p>` : ""}
             </article>`
             )
             .join("")}</div>`
        : "";

      const cloudCards =
        phase.clouds?.length ?
          `<h3 class="subhead">Cloud options</h3>
           <div class="compare-grid">${phase.clouds
             .map(
               (c) => `
             <article class="compare-card setup-option-card">
               <span class="setup-status setup-status-${c.status.toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(c.status)}</span>
               <h3>${escapeHtml(c.name)}</h3>
               <p>${escapeHtml(c.detail)}</p>
             </article>`
             )
             .join("")}</div>`
        : "";

      const steps = phase.steps
        .map((s, si) => {
          const key = `${phase.id}-${si}`;
          const checked = Boolean(completed[key]);
          return `
          <article class="step-card setup-step-card" data-phase="${pi}" data-step="${si}">
            <label class="step-check-label">
              <input type="checkbox" class="setup-check" data-key="${escapeHtml(key)}" ${checked ? "checked" : ""} />
              <span>Step done</span>
            </label>
            <h3>${escapeHtml(s.title)}</h3>
            <p>${escapeHtml(s.body)}</p>
            ${s.code ? `<pre class="code-sample">${escapeHtml(s.code)}</pre>` : ""}
            ${s.callout ? `<p class="callout">${escapeHtml(s.callout)}</p>` : ""}
          </article>`;
        })
        .join("");

      return `
        <div class="setup-phase-panel" data-phase="${pi}" hidden>
          <p class="lesson-summary">${escapeHtml(phase.summary)}</p>
          ${brokerCards}
          ${cloudCards}
          <div class="steps setup-steps">${steps}</div>
        </div>`;
    })
    .join("");

  el.innerHTML = `
    <h2>${escapeHtml(guide.title)}</h2>
    <p class="lesson-summary">${escapeHtml(guide.summary)}</p>
    <div class="setup-doc-row">
      <span class="setup-doc-label">Repo docs:</span>
      ${docLinks}
    </div>
    <p class="setup-progress" aria-live="polite"></p>
    <p class="panel-hint">Click a phase, then check off steps. Open repo docs on GitHub for the full walkthrough.</p>
    <div class="pipeline-quest setup-pipeline">${pipes}</div>
    ${phasePanels}
    <p class="note-box">${escapeHtml(guide.note)}</p>`;

  function refreshSetupProgress() {
    const total = el.querySelectorAll(".setup-check").length;
    const done = el.querySelectorAll(".setup-check:checked").length;
    const label = el.querySelector(".setup-progress");
    if (label) label.textContent = `${done} / ${total} setup steps complete`;
  }

  el.querySelectorAll(".setup-check").forEach((input) => {
    input.addEventListener("change", () => {
      completed[input.dataset.key] = input.checked;
      saveJson(SETUP_KEY, completed);
      input.closest(".setup-step-card")?.classList.toggle("done", input.checked);
      refreshSetupProgress();
    });
    input.closest(".setup-step-card")?.classList.toggle("done", input.checked);
  });

  function showPhase(idx) {
    el.querySelectorAll(".setup-node").forEach((n) => n.classList.toggle("active", n.dataset.phase === idx));
    el.querySelectorAll(".setup-phase-panel").forEach((p) => {
      p.hidden = p.dataset.phase !== idx;
    });
    el.querySelectorAll(".setup-step-card").forEach((card) => {
      card.classList.toggle("highlight", card.dataset.phase === idx);
    });
  }

  el.querySelectorAll(".setup-node").forEach((node) => {
    node.addEventListener("click", () => showPhase(node.dataset.phase));
  });

  refreshSetupProgress();
  if (phases.length) showPhase("0");
}

function renderHandsOn() {
  const el = document.getElementById("hands-on");
  const h = learnData()?.handsOn;
  if (!el || !h) return;

  el.innerHTML = `
    <h2>${escapeHtml(h.title)}</h2>
    <ol class="hands-on-list">
      ${h.steps
        .map(
          (s, i) => `
        <li>
          <label>
            <input type="checkbox" class="hands-check" data-step="${i}" />
            <span>${escapeHtml(s)}</span>
          </label>
        </li>`
        )
        .join("")}
    </ol>
    <p class="hands-progress" aria-live="polite"></p>
    <p class="note-box"><strong>Not financial advice.</strong> Educational software only. Simulated examples do not use real money and do not predict future performance.</p>`;

  const key = "hfah-learn-hands-v1";
  const done = loadJson(key, {});

  function refresh() {
    const checks = el.querySelectorAll(".hands-check");
    const n = [...checks].filter((c) => c.checked).length;
    const prog = el.querySelector(".hands-progress");
    if (prog) prog.textContent = `${n} / ${checks.length} home-base steps ready`;
  }

  el.querySelectorAll(".hands-check").forEach((input) => {
    input.checked = Boolean(done[input.dataset.step]);
    input.addEventListener("change", () => {
      done[input.dataset.step] = input.checked;
      saveJson(key, done);
      refresh();
    });
  });
  refresh();
}

window.addEventListener("error", (e) => {
  showLoadError(`Script error: ${e.message || "unknown"} — check browser console (F12).`);
});

document.addEventListener("DOMContentLoaded", () => {
  const data = learnData();
  if (!data) {
    showLoadError(
      "Lesson data did not load. Re-upload learn-site.zip (extract in your web root) and ensure learning-data.js is present."
    );
    initTabs();
    return;
  }

  const d = document.getElementById("disclaimer-text");
  if (d) d.textContent = data.disclaimer;

  document.querySelectorAll(".github-link").forEach((link) => {
    if (data.githubUrl) link.href = data.githubUrl;
  });

  initTabs();
  renderPipeline();
  renderStrategy();
  renderPairs();
  renderSpreadPlayground();
  renderZPlayground();
  renderStatArb();
  renderInnovative();
  renderArchitecture();
  renderCodeLab();
  renderGlossary();
  renderResources();

  function loadExpectedOutputs() {
    if (window.HFAH_EXPECTED_OUTPUTS) {
      renderExpectedOutputs(window.HFAH_EXPECTED_OUTPUTS);
      return;
    }
    const script = document.createElement("script");
    script.src = "data/expected-outputs.js";
    script.onload = () => renderExpectedOutputs(window.HFAH_EXPECTED_OUTPUTS || {});
    script.onerror = () => renderExpectedOutputs({});
    document.body.appendChild(script);
  }
  loadExpectedOutputs();
  renderSetupGuide();
  renderHandsOn();
  if (window.initPairsFloor) window.initPairsFloor();
});
