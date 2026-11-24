import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, random } from "remotion";

/*
 * Every motion here is periodic over the composition length, so the rendered clip
 * loops seamlessly and can be repeated for hours under the audio.
 */
const TAU = Math.PI * 2;

export const AmbientLoop = ({ image, overlays: o }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / durationInFrames; // phase 0..1

  const wave = 0.5 - 0.5 * Math.cos(TAU * p); // 0 → 1 → 0
  const scale = 1 + (o.zoom || 0) * wave;
  const breathe = (o.breathe || 0) * Math.sin(TAU * p); // >0 brighter, <0 darker

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <Img maxRetries={6} delayRenderTimeoutInMilliseconds={120000} src={/^(blob:|data:|https?:)/.test(image) ? image : staticFile(image)} style={{
        position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})`,
      }} />
      <AbsoluteFill style={{ backgroundColor: breathe > 0 ? "white" : "black", opacity: Math.abs(breathe) }} />
      {o.stars && <Stars p={p} />}
      {o.aurora && <Aurora p={p} />}
      {o.rays && <Rays p={p} />}
      {o.fog && <Fog p={p} {...o.fog} />}
      {o.particles && <Particles p={p} {...o.particles} />}
      {o.vignette > 0 && <Vignette strength={o.vignette} />}
      {o.grain > 0 && <Grain frame={frame} amount={o.grain} />}
    </AbsoluteFill>
  );
};

/* ---------- Fog: blurred blobs on a tile rendered twice, scrolled by whole tiles ---------- */
const Fog = ({ p, color, opacity }) => {
  const layers = [
    { seed: "a", y: 0.55, h: 0.6, speed: 1, blur: 60, alpha: 1 },
    { seed: "b", y: 0.7, h: 0.45, speed: 2, blur: 40, alpha: 0.8 },
    { seed: "c", y: 0.35, h: 0.5, speed: -1, blur: 80, alpha: 0.6 },
  ];
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity }}>
      {layers.map((L) => {
        const blobs = Array.from({ length: 9 }, (_, i) => ({
          x: random(`${L.seed}x${i}`) * 100,
          y: L.y * 100 + (random(`${L.seed}y${i}`) - 0.5) * L.h * 100,
          w: 25 + random(`${L.seed}w${i}`) * 35,
          h: 10 + random(`${L.seed}h${i}`) * 18,
        }));
        const shift = -((p * L.speed) % 1) * 50; // 50% of a 200%-wide strip = one tile
        const tile = (k) => blobs.map((b, i) => (
          <div key={`${k}${i}`} style={{
            position: "absolute", left: `${(b.x + k * 100) / 2}%`, top: `${b.y}%`,
            width: `${b.w / 2}%`, height: `${b.h}%`, transform: "translate(-50%, -50%)",
            borderRadius: "50%", background: `radial-gradient(closest-side, ${color}, transparent)`,
            opacity: L.alpha,
          }} />
        ));
        return (
          <div key={L.seed} style={{
            position: "absolute", inset: 0, width: "200%", filter: `blur(${L.blur}px)`,
            transform: `translateX(${shift}%)`,
          }}>
            {tile(-1)}{tile(0)}{tile(1)}{tile(2)}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- Particles ---------- */
const KINDS = {
  snow:     { size: [1.5, 5], dy: 1, cycles: [1, 2], sway: 0.015, alpha: [0.4, 0.9], blur: 1 },
  rain:     { size: [0.8, 1.4], dy: 1, cycles: [10, 14], sway: 0, alpha: [0.15, 0.35], streak: 30 },
  dust:     { size: [1, 2.5], dx: 1, cycles: [1, 1], sway: 0.02, alpha: [0.2, 0.55], blur: 0.6 },
  sediment: { size: [1, 3], dy: -1, cycles: [1, 1], sway: 0.02, alpha: [0.2, 0.6], blur: 0.8 },
  stardust: { size: [0.8, 2], twinkle: true, sway: 0.01, alpha: [0.3, 0.9], blur: 0.3 },
  sparkle:  { size: [1.2, 3], twinkle: true, sway: 0.005, alpha: [0.2, 1], blur: 0.5 },
};
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (v) => ((v % 1) + 1) % 1;

const Particles = ({ p, kind, count }) => {
  const k = KINDS[kind] || KINDS.dust;
  const { width, height } = useVideoConfig();
  const items = Array.from({ length: count }, (_, i) => {
    const r = (s) => random(`${kind}${s}${i}`);
    const cycles = k.cycles ? Math.round(lerp(k.cycles[0], k.cycles[1], r("c"))) : 0;
    const phase = r("ph");
    let x = r("x"), y = r("y");
    if (k.dy) y = wrap(y + k.dy * cycles * p);
    if (k.dx) x = wrap(x + k.dx * cycles * p);
    x += k.sway * Math.sin(TAU * (p * (1 + Math.floor(r("m") * 3)) + phase));
    let a = lerp(k.alpha[0], k.alpha[1], r("a"));
    if (k.twinkle) a *= 0.5 + 0.5 * Math.sin(TAU * (p * (1 + Math.floor(r("t") * 4)) + phase));
    return { x: x * width, y: y * height, s: lerp(k.size[0], k.size[1], r("s")), a };
  });
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
      <defs><filter id="pb"><feGaussianBlur stdDeviation={k.blur || 0} /></filter></defs>
      <g filter={k.blur ? "url(#pb)" : undefined} fill="white" stroke="white">
        {items.map((d, i) => k.streak
          ? <line key={i} x1={d.x} y1={d.y} x2={d.x - 3} y2={d.y + k.streak} strokeWidth={d.s} strokeOpacity={d.a} />
          : <circle key={i} cx={d.x} cy={d.y} r={d.s} fillOpacity={d.a} stroke="none" />)}
      </g>
    </svg>
  );
};

/* ---------- Stars ---------- */
const Stars = ({ p }) => {
  const { width, height } = useVideoConfig();
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
      {Array.from({ length: 260 }, (_, i) => {
        const r = (s) => random(`star${s}${i}`);
        const tw = 0.55 + 0.45 * Math.sin(TAU * (p * (1 + Math.floor(r("f") * 3)) + r("p")));
        return <circle key={i} cx={r("x") * width} cy={Math.pow(r("y"), 1.6) * height * 0.6}
          r={0.4 + r("s") * 1.1} fill="white" fillOpacity={(0.15 + r("a") * 0.6) * tw} />;
      })}
    </svg>
  );
};

/* ---------- Aurora: soft bands that sway periodically ---------- */
const Aurora = ({ p }) => (
  <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.35, filter: "blur(50px)" }}>
    {[0, 1, 2].map((i) => {
      const s = Math.sin(TAU * (p + i / 3));
      return (
        <div key={i} style={{
          position: "absolute", left: "-10%", width: "120%", top: `${8 + i * 7}%`, height: "18%",
          background: `linear-gradient(90deg, transparent, ${i === 1 ? "#7fd3c0" : "#6fb6a0"}, #8aa7d6, transparent)`,
          transform: `translateX(${s * 4}%) skewY(${-4 + s * 3}deg)`, borderRadius: "50%", opacity: 0.6 + 0.4 * s,
        }} />
      );
    })}
  </AbsoluteFill>
);

/* ---------- Light rays ---------- */
const Rays = ({ p }) => (
  <AbsoluteFill style={{ mixBlendMode: "screen", filter: "blur(18px)" }}>
    {[0, 1, 2, 3].map((i) => {
      const a = 0.08 + 0.06 * Math.sin(TAU * (p * (1 + (i % 2)) + i * 0.25));
      return (
        <div key={i} style={{
          position: "absolute", top: "-10%", left: `${30 + i * 12}%`, width: `${4 + (i % 3) * 3}%`, height: "120%",
          background: "linear-gradient(180deg, rgba(190,235,230,1), transparent 85%)",
          transform: `skewX(${-18 + i * 4}deg)`, opacity: a,
        }} />
      );
    })}
  </AbsoluteFill>
);

/* ---------- Vignette ---------- */
const Vignette = ({ strength }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${strength}) 100%)` }} />
);

/* ---------- Film grain (8 alternating noise seeds) ---------- */
const Grain = ({ frame, amount }) => {
  const { width, height } = useVideoConfig();
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: amount * 4 }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 8} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
};
