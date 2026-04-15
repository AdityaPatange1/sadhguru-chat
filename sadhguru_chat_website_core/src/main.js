import "./styles.css";
import { mountApp } from "./app.js";

const root = document.getElementById("app");
void mountApp(root).catch((err) => {
  console.error(err);
  root.innerHTML = `<p class="boot-err">Could not load the app. Try a modern browser with module support.</p>`;
});
