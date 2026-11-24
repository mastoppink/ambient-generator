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
    overlay = <Cta frame={f} total={L} fps={fps} tone={props.intro?.tone} {...props.cta} />;
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

export const INTRO_STYLES = {
  horizon: "Horizon · judul naik dari balik garis",
  sweep: "Light sweep · cahaya menyapu judul",
  split: "Split · garis membuka judul & subjudul",
  letters: "Engrave · huruf demi huruf",
  words: "Ascend · kata demi kata",
  letterbox: "Letterbox · bilah sinematik membuka",
  veil: "Veil · naik dari kabut",
  minimal: "Minimal · fade sangat lambat",
  focus: "Focus · buram ke tajam",
};
export const INTRO_LAYOUTS = { center: "Tengah", lowerLeft: "Kiri bawah", upperLeft: "Kiri atas (editorial)" };
export const TONES = { ivory: { label: "Ivory", color: "#f3f0ea" }, gold: { label: "Emas pucat", color: "#eadcb8" }, silver: { label: "Perak dingin", color: "#e1e7ec" } };
export const CTA_STYLES = { caption: "Caption · kiri bawah", center: "Tengah bawah", whisper: "Bisikan · kanan atas" };

/** Splits text into pieces (letters or words) that appear one after another. */
const Stagger = ({ text, s, start, step, dur = 1.6, words = false, rise = 10 }) => {
  const parts = words ? text.split(/(\s+)/) : [...text];
  let k = 0;
  return parts.map((part, i) => {
    if (/^\s+$/.test(part)) return <span key={i} style={{ whiteSpace: "pre" }}>{part}</span>;
    const t = ease(interpolate(s, [start + k * step, start + k * step + dur], [0, 1], clamp)); k++;
    return <span key={i} style={{ opacity: t, display: "inline-block", transform: `translateY(${(1 - t) * rise}px)`, whiteSpace: "pre" }}>{part}</span>;
  });
};

/**
 * Title card, restrained European editorial style: small tracked capitals, generous space, slow staggered fades.
 * `reveal` (INTRO_STYLES), `layout` (INTRO_LAYOUTS) and `tone` (TONES) give many combinations.
 */
