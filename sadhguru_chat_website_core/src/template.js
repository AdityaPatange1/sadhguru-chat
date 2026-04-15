import layoutHtml from "./pages/layout.html?raw";
import landingHtml from "./pages/landing.html?raw";
import homeHtml from "./pages/home.html?raw";
import guideHtml from "./pages/guide.html?raw";
import cliHtml from "./pages/cli.html?raw";
import webgpuHtml from "./pages/webgpu.html?raw";

/**
 * Minimal HTML templating: `{{name}}` is HTML-escaped; `{{{name}}}` is raw (for partials).
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderTemplate(template, data) {
  let out = template;
  out = out.replace(/\{\{\{(\w+)\}\}\}/g, (_, key) =>
    data[key] !== undefined && data[key] !== null ? String(data[key]) : "",
  );
  out = out.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    data[key] !== undefined && data[key] !== null
      ? escapeHtml(String(data[key]))
      : "",
  );
  return out;
}

/** Assembles the SPA shell from `pages/*.html` and injects the main column. */
export function renderAppHtml() {
  const main = [landingHtml, homeHtml, guideHtml, cliHtml, webgpuHtml].join("\n");
  return renderTemplate(layoutHtml, { main });
}
