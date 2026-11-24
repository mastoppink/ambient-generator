import { LANDSCAPES, MOODS } from "./data.js?v=5";
import { ALL_FIELDS, SINGLE, optionsFor, getLandscape } from "./generator.js?v=5";

/* Keyword lexicon (English + Indonesian). Multi-word keywords are allowed. */
const LANDSCAPE_KW = {
  abyssal: ["ocean", "sea", "deep", "depth", "depths", "abyss", "abyssal", "underwater", "sunken", "submerged", "tide", "drowned", "trench", "laut", "samudra", "dalam", "kedalaman", "tenggelam", "bawah air"],
  desert: ["desert", "sand", "dune", "dunes", "dust", "arid", "wasteland", "mirage", "sahara", "gurun", "pasir", "debu", "fatamorgana"],
  frozen: ["ice", "icy", "frozen", "snow", "arctic", "polar", "glacier", "winter", "cold", "tundra", "frost", "es", "salju", "beku", "dingin", "musim dingin"],
  forest: ["forest", "woods", "wood", "mist", "misty", "fog", "foggy", "rain", "moss", "grove", "swamp", "marsh", "hutan", "kabut", "hujan", "lumut", "rawa"],
  alien: ["space", "cosmic", "cosmos", "planet", "star", "stars", "void", "galaxy", "nebula", "orbit", "alien", "lunar", "astral", "interstellar", "eclipse", "angkasa", "bintang", "kosmik", "galaksi", "planet asing"],
  urban: ["city", "urban", "concrete", "mall", "hallway", "corridor", "backrooms", "station", "metro", "subway", "pool", "poolrooms", "megablock", "kota", "lorong", "beton", "stasiun", "gedung"],
};
const MOOD_KW = {
  solitude: ["alone", "lonely", "loneliness", "solitude", "sleep", "meditation", "meditate", "calm", "peace", "rest", "silence", "silent", "quiet", "relax", "focus", "sepi", "sendiri", "kesepian", "tenang", "tidur", "hening", "sunyi"],
  kenopsia: ["abandoned", "forgotten", "ruins", "ruin", "lost", "ancient", "empire", "cathedral", "temple", "memory", "memories", "forsaken", "remnant", "terlupakan", "reruntuhan", "kuno", "kenangan", "ditinggalkan"],
  megalophobia: ["colossal", "giant", "titan", "titanic", "leviathan", "monolith", "immense", "enormous", "megastructure", "vast", "behemoth", "raksasa", "kolosal"],
  liminal: ["liminal", "backrooms", "hallway", "corridor", "endless", "poolrooms", "dream", "dreamcore", "threshold", "between", "lorong", "mimpi", "tanpa akhir"],
};
/* Extra sentences triggered by time / weather words. */
const EXTRAS = [
  { kw: ["night", "midnight", "nocturne", "malam", "tengah malam"], text: "It is deep night, and everything is lit only faintly" },
  { kw: ["dawn", "sunrise", "morning", "fajar", "subuh", "pagi"], text: "The faint first light of dawn barely touches the horizon" },
  { kw: ["dusk", "twilight", "sunset", "evening", "senja", "petang"], text: "The last fading light of dusk lingers on the horizon" },
  { kw: ["rain", "rainfall", "hujan"], text: "A fine, silent rain falls over the whole scene" },
  { kw: ["snow", "snowfall", "salju"], text: "Snow falls slowly and silently" },
  { kw: ["moon", "moonlight", "bulan"], text: "A pale, distant moon hangs low and dim in the sky" },
  { kw: ["eternal", "eternity", "forever", "abadi", "selamanya"], text: "The stillness feels eternal, untouched for thousands of years" },
];

export const normalize = (s) =>
  " " + s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim() + " ";

const has = (norm, kw) => norm.includes(` ${kw} `) || norm.includes(` ${kw}s `);
const score = (norm, kws) => kws.reduce((n, kw) => n + (has(norm, kw) ? 1 : 0), 0);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function best(map, norm, rand, fallback) {
  let top = [], max = 0;
  for (const [id, kws] of Object.entries(map)) {
    const s = score(norm, kws);
    if (s > max) { max = s; top = [id]; } else if (s === max && s > 0) top.push(id);
  }
  if (!top.length) return { id: fallback(rand), matched: false };
  return { id: top[Math.floor(rand() * top.length)], matched: true };
}

/** Option words that also appear in the title (ignoring short/common words). */
function optionScore(norm, opt) {
  return normalize(opt).trim().split(" ").filter((w) => w.length > 3 && has(norm, w)).length;
}

/**
 * Builds a generator state from an audio title.
 * Same title always gives the same result (seeded by the title).
 */
export function stateFromTitle(title, base) {
  const norm = normalize(title);
  const rand = rng(hash(norm));
  const land = best(LANDSCAPE_KW, norm, rand, (r) => LANDSCAPES[Math.floor(r() * LANDSCAPES.length)].id);
  const mood = best(MOOD_KW, norm, rand, () => "solitude");
  const l = getLandscape(land.id);

  const sel = {};
  for (const f of ALL_FIELDS) {
    const opts = optionsFor(l, f);
    const scored = opts.map((o, i) => [i, optionScore(norm, o)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
    if (SINGLE.has(f)) {
      sel[f] = [scored.length ? scored[0][0] : Math.floor(rand() * opts.length)];
    } else {
      const picked = scored.map(([i]) => i);
      if (!picked.length) picked.push(Math.floor(rand() * opts.length));
      if (picked.length < 2 && opts.length > 1 && rand() < 0.5) {
        const other = [...opts.keys()].find((i) => !picked.includes(i));
        if (other !== undefined) picked.push(other);
      }
      sel[f] = picked.slice(0, 2).sort();
    }
  }

  const extras = EXTRAS.filter((e) => e.kw.some((kw) => has(norm, kw))).map((e) => e.text);

  return {
    state: { ...base, landscape: l.id, mood: mood.id, sel, custom: {}, extra: extras.join(". ") },
    detected: { landscape: l.label, landscapeMatched: land.matched, mood: MOODS.find((m) => m.id === mood.id).label, moodMatched: mood.matched, extras: extras.length },
  };
}
