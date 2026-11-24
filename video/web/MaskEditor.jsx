import { useEffect, useRef, useState } from "react";

/*
 * Paint where the water is. White = water. The mask is stored as a small PNG data URL (480×270),
 * feathered and scaled up when rendering.
 */
const MW = 480, MH = 270;

export function MaskEditor({ imageUrl, mask, onChange }) {
  const ref = useRef(null);
  const [mode, setMode] = useState("paint");
  const [size, setSize] = useState(28);
  const drawing = useRef(false);

  // Load the existing mask into the canvas once.
  useEffect(() => {
    const ctx = ref.current.getContext("2d");
    ctx.clearRect(0, 0, MW, MH);
    if (mask) { const i = new Image(); i.onload = () => ctx.drawImage(i, 0, 0, MW, MH); i.src = mask; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => onChange(isEmpty() ? null : ref.current.toDataURL("image/png"));
  const isEmpty = () => {
    const d = ref.current.getContext("2d").getImageData(0, 0, MW, MH).data;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 0) return false;
    return true;
  };
  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * MW, ((e.clientY - r.top) / r.height) * MH];
  };
  const dab = (e) => {
    const ctx = ref.current.getContext("2d");
    const [x, y] = pos(e);
    ctx.globalCompositeOperation = mode === "paint" ? "source-over" : "destination-out";
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(x, y, (size / 2) * (MW / 480), 0, Math.PI * 2); ctx.fill();
  };
  const fillBottom = (frac) => {
    const ctx = ref.current.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "white"; ctx.fillRect(0, MH * (1 - frac), MW, MH * frac);
    commit();
  };
  const clear = () => { ref.current.getContext("2d").clearRect(0, 0, MW, MH); commit(); };

  return (
    <div className="mask-editor">
      <div className="mask-stage" style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : "none" }}>
        <canvas ref={ref} width={MW} height={MH}
          onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); dab(e); }}
          onPointerMove={(e) => drawing.current && dab(e)}
          onPointerUp={() => { drawing.current = false; commit(); }} />
      </div>
      <div className="mask-tools">
        <button type="button" className={mode === "paint" ? "active" : ""} onClick={() => setMode("paint")}>Kuas air</button>
        <button type="button" className={mode === "erase" ? "active" : ""} onClick={() => setMode("erase")}>Penghapus</button>
        <label>Ukuran <input type="range" min="8" max="90" value={size} onChange={(e) => setSize(+e.target.value)} /></label>
        <button type="button" onClick={() => fillBottom(0.3)}>Isi 30% bawah</button>
        <button type="button" onClick={clear}>Bersihkan</button>
      </div>
    </div>
  );
}
