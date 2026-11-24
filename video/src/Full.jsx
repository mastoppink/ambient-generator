import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "./AmbientLoop.jsx";

/*
 * One composition with three back-to-back segments, rendered in a single pass so they share
 * one encoder configuration:
 *   [0, I)        intro   = the LAST I frames of the loop + title card (ends exactly at loop phase 0)
 *   [I, I+L)      loop    = the plain seamless loop
 *   [I+L, I+2L)   ctaLoop = the same loop with a Subscribe call-to-action
 * The muxer then plays: intro, loop, loop, … and swaps in ctaLoop at the chosen times.
 * Segment lengths are multiples of the keyframe interval, so every boundary is a keyframe.
 */
export const segmentFrames = ({ fps, loopSeconds, intro, cta }) => {
  const L = Math.round(loopSeconds * fps);
  const I = intro?.enabled ? Math.round(intro.seconds * fps) : 0;
  const C = cta?.enabled ? L : 0;
  return { I, L, C, total: I + L + C };
};

export const AmbientFull = (props) => {
  const pair = FONT_PAIRS[props.fontPair] || FONT_PAIRS.classic;
  SERIF = pair.serif + FALLBACK_SERIF; SERIF_W = pair.weight; SIZE = pair.size;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { I, L } = segmentFrames({ fps, ...props });
  let phase, overlay = null;
  if (frame < I) {
    phase = (L - I + frame) / L;
    overlay = <Intro frame={frame} total={I} fps={fps} {...props.intro} />;
  } else if (frame < I + L) {
    phase = (frame - I) / L;
  } else {
    const f = frame - I - L;
    phase = f / L;
    overlay = <Cta frame={f} total={L} fps={fps} {...props.cta} />;
  }
  return (
    <AbsoluteFill>
      <Scene {...props} phase={((phase % 1) + 1) % 1} grainFrame={frame} />
      {overlay}
    </AbsoluteFill>
  );
};

/** Font pairings (self-hosted in /fonts): an editorial serif for titles + a geometric European sans for small caps. */
export const FONT_PAIRS = {
  classic: { label: "Classic · Cormorant Garamond + Jost", serif: "'Cormorant Garamond'", weight: 300, size: 1 },
  bookish: { label: "Bookish · EB Garamond + Jost", serif: "'EB Garamond'", weight: 400, size: 0.9 },
  couture: { label: "Couture · Bodoni Moda + Jost", serif: "'Bodoni Moda'", weight: 400, size: 0.82 },
};
const FALLBACK_SERIF = ", Georgia, 'Times New Roman', serif";
const SANS = "Jost, 'Futura', 'Century Gothic', 'Helvetica Neue', Arial, sans-serif";
let SERIF = FONT_PAIRS.classic.serif + FALLBACK_SERIF, SERIF_W = 300, SIZE = 1;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
const ease = (t) => 1 - Math.pow(1 - t, 3);

/** (unused) Letters fade in one by one. */
const Letters = ({ text, s, start, step, dur = 1.4, style }) => (
  <span style={style}>
    {[...text].map((ch, i) => {
      const t = ease(interpolate(s, [start + i * step, start + i * step + dur], [0, 1], clamp));
      return <span key={i} style={{ opacity: t, display: "inline-block", transform: `translateY(${(1 - t) * 8}px)`, whiteSpace: "pre" }}>{ch}</span>;
    })}
  </span>
);

export const INTRO_STYLES = {
  horizon: "Horizon · judul naik dari balik garis",
  sweep: "Light sweep · cahaya menyapu judul",
  split: "Split · garis membuka judul & subjudul",
  minimal: "Minimal · fade sangat lambat",
  focus: "Focus · buram ke tajam",
};

/**
 * Title card, restrained European editorial style: small tracked capitals, generous space, slow staggered fades.
 * The title reveal itself depends on `reveal` (see INTRO_STYLES).
 */
