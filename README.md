# Dark Ambient Prompt Generator

Web statis untuk merakit prompt gambar bertema **kenopsia, megalophobia, liminal space, dan dark ambient** dari master template.

## Fitur
- 6 landscape (Abyssal, Desert, Frozen, Forest, Alien, Urban Liminal) dan 3 nuansa (Kenopsia, Megalophobia, Liminal)
- Pilih detail (structure, decay, atmosphere, lighting) atau tulis nilai custom sendiri
- Format output: Plain, Midjourney (`--ar`, `--no`) dan Stable Diffusion (positive/negative)
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
