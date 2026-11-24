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

const SERIF = "'Cormorant Garamond', 'Cormorant', Georgia, 'Times New Roman', serif";
const SANS = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Title card: fade from black; small caps channel line, serif title, hairline, tracked subtitle; fade out into the loop. */
const Intro = ({ frame, total, fps, title = "", subtitle = "", channel = "" }) => {
  const s = frame / fps, end = total / fps;
  const black = interpolate(s, [0, 2.2], [1, 0], { extrapolateRight: "clamp" });
  const fade = (a, b) => interpolate(s, [a, a + 1.6, end - 2, end - 0.4], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line = interpolate(s, [1.6, 3.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * fade(1.6);
  const spacing = interpolate(s, [0.8, end], [14, 18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.5) 70%)", opacity: fade(0.6) }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", color: "#f1efe9", padding: "0 180px" }}>
        {channel && <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 400, letterSpacing: 9, textTransform: "uppercase", opacity: 0.65 * fade(0.8), marginBottom: 34 }}>{channel}</div>}
        <div style={{ fontFamily: SERIF, fontSize: 104, fontWeight: 300, letterSpacing: spacing, lineHeight: 1.05, textTransform: "uppercase", opacity: fade(1.2), textShadow: "0 0 40px rgba(0,0,0,0.45)" }}>{title}</div>
        {subtitle && <div style={{ width: 160, height: 1, background: "rgba(241,239,233,0.55)", margin: "38px 0 30px", transform: `scaleX(${line})` }} />}
        {subtitle && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 42, fontWeight: 300, letterSpacing: 2, opacity: 0.85 * fade(2) }}>{subtitle}</div>}
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "black", opacity: black }} />
    </AbsoluteFill>
  );
};

/** Subscribe reminder: an understated lower-left caption that drifts in and out within one loop. */
const Cta = ({ frame, total, fps, text = "", button = "Subscribe", start = 2, hold = 8 }) => {
  const s = frame / fps, end = Math.min(total / fps - 0.5, start + hold + 2.4);
  const o = interpolate(s, [start, start + 1.6, end - 1.6, end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rise = interpolate(s, [start, start + 1.6], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line = interpolate(s, [start + 0.6, start + 2.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bell = interpolate(s, [start + 2.4, start + 2.6, start + 2.8, start + 3.0, start + 3.2], [0, -14, 10, -6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0 0 110px 120px", opacity: o }}>
      <div style={{ transform: `translateY(${rise}px)`, color: "#f1efe9", textShadow: "0 0 24px rgba(0,0,0,0.55)" }}>
        {text && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 300, fontSize: 40, letterSpacing: 0.5, marginBottom: 16 }}>{text}</div>}
        <div style={{ width: 220, height: 1, background: "rgba(241,239,233,0.5)", transformOrigin: "left", transform: `scaleX(${line})`, marginBottom: 16 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: SANS, fontSize: 21, fontWeight: 500, letterSpacing: 7, textTransform: "uppercase" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ transform: `rotate(${bell}deg)`, transformOrigin: "50% 10%" }}>
            <path d="M18 16V11a6 6 0 0 0-12 0v5l-2 2h16z" /><path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
          {button}
        </div>
      </div>
    </AbsoluteFill>
  );
};
