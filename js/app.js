import { LANDSCAPES, MOODS, FORMATS, ASPECTS } from "./data.js";
import {
  FIELDS, getLandscape, defaultSelection, buildOutput, randomState, serialize, parse,
} from "./generator.js";

const $ = (s) => document.querySelector(s);
const FIELD_LABELS = {
  structure: "Structure", decay: "Decay & Texture", atmosphere: "Atmosphere & Haze", lighting: "Lighting",
};
const HISTORY_KEY = "dap-history";

const base = {
  landscape: LANDSCAPES[0].id, mood: MOODS[0].id, sel: defaultSelection(),
  format: "plain", aspect: "21:9", negative: true, custom: {}, extra: "",
};
let state = parse(location.search, base) || { ...base };

function safeGet(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
function safeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

/* ---------- renderers ---------- */
function renderLandscapes() {
  $("#landscapes").innerHTML = LANDSCAPES.map((l) => `
    <button type="button" class="card ${l.id === state.landscape ? "active" : ""}" data-id="${l.id}"
      style="--c1:${l.swatch[0]};--c2:${l.swatch[1]};--c3:${l.swatch[2]}" aria-pressed="${l.id === state.landscape}">
      <span class="card-swatch"></span><span class="card-label">${l.label}</span>
    </button>`).join("");
}

function renderMoods() {
  $("#moods").innerHTML = MOODS.map((m) => `
    <button type="button" class="mood ${m.id === state.mood ? "active" : ""}" data-id="${m.id}" aria-pressed="${m.id === state.mood}">
      <strong>${m.label}</strong><small>${m.desc}</small>
    </button>`).join("");
}

function renderFields() {
  const l = getLandscape(state.landscape);
  $("#fields").innerHTML = FIELDS.map((f) => {
    const single = f === "structure";
    const chips = l[f].map((opt, i) => {
      const on = (state.sel[f] || []).includes(i);
      return `<button type="button" class="chip ${on ? "active" : ""}" data-field="${f}" data-i="${i}" aria-pressed="${on}">${opt}</button>`;
    }).join("");
    return `<div class="field">
      <div class="field-head"><span>${FIELD_LABELS[f]}</span><small>${single ? "pilih satu" : "boleh lebih dari satu"}</small></div>
      <div class="chips">${chips}</div>
      <input class="custom" data-custom="${f}" placeholder="Custom ${FIELD_LABELS[f].toLowerCase()} (opsional, menimpa pilihan)" value="${esc(state.custom[f] || "")}">
    </div>`;
  }).join("") + `
    <div class="field"><div class="field-head"><span>Landscape</span></div>
      <input class="custom" data-custom="landscape" placeholder="${esc(l.landscape)}" value="${esc(state.custom.landscape || "")}"></div>
    <div class="field"><div class="field-head"><span>Color Palette</span></div>
      <input class="custom" data-custom="palette" placeholder="${esc(l.palette)}" value="${esc(state.custom.palette || "")}"></div>`;
}

function renderOptions() {
  $("#format").innerHTML = FORMATS.map((f) => `<option value="${f.id}" ${f.id === state.format ? "selected" : ""}>${f.label}</option>`).join("");
  $("#aspect").innerHTML = ASPECTS.map((a) => `<option ${a === state.aspect ? "selected" : ""}>${a}</option>`).join("");
  $("#aspect-wrap").hidden = state.format !== "midjourney";
  $("#negative").checked = state.negative;
  $("#extra").value = state.extra;
}

function renderOutput() {
  const { positive, negative } = buildOutput(state);
  $("#out-positive").value = positive;
  $("#out-negative").value = negative;
  $("#neg-block").hidden = !negative;
  $("#char-count").textContent = `${positive.length} karakter`;
  history.replaceState(null, "", "?" + serialize(state));
}

function renderHistory() {
  const items = safeGet(HISTORY_KEY, []);
  $("#history").innerHTML = items.length
    ? items.map((h, i) => `<li><button type="button" class="hist" data-i="${i}" title="Salin">${esc(h)}</button></li>`).join("")
    : `<li class="empty">Belum ada. Prompt yang disalin akan muncul di sini.</li>`;
}

function renderAll() { renderLandscapes(); renderMoods(); renderFields(); renderOptions(); renderOutput(); }

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

/* ---------- actions ---------- */
async function copy(text, btn) {
  if (!text) return;
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove();
  }
  const old = btn.textContent; btn.textContent = "Tersalin ✓"; setTimeout(() => (btn.textContent = old), 1400);
}

function pushHistory(text) {
  const items = safeGet(HISTORY_KEY, []).filter((h) => h !== text);
  items.unshift(text); safeSet(HISTORY_KEY, items.slice(0, 15)); renderHistory();
}

/* ---------- events ---------- */
$("#landscapes").addEventListener("click", (e) => {
  const b = e.target.closest(".card"); if (!b) return;
  state.landscape = b.dataset.id; state.sel = defaultSelection(); state.custom = {};
  renderLandscapes(); renderFields(); renderOutput();
});
$("#moods").addEventListener("click", (e) => {
  const b = e.target.closest(".mood"); if (!b) return;
  state.mood = b.dataset.id; renderMoods(); renderOutput();
});
$("#fields").addEventListener("click", (e) => {
  const b = e.target.closest(".chip"); if (!b) return;
  const f = b.dataset.field, i = +b.dataset.i;
  let cur = state.sel[f] || [];
  if (f === "structure") cur = [i];
  else if (cur.includes(i)) { if (cur.length > 1) cur = cur.filter((x) => x !== i); }
  else cur = [...cur, i].sort();
  state.sel[f] = cur; renderFields(); renderOutput();
});
$("#fields").addEventListener("input", (e) => {
  const k = e.target.dataset.custom; if (!k) return;
  state.custom[k] = e.target.value; renderOutput();
});
$("#format").addEventListener("change", (e) => { state.format = e.target.value; renderOptions(); renderOutput(); });
$("#aspect").addEventListener("change", (e) => { state.aspect = e.target.value; renderOutput(); });
$("#negative").addEventListener("change", (e) => { state.negative = e.target.checked; renderOutput(); });
$("#extra").addEventListener("input", (e) => { state.extra = e.target.value; renderOutput(); });
$("#randomize").addEventListener("click", () => { state = randomState(state); renderAll(); });
$("#reset").addEventListener("click", () => { state = { ...base, sel: defaultSelection(), custom: {} }; renderAll(); });
$("#copy-positive").addEventListener("click", (e) => { const t = $("#out-positive").value; copy(t, e.target); pushHistory(t); });
$("#copy-negative").addEventListener("click", (e) => copy($("#out-negative").value, e.target));
$("#copy-link").addEventListener("click", (e) => copy(location.href, e.target));
$("#history").addEventListener("click", (e) => {
  const b = e.target.closest(".hist"); if (b) copy(b.textContent, b);
});
$("#clear-history").addEventListener("click", () => { safeSet(HISTORY_KEY, []); renderHistory(); });

renderAll(); renderHistory();
