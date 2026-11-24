import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, random, delayRender, continueRender } from "remotion";
import { createWater } from "./waterGL.js";

/*
 * Every motion here is periodic over the composition length, so the rendered clip
 * loops seamlessly and can be repeated for hours under the audio.
 *
 * Performance: all heavy looks (blur, glow, noise) are pre-rendered ONCE into textures.
 * Each frame only draws those textures onto two canvases (light overlays + grain),
 * which is many times faster than CSS/SVG blur filters per frame.
 */
const TAU = Math.PI * 2;

export const AmbientLoop = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <Scene {...props} phase={frame / durationInFrames} grainFrame={frame} />;
};

/** The ambient scene at a given loop phase (0..1). */
/** Loads an image element for canvas drawing; holds the render until it is ready. */
function useImageElement(src) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const handle = delayRender("load " + src.slice(0, 40), { timeoutInMilliseconds: 120000 });
    const el = new Image();
    el.onload = () => { setImg(el); continueRender(handle); };
    el.onerror = () => continueRender(handle);
    el.src = src;
    return () => continueRender(handle);
  }, [src]);
  return img;
}

export const Scene = ({ image, overlays: o, renderScale = 1, phase, grainFrame = 0, water }) => {
  const { width, height } = useVideoConfig();
  const p = phase;
  const frame = grainFrame;

  const wave = 0.5 - 0.5 * Math.cos(TAU * p); // 0 → 1 → 0
  const scale = 1 + (o.zoom || 0) * wave;
  const breathe = (o.breathe || 0) * Math.sin(TAU * p); // >0 brighter, <0 darker

  // Canvas resolution follows the output resolution so stars and particles stay crisp in 4K.
  const W = Math.round(width * renderScale), H = Math.round(height * renderScale);
  const lightRef = useRef(null), fogRef = useRef(null), grainRef = useRef(null), waterRef = useRef(null);
  const src = /^(blob:|data:|https?:)/.test(image) ? image : staticFile(image);
  const waterOn = !!(water?.enabled && water.mask);
  const imgEl = useImageElement(waterOn ? src : null);
  const maskEl = useImageElement(waterOn ? water.mask : null);

  const glRef = useRef(null);
  useLayoutEffect(() => {
    const c = waterRef.current; if (!c || !waterOn || !imgEl || !maskEl) return;
    if (!glRef.current || glRef.current.canvas !== c) glRef.current = { canvas: c, water: createWater(c) };
    const gw = glRef.current.water;
    if (gw) gw.draw({ img: imgEl, mask: featheredMask(maskEl, 960, 540), p, w: water, drops: waterDrops(p, water) });
    else drawWater(c.getContext("2d"), p, W, H, imgEl, maskEl, water); // fallback without WebGL
  }, [p, W, H, imgEl, maskEl, waterOn, water]);
  const FW = Math.round(W / 2), FH = Math.round(H / 2); // fog is soft: half resolution is invisible and 4× cheaper

  useLayoutEffect(() => {
    const c = lightRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    if (o.stars) drawStars(ctx, p, W, H);
    if (o.aurora) drawAurora(ctx, p, W, H);
    if (o.rays) drawRays(ctx, p, W, H);
    if (o.particles) drawParticles(ctx, p, W, H, o.particles);
  }, [p, W, H, o]);

  useLayoutEffect(() => {
    const c = fogRef.current; if (!c || !o.fog) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, FW, FH);
    ctx.globalCompositeOperation = "lighter";
    drawFog(ctx, p, FW, FH, o.fog, W);
  }, [p, FW, FH, W, o.fog]);

  useLayoutEffect(() => {
    const c = grainRef.current; if (!c || !(o.grain > 0)) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = ctx.createPattern(grainTexture(frame % 8), "repeat");
    ctx.fillRect(0, 0, W, H);
  }, [frame, W, H, o.grain]);

  const fill = { position: "absolute", inset: 0, width: "100%", height: "100%" };
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <Img maxRetries={6} delayRenderTimeoutInMilliseconds={120000} src={src} style={{
        ...fill, objectFit: "cover", transform: `scale(${scale})`,
      }} />
      {waterOn && <canvas ref={waterRef} width={W} height={H} style={{ ...fill, transform: `scale(${scale})` }} />}
      {breathe !== 0 && <AbsoluteFill style={{ backgroundColor: breathe > 0 ? "white" : "black", opacity: Math.abs(breathe) }} />}
      {o.fog && <canvas ref={fogRef} width={FW} height={FH} style={{ ...fill, mixBlendMode: "screen" }} />}
      <canvas ref={lightRef} width={W} height={H} style={{ ...fill, mixBlendMode: "screen" }} />
      {o.vignette > 0 && (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${o.vignette}) 100%)` }} />
      )}
      {o.grain > 0 && <canvas ref={grainRef} width={W} height={H} style={{ ...fill, mixBlendMode: "overlay", opacity: Math.min(1, o.grain * 4) }} />}
    </AbsoluteFill>
  );
};

/* ---------- texture cache ---------- */
const cache = new Map();
function texture(key, w, h, draw) {
  if (!cache.has(key)) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    draw(c.getContext("2d"), c.width, c.height);
    cache.set(key, c);
  }
  return cache.get(key);
}
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/* ---------- Fog: 3 seamless horizontal tiles of blurred blobs, scrolled by whole tiles ---------- */
const FOG_LAYERS = [
  { seed: "a", y: 0.55, h: 0.6, speed: 1, blur: 60, alpha: 1 },
  { seed: "b", y: 0.7, h: 0.45, speed: 2, blur: 40, alpha: 0.8 },
  { seed: "c", y: 0.35, h: 0.5, speed: -1, blur: 80, alpha: 0.6 },
];
function fogTile(L, color, W, H, fullW) {
  const s = 1, tw = W, th = H, k = fullW / 1920 / 2;
  return texture(`fog${L.seed}${color}${W}x${H}`, tw, th, (ctx) => {
    const [r, g, b] = hexRgb(color);
    // No canvas blur filter (it clips at texture edges and shows hard seams): blobs get a
    // smooth multi-stop falloff and are enlarged by the blur radius instead.
    const pad = L.blur * k * 2;
    for (let i = 0; i < 9; i++) {
      const x = random(`${L.seed}x${i}`) * tw;
      const y = (L.y + (random(`${L.seed}y${i}`) - 0.5) * L.h) * th;
      const rw = (25 + random(`${L.seed}w${i}`) * 35) / 100 * tw / 2 + pad;
      const rh = (10 + random(`${L.seed}h${i}`) * 18) / 100 * th / 2 + pad;
      for (const dx of [-tw, 0, tw]) { // wrap so the tile repeats seamlessly
        ctx.save();
        ctx.translate(x + dx, y); ctx.scale(rw, rh);
        const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        for (let t = 0; t <= 1.0001; t += 0.125) grd.addColorStop(Math.min(1, t), `rgba(${r},${g},${b},${(L.alpha * Math.pow(Math.cos(t * Math.PI / 2), 2)).toFixed(4)})`);
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  });
}
function drawFog(ctx, p, W, H, fog, fullW = W * 2) {
  ctx.save();
  ctx.globalAlpha = fog.opacity;
  for (const L of FOG_LAYERS) {
    const t = fogTile(L, fog.color || "#ffffff", W, H, fullW);
    const shift = -(((p * L.speed) % 1) + 1) % 1 * W;
    ctx.drawImage(t, shift, 0, W, H);
    ctx.drawImage(t, shift + W, 0, W, H);
  }
  ctx.restore();
}

/* ---------- Particles: one pre-blurred sprite, drawn many times ---------- */
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
const dot = (blur) => texture(`dot${blur}`, 64, 64, (ctx) => {
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  const hard = Math.max(0.05, 0.55 - blur * 0.35);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(hard, "rgba(255,255,255,0.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
});
function drawParticles(ctx, p, W, H, { kind, count }) {
  const k = KINDS[kind] || KINDS.dust, s = W / 1920;
  const sprite = dot(k.blur || 0);
  ctx.save();
  if (k.streak) { ctx.strokeStyle = "white"; ctx.lineCap = "round"; }
  for (let i = 0; i < count; i++) {
    const r = (q) => random(`${kind}${q}${i}`);
    const cycles = k.cycles ? Math.round(lerp(k.cycles[0], k.cycles[1], r("c"))) : 0;
    const phase = r("ph");
    let x = r("x"), y = r("y");
    if (k.dy) y = wrap(y + k.dy * cycles * p);
    if (k.dx) x = wrap(x + k.dx * cycles * p);
    x += k.sway * Math.sin(TAU * (p * (1 + Math.floor(r("m") * 3)) + phase));
    let a = lerp(k.alpha[0], k.alpha[1], r("a"));
    if (k.twinkle) a *= 0.5 + 0.5 * Math.sin(TAU * (p * (1 + Math.floor(r("t") * 4)) + phase));
    const size = lerp(k.size[0], k.size[1], r("s")) * s;
    ctx.globalAlpha = Math.max(0, a);
    if (k.streak) {
      ctx.lineWidth = size; ctx.beginPath(); ctx.moveTo(x * W, y * H); ctx.lineTo(x * W - 3 * s, y * H + k.streak * s); ctx.stroke();
    } else {
      const d = size * 2 * (1 + (k.blur || 0));
      ctx.drawImage(sprite, x * W - d / 2, y * H - d / 2, d, d);
    }
  }
  ctx.restore();
}

/* ---------- Stars ---------- */
function drawStars(ctx, p, W, H) {
  const s = W / 1920;
  ctx.save(); ctx.fillStyle = "white";
  for (let i = 0; i < 260; i++) {
    const r = (q) => random(`star${q}${i}`);
    const tw = 0.55 + 0.45 * Math.sin(TAU * (p * (1 + Math.floor(r("f") * 3)) + r("p")));
    ctx.globalAlpha = (0.15 + r("a") * 0.6) * tw;
    ctx.beginPath(); ctx.arc(r("x") * W, Math.pow(r("y"), 1.6) * H * 0.6, (0.4 + r("s") * 1.1) * s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- Aurora: pre-blurred bands that sway periodically ---------- */
function auroraBand(i, W, H) {
  return texture(`aurora${i}${W}x${H}`, W * 0.6, H * 0.09, (ctx, w, h) => {
    const [c1, c2] = [i === 1 ? [127, 211, 192] : [111, 182, 160], [138, 167, 214]];
    for (let x = 0; x < w; x++) { // horizontal color blend with soft ends
      const t = x / (w - 1), fade = Math.pow(Math.sin(Math.PI * t), 1.5);
      const c = c1.map((v, j) => Math.round(v + (c2[j] - v) * t));
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(0.5, `rgba(${c},${fade})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.fillRect(x, 0, 1, h);
    }
  });
}
function drawAurora(ctx, p, W, H) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const s = Math.sin(TAU * (p + i / 3));
    ctx.globalAlpha = 0.35 * (0.6 + 0.4 * s);
    ctx.setTransform(1, Math.tan(((-4 + s * 3) * Math.PI) / 180), 0, 1, 0, 0);
    ctx.drawImage(auroraBand(i, W, H), -0.1 * W + s * 0.048 * W, (0.08 + i * 0.07) * H, 1.2 * W, 0.18 * H);
  }
  ctx.restore();
}

