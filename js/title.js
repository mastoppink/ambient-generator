import { LANDSCAPES, MOODS } from "./data.js?v=9";
import { ALL_FIELDS, SINGLE, optionsFor, getLandscape } from "./generator.js?v=9";

/*
 * Title → prompt rules (English + Indonesian).
 * Each rule: kw (keywords, multi-word allowed), land / mood (score weights),
 * tone (+1 bright, -1 dark), text (sentence added to the prompt), group (for the summary).
 * Rules earlier in the list win when the sentence limit is reached.
 */
const R = (group, kw, opt = {}) => ({ group, kw, ...opt });

const RULES = [
  /* ---------- 3. Space imagery → sky (dark imagery picks the alien landscape) ---------- */
  R("langit", ["deep space", "luar angkasa", "the void", "void", "ruang hampa", "dark matter"], { land: { alien: 3 }, tone: -1, text: "Above lies the black, silent void of deep space" }),
  R("langit", ["event horizon"], { land: { alien: 3 }, mood: { megalophobia: 2 }, tone: -1, text: "Near the horizon, a vast dark sphere bends the faint light around it" }),
  R("langit", ["far side of the moon", "sisi jauh bulan"], { land: { alien: 3 }, tone: -1, text: "The ground is grey, cratered lunar dust beneath a black sky" }),
  R("langit", ["night sky", "langit malam"], { tone: -1, text: "Above is a deep, nearly black night sky" }),
  R("langit", ["northern lights", "aurora"], { land: { frozen: 1 }, tone: 1, text: "A pale, slow aurora drifts low across the sky" }),
  R("langit", ["nebula"], { tone: 1, text: "A faint, desaturated nebula glows softly across the empty sky" }),
  R("langit", ["starlight", "cahaya bintang"], { tone: 1, text: "Faint starlight falls softly over the scene" }),
  R("langit", ["stardust", "debu bintang"], { tone: 1, text: "Fine stardust seems to hang motionless in the air" }),
  R("langit", ["starfield", "deep field", "medan dalam"], { text: "A vast, quiet field of countless faint stars stretches across the sky" }),
  R("langit", ["celestial sea", "samudra langit"], { text: "The sky above resembles a calm, endless celestial sea" }),
  R("langit", ["stellar drift"], { text: "The stars appear to drift almost imperceptibly across the sky" }),
  R("langit", ["moon orbit", "slow orbit", "orbit lambat", "orbit"], { land: { alien: 1 }, text: "A distant moon hangs in slow orbit low above the horizon" }),
  R("langit", ["galaxy", "galaksi", "cosmos", "kosmos", "cosmic"], { land: { alien: 1 }, text: "The faint band of a distant galaxy arcs across the sky" }),

  /* ---------- Landscapes ---------- */
  R("landscape", ["ocean", "sea", "abyss", "abyssal", "underwater", "sunken", "submerged", "tide", "drowned", "trench", "laut", "samudra", "kedalaman", "tenggelam", "bawah air"], { land: { abyssal: 2 } }),
  R("landscape", ["desert", "sand", "dune", "dust", "arid", "wasteland", "mirage", "gurun", "pasir", "debu", "fatamorgana"], { land: { desert: 2 } }),
  R("landscape", ["ice", "icy", "frozen", "snow", "arctic", "polar", "glacier", "winter", "cold", "tundra", "frost", "es", "salju", "beku", "dingin"], { land: { frozen: 2 } }),
  R("landscape", ["forest", "woods", "mist", "misty", "fog", "foggy", "moss", "grove", "swamp", "marsh", "hutan", "kabut", "lumut", "rawa"], { land: { forest: 2 } }),
  R("landscape", ["space", "planet", "star", "alien", "lunar", "astral", "interstellar", "eclipse", "angkasa", "bintang", "planet asing"], { land: { alien: 2 } }),
  R("landscape", ["city", "urban", "concrete", "mall", "hallway", "corridor", "backrooms", "station", "metro", "subway", "poolrooms", "megablock", "kota", "lorong", "beton", "stasiun", "gedung"], { land: { urban: 2 } }),

  /* ---------- 1. Modes → mood + brightness ---------- */
  R("suasana", ["weightless", "floating", "luminous", "boundless", "melayang", "luas", "bercahaya"], { mood: { solitude: 1 }, tone: 1, text: "Everything feels weightless and boundless, as if gently floating" }),
  R("suasana", ["gentle", "serene", "tender", "peaceful", "lembut", "tenang", "damai"], { mood: { solitude: 1 }, text: "The atmosphere is serene and gentle" }),
  R("suasana", ["easygoing", "hopeful", "airy", "light", "ringan", "santai", "lapang"], { mood: { solitude: 1 }, tone: 1, text: "The air feels open, light and quietly hopeful" }),
  R("suasana", ["wistful", "warm", "drifting", "reflective", "sendu", "hangat", "syahdu"], { mood: { kenopsia: 1 }, text: "A faint warm tint lingers in the cold palette, wistful and reflective" }),
  R("suasana", ["dark", "calm", "melancholic", "melancholy", "quiet", "gelap", "hening", "muram"], { mood: { solitude: 1 }, tone: -1, text: "The mood is melancholic, dark and quiet" }),
  R("suasana", ["mysterious", "distant", "shadowed", "enigmatic", "misterius", "jauh", "remang"], { mood: { megalophobia: 1 }, tone: -1, text: "Something mysterious and enigmatic waits in the shadowed distance" }),

  /* ---------- Classic mood words ---------- */
  R("suasana", ["alone", "lonely", "loneliness", "solitude", "silence", "silent", "sepi", "sendiri", "kesepian", "sunyi"], { mood: { solitude: 2 } }),
  R("suasana", ["abandoned", "forgotten", "ruins", "ruin", "lost", "ancient", "empire", "cathedral", "temple", "memory", "memories", "forsaken", "remnant", "terlupakan", "reruntuhan", "kuno", "kenangan", "ditinggalkan"], { mood: { kenopsia: 2 } }),
  R("suasana", ["colossal", "giant", "titan", "titanic", "leviathan", "monolith", "immense", "enormous", "megastructure", "vast", "behemoth", "raksasa", "kolosal"], { mood: { megalophobia: 2 } }),
  R("suasana", ["liminal", "backrooms", "hallway", "corridor", "endless", "poolrooms", "dream", "dreamcore", "threshold", "lorong", "mimpi", "tanpa akhir"], { mood: { liminal: 2 } }),

  /* ---------- 2. Brightness adjectives ---------- */
  R("cahaya", ["shimmering", "glowing", "radiant", "berkilau", "berpendar"], { tone: 1 }),
  R("cahaya", ["deep", "dim", "velvet", "redup", "pekat"], { tone: -1 }),

  /* ---------- 7. Chapter names ---------- */
  R("babak", ["afterglow", "cahaya sisa"], { tone: 1, text: "The faint afterglow of a vanished light lingers on the horizon" }),
  R("babak", ["nightfall", "senja"], { tone: -1, text: "Night is falling, and the last light fades from the sky" }),
  R("babak", ["arrival", "tiba"], { text: "It feels like arriving at the edge of this place for the very first time" }),
  R("babak", ["return", "kembali"], { mood: { kenopsia: 1 }, text: "It feels like a place returned to after a very long time" }),
  R("babak", ["drift", "hanyut"], { text: "Thin layers of mist drift very slowly across the land" }),
  R("babak", ["glow"], { tone: 1 }),
  R("babak", ["stillness"], { mood: { solitude: 1 }, text: "Everything rests in complete stillness" }),
  R("babak", ["horizon", "cakrawala"], { text: "A single endless horizon line divides land and sky" }),

  /* ---------- Time / weather ---------- */
  R("waktu", ["night", "midnight", "nocturne", "malam", "tengah malam"], { tone: -1, text: "It is deep night, and everything is lit only faintly" }),
  R("waktu", ["dawn", "sunrise", "morning", "fajar", "subuh", "pagi"], { tone: 1, text: "The faint first light of dawn barely touches the horizon" }),
  R("waktu", ["dusk", "twilight", "sunset", "evening", "evenings", "petang"], { text: "The last fading light of dusk lingers on the horizon" }),
  R("waktu", ["rain", "rainfall", "hujan"], { text: "A fine, silent rain falls over the whole scene" }),
  R("waktu", ["snowfall"], { text: "Snow falls slowly and silently" }),
  R("waktu", ["moon", "moonlight", "bulan"], { text: "A pale, distant moon hangs low and dim in the sky" }),
  R("waktu", ["eternal", "eternity", "forever", "abadi", "selamanya"], { text: "The stillness feels eternal, untouched for thousands of years" }),

  /* ---------- 4. Melody → visual texture ---------- */
  R("melodi", ["glass bells", "lonceng kaca", "denting lonceng kaca"], { text: "Tiny points of light glint here and there, like distant glass" }),
  R("melodi", ["kalimba"], { text: "Small scattered droplets of light dot the scene gently" }),
  R("melodi", ["soft piano", "piano lembut", "piano"], { text: "The scene has a soft, intimate stillness, like a quiet piano note fading away" }),
  R("melodi", ["soft tones", "nada lembut"], { text: "All forms are softened, with gentle tonal gradients" }),
  R("melodi", ["pure drones", "pure drone", "dengung murni", "drone", "drones"], { text: "The fog and light are unbroken and continuous, without any distinct accents" }),

  /* ---------- 5. Purpose ---------- */
  R("tujuan", ["deep sleep", "restful sleep", "falling asleep", "sleep", "tidur nyenyak", "pengantar tidur", "tidur"], { mood: { solitude: 2 }, tone: -1, text: "The image is very calm and dark enough to rest the eyes" }),
  R("tujuan", ["deep focus", "focus", "concentration", "fokus", "konsentrasi"], { mood: { liminal: 1 }, text: "The composition is orderly and balanced, with nothing to distract the eye" }),
  R("tujuan", ["studying", "study", "reading", "work and study", "belajar", "membaca"], { mood: { kenopsia: 1 }, text: "The composition is calm and steady, with nothing to distract the eye" }),
  R("tujuan", ["relaxation", "relax", "unwinding", "calm evenings", "bersantai", "relaksasi"], { mood: { solitude: 1 }, text: "The overall feeling is softly relaxing" }),
  R("tujuan", ["meditation", "mindfulness", "quiet reflection", "meditasi", "perenungan"], { mood: { solitude: 2 }, text: "A still reflection mirrors the scene in calm water or polished ground" }),

  /* ---------- 6. Song shape ---------- */
  R("bentuk", ["gently rising and falling", "naik turun dengan lembut"], { text: "Layers of mist rise and fall gently across the land" }),
  R("bentuk", ["slowly unfolding", "tumbuh perlahan"], { text: "Light slowly unfolds from the horizon" }),
  R("bentuk", ["settling into stillness", "menenang di tengah"], { text: "The middle of the frame settles into perfect stillness" }),
  R("bentuk", ["steady and still", "datar dan tenang"], { text: "Everything is steady and perfectly still" }),
  R("bentuk", ["drifting through changing scenes", "berpindah dari suasana ke suasana"], { text: "Receding layers of terrain suggest a long, slow journey into the distance" }),
];

