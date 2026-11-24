import { TITLE_SPACE, DESERTED, STYLES, LANDSCAPES, MOODS, FRAMINGS, TWISTS, EMPTINESS } from "./data.js?v=14";

/** Per-landscape fields */
export const FIELDS = ["structure", "foreground", "decay", "atmosphere", "lighting"];
/** Global fields (same options for every landscape) */
export const GLOBAL = { framing: FRAMINGS.map((f) => f.label), twist: TWISTS.map((t) => t || "(tanpa kejutan)"), emptiness: EMPTINESS };
export const ALL_FIELDS = [...FIELDS, ...Object.keys(GLOBAL)];
export const SINGLE = new Set(["structure", "framing", "twist", "foreground"]);
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

/** First option everywhere, except framing and twist which are random so images don't repeat. */
export function defaultSelection() {
  const sel = Object.fromEntries(ALL_FIELDS.map((f) => [f, [0]]));
  sel.framing = [freshFraming()];
  sel.twist = [Math.floor(Math.random() * TWISTS.length)];
  return sel;
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
  const framing = state.custom?.framing?.trim() ? { text: state.custom.framing.trim() } : FRAMINGS[(state.sel.framing || [0])[0]] || FRAMINGS[0];
  const twist = state.custom?.twist?.trim() || TWISTS[(state.sel.twist || [0])[0]] || "";
  const palette = state.custom?.palette?.trim() || l.palette;
  const sentences = [
    m.camera.replace("{L}", landscape),
    `The main subject is a lone ${val("structure") || l.structure[0]}, an original, nameless structure of unique design that does not resemble any real or famous landmark.`,
    framing.text,
    twist && `An unexpected detail: ${twist}.`,
    framing.fg !== false && val("foreground") && `In the foreground, ${val("foreground")}, sparse, low and partly out of focus, giving the eye a quiet path into the scene without drawing attention.`,
    l.medium && `${l.medium}.`,
    val("decay") && `The structure is worn by time: ${val("decay")}.`,
    val("atmosphere") && `The air is filled with ${val("atmosphere")}.`,
    val("lighting") && `The only light is ${val("lighting")}.`,
    `A barely perceptible, cold glow in the haze behind the structure gently separates its silhouette, making it the focal point without looking like a spotlight.`,
    `The structure belongs naturally to the scene: the same haze softens it, its contrast and sharpness fade with distance like the rest of the environment, the same dim light falls on it, and the same dust or sediment covers it, so nothing looks pasted in.`,
    `The color palette is restrained: ${palette}.`,
    val("emptiness") && `The scene keeps a strong sense of ${val("emptiness")}, with generous empty space around the structure.`,
    m.feeling,
    DESERTED,
    (STYLES[state.style] || STYLES.photo).text,
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
    if (f === "framing") { sel[f] = [freshFraming()]; continue; }
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
  p.set("st", state.style);
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
  };
}
