import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { renderMediaOnWeb, canRenderMediaOnWeb, getEncodableVideoCodecs } from "@remotion/web-renderer";
import { AmbientLoop } from "../src/AmbientLoop.jsx";
import { defaultProps } from "../src/Root.jsx";
import { muxLoopWithAudio, audioDuration } from "./mux.js";

const KINDS = ["snow", "rain", "dust", "sediment", "stardust", "sparkle"];

/** Config can arrive from the prompt generator via ?cfg=<base64 json>. */
function initialConfig() {
  try {
    const raw = new URLSearchParams(location.search).get("cfg");
    if (raw) return { ...defaultProps, ...JSON.parse(decodeURIComponent(escape(atob(raw)))) };
  } catch {}
  return defaultProps;
}

const fmtTime = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}j ${m}m` : `${m}m ${sec}d`;
};

function App() {
  const [cfg, setCfg] = useState(initialConfig);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageName, setImageName] = useState("");
  const [audio, setAudio] = useState(null);
  const [audioLen, setAudioLen] = useState(0);
  const [status, setStatus] = useState({ stage: "idle" });
  const abortRef = useRef(null);

  const o = cfg.overlays;
  const setO = (patch) => setCfg((c) => ({ ...c, overlays: { ...c.overlays, ...patch } }));
  const inputProps = useMemo(() => ({ ...cfg, image: imageUrl || "" }), [cfg, imageUrl]);
  const durationInFrames = Math.round(cfg.loopSeconds * cfg.fps);

  useEffect(() => () => imageUrl && URL.revokeObjectURL(imageUrl), [imageUrl]);

  const onImage = (f) => { if (!f) return; setImageUrl(URL.createObjectURL(f)); setImageName(f.name); };
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
    try {
      // Choose an MP4-compatible codec the browser can encode.
      const codecs = await getEncodableVideoCodecs("mp4");
      const videoCodec = ["h264", "h265", "av1", "vp9"].find((c) => codecs.includes(c));
      if (!videoCodec) throw new Error("Browser ini tidak bisa meng-encode video. Pakai Chrome atau Edge versi terbaru di desktop.");

      const composition = {
        id: "AmbientLoop", component: AmbientLoop, durationInFrames,
        fps: cfg.fps, width: cfg.width, height: cfg.height,
      };
      const check = await canRenderMediaOnWeb({ container: "mp4", videoCodec, width: cfg.width, height: cfg.height });
      if (!check.canRender) throw new Error(check.issues.map((i) => i.message).join("\n"));

      // Ask for the output file first (needs a user gesture) so long videos stream to disk.
      let writable = null, fileHandle = null;
      if (window.showSaveFilePicker) {
        const name = (audio.name.replace(/\.[^.]+$/, "") || "ambient") + ".mp4";
        fileHandle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: "MP4", accept: { "video/mp4": [".mp4"] } }] });
        writable = await fileHandle.createWritable();
      }

      setStatus({ stage: "render", progress: 0 });
      const { getBlob } = await renderMediaOnWeb({
        composition, inputProps, container: "mp4", videoCodec, muted: true,
        videoBitrate: "very-high", keyframeIntervalInSeconds: 2,
        licenseKey: "free-license", signal: ctrl.signal,
        onProgress: (p) => setStatus({ stage: "render", progress: p.progress }),
      });
      const loopBlob = await getBlob();

      setStatus({ stage: "mux", progress: 0 });
      const blob = await muxLoopWithAudio(loopBlob, audio, {
        writable, signal: ctrl.signal, onProgress: (p) => setStatus({ stage: "mux", progress: p }),
      });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: audio.name.replace(/\.[^.]+$/, "") + ".mp4" });
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      setStatus({ stage: "done", name: fileHandle?.name });
    } catch (e) {
      if (e?.name === "AbortError") setStatus({ stage: "idle" });
      else { console.error(e); setStatus({ stage: "error", message: e?.message || String(e) }); }
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
          <small>{imageName || "PNG / JPG / WEBP dari Nano Banana"}</small>
        </label>
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

        <h2><span className="num">02</span> Overlay</h2>
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
        <Range label="Panjang loop (detik)" v={cfg.loopSeconds} min={10} max={60} step={5} fmt={(v) => v + " d"} onChange={(v) => setCfg((c) => ({ ...c, loopSeconds: v }))} />
      </section>

      <section className="output">
        <div className="panel">
          <div className="out-head"><span>Pratinjau loop</span><small>{cfg.width}×{cfg.height} · {cfg.loopSeconds} d</small></div>
          {imageUrl ? (
            <Player component={AmbientLoop} inputProps={inputProps} durationInFrames={durationInFrames}
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
            Hanya loop {cfg.loopSeconds} detik yang dirender, lalu diulang sepanjang audio tanpa render ulang.
            Semua proses berjalan di browser Anda, tidak ada file yang diunggah. Butuh Chrome atau Edge versi terbaru di desktop.
          </p>
        </div>
      </section>
    </main>
  );
}

function Range({ label, v, min = 0, max, step = 0.01, fmt = (x) => Math.round(x * 100) + "%", onChange }) {
  return (
    <label className="row">
      <span>{label} <b>{fmt(v)}</b></span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

createRoot(document.getElementById("root")).render(<App />);
