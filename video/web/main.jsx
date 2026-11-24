import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { renderMediaOnWeb, canRenderMediaOnWeb, getEncodableVideoCodecs } from "@remotion/web-renderer";
import { AmbientFull, segmentFrames } from "../src/Full.jsx";
import { defaultProps } from "../src/Root.jsx";
import { muxLoopWithAudio, audioDuration } from "./mux.js";
import { PRESETS, DEFAULT_GRADE, presetFor, applyGrade } from "./grade.js";

// Video bitrate (bits/s) per resolution and quality. "high" matches YouTube's upload recommendation.
const QUALITIES = {
  high: { label: "Tinggi (rekomendasi upload YouTube)", bps: { 1080: 12e6, 1440: 24e6, 2160: 40e6 } },
  balanced: { label: "Seimbang (disarankan)", bps: { 1080: 6e6, 1440: 10e6, 2160: 16e6 } },
  small: { label: "Hemat (file kecil)", bps: { 1080: 3e6, 1440: 5e6, 2160: 8e6 } },
};
const fmtSize = (bytes) => (bytes > 1e9 ? (bytes / 1e9).toFixed(1) + " GB" : Math.round(bytes / 1e6) + " MB");

const RESOLUTIONS = { "1080": { label: "1080p (Full HD)", scale: 1 }, "1440": { label: "1440p (2K)", scale: 4 / 3 }, "2160": { label: "2160p (4K)", scale: 2 } };

const KINDS = ["snow", "rain", "dust", "sediment", "stardust", "sparkle"];

/** Config can arrive from the prompt generator via ?cfg=<base64 json>. */
function initialConfig() {
  let c = defaultProps;
  try {
    const raw = new URLSearchParams(location.search).get("cfg");
    if (raw) c = { ...defaultProps, ...JSON.parse(decodeURIComponent(escape(atob(raw)))) };
  } catch {}
  // Intro text from the audio title: "Aurora · Weightless Ambient for Sleep" → title "Aurora", subtitle the rest.
  const [t, ...rest] = (c.title || "").split(/\s*[·|—–-]\s+/);
  return {
    ...c,
    loopSeconds: Math.max(10, Math.round(c.loopSeconds / 2) * 2),
    intro: { enabled: true, seconds: 8, title: t || "Ambient", subtitle: rest.join(" · "), channel: "", ...c.intro },
    cta: { enabled: true, text: "If this stillness keeps you company,", button: "Subscribe for more", start: 2, hold: 8, firstMin: 1, everyMin: 10, ...c.cta },
  };
}

