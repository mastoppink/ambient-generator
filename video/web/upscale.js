import * as ort from "onnxruntime-web/webgpu";

/*
 * 4× super-resolution in the browser with Real-ESRGAN General x4v3 (BSD-3, xinntao/Real-ESRGAN),
 * converted to ONNX. Runs on WebGPU when available, otherwise on the CPU (WebAssembly).
 * The image is processed in overlapping tiles to keep GPU memory low, then resized to the target.
 */
const BASE = new URL("./", import.meta.url);
ort.env.wasm.wasmPaths = new URL("ort/", BASE).href;
if (!self.crossOriginIsolated) ort.env.wasm.numThreads = 1;
const MODEL_URL = new URL("../models/realesr-general-x4v3.onnx", BASE).href;
const SCALE = 4, TILE = 192, PAD = 12;

let sessionPromise = null;
async function getSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const eps = "gpu" in navigator ? ["webgpu", "wasm"] : ["wasm"];
      for (const ep of eps) {
        try {
          const s = await ort.InferenceSession.create(MODEL_URL, { executionProviders: [ep], graphOptimizationLevel: "all" });
          return { session: s, backend: ep };
        } catch (e) { console.warn(`ONNX ${ep} gagal`, e); }
      }
      throw new Error("Model upscale tidak bisa dimuat di browser ini.");
    })();
    sessionPromise.catch(() => { sessionPromise = null; });
  }
  return sessionPromise;
}

/**
 * @param {Blob} file  source image
 * @param {{ width:number, height:number, onProgress?:(p:number, info:string)=>void, signal?:AbortSignal }} opts
 * @returns {Promise<{ blob: Blob, width: number, height: number, backend: string }>}
 */
export async function upscaleImage(file, { width, height, onProgress, signal }) {
  const bmp = await createImageBitmap(file);
  const w = bmp.width, h = bmp.height;
  const src = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true });
  src.drawImage(bmp, 0, 0);
  const pixels = src.getImageData(0, 0, w, h).data;

  const { session, backend } = await getSession();
  onProgress?.(0, backend);

  const W = w * SCALE, H = h * SCALE;
  const out = new ImageData(W, H);
  const tilesX = Math.ceil(w / TILE), tilesY = Math.ceil(h / TILE);
  let done = 0;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      if (signal?.aborted) throw new DOMException("Dibatalkan", "AbortError");
      // Tile with padding (clamped to the image)
      const x0 = tx * TILE, y0 = ty * TILE;
      const x1 = Math.min(x0 + TILE, w), y1 = Math.min(y0 + TILE, h);
      const px0 = Math.max(0, x0 - PAD), py0 = Math.max(0, y0 - PAD);
      const px1 = Math.min(w, x1 + PAD), py1 = Math.min(h, y1 + PAD);
      const tw = px1 - px0, th = py1 - py0, plane = tw * th;

      const input = new Float32Array(3 * plane);
      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const si = ((py0 + y) * w + (px0 + x)) * 4, di = y * tw + x;
          input[di] = pixels[si] / 255;
          input[plane + di] = pixels[si + 1] / 255;
          input[2 * plane + di] = pixels[si + 2] / 255;
        }
      }
      const result = await session.run({ input: new ort.Tensor("float32", input, [1, 3, th, tw]) });
      const o = result.output.data, OW = tw * SCALE, OP = OW * th * SCALE;

      // Copy only the un-padded centre of the tile
      const cx0 = (x0 - px0) * SCALE, cy0 = (y0 - py0) * SCALE;
      const cw = (x1 - x0) * SCALE, ch = (y1 - y0) * SCALE;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const si = (cy0 + y) * OW + (cx0 + x);
          const di = ((y0 * SCALE + y) * W + (x0 * SCALE + x)) * 4;
          out.data[di] = Math.max(0, Math.min(255, o[si] * 255 + 0.5));
          out.data[di + 1] = Math.max(0, Math.min(255, o[OP + si] * 255 + 0.5));
          out.data[di + 2] = Math.max(0, Math.min(255, o[2 * OP + si] * 255 + 0.5));
          out.data[di + 3] = 255;
        }
      }
      result.output.dispose?.();
      onProgress?.(++done / (tilesX * tilesY), backend);
    }
  }

  // Resize the 4× result to the target size (cover crop, high-quality downscale).
  const big = new OffscreenCanvas(W, H);
  big.getContext("2d").putImageData(out, 0, 0);
  const s = Math.max(width / W, height / H);
  const dw = W * s, dh = H * s;
  const final = new OffscreenCanvas(width, height);
  const ctx = final.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(big, (width - dw) / 2, (height - dh) / 2, dw, dh);
  const blob = await final.convertToBlob({ type: "image/png" });
  return { blob, width, height, backend };
}