const Intro = ({ frame, total, fps, title = "", subtitle = "", channel = "", reveal = "horizon", layout = "center", tone = "ivory" }) => {
  const s = frame / fps, end = total / fps;
  const black = interpolate(s, [0, 2.8], [1, 0], clamp);
  const appear = (a, d = 2.2) => ease(interpolate(s, [a, a + d], [0, 1], clamp));
  const out = interpolate(s, [end - 2.6, end - 0.2], [1, 0], clamp);
  const band = Math.min(appear(0.8, 2.5), out);
  const ivory = (TONES[tone] || TONES.ivory).color;
  const pair = SIZE;
  const breathe = interpolate(s, [4.6, end], [0, 0.03], clamp);
  const centered = layout === "center";
  const TITLE = title.toUpperCase();

  let tracking = 0.4 + breathe, titleStyle = { opacity: appear(1.8, 4) }, titleWrap = {}, titleContent = TITLE;
  let ruleW = appear(4.4, 1.8), ruleO = appear(4.4, 1.2), ruleWidth = 64;
  let subStyle = { opacity: appear(5.2, 2.4) }, subWrap = {};
  let bars = 0;

  if (reveal === "focus") {
    const r = ease(interpolate(s, [1.5, 4.6], [0, 1], clamp));
    tracking = 0.62 - 0.26 * r + breathe;
    const blur = (1 - r) * 10;
    titleStyle = { opacity: Math.min(1, r * 1.6), filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none", transform: `scale(${1.035 - 0.035 * r})` };
    ruleW = appear(4.2, 1.6); ruleO = appear(4.2, 1); subStyle = { opacity: appear(4.8) };
  } else if (reveal === "horizon") {
    ruleWidth = 200; ruleW = appear(1.2, 2.2); ruleO = appear(1.2, 1);
    const r = ease(interpolate(s, [2.6, 5.4], [0, 1], clamp));
    titleWrap = { overflow: "hidden", paddingTop: 8 };
    titleStyle = { transform: `translateY(${(1 - r) * 105}%)`, opacity: Math.min(1, r * 1.4) };
    subStyle = { opacity: appear(5.4, 2.2) };
  } else if (reveal === "sweep") {
    const x = interpolate(s, [1.6, 5.2], [-25, 110], clamp);
    const mask = `linear-gradient(90deg, #000 ${x}%, rgba(0,0,0,0.35) ${x + 8}%, transparent ${x + 18}%)`;
    titleStyle = { WebkitMaskImage: mask, maskImage: mask, opacity: appear(1.4, 1) };
    ruleW = appear(4.8, 1.6); ruleO = appear(4.8, 1); subStyle = { opacity: appear(5.4, 2.2) };
  } else if (reveal === "split") {
    ruleWidth = 120; ruleW = appear(1.2, 2); ruleO = appear(1.2, 1);
    const r = ease(interpolate(s, [2.8, 5.6], [0, 1], clamp));
    titleWrap = { overflow: "hidden", paddingTop: 8 };
    titleStyle = { transform: `translateY(${(1 - r) * 105}%)`, opacity: Math.min(1, r * 1.4) };
    subWrap = { overflow: "hidden", paddingBottom: 6 };
    subStyle = { transform: `translateY(${(1 - r) * -110}%)`, opacity: Math.min(1, r * 1.4) };
  } else if (reveal === "letters") {
    const n = TITLE.replace(/\s/g, "").length || 1, step = Math.min(0.12, 2.4 / n);
    titleStyle = {}; titleContent = <Stagger text={TITLE} s={s} start={1.6} step={step} dur={1.8} rise={6} />;
    const done = 1.6 + n * step + 1.2;
    ruleW = appear(done, 1.6); ruleO = appear(done, 1); subStyle = { opacity: appear(done + 0.6, 2.2) };
  } else if (reveal === "words") {
    titleStyle = {}; titleContent = <Stagger text={TITLE} s={s} start={1.8} step={0.9} dur={2.2} words rise={18} />;
    const n = TITLE.split(/\s+/).length, done = 1.8 + n * 0.9 + 1;
    ruleW = appear(done, 1.6); ruleO = appear(done, 1); subStyle = { opacity: appear(done + 0.6, 2.2) };
  } else if (reveal === "letterbox") {
    // Cinematic bars close in from the frame edges, then part again as the title fades in between them.
    bars = interpolate(s, [0.4, 2.4, end - 2.4, end - 0.2], [0, 1, 1, 0], clamp);
    titleStyle = { opacity: appear(2.2, 2.6) };
    tracking = 0.5 - 0.08 * appear(2.2, 4) + breathe;
    ruleW = appear(4.4, 1.6); ruleO = appear(4.4, 1); subStyle = { opacity: appear(5, 2.2) };
  } else if (reveal === "veil") {
    // The title rises out of a mist line: a soft vertical mask lifts from the bottom up.
    const y = interpolate(s, [1.8, 5.2], [130, -30], clamp);
    const mask = `linear-gradient(0deg, #000 ${100 - y}%, transparent ${130 - y}%)`;
    titleStyle = { WebkitMaskImage: mask, maskImage: mask, transform: `translateY(${(1 - appear(1.8, 3.4)) * 14}px)` };
    ruleW = appear(4.8, 1.6); ruleO = appear(4.8, 1); subStyle = { opacity: appear(5.4, 2.2) };
  }

  const align = centered
    ? { alignItems: "center", justifyContent: "center", textAlign: "center" }
    : layout === "lowerLeft"
      ? { alignItems: "flex-start", justifyContent: "flex-end", textAlign: "left", padding: "0 0 150px 150px" }
      : { alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left", padding: "150px 0 0 150px" };
  const bandBg = centered
    ? "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.32) 44%, rgba(0,0,0,0.32) 58%, transparent 72%)"
    : layout === "lowerLeft"
      ? "linear-gradient(20deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 35%, transparent 60%)"
      : "linear-gradient(160deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 35%, transparent 60%)";
  const ruleGrad = centered ? `linear-gradient(90deg, transparent, ${ivory}, transparent)` : `linear-gradient(90deg, ${ivory}, transparent)`;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: bandBg, opacity: band }} />
      <AbsoluteFill style={{ ...align, color: ivory, opacity: out, textShadow: "0 0 30px rgba(0,0,0,0.45)" }}>
        {channel && (
          <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 400, letterSpacing: "0.5em", textTransform: "uppercase", marginRight: centered ? "-0.5em" : 0, opacity: 0.75 * appear(0.9) }}>{channel}</div>
        )}
        {channel && (centered
          ? <div style={{ width: 1, height: 34, background: ivory, opacity: 0.4 * appear(1.4), margin: "26px 0 30px" }} />
          : <div style={{ width: 34, height: 1, background: ivory, opacity: 0.4 * appear(1.4), margin: "24px 0 26px", transform: `scaleX(${appear(1.4)})`, transformOrigin: "left" }} />)}
        <div style={titleWrap}>
          <div style={{ fontFamily: SERIF, fontWeight: SERIF_W, fontSize: Math.round(64 * pair), letterSpacing: `${tracking}em`, marginRight: centered ? `-${tracking}em` : 0,
            lineHeight: 1.1, ...titleStyle }}>{titleContent}</div>
        </div>
        {(subtitle || reveal === "horizon" || reveal === "split") && (
          <div style={{ width: ruleWidth, height: 1, background: ruleGrad, opacity: 0.6 * ruleO, margin: "30px 0 24px", transform: `scaleX(${ruleW})`, transformOrigin: centered ? "center" : "left" }} />
        )}
        {subtitle && (
          <div style={subWrap}>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: SERIF_W, fontSize: Math.round(30 * pair), letterSpacing: "0.04em", ...subStyle, opacity: 0.82 * (subStyle.opacity ?? 1) }}>{subtitle}</div>
          </div>
        )}
      </AbsoluteFill>
      {bars > 0 && (
        <>
          <AbsoluteFill style={{ height: `${bars * 12}%`, backgroundColor: "black" }} />
          <AbsoluteFill style={{ top: "auto", bottom: 0, height: `${bars * 12}%`, backgroundColor: "black" }} />
        </>
      )}
      <AbsoluteFill style={{ backgroundColor: "black", opacity: black }} />
    </AbsoluteFill>
  );
};