/* 9. Words that must never influence the result. */
const BANNED = ["432", "528", "hz", "binaural", "healing", "heal", "delta wave", "delta", "theta", "solfeggio", "no ads", "tanpa iklan", "cure", "menyembuhkan", "miracle", "dna"];

const TONE_TEXT = {
  bright: "The light is soft and gently luminous, like a faint glow behind thin mist, yet still low in contrast",
  dark: "Everything is dim and deep, sinking into soft velvety shadows",
};
const MAX_SENTENCES = 4;

export const normalize = (s) =>
  " " + s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim() + " ";

const has = (norm, kw) => norm.includes(` ${kw} `) || norm.includes(` ${kw}s `);
const strip = (norm, kw) => norm.split(` ${kw} `).join(" ").split(` ${kw}s `).join(" ");

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

/** Matches rules; longer (multi-word) keywords are consumed first so "deep space" doesn't also count as "deep". */
function matchRules(norm) {
  const all = RULES.flatMap((rule, i) => rule.kw.map((kw) => ({ kw, i })))
    .sort((a, b) => b.kw.split(" ").length - a.kw.split(" ").length || b.kw.length - a.kw.length);
  const hit = new Set();
  for (const { kw, i } of all) {
    if (has(norm, kw)) { hit.add(i); norm = strip(norm, kw); }
  }
  return [...hit].sort((a, b) => a - b).map((i) => RULES[i]);
}

