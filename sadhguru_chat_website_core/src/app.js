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

  root.innerHTML = template();

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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function template() {
  return `
  <a class="skip-link" href="#landing-main">Skip to content</a>
  <div class="shell">
    <header class="top">
      <div class="brand">
        <span class="brand__mark" aria-hidden="true">☸</span>
        <div>
          <p class="brand__title">Sadhguru Chat</p>
          <p class="brand__tag">Inner clarity · One page · No reloads</p>
        </div>
      </div>
      <nav class="nav" aria-label="Primary">
        <button type="button" class="nav__btn is-active" data-nav="landing">Landing</button>
        <button type="button" class="nav__btn" data-nav="home">Home</button>
        <button type="button" class="nav__btn" data-nav="guide">The app</button>
        <button type="button" class="nav__btn" data-nav="cli">CLI &amp; Ollama</button>
        <button type="button" class="nav__btn" data-nav="webgpu">Browser / WebGPU</button>
      </nav>
    </header>

    <main id="main" class="main">
      <section class="view view--landing" data-view="landing" id="landing-main">
        <div class="landing">
          <div class="landing__hero landing__hero--content landing__band--parallax">
            <div class="landing__parallax-bg" aria-hidden="true">
              <span class="landing__orb landing__orb--1"></span>
              <span class="landing__orb landing__orb--2"></span>
              <span class="landing__orb landing__orb--3"></span>
            </div>
            <div class="landing__hero-inner">
              <p class="landing__eyebrow">Sadhguru Chat · SPA · CLI &amp; browser</p>
              <h1 class="landing__title">A quiet space for questions that matter</h1>
              <p class="landing__subtitle">
                This site introduces a small AI-assisted project: a <strong>Python CLI</strong> that talks to models through
                <strong>Ollama</strong>, and a <strong>vanilla web app</strong> where you can try a Sadhguru-style dialogue
                in your browser with <strong>WebLLM</strong> (WebGPU). Same intention — different runtimes.
              </p>
              <div class="landing__cta">
                <button type="button" class="btn btn--primary" data-nav="home">Open Home &amp; chat</button>
                <button type="button" class="btn btn--ghost" data-jump="landing-overview">Read the overview</button>
              </div>
            </div>
          </div>

          <section class="landing__section landing__band--parallax landing__band landing__band--soft" id="landing-overview">
            <div class="landing__section-inner landing__reveal">
              <h2 class="landing__h2">What you’ll find here</h2>
              <p class="landing__lead">
                The repository pairs a terminal workflow for power users with a no-backend web demo. You choose: remote
                Ollama models with your own keys, or fully local inference in Chromium via WebLLM — no account on this site.
              </p>
              <ul class="landing__list">
                <li><strong>Documentation SPA</strong> — Hash routes (<code>#/landing</code>, <code>#/home</code>, …) swap views without a full reload.</li>
                <li><strong>Home</strong> — Short intro plus the WebLLM chat panel and quick-reference cards.</li>
                <li><strong>The app / CLI / WebGPU</strong> — Deeper notes mirrored from the Python tool and browser stack.</li>
              </ul>
            </div>
          </section>

          <section class="landing__section" id="landing-features">
            <div class="landing__section-inner landing__reveal">
              <h2 class="landing__h2">Features</h2>
              <div class="landing__features">
                <article class="landing__feature">
                  <h3 class="landing__h3">Sadhguru voice (system prompt)</h3>
                  <p>Replies aim for depth, metaphor, and inward focus — not generic assistant tone. The same core prompt drives CLI and web.</p>
                </article>
                <article class="landing__feature">
                  <h3 class="landing__h3">CLI + Ollama</h3>
                  <p>Ask once or stay in a REPL-style loop. Point <code>OLLAMA_HOST</code> at your server and pass <code>--model</code> to match a tag your Ollama knows.</p>
                </article>
                <article class="landing__feature">
                  <h3 class="landing__h3">Optional CLI modes</h3>
                  <p><code>--opc</code> “yogic code” phrasing; <code>--sans</code> Sanskrit–Tamil blend with English gloss (CLI only).</p>
                </article>
                <article class="landing__feature">
                  <h3 class="landing__h3">WebLLM in the tab</h3>
                  <p>Pick a bundled MLC model, load weights once, then chat offline in spirit — data stays on-device after download.</p>
                </article>
                <article class="landing__feature">
                  <h3 class="landing__h3">Vite + npm</h3>
                  <p>The UI is packaged with npm scripts; local dev uses headers that satisfy WebLLM’s COOP/COEP needs.</p>
                </article>
                <article class="landing__feature">
                  <h3 class="landing__h3">Single Page App</h3>
                  <p>One HTML shell, client-side routing, and lazy-loaded WebLLM so first paint stays light.</p>
                </article>
              </div>
            </div>
          </section>

          <section class="landing__section landing__band landing__band--dark">
            <div class="landing__section-inner landing__reveal">
              <h2 class="landing__h2 landing__h2--on-dark">Run the Python CLI</h2>
              <ol class="landing__steps">
                <li>Clone the repo and open a terminal at the project root.</li>
                <li>Create a virtual environment, then <code>pip install -r requirements.txt</code> (includes <code>ollama</code>, <code>python-dotenv</code>, <code>rich</code>).</li>
                <li>Set <code>OLLAMA_HOST</code> and <code>OLLAMA_API_KEY</code> in a <code>.env</code> file (see <code>sadhguru_chat.py</code>).</li>
                <li>Ensure your Ollama server exposes the model you pass with <code>--model</code> (default in code may be <code>gpt-oss:20b</code> — adjust to what you host).</li>
                <li>Run <code>python sadhguru_chat.py --question "…"</code> or <code>--interactive</code>.</li>
              </ol>
              <p class="landing__note landing__note--on-dark">
                Tip: use <code>--opc</code> or <code>--sans</code> only when you want those experimental prompt modes.
              </p>
            </div>
          </section>

          <section class="landing__section landing__band--parallax landing__band landing__band--mist">
            <div class="landing__section-inner landing__reveal">
              <h2 class="landing__h2">Run this website locally</h2>
              <p class="landing__lead">From the repository root, the Makefile installs dependencies and starts the Vite dev server:</p>
              <pre class="code-block code-block--inline"><code>make start-web</code></pre>
              <p class="landing__lead">Equivalent:</p>
              <pre class="code-block code-block--inline"><code>cd sadhguru_chat_website_core
npm install
npm run dev</code></pre>
              <p class="landing__lead">
                Then open the printed URL (typically <code>http://localhost:5173/</code>). Use <strong>Home</strong> for WebLLM chat;
                first model load can take a while and uses significant disk in the browser cache.
              </p>
            </div>
          </section>

          <section class="landing__section" id="landing-requirements">
            <div class="landing__section-inner landing__reveal">
              <h2 class="landing__h2">What you need</h2>
              <div class="landing__table-wrap">
                <table class="landing__table">
                  <thead>
                    <tr>
                      <th scope="col">Piece</th>
                      <th scope="col">CLI path</th>
                      <th scope="col">Web path</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Runtime</td>
                      <td>Python 3, Ollama reachable at <code>OLLAMA_HOST</code></td>
                      <td>Modern Chromium with <strong>WebGPU</strong></td>
                    </tr>
                    <tr>
                      <td>Auth</td>
                      <td><code>OLLAMA_API_KEY</code> if your host requires it</td>
                      <td>None for this demo (models download from public MLC endpoints)</td>
                    </tr>
                    <tr>
                      <td>Build</td>
                      <td><code>pip install -r requirements.txt</code></td>
                      <td><code>npm install</code> inside <code>sadhguru_chat_website_core/</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section class="landing__closing landing__reveal">
            <p class="landing__closing-text">When you’re ready, switch to <strong>Home</strong> for the live WebLLM panel — or use the tabs above for focused docs.</p>
            <div class="landing__cta">
              <button type="button" class="btn btn--primary" data-nav="home">Go to Home</button>
              <button type="button" class="btn btn--ghost" data-nav="guide">The app</button>
            </div>
          </section>
        </div>
      </section>

      <section class="view" data-view="home" hidden>
        <div class="hero">
          <h1 class="hero__headline">Stillness you can speak with</h1>
          <p class="hero__lede">
            A calm, contemplative chat experience styled after Sadhguru’s voice — available as a Python CLI
            through Ollama, or privately in your browser with <strong>WebLLM</strong> (WebGPU).
          </p>
        </div>

        <div id="webgpu-banner" class="banner banner--warn" hidden>
          <strong>No WebGPU detected.</strong> WebLLM needs WebGPU (e.g. Chrome/Edge on desktop). You can still read the docs using the navigation above.
        </div>

        <section class="panel chat-panel" aria-labelledby="chat-heading">
          <div class="panel__head">
            <h2 id="chat-heading" class="panel__title">Chat with Sadhguru (WebLLM)</h2>
            <p class="panel__sub">Runs locally in your browser after the model downloads. No server, no API key.</p>
          </div>

          <div class="chat-controls">
            <label class="field">
              <span class="field__label">Model</span>
              <select id="model-select" class="field__input"></select>
            </label>
            <button type="button" id="load-engine" class="btn btn--primary">Load model</button>
          </div>
          <div class="load-line">
            <progress id="load-progress" max="100" value="0"></progress>
            <span id="load-progress-text" class="load-line__text"></span>
          </div>
          <p id="engine-status" class="status" data-kind="muted"></p>

          <div id="chat-messages" class="chat-messages" role="log" aria-live="polite"></div>

          <form id="chat-form" class="chat-form">
            <label class="visually-hidden" for="chat-input">Your message</label>
            <textarea id="chat-input" class="chat-input" rows="2" placeholder="What is calling you within?" disabled></textarea>
            <button type="submit" id="chat-send" class="btn btn--accent" disabled>Send</button>
          </form>
        </section>

        <div class="grid grid--3">
          <article class="card">
            <h3 class="card__title">Two front doors</h3>
            <p class="card__text">Use the <strong>CLI</strong> with your own Ollama host for full-strength models, or the <strong>web</strong> client here for private, in-browser inference.</p>
          </article>
          <article class="card">
            <h3 class="card__title">Same intention</h3>
            <p class="card__text">Both paths share a carefully written system prompt: reflective tone, experiential wisdom, and a gentle challenge to look inward.</p>
          </article>
          <article class="card">
            <h3 class="card__title">Yours to explore</h3>
            <p class="card__text">Optional CLI modes add playful “yogic code” or Sanskrit–Tamil blending. The web demo keeps the core voice for a fast, clear experience.</p>
          </article>
        </div>
      </section>

      <section class="view" data-view="guide" hidden>
        <h1 class="page-title">What this project is</h1>
        <div class="prose">
          <p>
            <strong>Sadhguru Chat</strong> is a small Python program that sends your questions to a large language model
            with a fixed <em>system prompt</em> so replies read like Sadhguru Jaggi Vasudev: poetic, grounded, and inward-pointing.
          </p>
          <p>
            The CLI uses <strong>Ollama</strong> (with <code>OLLAMA_HOST</code> and <code>OLLAMA_API_KEY</code> from your environment)
            so you can pick any model your server exposes — for example <code>gpt-oss:20b</code> as a default.
          </p>
          <p>
            This website is a <strong>single-page app</strong>: navigation swaps content without reloading the page.
            The chat card on Home uses <strong>WebLLM</strong> so inference happens in your tab via WebGPU, not on our servers.
          </p>
        </div>
      </section>

      <section class="view" data-view="cli" hidden>
        <h1 class="page-title">CLI &amp; Ollama</h1>
        <div class="prose">
          <p>Install Python dependencies (see the repo <code>requirements.txt</code>), set Ollama env vars, then:</p>
          <pre class="code-block"><code># One-shot question
python sadhguru_chat.py --question "What is inner engineering?"

# Interactive session
python sadhguru_chat.py --interactive

# Optional styles (CLI only)
python sadhguru_chat.py --interactive --opc
python sadhguru_chat.py --interactive --sans

# Choose a model id known to your Ollama server
python sadhguru_chat.py --question "Hello" --model llama3</code></pre>
          <p>
            <code>--opc</code> enables “Yogic Code” (playful compressed phrasing). <code>--sans</code> asks for a Sanskrit + Tamil blend with English gloss.
            These modes extend the base prompt defined in <code>sadhguru_chat.py</code>.
          </p>
        </div>
      </section>

      <section class="view" data-view="webgpu" hidden>
        <h1 class="page-title">Browser chat &amp; WebGPU</h1>
        <div class="prose">
          <p>
            WebLLM loads a quantized model into your browser. The first load can take time and disk space; later visits reuse the cache.
          </p>
          <p>
            A recent Chromium browser with <strong>WebGPU</strong> enabled is strongly recommended. Firefox and Safari support is evolving — if loading fails, use the CLI path instead.
          </p>
          <p>
            Security headers (<code>Cross-Origin-Opener-Policy</code> and <code>Cross-Origin-Embedder-Policy</code>) are set in the Vite dev server so WebLLM can use shared memory where needed.
          </p>
        </div>
      </section>
    </main>

    <footer class="foot">
      <p>Sadhguru Chat · Educational / exploratory interface</p>
    </footer>
  </div>`;
}
