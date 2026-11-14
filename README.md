# claude-video

Video animasi **Rajah Fasa: Air & CO₂** — 45 saat, 9:16 (1080x1920), 30 fps.

Hasil akhir: [`out/rajah-fasa-air-co2.mp4`](out/rajah-fasa-air-co2.mp4)

## Struktur

- `footage/` — bahan asal: `storyboard.json`, `skrip.md` dan `scenes/*.svg|png`.
- `src/animate.js` — enjin animasi. Setiap scene guna SVG asal; elemen digerakkan sebagai fungsi nombor frame (`renderFrame(f)`), ikut masa dalam medan `animasi` storyboard.
- `src/index.html` — pentas 1080x1920 + pratonton masa nyata.
- `scripts/render.cjs` — tangkap 1350 frame dengan Chromium (Playwright), kemudian gabung dengan ffmpeg.
- `scripts/audio.py` — sintesis muzik 105 BPM (ukulele, glockenspiel, synth lembut) dan kesan bunyi; muzik diperlahankan -12 dB semasa dialog.

## Guna

```bash
node scripts/render.cjs
```

```bash
node scripts/render.cjs --serve
```

```bash
node scripts/render.cjs --still 0,200,700
```

Perlu: Node + Playwright (Chromium), ffmpeg, Python 3 + numpy.

## Nota

- Sarikata: Baloo 2 ExtraBold 60 px, putih bergaris luar `#16343A`, dalam jalur y 1150-1300, maksimum 2 baris. Lebar dihadkan 840 px supaya tidak masuk 120 px paling kanan. Dialog panjang dipecah kepada beberapa paparan.
- Dialog terakhir ("Lain bahan, lain rajah fasanya!") tidak diulang sebagai sarikata kerana ia sudah muncul sebagai teks penutup besar, perkataan demi perkataan.
- Tiada suara latar: runut bunyi hanya muzik dan kesan bunyi. Sorakan "Yeay!" digantikan dengan bunyi loceng penutup.
- Font Baloo 2 dilesenkan di bawah SIL OFL (`src/fonts/OFL.txt`).
