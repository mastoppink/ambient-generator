# Dark Ambient Prompt Generator

Web statis untuk merakit prompt gambar bertema **kenopsia, megalophobia, liminal space, dan dark ambient** dari master template.

## Fitur
- Prompt khusus **Nano Banana** (Gemini image): kalimat naratif, bukan daftar kata kunci; larangan ditulis sebagai deskripsi (tanpa negative prompt); aspect ratio disebut dalam teks
- Dioptimalkan untuk latar musik ambient: subjek jelas sebagai titik fokus (sepertiga tinggi frame, siluet dipisahkan cahaya samar), elemen latar depan yang menuntun mata, ruang kosong lega, cahaya redup, kontras rendah
- 10 landscape dengan thumbnail (Abyssal, Desert, Frozen, Forest, Alien, Urban, Salt Flat, Volcanic, Foggy Coast, Cavern), masing-masing 6–8 struktur, 4–5 foreground, 4 pencahayaan; 4 nuansa: Ambient Solitude (default), Kenopsia, Megalophobia, Liminal Space
- Pilih detail (structure, foreground, decay, atmosphere, lighting, framing, kejutan, emptiness). Framing (16 pola komposisi & lensa) dan kejutan (15 detail tak terduga) dipilih acak agar hasil tidak monoton atau tulis nilai custom sendiri
- **Auto dari judul audio**: ketik judul (Inggris/Indonesia), generator mendeteksi kata kunci untuk memilih landscape, nuansa, detail dan kalimat suasana. Memahami bank kata judul ambient: mode/suasana (Lydian–Phrygian), kecerahan, citra luar angkasa (jadi langit), melodi, tujuan, bentuk lagu, nama chapter; kata terlarang (432, Hz, binaural, healing, …) diabaikan. Judul yang sama selalu memberi hasil yang sama. Aturannya ada di `RULES` dalam `js/title.js`
- Gaya **Fotorealistis** (default) atau Matte Painting
- Panel **Overlay & Motion**: catatan editing, prompt aset overlay (latar hitam untuk blend Screen) dan unduh config untuk video
- **Prompt Revisi**: pilih masalah pada gambar (miniatur, tempelan, terlalu ramai, terlalu terang, dll.) → salin instruksi edit untuk dikirim di chat Nano Banana yang sama
- Toggle "Ruang untuk judul", kalimat tambahan bebas
- Prompt dipadatkan (±1.300–1.800 karakter) dengan penghitung karakter; peringatan jika > 2.000 karakter agar Nano Banana tetap patuh pada detail
- Tombol acak, salin, link share (state tersimpan di URL) dan riwayat (localStorage)

## Membuat video
**Video Studio** (`studio.html`) merender video langsung di browser dengan Remotion (`@remotion/web-renderer`): pilih gambar + audio → atur overlay → **Render Video**. Hanya loop pendek yang dirender, lalu diulang sepanjang audio (mediabunny, tanpa render ulang) dan disimpan sebagai MP4. Mendukung **upscale gambar ke 4K** (Real-ESRGAN General x4v3 via ONNX Runtime Web, WebGPU dengan fallback CPU; model di `models/`) dan **render 1080p / 1440p / 4K**. Butuh Chrome/Edge desktop. Tombol **Buka Video Studio** di generator membawa pengaturan overlay otomatis.

Alternatif lewat terminal (Node.js): lihat [`video/README.md`](video/README.md).

Kode Video Studio ada di `video/web/` dan di-build oleh workflow GitHub Pages (`npm run build:web` → `studio/studio.js`).

## Jalankan lokal
```bash
(cd video && npm install && npm run build:web)   # sekali, untuk Video Studio
python3 -m http.server 8000
# buka http://localhost:8000
```
(ES modules butuh server, tidak bisa dibuka langsung via `file://`.)

## Deploy ke GitHub Pages
1. Merge ke `main`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` akan deploy otomatis.

## Menambah landscape / nuansa
Edit `js/data.js` dan tambahkan objek baru ke `LANDSCAPES` atau `MOODS`.
