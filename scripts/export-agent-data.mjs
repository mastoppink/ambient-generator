// Exports every generator option to agent/options.json so AI agents can read them without running the app.
// Run: node scripts/export-agent-data.mjs   (also run by the GitHub Pages workflow)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const d = await import(pathToFileURL(path.join(root, "js", "data.js")).href);
const grade = fs.readFileSync(path.join(root, "video", "web", "grade.js"), "utf8");
const presets = [...grade.matchAll(/^\s+(\w+):\s+\{ label: "([^"]+)"/gm)].map((m) => ({ id: m[1], label: m[2] }));

const out = {
  app: "Dark Ambient Prompt Generator + Ambient Video Studio",
  generated: new Date().toISOString(),
  urls: { generator: "./", studio: "./studio.html", guide: "./agents.html" },
  urlParams: {
    title: "audio title; the generator picks everything from it (e.g. ?title=Aurora%20%C2%B7%20Weightless%20Ambient%20for%20Sleep)",
    l: "landscape id", m: "mood id",
    s: "structure index", o: "foreground index", d: "decay indexes (dot-separated)", a: "atmosphere indexes (dot-separated)",
    g: "lighting index", c: "framing index", w: "twist index", e: "emptiness indexes (dot-separated)",
    ar: "aspect ratio (16:9 default)", t: "title space 1/0", st: "style photo|matte", x: "extra free sentence",
  },
  promptOrder: [
    "mood.camera with {L} = landscape phrase",
    "Subject: a lone {structure}, {ORIGINAL}, {decay}.",
    "Unexpected detail: {twist}.  (omitted when twist is empty)",
    "Composition: {framing.text}",
    "Foreground: {foreground}, sparse and understated.  (omitted when framing.fg === false)",
    "{landscape.medium}.",
    "Air: {atmosphere}; light: {lighting}.",
    "{GLOW}", "{INTEGRATE}", "Palette: {palette}.", "Generous empty space, {emptiness}.",
    "{mood.feeling}", "{DESERTED}", "{STYLES[style].text}", "{TITLE_SPACE} (if title space on)", "{extra}", "{aspect} format.",
  ],
  constants: { ORIGINAL: d.ORIGINAL, INTEGRATE: d.INTEGRATE, GLOW: d.GLOW, DESERTED: d.DESERTED, TITLE_SPACE: d.TITLE_SPACE, STYLES: d.STYLES },
  landscapes: d.LANDSCAPES.map(({ swatch, ...l }) => l),
  moods: d.MOODS,
  framings: d.FRAMINGS,
  twists: d.TWISTS,
  emptiness: d.EMPTINESS,
  aspects: d.ASPECTS,
  revisions: d.REVISIONS,
  studio: {
    cfgParam: "studio.html?cfg=<base64(UTF-8 JSON)>",
    cfgExample: { image: "background.png", width: 1920, height: 1080, fps: 30, scale: 2, loopSeconds: 30, landscape: "frozen",
      overlays: { fog: { color: "#e8eff3", opacity: 0.28 }, particles: { kind: "snow", count: 220 }, stars: false, aurora: false, rays: false, grain: 0.02, vignette: 0.01, zoom: 0.01, breathe: 0.03 } },
    particleKinds: ["snow", "rain", "dust", "sediment", "stardust", "sparkle"],
    resolutions: { "1080": 1, "1440": 1.3333, "2160": 2 },
    upscaleModels: { max: "Real-ESRGAN x4plus (most detail, needs GPU)", fast: "Real-ESRGAN General x4v3 dn0.3 (fast)" },
    gradingPresets: presets,
  },
};
fs.mkdirSync(path.join(root, "agent"), { recursive: true });
fs.writeFileSync(path.join(root, "agent", "options.json"), JSON.stringify(out, null, 2));
console.log("agent/options.json written:", d.LANDSCAPES.length, "landscapes,", d.FRAMINGS.length, "framings,", presets.length, "grading presets");
