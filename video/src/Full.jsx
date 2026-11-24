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

/**
 * Title card, restrained European editorial style: small tracked capitals, generous space, slow staggered fades.
 * Channel name → title (tracking widens almost imperceptibly) → hairline → italic subtitle; all dissolve together.
 */
const Intro = ({ frame, total, fps, title = "", subtitle = "", channel = "" }) => {
  const s = frame / fps, end = total / fps;
  const black = interpolate(s, [0, 2.8], [1, 0], clamp);
  const appear = (a, d = 2.2) => ease(interpolate(s, [a, a + d], [0, 1], clamp));
  const out = interpolate(s, [end - 2.6, end - 0.2], [1, 0], clamp);
  const band = Math.min(appear(0.8, 2.5), out);
  // Title reveal: from soft blur and wide tracking, the letters settle and sharpen into place, then keep breathing open very slowly.
  const r = ease(interpolate(s, [1.5, 4.6], [0, 1], clamp));
  const tracking = 0.62 - 0.26 * r + interpolate(s, [4.6, end], [0, 0.04], clamp); // em
  const titleBlur = (1 - r) * 10;
  const titleScale = 1.035 - 0.035 * r;
  const ivory = "#f3f0ea";
  const pair = SIZE; // per-font optical size
  return (
    <AbsoluteFill>
      {/* a very soft horizontal band for legibility, instead of a heavy vignette */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.32) 44%, rgba(0,0,0,0.32) 58%, transparent 72%)", opacity: band }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", color: ivory, opacity: out, textShadow: "0 0 30px rgba(0,0,0,0.45)" }}>
        {channel && (
          <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 400, letterSpacing: "0.5em", textTransform: "uppercase", marginRight: "-0.5em", opacity: 0.75 * appear(0.9) }}>{channel}</div>
        )}
        {channel && <div style={{ width: 1, height: 34, background: ivory, opacity: 0.4 * appear(1.4), margin: "26px 0 30px" }} />}
        <div style={{ fontFamily: SERIF, fontWeight: SERIF_W, fontSize: Math.round(64 * pair), letterSpacing: `${tracking}em`, marginRight: `-${tracking}em`,
          textTransform: "uppercase", lineHeight: 1.1, opacity: Math.min(1, r * 1.6), filter: titleBlur > 0.05 ? `blur(${titleBlur.toFixed(2)}px)` : "none",
          transform: `scale(${titleScale})` }}>{title}</div>
        {subtitle && <div style={{ width: 64, height: 1, background: ivory, opacity: 0.5 * appear(4.2), margin: "34px 0 26px", transform: `scaleX(${appear(4.2, 1.6)})` }} />}
        {subtitle && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: SERIF_W, fontSize: Math.round(30 * pair), letterSpacing: "0.04em", opacity: 0.82 * appear(4.8) }}>{subtitle}</div>}
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
