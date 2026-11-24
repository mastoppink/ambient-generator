import { TEMPLATE, NEGATIVE, LANDSCAPES, MOODS } from "./data.js?v=2";

export const FIELDS = ["structure", "decay", "atmosphere", "lighting"];

export const getLandscape = (id) => LANDSCAPES.find((l) => l.id === id) || LANDSCAPES[0];
export const getMood = (id) => MOODS.find((m) => m.id === id) || MOODS[0];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const join = (arr, sep = ", ") => arr.filter(Boolean).join(sep);

/** Default selection: first option of each field. */
export function defaultSelection() {
  return Object.fromEntries(FIELDS.map((f) => [f, [0]]));
}

export function buildPositive(state) {
  const l = getLandscape(state.landscape);
  const m = getMood(state.mood);
  const val = (f) => {
    if (state.custom?.[f]?.trim()) return state.custom[f].trim();
    const idx = state.sel[f] || [];
    const items = idx.map((i) => l[f][i]).filter(Boolean);
    // Structure reads "a colossal X" → join alternatives with "and"
    return f === "structure" ? join(items, " and ") : join(items);
  };
  const map = {
    COMPOSITION: m.composition,
    STRUCTURE: val("structure") || l.structure[0],
    LANDSCAPE: state.custom?.landscape?.trim() || l.landscape,
    SCALE_MOOD: m.scaleMood,
    DECAY: val("decay"),
    ATMOSPHERE: val("atmosphere"),
    LIGHTING: val("lighting"),
    PALETTE: state.custom?.palette?.trim() || l.palette,
  };
  let out = TEMPLATE.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? "");
  // tidy empties
  out = out
    .replace(/surrounded by\s*,/g, ",")
    .replace(/illuminated by\s*,/g, ",")
    .replace(/\s*,\s*(,\s*)+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^,\s*/, "")
    .trim();
  if (state.extra?.trim()) out += ", " + state.extra.trim();
  return out;
}

export function buildOutput(state) {
  const positive = buildPositive(state);
  const negative = state.negative ? NEGATIVE : "";
  if (state.format === "midjourney") {
    let p = `${positive} --ar ${state.aspect}`;
    if (negative) p += ` --no ${negative}`;
    return { positive: p, negative: "" };
  }
  return { positive, negative };
}

export function randomState(base) {
  const l = pick(LANDSCAPES);
  const sel = {};
  for (const f of FIELDS) {
    const n = l[f].length;
    const idx = [...Array(n).keys()].filter(() => Math.random() < 0.5);
    sel[f] = idx.length ? idx : [Math.floor(Math.random() * n)];
  }
  sel.structure = [Math.floor(Math.random() * l.structure.length)];
  return { ...base, landscape: l.id, mood: pick(MOODS).id, sel, custom: {} };
}

/* URL share */
export function serialize(state) {
  const p = new URLSearchParams();
  p.set("l", state.landscape);
  p.set("m", state.mood);
  for (const f of FIELDS) p.set(f[0], (state.sel[f] || []).join("."));
  p.set("f", state.format);
  p.set("ar", state.aspect);
  p.set("n", state.negative ? "1" : "0");
  return p.toString();
}

export function parse(search, base) {
  const p = new URLSearchParams(search);
  if (!p.has("l")) return null;
  const l = getLandscape(p.get("l"));
  const sel = {};
  for (const f of FIELDS) {
    const raw = p.get(f[0]);
    const idx = raw ? raw.split(".").map(Number).filter((i) => i >= 0 && i < l[f].length) : [];
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
  };
}