const Intro = ({ frame, total, fps, title = "", subtitle = "", channel = "", reveal = "horizon" }) => {
  const s = frame / fps, end = total / fps;
  const black = interpolate(s, [0, 2.8], [1, 0], clamp);
  const appear = (a, d = 2.2) => ease(interpolate(s, [a, a + d], [0, 1], clamp));
  const out = interpolate(s, [end - 2.6, end - 0.2], [1, 0], clamp);
  const band = Math.min(appear(0.8, 2.5), out);
  const ivory = "#f3f0ea";
  const pair = SIZE; // per-font optical size
  const breathe = interpolate(s, [4.6, end], [0, 0.03], clamp); // tracking keeps opening almost imperceptibly

  // Defaults (minimal), overridden per reveal style below.
  let tracking = 0.4 + breathe, titleStyle = { opacity: appear(1.8, 4) }, titleWrap = {};
  let ruleW = appear(4.4, 1.8), ruleO = appear(4.4, 1.2), ruleWidth = 64;
  let subStyle = { opacity: appear(5.2, 2.4) }, subWrap = {};

  if (reveal === "focus") {
    const r = ease(interpolate(s, [1.5, 4.6], [0, 1], clamp));
    tracking = 0.62 - 0.26 * r + breathe;
    const blur = (1 - r) * 10;
    titleStyle = { opacity: Math.min(1, r * 1.6), filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none", transform: `scale(${1.035 - 0.035 * r})` };
    ruleW = appear(4.2, 1.6); ruleO = appear(4.2, 1); subStyle = { opacity: appear(4.8) };
  } else if (reveal === "horizon") {
    // The hairline is drawn first; the title then rises from behind it, as if from the horizon.
    ruleWidth = 200; ruleW = appear(1.2, 2.2); ruleO = appear(1.2, 1);
    const r = ease(interpolate(s, [2.6, 5.4], [0, 1], clamp));
    titleWrap = { overflow: "hidden", paddingTop: 8 };
    titleStyle = { transform: `translateY(${(1 - r) * 105}%)`, opacity: Math.min(1, r * 1.4) };
    subStyle = { opacity: appear(5.4, 2.2) };
  } else if (reveal === "sweep") {
    // A soft-edged band of light uncovers the letters from left to right.
    const x = interpolate(s, [1.6, 5.2], [-25, 110], clamp);
    const mask = `linear-gradient(90deg, #000 ${x}%, rgba(0,0,0,0.35) ${x + 8}%, transparent ${x + 18}%)`;
    titleStyle = { WebkitMaskImage: mask, maskImage: mask, opacity: appear(1.4, 1) };
    ruleW = appear(4.8, 1.6); ruleO = appear(4.8, 1); subStyle = { opacity: appear(5.4, 2.2) };
  } else if (reveal === "split") {
    // The hairline appears alone, then opens: the title rises above it and the subtitle descends below it.
    ruleWidth = 120; ruleW = appear(1.2, 2); ruleO = appear(1.2, 1);
    const r = ease(interpolate(s, [2.8, 5.6], [0, 1], clamp));
    titleWrap = { overflow: "hidden", paddingTop: 8 };
    titleStyle = { transform: `translateY(${(1 - r) * 105}%)`, opacity: Math.min(1, r * 1.4) };
    subWrap = { overflow: "hidden", paddingBottom: 6 };
    subStyle = { transform: `translateY(${(1 - r) * -110}%)`, opacity: Math.min(1, r * 1.4) * 1 };
  }

  return (
    <AbsoluteFill>
      {/* a very soft horizontal band for legibility, instead of a heavy vignette */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.32) 44%, rgba(0,0,0,0.32) 58%, transparent 72%)", opacity: band }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", color: ivory, opacity: out, textShadow: "0 0 30px rgba(0,0,0,0.45)" }}>
        {channel && (
          <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 400, letterSpacing: "0.5em", textTransform: "uppercase", marginRight: "-0.5em", opacity: 0.75 * appear(0.9) }}>{channel}</div>
        )}
        {channel && <div style={{ width: 1, height: 34, background: ivory, opacity: 0.4 * appear(1.4), margin: "26px 0 30px" }} />}
        <div style={titleWrap}>
          <div style={{ fontFamily: SERIF, fontWeight: SERIF_W, fontSize: Math.round(64 * pair), letterSpacing: `${tracking}em`, marginRight: `-${tracking}em`,
            textTransform: "uppercase", lineHeight: 1.1, ...titleStyle }}>{title}</div>
        </div>
        {(subtitle || reveal === "horizon" || reveal === "split") && (
          <div style={{ width: ruleWidth, height: 1, background: `linear-gradient(90deg, transparent, ${ivory}, transparent)`, opacity: 0.6 * ruleO, margin: "30px 0 24px", transform: `scaleX(${ruleW})` }} />
        )}
        {subtitle && (
          <div style={subWrap}>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: SERIF_W, fontSize: Math.round(30 * pair), letterSpacing: "0.04em", ...subStyle, opacity: 0.82 * (subStyle.opacity ?? 1) }}>{subtitle}</div>
          </div>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "black", opacity: black }} />
    </AbsoluteFill>
  );
};

/** Subscribe reminder: a purely typographic caption, lower left, that breathes in and out within one loop. */
const Cta = ({ frame, total, fps, text = "", button = "Subscribe", start = 2, hold = 8 }) => {
  const s = frame / fps, end = Math.min(total / fps - 0.5, start + hold + 2.6);
  const o = interpolate(s, [start, start + 1.8, end - 1.8, end], [0, 1, 1, 0], clamp);
  const lineIn = ease(interpolate(s, [start + 0.8, start + 2.6], [0, 1], clamp));
  const btn = ease(interpolate(s, [start + 1.6, start + 3], [0, 1], clamp));
  const ivory = "#f2efe8";
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0 0 112px 124px", opacity: o * 0.92 }}>
      <div style={{ color: ivory, textShadow: "0 0 28px rgba(0,0,0,0.6)", transform: `translateY(${(1 - o) * 8}px)` }}>
        {text && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: SERIF_W, fontSize: Math.round(40 * SIZE), letterSpacing: 0.4, marginBottom: 18 }}>{text}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 70, height: 1, background: ivory, opacity: 0.55, transform: `scaleX(${lineIn})`, transformOrigin: "left" }} />
          <div style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, letterSpacing: 8, textTransform: "uppercase", opacity: btn, transform: `translateX(${(1 - btn) * -8}px)` }}>{button}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
