# Dark Ambient Prompt Generator

Web statis untuk merakit prompt gambar bertema **kenopsia, megalophobia, liminal space, dan dark ambient** dari master template.

## Fitur
- Prompt khusus **Nano Banana** (Gemini image): kalimat naratif, bukan daftar kata kunci; larangan ditulis sebagai deskripsi (tanpa negative prompt); aspect ratio disebut dalam teks
- Dioptimalkan untuk latar musik ambient: subjek kecil dan jauh, ruang kosong dominan, cahaya redup, kontras rendah
- 6 landscape dengan thumbnail dan 4 nuansa: Ambient Solitude (default), Kenopsia, Megalophobia, Liminal Space
- Pilih detail (structure, decay, atmosphere, lighting, distance, emptiness) atau tulis nilai custom sendiri
- **Auto dari judul audio**: ketik judul (Inggris/Indonesia), generator mendeteksi kata kunci untuk memilih landscape, nuansa, detail dan kalimat suasana. Memahami bank kata judul ambient: mode/suasana (Lydian–Phrygian), kecerahan, citra luar angkasa (jadi langit), melodi, tujuan, bentuk lagu, nama chapter; kata terlarang (432, Hz, binaural, healing, …) diabaikan. Judul yang sama selalu memberi hasil yang sama. Aturannya ada di `RULES` dalam `js/title.js`
- Gaya **Fotorealistis** (default) atau Matte Painting
- Panel **Overlay & Motion**: catatan editing, prompt aset overlay (latar hitam untuk blend Screen) dan unduh config untuk video
- Toggle "Ruang untuk judul", kalimat tambahan bebas
- Tombol acak, salin, link share (state tersimpan di URL) dan riwayat (localStorage)

## Membuat video (Remotion)
Folder [`video/`](video/README.md) berisi project Remotion: gambar + audio + `video-config.json` (diunduh dari web) → video MP4 panjang dengan overlay hidup. Dijalankan di komputer sendiri (`cd video && npm install && npm run make`), tidak di GitHub Pages.

## Jalankan lokal
```bash
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
