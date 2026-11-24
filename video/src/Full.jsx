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

/** Letters fade in one by one (film title style); spaces keep their width. */
const Letters = ({ text, s, start, step, dur = 1.4, style }) => (
  <span style={style}>
    {[...text].map((ch, i) => {
      const t = ease(interpolate(s, [start + i * step, start + i * step + dur], [0, 1], clamp));
      return <span key={i} style={{ opacity: t, display: "inline-block", transform: `translateY(${(1 - t) * 8}px)`, whiteSpace: "pre" }}>{ch}</span>;
    })}
  </span>
);

/**
 * Title card: fade from black; "— CHANNEL —" with hairlines; title letters appear one by one while the
 * tracking slowly widens; hairline; italic subtitle; everything rises a little and dissolves into the loop.
 */
const Intro = ({ frame, total, fps, title = "", subtitle = "", channel = "" }) => {
  const s = frame / fps, end = total / fps;
  const black = interpolate(s, [0, 2.4], [1, 0], clamp);
  const out = interpolate(s, [end - 2.2, end - 0.3], [1, 0], clamp);
  const drift = interpolate(s, [end - 2.2, end - 0.3], [0, -14], clamp);
  const shade = interpolate(s, [0.4, 2, end - 2.2, end - 0.3], [0, 1, 1, 0], clamp);
  const tracking = interpolate(s, [0.6, end], [16, 22], clamp);
  const letters = title.length || 1;
  const step = Math.min(0.09, 1.6 / letters);
  const titleDone = 1.2 + letters * step + 0.6;
  const rule = ease(interpolate(s, [titleDone - 0.4, titleDone + 1.2], [0, 1], clamp));
  const sub = ease(interpolate(s, [titleDone + 0.2, titleDone + 1.8], [0, 1], clamp));
  const ch = ease(interpolate(s, [0.6, 2.2], [0, 1], clamp));
  const ivory = "#f2efe8";
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 55% at center, rgba(0,0,0,0.38), rgba(0,0,0,0) 75%)", opacity: shade }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", color: ivory, padding: "0 180px",
        opacity: out, transform: `translateY(${drift}px)`, textShadow: "0 0 36px rgba(0,0,0,0.5)" }}>
        {channel && (
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 42, opacity: 0.85 * ch }}>
            <div style={{ width: 56, height: 1, background: ivory, opacity: 0.7, transform: `scaleX(${ch})`, transformOrigin: "right" }} />
            <div style={{ fontFamily: SANS, fontSize: 21, fontWeight: 400, letterSpacing: 11, textTransform: "uppercase", paddingLeft: 10 }}>{channel}</div>
            <div style={{ width: 56, height: 1, background: ivory, opacity: 0.7, transform: `scaleX(${ch})`, transformOrigin: "left" }} />
          </div>
        )}
        <Letters text={title.toUpperCase()} s={s} start={1.2} step={step}
          style={{ fontFamily: SERIF, fontSize: Math.round(100 * SIZE), fontWeight: SERIF_W, letterSpacing: tracking, lineHeight: 1.05, marginRight: -tracking }} />
        {subtitle && <div style={{ width: 180, height: 1, background: `linear-gradient(90deg, transparent, ${ivory}aa, transparent)`, margin: "40px 0 30px", transform: `scaleX(${rule})` }} />}
        {subtitle && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: Math.round(40 * SIZE), fontWeight: SERIF_W, letterSpacing: 1.5, opacity: 0.88 * sub, transform: `translateY(${(1 - sub) * 6}px)` }}>{subtitle}</div>}
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
