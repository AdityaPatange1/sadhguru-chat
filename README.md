<p align="center">
  <img src="https://i.ibb.co/hRssZRmm/Screenshot-2026-04-15-at-8-56-55-AM.png" alt="Sadhguru Flow — landing page with hero, navigation, and theme controls" width="100%" />
</p>

<h1 align="center">Sadhguru Flow</h1>

<p align="center">
  <em>A quiet space for questions that matter.</em><br />
  Chat in the voice of contemplative wisdom — through a <strong>Python + Ollama CLI</strong> or a <strong>vanilla web app</strong> with <strong>WebLLM</strong> in your browser.
</p>

<p align="center">
  <a href="https://github.com/AdityaPatange1/sadhguru-flow">Repository</a>
  ·
  <a href="#usage">Usage</a>
  ·
  <a href="#license">License</a>
</p>

---

## Overview

**Sadhguru Flow** is a small project that wraps large-language-model calls in a fixed **system prompt** so replies read like **Sadhguru Jaggi Vasudev**: poetic, grounded, inward-looking, and never generic. You can run it as a **terminal client** against your own **Ollama** server, or explore the same intention in the **browser** using **[WebLLM](https://webllm.mlc.ai/)** (WebGPU) — no API keys for the local web demo, no page reloads for navigation.

| Path        | Best for                                                           |
| ----------- | ------------------------------------------------------------------ |
| **CLI**     | Full model choice via Ollama, scripting, `--opc` / `--sans` modes. |
| **Web SPA** | Private in-tab inference, themed UI, quick onboarding.             |

---

## Features

### Command-line interface

- **Ollama-backed** chat using `OLLAMA_HOST` and optional `OLLAMA_API_KEY`.
- **Single question** or **interactive** session with conversation history.
- **Rich** terminal output with Markdown rendering.
- **Optional modes** (extend the base prompt):
  - `--opc` — “Yogic code” / playful compressed phrasing.
  - `--sans` — Sanskrit + Tamil blend with English gloss.
- **`--model`** to target any model tag your server exposes.

### Web application (`sadhguru_chat_website_core/`)

- **Single Page App** — hash routing (`#/landing`, `#/home`, …), no full reloads.
- **Landing page** — scrollable intro: features, how to run CLI & web, requirements.
- **Home** — **WebLLM** chat panel (model download + WebGPU); quick-reference cards.
- **Docs tabs** — “The app”, CLI & Ollama, Browser / WebGPU.
- **17 color themes** + **light / dark** mode, driven by `src/themes.json` (persisted in `localStorage`).
- **HTML partials** in `src/pages/` assembled with a tiny `renderTemplate` helper (`{{ }}` / `{{{ }}}`).
- **Vite** dev server with **COOP/COEP** headers for WebLLM.
- Links to **[source on GitHub](https://github.com/AdityaPatange1/sadhguru-flow)** in the footer and throughout the copy.

---

## Tech stack

| Area | Stack                                                       |
| ---- | ----------------------------------------------------------- |
| CLI  | Python 3, `ollama`, `python-dotenv`, `rich`.                |
| Web  | Vanilla JS, Vite, `@mlc-ai/web-llm`, CSS custom properties. |

---

## Prerequisites

**CLI**

- Python 3 and `pip`.
- An [Ollama](https://ollama.com/) server you can reach (`OLLAMA_HOST`), with API key if required (`OLLAMA_API_KEY`).

**Web**

- **Node.js** (LTS recommended) and `npm`.
- A **Chromium-class** browser with **WebGPU** for WebLLM (e.g. recent Chrome or Edge on desktop).

---

## Usage

### 1. Clone the repository

```bash
git clone https://github.com/AdityaPatange1/sadhguru-flow.git
cd sadhguru-flow
```

### 2. Python CLI

Create a virtual environment, install dependencies, and configure the environment:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the project root (values depend on your Ollama setup):

```env
OLLAMA_HOST=https://your-ollama-host
OLLAMA_API_KEY=your-key-if-needed
```

**Examples**

```bash
# One-off question
python sadhguru_chat.py --question "What is inner engineering?"

# Interactive session
python sadhguru_chat.py --interactive

# Optional prompt styles
python sadhguru_chat.py --interactive --opc
python sadhguru_chat.py --interactive --sans

# Model name as known to your Ollama server
python sadhguru_chat.py --question "Hello" --model llama3
```

### 3. Web app (local)

From the **repository root**:

```bash
make start-web
```

This runs `npm install` and `npm run dev` inside `sadhguru_chat_website_core/`. Open the URL Vite prints (typically `http://localhost:5173/`).

**Equivalent manual steps**

```bash
cd sadhguru_chat_website_core
npm install
npm run dev
```

**Production build**

```bash
cd sadhguru_chat_website_core
npm run build
npm run preview   # optional local preview of dist/
```

**Theme JSON regeneration** (optional, for maintainers):

```bash
cd sadhguru_chat_website_core
npm run generate-themes
```

---

## Project structure

```
sadhguru-flow/
├── sadhguru_chat.py          # CLI entrypoint
├── requirements.txt
├── Makefile                  # make start-web → Vite dev server
├── LICENSE
├── README.md
└── sadhguru_chat_website_core/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── src/
    │   ├── main.js
    │   ├── app.js              # routing, WebLLM chat, parallax
    │   ├── template.js         # HTML assembly from pages/*.html
    │   ├── theme.js            # light/dark + themes from themes.json
    │   ├── styles.css
    │   ├── themes.json         # 17 themes × light/dark CSS variables
    │   └── pages/              # layout + route HTML partials
    └── scripts/
        └── generate-themes.mjs
```

---

## Configuration reference (CLI)

| Variable         | Role                                                       |
| ---------------- | ---------------------------------------------------------- |
| `OLLAMA_HOST`    | Ollama API base URL                                        |
| `OLLAMA_API_KEY` | Sent as `Authorization: Bearer …` if your host requires it |

Flags: `--question`, `--interactive`, `--opc`, `--sans`, `--model` (see `python sadhguru_chat.py --help`).

---

## Contributing

Contributions are welcome.

1. **Fork** the repository and create a **branch** for your change (`feature/…`, `fix/…`).
2. Keep **commits** focused and messages clear.
3. For **CLI** changes: ensure `sadhguru_chat.py` still runs with a typical Ollama setup.
4. For **web** changes: run `npm run build` in `sadhguru_chat_website_core/` before opening a PR.
5. Open a **Pull Request** with a short description of _what_ and _why_.

Please avoid unrelated refactors in the same PR as a bugfix or small feature.

---

## License

This project is released under the **CC0 1.0 Universal** license — see the [`LICENSE`](LICENSE) file. You can copy, modify, and distribute the work without asking permission; refer to CC0 for full terms and limitations (e.g. trademark rights are not waived).

---

## Disclaimer

This is an **educational / exploratory** interface. It is **not affiliated with** Isha Foundation or Sadhguru. The model does not speak for any real person; treat outputs as **creative / reflective** text, not spiritual, medical, or legal advice.

---

## Acknowledgements

- Inspired by **Sadhguru Jaggi Vasudev**’s public talks and writings, implemented for real-life usage.
- Browser inference powered by **[MLC / WebLLM](https://webllm.mlc.ai/)** and the open models distributed for in-browser use.
- Remote inference path uses **[Ollama](https://ollama.com/)**.

---

<p align="center">
  Built with loving-friendliness (metta)  · <a href="https://github.com/AdityaPatange1/sadhguru-flow">github.com/AdityaPatange1/sadhguru-flow</a> for our people and the world.
</p>