/** Subscribe reminder in one of three understated typographic styles (CTA_STYLES). */
const Cta = ({ frame, total, fps, text = "", button = "Subscribe", start = 2, hold = 8, style = "caption", tone = "ivory" }) => {
  const s = frame / fps, end = Math.min(total / fps - 0.5, start + hold + 2.6);
  const o = interpolate(s, [start, start + 1.8, end - 1.8, end], [0, 1, 1, 0], clamp);
  const lineIn = ease(interpolate(s, [start + 0.8, start + 2.6], [0, 1], clamp));
  const btn = ease(interpolate(s, [start + 1.6, start + 3], [0, 1], clamp));
  const ivory = (TONES[tone] || TONES.ivory).color;
  const shadow = "0 0 28px rgba(0,0,0,0.6)";
  const caps = { fontFamily: SANS, fontWeight: 500, textTransform: "uppercase" };

  if (style === "center") {
    return (
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 96, opacity: o * 0.92, color: ivory, textShadow: shadow, textAlign: "center" }}>
        {text && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: SERIF_W, fontSize: Math.round(36 * SIZE), marginBottom: 16 }}>{text}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 54, height: 1, background: ivory, opacity: 0.5, transform: `scaleX(${lineIn})`, transformOrigin: "right" }} />
          <div style={{ ...caps, fontSize: 18, letterSpacing: "0.5em", marginRight: "-0.5em", opacity: btn }}>{button}</div>
          <div style={{ width: 54, height: 1, background: ivory, opacity: 0.5, transform: `scaleX(${lineIn})`, transformOrigin: "left" }} />
        </div>
      </AbsoluteFill>
    );
  }
  if (style === "whisper") {
    return (
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "flex-end", padding: "88px 110px 0 0", opacity: o * 0.85, color: ivory, textShadow: shadow, textAlign: "right" }}>
        <div style={{ ...caps, fontSize: 16, letterSpacing: "0.45em", marginRight: "-0.45em", opacity: btn }}>{button}</div>
        <div style={{ width: 90, height: 1, background: `linear-gradient(270deg, ${ivory}, transparent)`, opacity: 0.6, margin: "14px 0 12px", transform: `scaleX(${lineIn})`, transformOrigin: "right" }} />
        {text && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: SERIF_W, fontSize: Math.round(26 * SIZE) }}>{text.replace(/,\s*$/, "")}</div>}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0 0 112px 124px", opacity: o * 0.92 }}>
      <div style={{ color: ivory, textShadow: shadow, transform: `translateY(${(1 - o) * 8}px)` }}>
        {text && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: SERIF_W, fontSize: Math.round(40 * SIZE), letterSpacing: 0.4, marginBottom: 18 }}>{text}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 70, height: 1, background: ivory, opacity: 0.55, transform: `scaleX(${lineIn})`, transformOrigin: "left" }} />
          <div style={{ ...caps, fontSize: 19, letterSpacing: 8, opacity: btn, transform: `translateX(${(1 - btn) * -8}px)` }}>{button}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
