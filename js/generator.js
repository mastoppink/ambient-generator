import { TITLE_SPACE, DESERTED, STYLES, ORIGINAL, INTEGRATE, GLOW, LANDSCAPES, MOODS, FRAMINGS, TWISTS, EMPTINESS } from "./data.js?v=17";

/** Per-landscape fields */
export const FIELDS = ["structure", "foreground", "decay", "atmosphere", "lighting"];
/** Global fields (same options for every landscape) */
export const GLOBAL = { framing: FRAMINGS.map((f) => f.label), twist: TWISTS.map((t) => t || "(tanpa kejutan)"), emptiness: EMPTINESS };
export const ALL_FIELDS = [...FIELDS, ...Object.keys(GLOBAL)];
export const SINGLE = new Set(["structure", "framing", "twist", "foreground", "lighting"]);
const KEYS = { structure: "s", foreground: "o", decay: "d", atmosphere: "a", lighting: "g", framing: "c", twist: "w", emptiness: "e" };

export const getLandscape = (id) => LANDSCAPES.find((l) => l.id === id) || LANDSCAPES[0];
export const getMood = (id) => MOODS.find((m) => m.id === id) || MOODS[0];
export const optionsFor = (l, f) => GLOBAL[f] || l[f];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const join = (arr, sep = ", ") => arr.filter(Boolean).join(sep);

/* Recently used framings are skipped so consecutive images don't share a composition. */
const recentFramings = [];
function freshFraming() {
  const pool = [...FRAMINGS.keys()].filter((i) => !recentFramings.includes(i));
  const pick = pool[Math.floor(Math.random() * pool.length)];
  recentFramings.push(pick);
  if (recentFramings.length > 4) recentFramings.shift();
  return pick;
}

/** Variety by default: random structure, foreground, lighting, framing and twist; first option elsewhere. */
export function defaultSelection(landscape = LANDSCAPES[0]) {
  const sel = Object.fromEntries(ALL_FIELDS.map((f) => [f, [0]]));
  for (const f of ["structure", "foreground", "lighting", "twist", "emptiness"]) {
    sel[f] = [Math.floor(Math.random() * optionsFor(landscape, f).length)];
  }
  sel.framing = [freshFraming()];
  return sel;
}

const ASPECT_TEXT = {
  "16:9": "16:9 landscape format", "21:9": "21:9 ultra-wide format",
  "9:16": "9:16 vertical format", "1:1": "1:1 square format",
  "3:2": "3:2 landscape format", "2:3": "2:3 portrait format",
};
const listJoin = (a) => a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Builds a compact narrative prompt for Nano Banana (Gemini image). */
export function buildPrompt(state) {
  const l = getLandscape(state.landscape);
  const m = getMood(state.mood);
  const val = (f) => {
    if (state.custom?.[f]?.trim()) return state.custom[f].trim();
    const opts = optionsFor(l, f);
    const items = (state.sel[f] || []).map((i) => opts[i]).filter(Boolean);
    return listJoin(items);
  };
  const landscape = state.custom?.landscape?.trim() || l.landscape;
  const palette = state.custom?.palette?.trim() || l.palette;
  const framing = state.custom?.framing?.trim() ? { text: state.custom.framing.trim() } : FRAMINGS[(state.sel.framing || [0])[0]] || FRAMINGS[0];
  const twist = state.custom?.twist?.trim() || TWISTS[(state.sel.twist || [0])[0]] || "";
  const decay = val("decay"), atmosphere = val("atmosphere"), lighting = val("lighting");
  const sentences = [
    m.camera.replace("{L}", landscape),
    `Subject: a lone ${val("structure") || l.structure[0]}, ${ORIGINAL}${decay ? `, ${decay}` : ""}.`,
    twist && `Unexpected detail: ${twist}.`,
    `Composition: ${framing.text}`,
    framing.fg !== false && val("foreground") && `Foreground: ${val("foreground")}, sparse and understated.`,
    l.medium && `${l.medium}.`,
    [atmosphere && `Air: ${atmosphere}`, lighting && `light: ${lighting}`].filter(Boolean).join("; ") + ".",
    GLOW,
    INTEGRATE,
    `Palette: ${palette}.`,
    val("emptiness") && `Generous empty space, ${val("emptiness")}.`,
    m.feeling,
    DESERTED,
    (STYLES[state.style] || STYLES.photo).text,
    state.titleSpace && TITLE_SPACE,
    state.extra?.trim() && cap(state.extra.trim().replace(/\.?$/, ".")),
    `${cap(ASPECT_TEXT[state.aspect] || state.aspect)}.`,
  ];
  return sentences.filter((s) => s && s !== ".").join(" ").replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim();
}

function weightedMood() {
  const total = MOODS.reduce((s, m) => s + (m.weight || 1), 0);
  let r = Math.random() * total;
  for (const m of MOODS) if ((r -= m.weight || 1) < 0) return m;
  return MOODS[0];
}

export function randomState(base) {
  const l = pick(LANDSCAPES);
  const sel = {};
  for (const f of ALL_FIELDS) {
    const n = optionsFor(l, f).length;
    if (f === "framing") { sel[f] = [freshFraming()]; continue; }
    if (SINGLE.has(f)) { sel[f] = [Math.floor(Math.random() * n)]; continue; }
    const shuffled = [...Array(n).keys()].sort(() => Math.random() - 0.5);
    const max = Math.min(2, n);
    sel[f] = shuffled.slice(0, 1 + Math.floor(Math.random() * max)).sort();
  }
  return { ...base, landscape: l.id, mood: weightedMood().id, sel, custom: {} };
}

/* URL share */
export function serialize(state) {
  const p = new URLSearchParams();
  p.set("l", state.landscape);
  p.set("m", state.mood);
  for (const f of ALL_FIELDS) p.set(KEYS[f], (state.sel[f] || []).join("."));
  p.set("ar", state.aspect);
  p.set("t", state.titleSpace ? "1" : "0");
  p.set("st", state.style);
  if (state.extra?.trim()) p.set("x", state.extra.trim());
  return p.toString();
}

export function parse(search, base) {
  const p = new URLSearchParams(search);
  if (!p.has("l")) return null;
  const l = getLandscape(p.get("l"));
  const sel = {};
  for (const f of ALL_FIELDS) {
    const n = optionsFor(l, f).length;
    const raw = p.get(KEYS[f]);
    const idx = raw ? raw.split(".").map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < n) : [];
    sel[f] = idx.length ? idx : [0];
  }
  return {
    ...base,
    landscape: l.id,
    mood: getMood(p.get("m")).id,
    sel,
    aspect: p.get("ar") || base.aspect,
    titleSpace: p.get("t") !== "0",
    style: p.get("st") === "matte" ? "matte" : "photo",
    extra: p.get("x") || "",
  };
}