/* ---------- Light rays ---------- */
function ray(i, W, H) {
  return texture(`ray${i}${W}x${H}`, W * 0.2, H * 0.6, (ctx, w, h) => {
    const rw = 0.2 + (i % 3) * 0.15;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(190,235,230,1)"); g.addColorStop(0.85, "rgba(190,235,230,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // soft horizontal falloff mask (no blur filter, so no hard edges)
    const m = ctx.createLinearGradient(0, 0, w, 0);
    m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(0.5 - rw / 2, "rgba(0,0,0,0.6)"); m.addColorStop(0.5, "rgba(0,0,0,1)");
    m.addColorStop(0.5 + rw / 2, "rgba(0,0,0,0.6)"); m.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-in"; ctx.fillStyle = m; ctx.fillRect(0, 0, w, h);
  });
}
function drawRays(ctx, p, W, H) {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = 0.08 + 0.06 * Math.sin(TAU * (p * (1 + (i % 2)) + i * 0.25));
    ctx.setTransform(1, 0, Math.tan(((-18 + i * 4) * Math.PI) / 180), 1, 0, 0);
    ctx.drawImage(ray(i, W, H), (0.22 + i * 0.12) * W, -0.1 * H, 0.2 * W, 1.2 * H);
  }
  ctx.restore();
}

