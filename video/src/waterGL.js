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
uniform sampler2D uImg; uniform sampler2D uMask;
uniform vec4 uCover; uniform float uAspect; uniform float uP;
uniform float uRipple; uniform float uShimmer;
uniform vec4 uDrops[16]; uniform int uDropCount;
const float TAU = 6.2831853;

// slope (gradient) of the water height at a point, in perspective-corrected surface space
vec2 slope(vec2 uv) {
  float depth = mix(0.22, 1.0, clamp(uv.y, 0.0, 1.0));          // farther (top) = smaller, denser waves
  vec2 q = vec2(uv.x * uAspect, uv.y * 3.2) / depth;             // squash vertically: ripples look flat
  vec2 g = vec2(0.0);
  // a few directional waves: (dir.x, dir.y, wavenumber, temporal cycles)
  vec4 W[7];
  W[0] = vec4( 0.98,  0.20, 11.0,  4.0);
  W[1] = vec4(-0.90,  0.44, 17.0, -6.0);
  W[2] = vec4( 0.60,  0.80, 23.0,  7.0);
  W[3] = vec4(-0.35,  0.94, 31.0, -9.0);
  W[4] = vec4( 0.99, -0.10, 43.0, 11.0);
  W[5] = vec4(-0.75, -0.66, 57.0, -13.0);
  W[6] = vec4( 0.20,  0.98, 71.0, 16.0);
  for (int i = 0; i < 7; i++) {
    vec2 d = normalize(W[i].xy); float k = W[i].z;
    float ph = dot(d, q) * k + TAU * W[i].w * uP + float(i) * 1.7;
    g += d * cos(ph) * (1.0 / k) * k * 0.9 / (1.0 + float(i) * 0.35); // amplitude ∝ 1/k → slope ∝ const, softened
  }
  // drop rings: radial waves that grow and fade
  for (int j = 0; j < 16; j++) {
    if (j >= uDropCount) break;
    vec4 D = uDrops[j];                       // x, y, t (0..1), size
    vec2 dv = vec2((uv.x - D.x) * uAspect, (uv.y - D.y) * 3.4) / mix(0.22, 1.0, D.y);
    float dist = length(dv); float r = D.z * 0.16 * D.w;
    float env = exp(-pow((dist - r) / (0.02 + 0.035 * D.z), 2.0)) * pow(1.0 - D.z, 1.3);
    g += normalize(dv + 1e-5) * sin((dist - r) * 170.0) * env * 4.5;
  }
  return g * depth;
}

void main() {
  float m = texture2D(uMask, vUv).r;
  if (m < 0.003) { gl_FragColor = vec4(0.0); return; }
  vec2 g = slope(vUv);
  // refraction/reflection offset: stronger vertical wobble, like real reflections
  vec2 off = vec2(g.x * 0.0024, g.y * 0.0065) * uRipple;
  vec2 uv = clamp(vUv + off, 0.0, 1.0);
  vec3 col = texture2D(uImg, uCover.xy + uv * uCover.zw).rgb;
  // specular glints where the tilted surface catches the light; stronger on bright reflections
  vec3 n = normalize(vec3(-g * 0.06 * uRipple, 1.0));
  float spec = pow(max(dot(n, normalize(vec3(0.0, -0.32, 1.0))), 0.0), 220.0);
  // soft light/dark shading from the surface slope: makes ripples readable even on dark reflections
  col *= 1.0 + dot(g, vec2(0.25, 0.97)) * 0.06 * uRipple;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += spec * uShimmer * (0.25 + 1.2 * lum) * vec3(1.0, 0.98, 0.95);
  // slightly darker, cooler water (Fresnel-ish) so it reads as a surface
  col = clamp(mix(col, col * vec3(0.92, 0.96, 1.0), 0.25 * m), 0.0, 1.0);
  gl_FragColor = vec4(col * m, m); // valid premultiplied alpha (color never exceeds alpha)
}`;

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
  const imgTex = tex(0), maskTex = tex(1);
  gl.uniform1i(U("uImg"), 0); gl.uniform1i(U("uMask"), 1);
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