const fmtTime = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}j ${m}m` : `${m}m ${sec}d`;
};

function App() {
  const [cfg, setCfg] = useState(initialConfig);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageName, setImageName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [origFile, setOrigFile] = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const [up, setUp] = useState({ stage: "idle" });
  const [quality, setQuality] = useState("balanced");
  const [upModel, setUpModel] = useState(() => ("gpu" in navigator ? "max" : "fast"));
  const [resolution, setResolution] = useState(() => (initialConfig().scale === 1 ? "1080" : "2160"));
  const [audio, setAudio] = useState(null);
  const [audioLen, setAudioLen] = useState(0);
  const [status, setStatus] = useState({ stage: "idle" });
  const abortRef = useRef(null);

  const o = cfg.overlays;
  const setO = (patch) => setCfg((c) => ({ ...c, overlays: { ...c.overlays, ...patch } }));
  const inputProps = useMemo(() => ({ ...cfg, image: imageUrl || "" }), [cfg, imageUrl]);
  const seg = segmentFrames(cfg);
  const durationInFrames = seg.total;
  const [previewPart, setPreviewPart] = useState("loop");
  const setIntro = (patch) => setCfg((c) => ({ ...c, intro: { ...c.intro, ...patch } }));
  const setCta = (patch) => setCfg((c) => ({ ...c, cta: { ...c.cta, ...patch } }));
  const range = previewPart === "intro" && seg.I ? [0, seg.I - 1]
    : previewPart === "cta" && seg.C ? [seg.I + seg.L, seg.total - 1]
    : [seg.I, seg.I + seg.L - 1];


  const [preset, setPreset] = useState(() => presetFor(initialConfig().landscape));
  const [grade, setGrade] = useState(() => ({ ...DEFAULT_GRADE, ...PRESETS[presetFor(initialConfig().landscape)] }));
  const [grading, setGrading] = useState(false);
  const gradedBlobRef = useRef(null);
  const setG = (patch) => { setPreset("custom"); setGrade((g) => ({ ...g, ...patch })); };
  const choosePreset = (k) => { setPreset(k); setGrade((g) => ({ ...DEFAULT_GRADE, ...PRESETS[k], intensity: g.intensity })); };

  // Re-grade the current base image whenever it or the grade changes (debounced).
  useEffect(() => {
    if (!imageFile) return;
    let cancelled = false;
    setGrading(true);
    const t = setTimeout(async () => {
      try {
        const blob = await applyGrade(imageFile, grade);
        if (cancelled) return;
        gradedBlobRef.current = blob;
        // Revoke the previous preview URL later, never while something may still be loading it.
        setImageUrl((old) => { if (old) setTimeout(() => URL.revokeObjectURL(old), 30000); return URL.createObjectURL(blob); });
      } finally { if (!cancelled) setGrading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [imageFile, grade]);

  const useImage = async (blob, name) => {
    setImageName(name); setImageFile(blob);
    try { const b = await createImageBitmap(blob); setImageSize([b.width, b.height]); b.close(); } catch { setImageSize(null); }
  };
  const onImage = (f) => { if (!f) return; setUp({ stage: "idle" }); setOrigFile(f); useImage(f, f.name); };

  async function upscale() {
    if (!origFile) return;
    const target = { width: Math.round(cfg.width * 2), height: Math.round(cfg.height * 2) };
    setUp({ stage: "run", progress: 0 });
    try {
      const { upscaleImage } = await import("./upscale.js");
      const r = await upscaleImage(origFile, { ...target, model: upModel, onProgress: (p, backend) => setUp({ stage: "run", progress: p, backend }) });
      const name = origFile.name.replace(/\.[^.]+$/, "") + "-4k.png";
      await useImage(r.blob, name);
      setUp({ stage: "done", url: URL.createObjectURL(r.blob), name, backend: r.backend });
    } catch (e) {
      console.error(e); setUp({ stage: "error", message: e?.message || String(e) });
    }
  }
  const onAudio = async (f) => {
    if (!f) return;
    setAudio(f); setAudioLen(0);
    try { setAudioLen(await audioDuration(f)); } catch { setAudioLen(-1); }
  };
  const onConfig = async (f) => {
    if (!f) return;
    try { const j = JSON.parse(await f.text()); setCfg((c) => ({ ...c, ...j, image: c.image })); }
    catch { alert("File config tidak valid."); }
  };

  async function render() {
    if (!imageUrl || !audio) return;
    const ctrl = new AbortController(); abortRef.current = ctrl;
    let step = "menyiapkan render", writable = null, fileHandle = null;
    try {
      // Choose an MP4-compatible codec the browser can encode.
      const codecs = await getEncodableVideoCodecs("mp4");
      const videoCodec = ["h264", "h265", "av1", "vp9"].find((c) => codecs.includes(c));
      if (!videoCodec) throw new Error("Browser ini tidak bisa meng-encode video. Pakai Chrome atau Edge versi terbaru di desktop.");

      const composition = {
        id: "AmbientFull", component: AmbientFull, durationInFrames,
        fps: cfg.fps, width: cfg.width, height: cfg.height,
      };
      const scale = RESOLUTIONS[resolution].scale;
      const check = await canRenderMediaOnWeb({ container: "mp4", videoCodec, width: Math.round(cfg.width * scale), height: Math.round(cfg.height * scale) });
      if (!check.canRender) throw new Error(check.issues.map((i) => i.message).join("\n"));

      // Ask for the output file first (needs a user gesture) so long videos stream to disk.
      step = "membuka file tujuan";
      if (window.showSaveFilePicker) {
        const name = (audio.name.replace(/\.[^.]+$/, "") || "ambient") + ".mp4";
        fileHandle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: "MP4", accept: { "video/mp4": [".mp4"] } }] });
        writable = await fileHandle.createWritable();
      }

      // Read the source files into memory now: files on cloud-synced folders (Drive, OneDrive, iCloud),
      // network drives or USB sticks can fail mid-way with "network error" when read lazily.
      step = "membaca file audio";
      setStatus({ stage: "render", progress: 0 });
      const audioData = audio.size < 1.5e9 ? new File([await audio.arrayBuffer()], audio.name, { type: audio.type }) : audio;
      step = "membaca file gambar";
      const imageData = gradedBlobRef.current || new Blob([await imageFile.arrayBuffer()], { type: imageFile.type });

      step = "render loop";
      // A dedicated URL that stays valid for the whole render, whatever happens to the preview.
      const renderImageUrl = URL.createObjectURL(imageData);
      const renderProps = { ...inputProps, image: renderImageUrl, renderScale: scale };
      const { getBlob } = await renderMediaOnWeb({
        composition, inputProps: renderProps, container: "mp4", videoCodec, muted: true, scale,
        videoBitrate: QUALITIES[quality].bps[resolution], keyframeIntervalInSeconds: 2,
        licenseKey: "free-license", signal: ctrl.signal,
        onProgress: (p) => setStatus({ stage: "render", progress: p.progress }),
      });
      const loopBlob = await getBlob();
      URL.revokeObjectURL(renderImageUrl);

      step = "menggabungkan video dengan audio";
      setStatus({ stage: "mux", progress: 0 });
      const blob = await muxLoopWithAudio(loopBlob, audioData, {
        segments: {
          intro: seg.I / cfg.fps, loop: seg.L / cfg.fps,
          cta: seg.C ? { first: cfg.cta.firstMin * 60, every: Math.max(1, cfg.cta.everyMin) * 60 } : undefined,
        },
        writable, signal: ctrl.signal, onProgress: (p) => setStatus({ stage: "mux", progress: p }),
      });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: audio.name.replace(/\.[^.]+$/, "") + ".mp4" });
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      setStatus({ stage: "done", name: fileHandle?.name });
    } catch (e) {
      try { await writable?.abort(); } catch {}
      if (e?.name === "AbortError") setStatus({ stage: "idle" });
      else {
        console.error(e);
        const raw = e?.message || String(e);
        const fileIssue = /network error|NotReadable|could not be read|NotFound/i.test(raw + " " + (e?.name || ""));
        const hint = fileIssue
          ? "\nFile tidak bisa dibaca oleh browser. Salin gambar dan audio ke folder lokal (mis. Desktop, bukan Google Drive/OneDrive/iCloud, drive jaringan atau flashdisk), pilih ulang file-nya, lalu render lagi."
          : "";
        setStatus({ stage: "error", message: `Gagal saat ${step}: ${raw}${hint}` });
      }
    } finally { abortRef.current = null; }
  }

  const busy = status.stage === "render" || status.stage === "mux";
  const pct = Math.round((status.progress || 0) * 100);

  return (
    <main className="studio">
      <section className="controls">
        <h2><span className="num">01</span> File</h2>
        <label className="file">
          <span>Gambar latar</span>
          <input type="file" accept="image/*" onChange={(e) => onImage(e.target.files[0])} />
          <small>{imageName ? `${imageName}${imageSize ? ` · ${imageSize[0]}×${imageSize[1]}` : ""}` : "PNG / JPG / WEBP dari Nano Banana"}</small>
        </label>
        {imageFile && up.stage === "idle" && imageSize && imageSize[0] >= cfg.width * 2 && imageSize[1] >= cfg.height * 2 && (
          <p className="ok upscale">✔ Gambar sudah 4K, tidak perlu upscale.</p>
        )}
        {imageFile && !(up.stage === "idle" && imageSize && imageSize[0] >= cfg.width * 2 && imageSize[1] >= cfg.height * 2) && (
          <div className="upscale">
            {up.stage !== "run" && (
              <select value={upModel} onChange={(e) => setUpModel(e.target.value)}>
                <option value="max">Detail maksimal · Real-ESRGAN x4plus (67 MB, butuh GPU)</option>
                <option value="fast">Cepat · Real-ESRGAN General x4v3 (5 MB)</option>
              </select>
            )}
            {up.stage !== "run"
              ? <button type="button" onClick={upscale}>{up.stage === "done" ? "Upscale ulang dari gambar asli" : "Upscale ke 4K (Real-ESRGAN)"}</button>
              : <div className="progress"><div className="bar"><div style={{ width: Math.round(up.progress * 100) + "%" }} /></div>
                  <small>Upscale {Math.round(up.progress * 100)}% · {up.backend === "webgpu" ? "GPU (WebGPU)" : up.backend ? "CPU (lambat, " + (upModel === "max" ? "bisa >10 menit" : "1–2 menit") + ")" : upModel === "max" ? "mengunduh model 67 MB…" : "memuat model…"}</small></div>}
            {up.stage === "done" && <p className="ok" style={{ margin: 0 }}>✔ Gambar 4K dipakai untuk video</p>}
            {imageUrl && <a className="dl" href={imageUrl} download={(imageName || "background").replace(/\.[^.]+$/, "") + "-graded.jpg"}>Unduh gambar (dengan grading)</a>}
            {up.stage === "error" && <p className="err">✖ {up.message}</p>}
          </div>
        )}
        <label className="file">
          <span>Audio</span>
          <input type="file" accept="audio/*,.flac,.wav,.m4a" onChange={(e) => onAudio(e.target.files[0])} />
          <small>{audio ? `${audio.name}${audioLen > 0 ? ` · ${fmtTime(audioLen)}` : audioLen < 0 ? " · tidak terbaca" : ""}` : "MP3 / WAV / FLAC / M4A"}</small>
        </label>
        <label className="file">
          <span>Config (opsional)</span>
          <input type="file" accept=".json,application/json" onChange={(e) => onConfig(e.target.files[0])} />
          <small>video-config.json dari generator, atau atur manual di bawah</small>
        </label>

        <h2><span className="num">02</span> Color Grading</h2>
        <div className="grid2">
          <label className="row"><span>Preset</span>
            <select value={preset} onChange={(e) => choosePreset(e.target.value)}>
              {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
              {preset === "custom" && <option value="custom">Custom</option>}
            </select></label>
          <Range label="Intensitas" v={grade.intensity} max={1} onChange={(v) => setGrade((g) => ({ ...g, intensity: v }))} />
        </div>
        <details className="adv">
          <summary>Atur manual {grading && <small>· memproses…</small>}</summary>
          <div className="grid2">
            <Range label="Exposure" v={grade.exposure} min={-1} max={1} fmt={sig} onChange={(v) => setG({ exposure: v })} />
            <Range label="Kontras" v={grade.contrast} min={-0.5} max={0.5} fmt={sig} onChange={(v) => setG({ contrast: v })} />
            <Range label="Saturasi" v={grade.saturation} min={-1} max={0.5} fmt={sig} onChange={(v) => setG({ saturation: v })} />
            <Range label="Suhu (biru ↔ hangat)" v={grade.temperature} min={-1} max={1} fmt={sig} onChange={(v) => setG({ temperature: v })} />
            <Range label="Tint (hijau ↔ magenta)" v={grade.tint} min={-1} max={1} fmt={sig} onChange={(v) => setG({ tint: v })} />
            <Range label="Fade (hitam pudar)" v={grade.fade} max={1} onChange={(v) => setG({ fade: v })} />
            <label className="row"><span>Warna bayangan</span><input type="color" value={grade.shadows} onChange={(e) => setG({ shadows: e.target.value })} /></label>
            <Range label="Kekuatan bayangan" v={grade.shadowAmt} max={1} onChange={(v) => setG({ shadowAmt: v })} />
            <label className="row"><span>Warna highlight</span><input type="color" value={grade.highlights} onChange={(e) => setG({ highlights: e.target.value })} /></label>
            <Range label="Kekuatan highlight" v={grade.highlightAmt} max={1} onChange={(v) => setG({ highlightAmt: v })} />
          </div>
        </details>

        <h2><span className="num">03</span> Intro &amp; CTA</h2>
        <label className="toggle"><input type="checkbox" checked={cfg.intro.enabled} onChange={(e) => setIntro({ enabled: e.target.checked })} /> Intro (judul di awal video)</label>
        {cfg.intro.enabled && (
          <div className="grid2" style={{ margin: "10px 0 16px" }}>
            <label className="row"><span>Judul</span><input className="custom" value={cfg.intro.title} onChange={(e) => setIntro({ title: e.target.value })} /></label>
            <label className="row"><span>Subjudul</span><input className="custom" value={cfg.intro.subtitle} onChange={(e) => setIntro({ subtitle: e.target.value })} /></label>
            <label className="row"><span>Nama channel (opsional)</span><input className="custom" value={cfg.intro.channel} onChange={(e) => setIntro({ channel: e.target.value })} /></label>
            <label className="row"><span>Durasi intro</span>
              <select value={cfg.intro.seconds} onChange={(e) => setIntro({ seconds: +e.target.value })}>
                {[6, 8, 10, 12].map((s) => <option key={s} value={s}>{s} detik</option>)}
              </select></label>
          </div>
        )}
        <label className="toggle"><input type="checkbox" checked={cfg.cta.enabled} onChange={(e) => setCta({ enabled: e.target.checked })} /> CTA Subscribe (muncul berkala)</label>
        {cfg.cta.enabled && (
          <div className="grid2" style={{ margin: "10px 0 16px" }}>
            <label className="row"><span>Teks ajakan</span><input className="custom" value={cfg.cta.text} onChange={(e) => setCta({ text: e.target.value })} /></label>
            <label className="row"><span>Tombol</span><input className="custom" value={cfg.cta.button} onChange={(e) => setCta({ button: e.target.value })} /></label>
            <label className="row"><span>Pertama muncul (menit ke-)</span><input className="custom" type="number" min="0" step="0.5" value={cfg.cta.firstMin} onChange={(e) => setCta({ firstMin: Math.max(0, +e.target.value) })} /></label>
            <label className="row"><span>Ulangi setiap (menit)</span><input className="custom" type="number" min="1" step="1" value={cfg.cta.everyMin} onChange={(e) => setCta({ everyMin: Math.max(1, +e.target.value) })} /></label>
          </div>
        )}

        <h2><span className="num">04</span> Overlay</h2>
        <div className="grid2">
          <Range label="Kabut" v={o.fog?.opacity ?? 0} max={0.6} onChange={(v) => setO({ fog: { ...o.fog, opacity: v } })} />
          <label className="row"><span>Warna kabut</span><input type="color" value={o.fog?.color || "#ffffff"} onChange={(e) => setO({ fog: { ...o.fog, color: e.target.value } })} /></label>
          <label className="row"><span>Partikel</span>
            <select value={o.particles?.kind || "dust"} onChange={(e) => setO({ particles: { ...o.particles, kind: e.target.value } })}>
              {KINDS.map((k) => <option key={k}>{k}</option>)}
            </select></label>
          <Range label="Jumlah partikel" v={o.particles?.count ?? 0} max={400} step={10} fmt={(v) => v} onChange={(v) => setO({ particles: { ...o.particles, count: v } })} />
          <Range label="Film grain" v={o.grain} max={0.12} onChange={(v) => setO({ grain: v })} />
          <Range label="Vignette" v={o.vignette} max={0.9} onChange={(v) => setO({ vignette: v })} />
          <Range label="Slow zoom" v={o.zoom} max={0.12} onChange={(v) => setO({ zoom: v })} />
          <Range label="Cahaya bernapas" v={o.breathe} max={0.1} onChange={(v) => setO({ breathe: v })} />
        </div>
        <div className="checks">
          {[["stars", "Bintang"], ["aurora", "Aurora"], ["rays", "God rays"]].map(([k, l]) => (
            <label key={k} className="toggle"><input type="checkbox" checked={!!o[k]} onChange={(e) => setO({ [k]: e.target.checked })} /> {l}</label>
          ))}
        </div>
        <label className="row" style={{ marginBottom: 12 }}><span>Resolusi video</span>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            {Object.entries(RESOLUTIONS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </select></label>
        <label className="row" style={{ marginBottom: 12 }}><span>Kualitas file {audioLen > 0 && <b>· perkiraan {fmtSize((QUALITIES[quality].bps[resolution] + 320e3) * audioLen / 8)}</b>}</span>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            {Object.entries(QUALITIES).map(([k, q]) => <option key={k} value={k}>{q.label} · {Math.round(q.bps[resolution] / 1e6)} Mbps</option>)}
          </select></label>
        <Range label="Panjang loop (detik)" v={cfg.loopSeconds} min={10} max={60} step={2} fmt={(v) => v + " d"} onChange={(v) => setCfg((c) => ({ ...c, loopSeconds: v }))} />
      </section>

      <section className="output">
        <div className="panel">
          <div className="seg-tabs">
            {[["loop", "Loop"], ["intro", "Intro"], ["cta", "CTA Subscribe"]].map(([k, l]) => (
              <button key={k} type="button" className={previewPart === k ? "active" : ""} disabled={(k === "intro" && !seg.I) || (k === "cta" && !seg.C)} onClick={() => setPreviewPart(k)}>{l}</button>
            ))}
          </div>
          <div className="out-head"><span>Pratinjau</span><small>render {Math.round(cfg.width * RESOLUTIONS[resolution].scale)}×{Math.round(cfg.height * RESOLUTIONS[resolution].scale)} · loop {cfg.loopSeconds} d</small></div>
          {imageUrl ? (
            <Player key={previewPart + range.join("-")} component={AmbientFull} inputProps={inputProps} durationInFrames={durationInFrames}
              inFrame={range[0]} outFrame={range[1]}
              fps={cfg.fps} compositionWidth={cfg.width} compositionHeight={cfg.height}
              style={{ width: "100%", borderRadius: 8, overflow: "hidden" }} autoPlay loop controls />
          ) : <div className="placeholder">Pilih gambar latar untuk melihat pratinjau</div>}
          <div className="actions">
            {!busy
              ? <button className="primary" disabled={!imageUrl || !audio} onClick={render}>Render Video</button>
              : <button onClick={() => abortRef.current?.abort()}>Batalkan</button>}
          </div>
          {busy && (
            <div className="progress">
              <div className="bar"><div style={{ width: pct + "%" }} /></div>
              <small>{status.stage === "render" ? `1/2 · Render loop ${pct}%` : `2/2 · Menggabungkan dengan audio ${pct}%`}</small>
            </div>
          )}
          {status.stage === "done" && <p className="ok">✔ Selesai{status.name ? `: ${status.name} tersimpan` : ", file terunduh"}.</p>}
          {status.stage === "error" && <p className="err">✖ {status.message}</p>}
          <p className="hint">
            Yang dirender hanya {[seg.I && "intro", "1 loop", seg.C && "1 loop CTA"].filter(Boolean).join(" + ")} ({Math.round(seg.total / cfg.fps)} detik), lalu loop diulang sepanjang audio tanpa render ulang.
            Untuk 4K, upscale gambar dulu agar detailnya tajam. Semua proses berjalan di browser Anda, tidak ada file yang diunggah. Butuh Chrome atau Edge versi terbaru di desktop.
          </p>
        </div>
      </section>
    </main>
  );
}

const sig = (v) => (v > 0 ? "+" : "") + Math.round(v * 100);

function Range({ label, v, min = 0, max, step = 0.01, fmt = (x) => Math.round(x * 100) + "%", onChange }) {
  return (
    <label className="row">
      <span>{label} <b>{fmt(v)}</b></span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

createRoot(document.getElementById("root")).render(<App />);
