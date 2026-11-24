import { TEMPLATE, NEGATIVE, TITLE_SPACE, LANDSCAPES, MOODS, DISTANCES, EMPTINESS } from "./data.js?v=3";

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

export function buildPositive(state) {
  const l = getLandscape(state.landscape);
  const m = getMood(state.mood);
  const val = (f) => {
    if (state.custom?.[f]?.trim()) return state.custom[f].trim();
    const opts = optionsFor(l, f);
    const items = (state.sel[f] || []).map((i) => opts[i]).filter(Boolean);
    return f === "structure" ? join(items, " and ") : join(items);
  };
  const map = {
    COMPOSITION: m.composition,
    DISTANCE: val("distance"),
    STRUCTURE: val("structure") || l.structure[0],
    LANDSCAPE: state.custom?.landscape?.trim() || l.landscape,
    SCALE_MOOD: m.scaleMood,
    DECAY: val("decay"),
    ATMOSPHERE: val("atmosphere"),
    LIGHTING: val("lighting"),
    PALETTE: state.custom?.palette?.trim() || l.palette,
    EMPTINESS: val("emptiness"),
  };
  let out = TEMPLATE.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? "");
  out = out
    .replace(/(veiled by|under)\s*,/g, ",")
    .replace(/\s*,\s*(,\s*)+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^,\s*/, "")
    .trim();
  if (state.titleSpace) out += ", " + TITLE_SPACE;
  if (state.extra?.trim()) out += ", " + state.extra.trim();
  return out;
}

export function buildOutput(state) {
  const positive = buildPositive(state);
  const negative = state.negative ? NEGATIVE : "";
  if (state.format === "midjourney") {
    let p = `${positive} --ar ${state.aspect} --style raw --stylize 50`;
    if (negative) p += ` --no ${negative}`;
    return { positive: p, negative: "" };
  }
  if (state.format === "flux") {
    const sentence = `A ${state.aspect} image: ${positive}.`.replace(/: (\w)/, (_, c) => ": " + c.toUpperCase());
    return { positive: sentence, negative: "" };
  }
  return { positive, negative };
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
  p.set("f", state.format);
  p.set("ar", state.aspect);
  p.set("n", state.negative ? "1" : "0");
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
    format: p.get("f") || base.format,
    aspect: p.get("ar") || base.aspect,
    negative: p.get("n") !== "0",
    titleSpace: p.get("t") !== "0",
  };
}
