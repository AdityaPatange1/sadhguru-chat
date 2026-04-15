import themesConfig from "./themes.json";

const STORAGE_THEME = "sadhguru-flow-theme-id";
const STORAGE_MODE = "sadhguru-flow-color-mode";

/**
 * Apply palette from themes.json, wire navbar toggle + theme picker.
 */
export function initTheme(root) {
  const html = document.documentElement;
  const { themes, defaultTheme } = themesConfig;

  let themeId =
    localStorage.getItem(STORAGE_THEME) || defaultTheme || themes[0]?.id;
  let mode = localStorage.getItem(STORAGE_MODE);

  if (mode !== "light" && mode !== "dark") {
    mode = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  const modeToggle = root.querySelector("#theme-mode-toggle");
  const pickerToggle = root.querySelector("#theme-picker-toggle");
  const panel = root.querySelector("#theme-panel");
  const grid = root.querySelector("#theme-grid");

  function getThemeEntry() {
    return themes.find((t) => t.id === themeId) || themes[0];
  }

  function applyVars() {
    const entry = getThemeEntry();
    const vars = entry?.[mode];
    if (!vars || typeof vars !== "object") return;

    for (const [key, value] of Object.entries(vars)) {
      if (key.startsWith("--")) {
        html.style.setProperty(key, String(value));
      }
    }
    html.dataset.colorMode = mode;
    html.dataset.themeId = entry.id;

    localStorage.setItem(STORAGE_THEME, entry.id);
    localStorage.setItem(STORAGE_MODE, mode);

    if (modeToggle) {
      modeToggle.setAttribute(
        "aria-label",
        mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
      );
      modeToggle.textContent = mode === "dark" ? "☀" : "☾";
    }

    grid?.querySelectorAll("[data-theme-id]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.themeId === entry.id);
    });
  }

  if (grid) {
    grid.replaceChildren();
    themes.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-chip";
      btn.dataset.themeId = t.id;
      btn.textContent = t.name;
      btn.addEventListener("click", () => {
        themeId = t.id;
        applyVars();
        if (panel) panel.hidden = true;
        if (pickerToggle) pickerToggle.setAttribute("aria-expanded", "false");
      });
      grid.appendChild(btn);
    });
  }

  modeToggle?.addEventListener("click", () => {
    mode = mode === "light" ? "dark" : "light";
    applyVars();
  });

  pickerToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    pickerToggle.setAttribute("aria-expanded", String(!open));
  });

  document.addEventListener("click", (e) => {
    if (!panel || panel.hidden) return;
    if (panel.contains(e.target) || pickerToggle?.contains(e.target)) return;
    panel.hidden = true;
    pickerToggle?.setAttribute("aria-expanded", "false");
  });

  applyVars();
}
