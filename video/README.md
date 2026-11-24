# Ambient Video (Remotion)

Membuat video ambient panjang dari **1 gambar + 1 audio**, dengan overlay hidup (kabut, partikel, bintang, aurora, grain, slow zoom).
Semua gerakan dibuat **berulang sempurna (seamless loop)**, jadi yang dirender hanya klip pendek (default 30 detik), lalu diulang sepanjang audio tanpa render ulang. Video 3 jam selesai dalam hitungan menit.

## Sekali saja: instalasi
Butuh [Node.js](https://nodejs.org) 18 atau lebih baru.
```bash
cd video
npm install
```

## Membuat video
1. Di web generator, buat prompt, lalu generate gambarnya di Nano Banana.
2. Di panel **Overlay & Motion**, klik **Unduh Config Video**. File yang terunduh bernama `video-config.json`.
3. Taruh 3 file ke folder `video/input/`:
   - gambar latar (`.png` / `.jpg` / `.webp`)
   - `video-config.json`
   - audio (`.mp3` / `.wav` / `.flac` / `.m4a`)
4. Jalankan:
   ```bash
   npm run make
   ```
5. Hasilnya ada di `video/out/<nama-audio>.mp4`.

Atau tunjuk file langsung:
```bash
npm run make -- --audio "D:/musik/track.wav" --image "D:/gambar/bg.png" --config "D:/unduhan/video-config.json"
```

## Pratinjau dan atur overlay
```bash
npm run studio
```
Remotion Studio terbuka di browser. Taruh gambar di `video/public/background.png` dan atur nilai overlay di panel props.

## Isi config
| Kunci | Arti |
|---|---|
| `loopSeconds` | panjang klip loop (default 30; makin panjang makin tidak terasa berulang, render makin lama) |
| `overlays.fog` | warna & opacity kabut |
| `overlays.particles` | `kind`: snow, rain, dust, sediment, stardust, sparkle; `count`: jumlah partikel |
| `overlays.stars` / `aurora` / `rays` | bintang berkelip, aurora, berkas cahaya |
| `overlays.grain` | film grain (0–0.1) |
| `overlays.vignette` | kegelapan tepi (0–1) |
| `overlays.zoom` | slow zoom bolak-balik (0.04 = 4%) |
| `overlays.breathe` | cahaya naik-turun (0.03 = ±3%) |

## Catatan
- Remotion gratis untuk individu dan perusahaan kecil (maks. 3 karyawan). Lihat lisensinya di remotion.dev.
- Pertama kali render, Remotion mengunduh Chrome headless secara otomatis.
