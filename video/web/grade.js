/*
 * Color grading applied to the background image pixels (once, before rendering), so the preview
 * and the rendered video match exactly and rendering stays fast.
 */
export const DEFAULT_GRADE = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, fade: 0, shadows: "#808080", shadowAmt: 0, highlights: "#808080", highlightAmt: 0, intensity: 1, sharpen: 0 };

export const PRESETS = {
  none:      { label: "Tanpa grading", ...DEFAULT_GRADE },
  filmic:    { label: "Filmic lembut", contrast: -0.08, saturation: -0.2, fade: 0.35, shadows: "#3a5a66", shadowAmt: 0.25, highlights: "#d8c8a8", highlightAmt: 0.15 },
  tealfog:   { label: "Teal kabut", temperature: -0.25, saturation: -0.25, fade: 0.25, shadows: "#1f4d55", shadowAmt: 0.4, highlights: "#b8d0d0", highlightAmt: 0.15 },
  moonlight: { label: "Cahaya bulan", exposure: -0.25, temperature: -0.55, saturation: -0.35, contrast: 0.05, shadows: "#20304d", shadowAmt: 0.45, highlights: "#c0cce0", highlightAmt: 0.2 },
  bleach:    { label: "Bleach bypass", contrast: 0.25, saturation: -0.6, fade: 0.1, highlights: "#e8e4dc", highlightAmt: 0.1 },
  sepia:     { label: "Debu sepia", temperature: 0.35, saturation: -0.35, fade: 0.3, shadows: "#4a3a2a", shadowAmt: 0.3, highlights: "#e0cba0", highlightAmt: 0.25 },
  coldsteel: { label: "Baja dingin", temperature: -0.35, tint: 0.05, saturation: -0.45, contrast: 0.1, shadows: "#2a3540", shadowAmt: 0.3 },
  ember:     { label: "Bara redup", exposure: -0.15, temperature: 0.25, saturation: -0.2, shadows: "#1c1a24", shadowAmt: 0.35, highlights: "#d08a5a", highlightAmt: 0.25 },
  dreamy:    { label: "Pastel mimpi", exposure: 0.1, contrast: -0.2, saturation: -0.15, fade: 0.5, shadows: "#6a6080", shadowAmt: 0.25, highlights: "#f0dce0", highlightAmt: 0.2 },
  noir:      { label: "Noir hitam-putih", contrast: 0.2, saturation: -1, fade: 0.15 },
};
export const presetFor = (landscape) => ({
  abyssal: "tealfog", desert: "sepia", frozen: "coldsteel", forest: "filmic", alien: "moonlight",
  urban: "bleach", saltflat: "dreamy", volcanic: "ember", coast: "coldsteel", cavern: "filmic",
}[landscape] || "filmic");

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Returns a high-quality JPEG blob of `source` with the grade applied (small and fast to decode while rendering). */
export async function applyGrade(source, grade) {
  const g = { ...DEFAULT_GRADE, ...grade };
  const bmp = await createImageBitmap(source);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0); bmp.close();
  const isNeutral = Object.keys(DEFAULT_GRADE).every((k) => k === "intensity" || k === "sharpen" || g[k] === DEFAULT_GRADE[k]);
  if (!isNeutral && g.intensity > 0) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
    const exp = Math.pow(2, g.exposure), con = 1 + g.contrast, sat = 1 + g.saturation;
    const S = hex(g.shadows).map((v) => (v - 0.5) * g.shadowAmt), H = hex(g.highlights).map((v) => (v - 0.5) * g.highlightAmt);
    const lift = g.fade * 0.12, k = g.intensity;
    const tR = g.temperature * 0.08, tB = -g.temperature * 0.08, tG = -g.tint * 0.06;
    // Pre-compute per-channel curve for exposure/temperature/tint/contrast (fast LUT)
    const lut = [0, 1, 2].map((c) => {
      const off = c === 0 ? tR : c === 1 ? tG : tB;
      return Float32Array.from({ length: 256 }, (_, i) => clamp(((i / 255) * exp + off - 0.5) * con + 0.5));
    });
    for (let i = 0; i < d.length; i += 4) {
      const r0 = d[i] / 255, g0 = d[i + 1] / 255, b0 = d[i + 2] / 255;
      let r = lut[0][d[i]], gg = lut[1][d[i + 1]], b = lut[2][d[i + 2]];
      const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      r = lum + (r - lum) * sat; gg = lum + (gg - lum) * sat; b = lum + (b - lum) * sat;
      const ws = (1 - lum) * (1 - lum), wh = lum * lum;
      r += S[0] * ws + H[0] * wh; gg += S[1] * ws + H[1] * wh; b += S[2] * ws + H[2] * wh;
      r = lift + clamp(r) * (1 - lift); gg = lift + clamp(gg) * (1 - lift); b = lift + clamp(b) * (1 - lift);
      d[i] = (r0 + (r - r0) * k) * 255 + 0.5;
      d[i + 1] = (g0 + (gg - g0) * k) * 255 + 0.5;
      d[i + 2] = (b0 + (b - b0) * k) * 255 + 0.5;
    }
    ctx.putImageData(img, 0, 0);
  }
  if (g.sharpen > 0) sharpen(ctx, canvas.width, canvas.height, g.sharpen);
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.95 });
}

/** Unsharp mask (3×3 box blur), amount 0..1 → 0..1.2 extra local contrast. Restores crispness after upscaling. */
function sharpen(ctx, w, h, amount) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data, src = new Uint8ClampedArray(d);
  const k = amount * 1.2, row = w * 4;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * row + x * 4;
      for (let c = 0; c < 3; c++) {
        const j = i + c;
        const blur = (src[j - row - 4] + src[j - row] + src[j - row + 4] + src[j - 4] + src[j] + src[j + 4] + src[j + row - 4] + src[j + row] + src[j + row + 4]) / 9;
        d[j] = src[j] + (src[j] - blur) * k;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}