function pickBest(scores, rand) {
  const max = Math.max(0, ...Object.values(scores));
  if (!max) return null;
  const top = Object.keys(scores).filter((k) => scores[k] === max);
  return top[Math.floor(rand() * top.length)];
}

/** Option words that also appear in the title (ignoring short words). */
function optionScore(norm, opt) {
  return normalize(opt).trim().split(" ").filter((w) => w.length > 3 && has(norm, w)).length;
}

/**
 * Builds a generator state from an audio title.
 * Same title always gives the same result (seeded by the title).
 */
export function stateFromTitle(title, base) {
  let norm = normalize(title);
  for (const b of BANNED) norm = strip(norm, b);
  norm = norm.replace(/ (ii|iii|iv|v|vi|\d+)(?= )/g, " ");
  const rand = rng(hash(norm));

  const rules = matchRules(norm);
  const land = {}, mood = {};
  let tone = 0;
  for (const r of rules) {
    for (const [k, w] of Object.entries(r.land || {})) land[k] = (land[k] || 0) + w;
    for (const [k, w] of Object.entries(r.mood || {})) mood[k] = (mood[k] || 0) + w;
    tone += r.tone || 0;
  }
  const landId = pickBest(land, rand);
  const moodId = pickBest(mood, rand);
  const l = getLandscape(landId || LANDSCAPES[Math.floor(rand() * LANDSCAPES.length)].id);
  const m = MOODS.find((x) => x.id === (moodId || "solitude"));

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

  const texts = [...new Set(rules.map((r) => r.text).filter(Boolean))].slice(0, MAX_SENTENCES);
  const toneKey = tone >= 2 ? "bright" : tone <= -2 ? "dark" : null;
  if (toneKey) texts.push(TONE_TEXT[toneKey]);

  return {
    state: { ...base, landscape: l.id, mood: m.id, sel, custom: {}, extra: texts.join(". ") },
    detected: {
      landscape: l.label, landscapeMatched: !!landId,
      mood: m.label, moodMatched: !!moodId,
      tone: toneKey === "bright" ? "terang" : toneKey === "dark" ? "gelap" : "netral",
      groups: [...new Set(rules.map((r) => r.group))],
      extras: texts.length,
    },
  };
}
