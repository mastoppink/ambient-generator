/*
 * Realistic water for the painted mask, rendered with WebGL:
 * a surface built from several directional waves (perspective-scaled), whose slope refracts the
 * reflection and produces specular glints; drop rings are radial waves that bend the reflection too.
 * All motion uses integer cycles of the loop phase, so it loops seamlessly.
 */
const VERT = `attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uImg; uniform sampler2D uMask; uniform sampler2D uNoise;
uniform vec4 uCover; uniform float uAspect; uniform float uP;
uniform float uRipple; uniform float uShimmer;
uniform vec4 uDrops[16]; uniform int uDropCount;

// Slope of the water surface. uNoise (tileable): RG = slope of a random multi-wave height field, B = low-frequency field.
// Scrolling by whole tiles per loop keeps everything seamless.
vec2 slope(vec2 uv) {
  float depth = mix(0.2, 1.0, clamp(uv.y, 0.0, 1.0));             // far = smaller, denser ripples
  vec2 q = vec2(uv.x * uAspect, uv.y * 3.0) / depth;                // flattened by perspective
  vec2 a = texture2D(uNoise, q * 0.55 + vec2(uP * 1.0, uP * 0.0)).rg * 2.0 - 1.0;
  vec2 b = texture2D(uNoise, q * 1.35 + vec2(-uP * 2.0, uP * 1.0)).rg * 2.0 - 1.0;
  vec2 c = texture2D(uNoise, q * 3.1 + vec2(uP * 3.0, -uP * 2.0)).rg * 2.0 - 1.0;
  // calm vs. stirred patches drifting slowly across the surface
  float calm = texture2D(uNoise, uv * vec2(0.6, 0.9) + vec2(uP, 0.0)).b;
  calm = smoothstep(0.25, 0.85, calm) * 0.85 + 0.15;
  vec2 g = (a * 1.0 + b * 0.55 + c * 0.25) * calm;
  // drop rings: a few concentric wavelets behind the leading ring, decaying with distance and time
  for (int j = 0; j < 16; j++) {
    if (j >= uDropCount) break;
    vec4 D = uDrops[j];                                              // x, y, t (0..1), size
    vec2 dv = vec2((uv.x - D.x) * uAspect, (uv.y - D.y) * 3.2) / mix(0.2, 1.0, D.y);
    float dist = length(dv), r = D.z * 0.14 * D.w;
    float behind = r - dist;                                         // > 0 inside the leading ring
    float env = exp(-pow(behind / (0.03 + 0.05 * D.z), 2.0)) * step(-0.012, behind) * pow(1.0 - D.z, 1.4);
    g += normalize(dv + 1e-5) * sin(behind * 150.0) * env * 6.5 * (1.0 + 2.0 * exp(-dist * 30.0) * (1.0 - D.z));
  }
  return g * depth;
}

void main() {
  float m = texture2D(uMask, vUv).r;
  if (m < 0.003) { gl_FragColor = vec4(0.0); return; }
  vec2 g = slope(vUv);
  vec2 off = vec2(g.x * 0.0032, g.y * 0.0095) * uRipple;             // reflections wobble mostly vertically
  vec2 uv = clamp(vUv + off, 0.0, 1.0);
  vec3 col = texture2D(uImg, uCover.xy + uv * uCover.zw).rgb;
  col *= 1.0 + dot(g, vec2(0.2, 0.98)) * 0.10 * uRipple;             // soft light/dark from the slope
  vec3 n = normalize(vec3(-g * 0.08 * uRipple, 1.0));
  float spec = pow(max(dot(n, normalize(vec3(0.0, -0.3, 1.0))), 0.0), 260.0);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += spec * uShimmer * (0.2 + 1.2 * lum) * vec3(1.0, 0.98, 0.95);
  col = clamp(mix(col, col * vec3(0.92, 0.96, 1.0), 0.25 * m), 0.0, 1.0);
  gl_FragColor = vec4(col * m, m);
}`;

