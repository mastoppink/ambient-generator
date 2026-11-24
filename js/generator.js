import { TITLE_SPACE, DESERTED, STYLE, LANDSCAPES, MOODS, DISTANCES, EMPTINESS } from "./data.js?v=6";

/** Per-landscape fields */
export const FIELDS = ["structure", "decay", "atmosphere", "lighting"];
/** Global fields (same options for every landscape) */
export const GLOBAL = { distance: DISTANCES, emptiness: EMPTINESS };
export const ALL_FIELDS = [...FIELDS, ...Object.keys(GLOBAL)];
export const SINGLE = new Set(["structure", "distance"]);
const KEYS = { structure: "s", decay: "d", atmosphere: "a", lighting: "g", distance: "x", emptiness: "e" };

export const getLandscape = (id) => LANDSCAPES.find((l) => l.id === id) || LANDSCAPES[0];
export const getMood = (id) => MOODS.find((m) => m.id === id) || MOODS[0];
export const optionsFor = (l, f) => GLOBAL[f] || l[f];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const join = (arr, sep = ", ") => arr.filter(Boolean).join(sep);

export function defaultSelection() {
  return Object.fromEntries(ALL_FIELDS.map((f) => [f, [0]]));
}

const ASPECT_TEXT = {
  "16:9": "a wide 16:9 landscape format", "21:9": "an ultra-wide 21:9 cinematic format",
  "9:16": "a tall 9:16 vertical format", "1:1": "a square 1:1 format",
  "3:2": "a 3:2 landscape format", "2:3": "a 2:3 portrait format",
};
const listJoin = (a) => a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Builds a narrative prompt for Nano Banana (Gemini image). */
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
  const sentences = [
    m.camera.replace("{L}", landscape),
    `Far in the distance stands a lone ${val("structure") || l.structure[0]}, ${val("distance")}.`,
    val("decay") && `It is worn by time: ${val("decay")}.`,
    val("atmosphere") && `The air is filled with ${val("atmosphere")}.`,
    val("lighting") && `The only light is ${val("lighting")}.`,
    `The color palette is restrained: ${palette}.`,
    val("emptiness") && `The composition is dominated by ${val("emptiness")}, with empty space filling most of the frame.`,
    m.feeling,
    DESERTED,
    STYLE,
    state.titleSpace && TITLE_SPACE,
    state.extra?.trim() && cap(state.extra.trim().replace(/\.?$/, ".")),
    `Use ${ASPECT_TEXT[state.aspect] || state.aspect}.`,
  ];
  return sentences.filter(Boolean).join(" ").replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim();
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
    if (SINGLE.has(f)) { sel[f] = [Math.floor(Math.random() * n)]; continue; }
    const shuffled = [...Array(n).keys()].sort(() => Math.random() - 0.5);
    const max = f === "emptiness" ? 2 : n;
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
  };
}
