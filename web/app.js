const STORAGE_KEY = "hfah-learning-progress-v1";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function docHref(docPath) {
  if (!docPath) return "#";
  if (window.HFAH_STATIC?.enabled) {
    const slug = docPath.replace(/\.md$/i, "").replace(/\//g, "_") + ".html";
    return `/docs/${slug}`;
  }
  return `/view/${docPath.split("/").map(encodeURIComponent).join("/")}`;
}

function initDisclaimer() {
  const el = document.getElementById("disclaimer-text");
  if (el && window.HFAH_LEARNING) {
    el.textContent = window.HFAH_LEARNING.disclaimer;
  }
}

function initTabs() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.panel;
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === target));
    });
  });
}

function renderPipeline() {
  const el = document.getElementById("pipeline");
  if (!el || !window.HFAH_LEARNING) return;
  el.innerHTML = window.HFAH_LEARNING.pipeline
    .map((s, i) => {
      const arrow = i < window.HFAH_LEARNING.pipeline.length - 1 ? " +" : "";
      return `<div class="pipe-node">${s.label}${arrow}</div>`;
    })
    .join("");
}

function renderStages() {
  const container = document.getElementById("stages");
  const progress = loadProgress();
  if (!container || !window.HFAH_LEARNING) return;

  const core = window.HFAH_LEARNING.stages.filter((s) => !s.locked && !s.optional);
  const doneCount = core.filter((s) => progress[s.id]).length;

  container.innerHTML = window.HFAH_LEARNING.stages
    .map((stage) => {
      const done = !!progress[stage.id];
      const classes = [
        "quest-card",
        done ? "done" : "",
        stage.optional ? "optional" : "",
        stage.locked ? "locked" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const tasks = (stage.tasks || [])
        .map((t) => {
          const link = t.doc
            ? ` <a href="${docHref(t.doc)}" target="_blank" rel="noopener noreferrer">[open]</a>`
            : "";
          return `<li>${t.text}${link}</li>`;
        })
        .join("");

      const commands =
        stage.commands && stage.commands.length
          ? `<div class="code-block"><button type="button" class="copy" data-copy="${encodeURIComponent(
              stage.commands.join("\n")
            )}">COPY</button><pre>${stage.commands.map(escapeHtml).join("\n")}</pre></div>`
          : "";

      const runBtn =
        stage.id === "stage-2"
          ? `<button type="button" class="action-btn primary run-linked" data-action="run_once">Run in lab</button>`
          : stage.id === "stage-4"
            ? `<button type="button" class="action-btn run-linked" data-action="backtest">Run backtest in lab</button>`
            : stage.id === "stage-6"
              ? `<button type="button" class="action-btn run-linked" data-action="pytest">Run tests in lab</button>`
              : "";

      const badge = stage.optional
        ? '<span class="badge">SIDE QUEST</span>'
        : stage.locked
          ? '<span class="badge">LOCKED</span>'
          : "";

      return `
        <article class="${classes}">
          <div class="quest-header">
            <input type="checkbox" id="${stage.id}" ${done ? "checked" : ""} ${stage.locked ? "disabled" : ""} />
            <h3><label for="${stage.id}">${stage.title}</label></h3>
            ${badge}
          </div>
          <div class="quest-body">
            <p>${stage.body}</p>
            ${tasks ? `<ul>${tasks}</ul>` : ""}
            ${commands}
            ${runBtn}
            ${stage.checkpoint ? `<div class="checkpoint"><strong>Quest goal:</strong> ${stage.checkpoint}</div>` : ""}
          </div>
        </article>`;
    })
    .join("");

  const fill = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  const pct = core.length ? Math.round((doneCount / core.length) * 100) : 0;
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = `${doneCount} / ${core.length} quests cleared (${pct}% XP)`;

  container.querySelectorAll('input[type="checkbox"]').forEach((box) => {
    box.addEventListener("change", () => {
      const p = loadProgress();
      p[box.id] = box.checked;
      saveProgress(p);
      renderStages();
    });
  });

  container.querySelectorAll("button.copy").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(decodeURIComponent(btn.dataset.copy || ""));
      btn.textContent = "OK";
      setTimeout(() => { btn.textContent = "COPY"; }, 1200);
    });
  });

  container.querySelectorAll("button.run-linked").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector('.nav-btn[data-panel="panel-lab"]')?.click();
      runLabAction(btn.dataset.action);
    });
  });
}

function renderTopics() {
  const container = document.getElementById("topics");
  if (!container || !window.HFAH_LEARNING) return;
  container.innerHTML = window.HFAH_LEARNING.topics
    .map(
      (t) => `
      <div class="topic-card">
        <h3>${t.title}</h3>
        <ul>${t.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
        <details>
          <summary>Research scroll</summary>
          <ul>${t.research.map((r) => `<li>${r}</li>`).join("")}</ul>
        </details>
      </div>`
    )
    .join("");
}

function renderJournal() {
  const container = document.getElementById("journal");
  if (!container || !window.HFAH_LEARNING) return;
  container.innerHTML = window.HFAH_LEARNING.journalPrompts
    .map((p) => `<li>${p}</li>`)
    .join("");
}

function setConsole(text, state) {
  const el = document.getElementById("console-out");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("running", "error");
  if (state) el.classList.add(state);
}

async function runLabAction(action) {
  if (window.HFAH_API && !window.HFAH_API.labAvailable()) {
    setConsole(
      window.HFAH_STATIC?.labMessage ||
        "Code lab is not available on this hosted site. See docs/STATIC_DEPLOY.md to connect a lab API.",
      "error"
    );
    return;
  }
  const consoleEl = document.getElementById("console-out");
  const buttons = document.querySelectorAll(".action-btn, .run-linked");
  buttons.forEach((b) => { b.disabled = true; });

  setConsole("Loading... command starting...\n", "running");

  const body = { action };
  if (action === "backtest") {
    const start = document.getElementById("bt-start")?.value || "2023-01-01";
    const end = document.getElementById("bt-end")?.value || "2024-12-31";
    body.extra_args = ["--start", start, "--end", end];
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
    setConsole(out || "(no output)", data.ok ? "" : "error");
  } catch (err) {
    setConsole(`Could not reach lab API. Is learn_ui running?\n${err}`, "error");
  } finally {
    buttons.forEach((b) => { b.disabled = false; });
  }
}

function initLab() {
  document.querySelectorAll(".action-btn[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => runLabAction(btn.dataset.action));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDisclaimer();
  initTabs();
  renderPipeline();
  renderStages();
  renderTopics();
  renderJournal();
  initLab();
  if (window.initTradingFloor) window.initTradingFloor();
});
