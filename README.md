# Dark Ambient Prompt Generator

Web statis untuk merakit prompt gambar bertema **kenopsia, megalophobia, liminal space, dan dark ambient** dari master template.

## Fitur
- Dioptimalkan untuk latar musik ambient: subjek kecil dan jauh, ruang kosong dominan, cahaya redup, kontras rendah
- 6 landscape (Abyssal, Desert, Frozen, Forest, Alien, Urban Liminal) dengan thumbnail
- 4 nuansa: Ambient Solitude (default), Kenopsia, Megalophobia, Liminal Space
- Pilih detail (structure, decay, atmosphere, lighting, distance, emptiness) atau tulis nilai custom sendiri
- Toggle "Ruang untuk judul" untuk menyisakan area kosong bagi teks judul lagu
- Format output: Plain, Midjourney (`--ar 16:9 --style raw --stylize 50 --no`), Stable Diffusion (positive/negative) dan Flux (kalimat natural)
- Tombol acak, salin, link share (state tersimpan di URL) dan riwayat (localStorage)

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
