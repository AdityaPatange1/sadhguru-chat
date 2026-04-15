import { escapeHtml, renderAppHtml } from "./template.js";

const SYSTEM_PROMPT = `You are Sadhguru Jaggi Vasudev — a realized yogi, mystic, and spiritual master.

Guidelines:
- Respond with depth, clarity, and experiential wisdom.
- Use analogies from life, nature, and inner experience.
- Avoid sounding like a generic AI.
- Maintain calm authority, poetic tone, and subtle humor where appropriate.
- Do NOT break character.

Structure:
- Begin with a reflective or paradoxical statement when appropriate.
- Expand into insight.
- End with a contemplative takeaway or question.`;

const ROUTES = ["landing", "home", "guide", "cli", "webgpu"];

const DEFAULT_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

function parseRoute() {
  const h = (window.location.hash || "#/landing").slice(1).replace(/^\//, "");
  const name = h.split("/")[0] || "landing";
  return ROUTES.includes(name) ? name : "landing";
}

export async function mountApp(root) {
  const { CreateMLCEngine, prebuiltAppConfig, ModelType } =
    await import("@mlc-ai/web-llm");

  const instructModels = () =>
    prebuiltAppConfig.model_list.filter(
      (m) => m.model_type !== ModelType.embedding,
    );

  root.innerHTML = renderAppHtml();

  const els = {
    nav: root.querySelectorAll("[data-nav]"),
    views: root.querySelectorAll("[data-view]"),
    modelSelect: root.querySelector("#model-select"),
    loadBtn: root.querySelector("#load-engine"),
    progress: root.querySelector("#load-progress"),
    progressText: root.querySelector("#load-progress-text"),
    status: root.querySelector("#engine-status"),
    messages: root.querySelector("#chat-messages"),
    form: root.querySelector("#chat-form"),
    input: root.querySelector("#chat-input"),
    sendBtn: root.querySelector("#chat-send"),
    webgpuBanner: root.querySelector("#webgpu-banner"),
  };

  const models = instructModels();
  els.modelSelect.innerHTML = models
    .map((m) => {
      const sel = m.model_id === DEFAULT_MODEL ? " selected" : "";
      return `<option value="${escapeAttr(m.model_id)}"${sel}>${escapeHtml(
        m.model_id,
      )}</option>`;
    })
    .join("");

  const webgpuOk = !!navigator.gpu;
  els.webgpuBanner.hidden = webgpuOk;
  els.loadBtn.disabled = !webgpuOk;

  function showRoute(name) {
    els.nav.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.nav === name);
    });
    els.views.forEach((view) => {
      view.hidden = view.dataset.view !== name;
    });
  }

  function navigate(name) {
    const n = ROUTES.includes(name) ? name : "landing";
    window.location.hash = `#/${n}`;
  }

  function onHash() {
    showRoute(parseRoute());
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  window.addEventListener("hashchange", onHash);
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-nav]");
    if (!t || !ROUTES.includes(t.dataset.nav)) return;
    navigate(t.dataset.nav);
  });

  if (
    !window.location.hash ||
    window.location.hash === "#" ||
    window.location.hash === "#/"
  ) {
    history.replaceState(null, "", "#/landing");
  }
  onHash();

  setupLandingParallax(root);
  setupLandingJumps(root, navigate);

  let engine = null;
  let loading = false;
  /** @type {{ role: string, content: string }[]} */
  let chatHistory = [{ role: "system", content: SYSTEM_PROMPT }];

  async function ensureEngine() {
    if (engine || loading) return engine;
    if (!webgpuOk) {
      setStatus(
        "WebGPU is not available in this browser. Try a recent Chrome or Edge desktop build.",
        "err",
      );
      return null;
    }
    loading = true;
    els.loadBtn.disabled = true;
    const modelId = els.modelSelect.value;
    setStatus(
      "Loading model (first run may download several hundred MB)…",
      "load",
    );
    try {
      engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          const p = report.progress;
          els.progress.value = Math.round(p * 100);
          els.progressText.textContent =
            report.text || `${Math.round(p * 100)}%`;
        },
      });
      setStatus("Model ready. Speak from your heart.", "ok");
      els.input.disabled = false;
      els.sendBtn.disabled = false;
      return engine;
    } catch (e) {
      console.error(e);
      setStatus(String(e?.message || e), "err");
      engine = null;
      return null;
    } finally {
      loading = false;
      els.loadBtn.disabled = !webgpuOk;
    }
  }

  function setStatus(text, kind) {
    els.status.textContent = text;
    els.status.dataset.kind = kind;
  }

  els.modelSelect.addEventListener("change", () => {
    engine = null;
    chatHistory = [{ role: "system", content: SYSTEM_PROMPT }];
    setStatus("Model changed — click Load model before chatting.", "muted");
  });

  els.loadBtn.addEventListener("click", () => {
    engine = null;
    chatHistory = [{ role: "system", content: SYSTEM_PROMPT }];
    els.messages.innerHTML = "";
    appendMessage(
      "assistant",
      "When the model is ready, ask anything — inner work, life, stillness.",
    );
    ensureEngine();
  });

  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `msg msg--${role}`;
    div.innerHTML =
      role === "user"
        ? `<span class="msg__label">You</span><p class="msg__body"></p>`
        : `<span class="msg__label">Sadhguru</span><p class="msg__body"></p>`;
    div.querySelector(".msg__body").textContent = text;
    els.messages.appendChild(div);
    els.messages.scrollTop = els.messages.scrollHeight;
    return div.querySelector(".msg__body");
  }

  appendMessage(
    "assistant",
    "This conversation runs entirely in your browser via WebLLM. Load a model below, then begin.",
  );

  els.form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const text = els.input.value.trim();
    if (!text) return;

    const eng = await ensureEngine();
    if (!eng) return;

    els.input.value = "";
    els.sendBtn.disabled = true;
    appendMessage("user", text);
    chatHistory.push({ role: "user", content: text });

    const bodyEl = appendMessage("assistant", "");
    let full = "";

    try {
      const chunks = await eng.chat.completions.create({
        messages: chatHistory,
        temperature: 0.75,
        stream: true,
        stream_options: { include_usage: true },
      });

      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta?.content || "";
        full += delta;
        bodyEl.textContent = full;
        els.messages.scrollTop = els.messages.scrollHeight;
      }

      chatHistory.push({ role: "assistant", content: full });
    } catch (e) {
      console.error(e);
      bodyEl.textContent = `Error: ${e?.message || e}`;
    } finally {
      els.sendBtn.disabled = false;
    }
  });
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function setupLandingJumps(appRoot, navigate) {
  appRoot.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-jump]");
    if (!btn) return;
    const id = btn.getAttribute("data-jump");
    const el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const landingView = appRoot.querySelector('[data-view="landing"]');
    if (landingView?.hidden) {
      navigate("landing");
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function setupLandingParallax(appRoot) {
  const landing = appRoot.querySelector(".landing");
  if (!landing) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    landing.classList.add("landing--no-motion");
    return;
  }

  const hero = landing.querySelector(".landing__hero");
  const orbs = landing.querySelectorAll(".landing__orb");
  const bands = landing.querySelectorAll(".landing__band--parallax");
  const revealEls = landing.querySelectorAll(".landing__reveal");

  let ticking = false;

  function updateParallax() {
    const view = appRoot.querySelector('[data-view="landing"]');
    if (!view || view.hidden) {
      ticking = false;
      return;
    }

    landing.style.setProperty("--scroll-y", String(window.scrollY));

    if (hero && orbs.length) {
      const r = hero.getBoundingClientRect();
      const heroProgress = Math.max(
        0,
        Math.min(
          1,
          (window.innerHeight - r.top) / (window.innerHeight + r.height * 0.5),
        ),
      );
      const drift = heroProgress * 100;

      orbs.forEach((orb, i) => {
        const f = (i + 1) * 0.32;
        const dir = i % 2 ? -1 : 1;
        orb.style.transform = `translate3d(${drift * 0.08 * dir}px, ${drift * f}px, 0)`;
      });
    }

    bands.forEach((band) => {
      const rect = band.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const p = (window.innerHeight / 2 - mid) / window.innerHeight;
      band.style.setProperty("--band-shift", `${p * 48}px`);
    });

    revealEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const v = Math.max(
        0,
        Math.min(1, 1 - rect.top / (window.innerHeight * 0.92)),
      );
      el.style.setProperty("--reveal", String(v));
    });

    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick, { passive: true });
  updateParallax();
}