/** 256×256 tileable noise: RG = slope of a sum of random integer-frequency waves, B = a low-frequency field. */
function makeNoise() {
  const N = 256, data = new Uint8Array(N * N * 4);
  let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const waves = [];
  while (waves.length < 40) {
    const kx = Math.round((rnd() * 2 - 1) * 9), ky = Math.round((rnd() * 2 - 1) * 9);
    const k = Math.hypot(kx, ky); if (k < 1.5) continue;
    waves.push([kx, ky, rnd() * Math.PI * 2, 1 / Math.pow(k, 1.6)]);
  }
  const low = []; for (let i = 0; i < 6; i++) low.push([Math.round(rnd() * 4 - 2) || 1, Math.round(rnd() * 4 - 2), rnd() * 6.283]);
  let maxG = 0; const gx = new Float32Array(N * N), gy = new Float32Array(N * N), lo = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let sx = 0, sy = 0, l = 0;
    for (const [kx, ky, ph, a] of waves) { const c = Math.cos(2 * Math.PI * (kx * x + ky * y) / N + ph) * a; sx += c * kx; sy += c * ky; }
    for (const [kx, ky, ph] of low) l += Math.sin(2 * Math.PI * (kx * x + ky * y) / N + ph);
    const i = y * N + x; gx[i] = sx; gy[i] = sy; lo[i] = l; maxG = Math.max(maxG, Math.abs(sx), Math.abs(sy));
  }
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = 128 + 127 * gx[i] / maxG; data[i * 4 + 1] = 128 + 127 * gy[i] / maxG;
    data[i * 4 + 2] = 128 + 127 * Math.max(-1, Math.min(1, lo[i] / 3)); data[i * 4 + 3] = 255;
  }
  return { N, data };
}

export function createWater(canvas) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: true });
  if (!gl) return null;
  let lost = false;
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost = true; });
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
  // Images larger than the GPU texture limit (or than needed) are downscaled once before upload.
  const fit = (img) => {
    const limit = Math.min(maxTex, Math.max(canvas.width, 2048));
    if (img.width <= limit && img.height <= limit) return img;
    const k = limit / Math.max(img.width, img.height);
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  };
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const tex = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const imgTex = tex(0), maskTex = tex(1), noiseTex = tex(2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  const nz = makeNoise();
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, nz.N, nz.N, 0, gl.RGBA, gl.UNSIGNED_BYTE, nz.data);
  gl.uniform1i(U("uImg"), 0); gl.uniform1i(U("uMask"), 1); gl.uniform1i(U("uNoise"), 2);
  let lastImg = null, lastMask = null, lastFit = null;

  return {
    get ok() { return !lost && !gl.isContextLost(); },
    draw({ img, mask, p, w, drops }) {
      if (lost || gl.isContextLost()) throw new Error("WebGL context lost");
      const W = canvas.width, H = canvas.height;
      gl.viewport(0, 0, W, H);
      if (img !== lastImg) { lastImg = img; img = fit(img); lastFit = img; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, imgTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); }
      else img = lastFit;
      if (mask !== lastMask) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask); lastMask = mask; }
      // cover-fit source rectangle in normalized image coordinates
      const ir = img.width / img.height, r = W / H;
      const cover = ir > r ? [(1 - r / ir) / 2, 0, r / ir, 1] : [0, (1 - ir / r) / 2, 1, ir / r];
      gl.uniform4fv(U("uCover"), cover);
      gl.uniform1f(U("uAspect"), W / H);
      gl.uniform1f(U("uP"), p);
      gl.uniform1f(U("uRipple"), w.ripple ?? 0.5);
      gl.uniform1f(U("uShimmer"), (w.shimmer ?? 0.4) * 1.5);
      const arr = new Float32Array(64); drops.slice(0, 16).forEach((d, i) => arr.set(d, i * 4));
      gl.uniform4fv(U("uDrops"), arr); gl.uniform1i(U("uDropCount"), Math.min(16, drops.length));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const err = gl.getError();
      if (err !== gl.NO_ERROR) throw new Error("WebGL error " + err);
    },
  };
}
