import { getLandscape } from "./generator.js?v=10";

/*
 * Overlay & motion plan per landscape, adjusted by the prompt's extra sentences
 * (which come from the audio title). Used for: editing notes, overlay-asset prompts,
 * and the Remotion config export (video/).
 */
const BASE = {
  abyssal: { fog: { color: "#3f7f86", opacity: 0.22 }, particles: { kind: "sediment", count: 140 }, rays: true },
  desert:  { fog: { color: "#c9ad82", opacity: 0.2 },  particles: { kind: "dust", count: 120 } },
  frozen:  { fog: { color: "#e8eff3", opacity: 0.28 }, particles: { kind: "snow", count: 220 } },
  forest:  { fog: { color: "#a7b0a7", opacity: 0.32 }, particles: { kind: "dust", count: 70 } },
  alien:   { fog: { color: "#5b5d9a", opacity: 0.14 }, particles: { kind: "stardust", count: 90 }, stars: true },
  urban:   { fog: { color: "#9aa3a6", opacity: 0.22 }, particles: { kind: "dust", count: 80 } },
};

const PARTICLE_LABEL = {
  sediment: "sedimen melayang naik pelan", dust: "partikel debu melayang", snow: "salju halus turun pelan",
  rain: "hujan tipis", stardust: "debu bintang berkilau samar", sparkle: "titik cahaya berkilau",
};

export function overlayPlan(state) {
  const l = getLandscape(state.landscape);
  const base = BASE[l.id];
  const text = (state.extra || "").toLowerCase();
  const plan = {
    fog: { ...base.fog },
    particles: { ...base.particles },
    stars: !!base.stars,
    aurora: false,
    rays: !!base.rays,
    grain: 0.05,
    vignette: 0.35,
    zoom: 0.04,
    breathe: 0.03,
  };
  if (/rain/.test(text)) plan.particles = { kind: "rain", count: 260 };
  else if (/snow/.test(text)) plan.particles = { kind: "snow", count: 220 };
  else if (/glint|glass|droplets/.test(text)) plan.particles = { kind: "sparkle", count: 60 };
  if (/star|galaxy|nebula|void|deep space|night sky|moon/.test(text)) plan.stars = true;
  if (/aurora/.test(text)) plan.aurora = true;
  if (/dim and deep|dark|night/.test(text)) plan.vignette = 0.5;
  if (/mist|fog/.test(text)) plan.fog.opacity = Math.min(0.45, plan.fog.opacity + 0.1);
  if (l.id === "abyssal") plan.stars = false;
  return plan;
}

/** Human-readable editing notes (Indonesian). */
export function overlayNotes(plan) {
  const pct = (v) => `${Math.round(v * 100)}%`;
  const notes = [
    `Kabut/asap bergerak lambat, blend Screen, opacity ${pct(plan.fog.opacity)}`,
    `${cap(PARTICLE_LABEL[plan.particles.kind])}`,
  ];
  if (plan.stars) notes.push("Bintang berkelip sangat pelan (sesekali satu meteor tipis)");
  if (plan.aurora) notes.push("Aurora bergelombang pelan di langit");
  if (plan.rays) notes.push("Berkas cahaya (god rays) bergeser sangat pelan");
  notes.push(`Film grain ${pct(plan.grain)}`);
  notes.push(`Slow zoom ${pct(plan.zoom)} bolak-balik dalam satu loop`);
  notes.push(`Cahaya "bernapas" ±${pct(plan.breathe)}, vignette ${pct(plan.vignette)}`);
  return notes;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Nano Banana prompts (one image each) for overlay assets on pure black, for Screen blending. */
export function overlayAssetPrompts(plan, aspect) {
  const subject = {
    sediment: "countless tiny soft particles of floating sea sediment, some slightly out of focus",
    dust: "fine floating dust particles caught in faint light, some blurred by depth of field",
    snow: "softly falling snowflakes of different sizes, the nearest ones blurred by depth of field",
    rain: "thin, fine streaks of falling rain, slightly motion-blurred",
    stardust: "sparse, tiny glittering specks of stardust, some softly glowing",
    sparkle: "a few tiny soft points of glinting light, like distant glass catching light",
  }[plan.particles.kind];
  const tail = `Nothing else in the image: no landscape, no horizon, no objects, no text. The background must be pure, completely black (#000000). Photographic and realistic, high resolution, ${aspect} format. This is an overlay texture for video compositing with Screen blending.`;
  return {
    fog: `A single overlay texture of soft, wispy layers of drifting fog and smoke in light grey, thin and translucent, spread evenly across the frame with no hard edges. ${tail}`,
    particles: `A single overlay texture of ${subject}, scattered evenly across the whole frame. ${tail}`,
  };
}

/** JSON config consumed by the Remotion project in /video. */
export function videoConfig(state, plan) {
  return {
    image: "background.png",
    width: state.aspect === "9:16" ? 1080 : 1920,
    height: state.aspect === "9:16" ? 1920 : 1080,
    fps: 30,
    loopSeconds: 30,
    landscape: state.landscape,
    overlays: plan,
  };
}
