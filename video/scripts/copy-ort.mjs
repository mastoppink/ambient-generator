// Copies the ONNX Runtime WebAssembly files next to the studio bundle.
import fs from "node:fs";
import path from "node:path";
const dir = path.dirname(new URL(import.meta.url).pathname);
const src = path.join(dir, "..", "node_modules", "onnxruntime-web", "dist");
const dst = path.join(dir, "..", "..", "studio", "ort");
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) {
  if (/^ort-wasm-simd-threaded(\.(jsep|asyncify|jspi))?\.(wasm|mjs)$/.test(f)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log("ONNX Runtime files copied to studio/ort/");