/* ---------- Film grain: 8 pre-generated noise tiles ---------- */
function grainTexture(n) {
  return texture(`grain${n}`, 256, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    let seed = 1234567 + n * 7919;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const v = 128 + ((seed >> 8) % 256 - 128) * 0.5;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Drop rings for the shader: [x, y, t, size], integer cycles per loop. */
function waterDrops(p, w) {
  const n = Math.round((w.drops ?? 0.4) * 16), out = [];
  for (let i = 0; i < n; i++) {
    const q = (k) => random(`drop${k}${i}`);
    const cycles = 1 + Math.floor(q("c") * 2);
    const t = (((p * cycles + q("p")) % 1) + 1) % 1;
    if (t > 0.7) continue;
    out.push([q("x"), 0.35 + q("y") * 0.65, t / 0.7, 0.6 + q("s") * 0.8]);
  }
  return out;
}

/* ---------- (fallback) Living water: rippling reflection, drop rings and glints, only inside the painted mask ---------- */
const featherCache = new WeakMap();
function featheredMask(mask, W, H) {
  let byKey = featherCache.get(mask);
  if (!byKey) featherCache.set(mask, (byKey = new Map()));
  const key = W + "x" + H;
  if (!byKey.has(key)) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.filter = `blur(${Math.round(6 * W / 1920)}px)`;
    ctx.drawImage(mask, 0, 0, W, H);
    byKey.set(key, c);
  }
  return byKey.get(key);
}
function drawWater(ctx, p, W, H, img, mask, w) {
  const s = W / 1920;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, W, H);
  // cover-fit source rectangle (same framing as the background image)
  const ir = img.width / img.height, r = W / H;
  let sw, sh, sx, sy;
  if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) / 2; }
  // 1. Ripple: thin horizontal strips shifted by slow, broad sine waves (integer cycles → seamless loop).
  //    Waves are finer and smaller far away (top) and a bit larger near the camera (bottom), like real water.
  const A = (w.ripple ?? 0.5) * 2.2 * s, S = Math.max(1, Math.round(1.5 * s));
  if (A > 0) {
    for (let y = 0; y < H; y += S) {
      const v = y / H, near = 0.35 + 0.65 * v;
      const dx = A * near * (Math.sin(TAU * (v * 7 / near + p)) + 0.35 * Math.sin(TAU * (v * 16 / near - p * 2)));
      ctx.drawImage(img, sx, sy + v * sh, sw, sh * S / H, dx, y, W, S);
    }
  } else ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  // 2. Drop rings: expanding, fading ellipses (perspective-flattened)
  const drops = Math.round((w.drops ?? 0.4) * 24);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "white";
  for (let i = 0; i < drops; i++) {
    const q = (k) => random(`drop${k}${i}`);
    const cycles = 1 + Math.floor(q("c") * 2);
    const t = (((p * cycles + q("p")) % 1) + 1) % 1;
    if (t > 0.6) continue; // rest between drops
    const tt = t / 0.6, rad = (8 + tt * 70) * s * (0.6 + q("s") * 0.8);
    ctx.globalAlpha = Math.pow(1 - tt, 1.6) * 0.38;
    ctx.lineWidth = 1.6 * s;
    for (const k of [1, 0.62]) {
      ctx.beginPath(); ctx.ellipse(q("x") * W, (0.35 + q("y") * 0.65) * H, rad * k, rad * k * 0.26, 0, 0, TAU); ctx.stroke();
    }
  }
  // 3. Glints: tiny highlights that twinkle on the surface
  const glints = Math.round((w.shimmer ?? 0.4) * 260);
  ctx.fillStyle = "white";
  for (let i = 0; i < glints; i++) {
    const q = (k) => random(`glint${k}${i}`);
    const tw = Math.max(0, Math.sin(TAU * (p * (1 + Math.floor(q("f") * 4)) + q("p"))));
    ctx.globalAlpha = Math.pow(tw, 6) * 0.55;
    if (ctx.globalAlpha < 0.01) continue;
    ctx.beginPath(); ctx.ellipse(q("x") * W, (0.3 + q("y") * 0.7) * H, (1.6 + q("s") * 2.4) * s, 0.7 * s, 0, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // keep only the painted water area (soft edges)
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(featheredMask(mask, W, H), 0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
}
