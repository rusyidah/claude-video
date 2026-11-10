# Dengar Kata Ibu Ayah

Video 30 saat (1920×1080, 30 fps) dibina daripada footage dalam `footage/`, mengikut
pola editing dalam `../analysis/reference-editing-dna.md`. Hanya behaviour editing yang
diambil daripada reference; watak, teks, muzik dan grafik semuanya daripada footage ini
atau dijana di sini.

- Hasil: `out/dengar-kata-ibu-ayah.mp4`
- Bina semula: `python3 src/audio.py out/audio.wav && node src/render.mjs`, kemudian gabung dengan `ffmpeg` (lihat bawah)

## Bahan yang diterima

6 scene ilustrasi (PNG + SVG berlapis), `skrip.md`, `storyboard.json`.
**Tiada audio**: tiada muzik, tiada rakaman suara dialog, tiada SFX.

## Bagaimana style reference digunakan

| Pola daripada reference | Dalam video ini |
|---|---|
| Cut pada grid rentak; satu ayat satu shot | Muzik 120 BPM (1 beat = 0.5 s). Semua sempadan scene dan cut dalaman jatuh pada beat: 3, 5, 7, 9, 11, 13, 14, 16, 18, 20, 21.5, 23, 26 s |
| Wide → closeup "bukti" → medium | Setiap scene dipecah kepada 3 shot dengan crop kamera pada SVG: mainan di permaidani (5–7 s), kotak mainan (11–13 s), tangan di sinki (16–18 s), wajah anak-anak (21.5–23 s) |
| Caption karaoke satu baris, bawah-tengah | Dialog dipecah kepada baris 2–4 perkataan; huruf bertukar putih → kuning dari kiri ke kanan mengikut tempoh dialog |
| Gema kata kunci | Sekali sahaja: "Kemas!" di 8.4–9.0 s (satu-satunya jeda ≥0.5 s antara dialog) |
| Hard cut sebagai asas; transition bergaya di sempadan bahagian | Hard cut di dalam scene dan 2→3. Push laju 3→4 (tukar lokasi). Wipe buih ke warna rata 4→5 |
| Transition pembuka = penutup | Wipe gelang berwarna yang sama di 3.0 s dan 26.0 s |
| Elemen masuk berperingkat pada kad tajuk | Watak melantun masuk, kemudian tajuk muncul sepatah-sepatah pada beat 0.5 / 1.0 / 1.5 / 2.0 s |
| Tenaga naik berperingkat + gangguan di tengah | Muzik perlahan di scene 2, penuh di scene 3, jarang + bunyi air di scene 4, penuh di scene 5 |
| Muzik berhenti sebelum baris penutup | Muzik berhenti di 25.5 s; kadens penutup bermula 26.5 s |
| Shot akhir lebih panjang | Scene 5 ditutup dengan wide 3 s; kad penutup satu shot 4 s |

## Perbezaan daripada `storyboard.json` (disengajakan)

| Storyboard | Video | Sebab |
|---|---|---|
| Muzik 110 BPM | 120 BPM | Pada 110 BPM, cut di 3 s, 9 s, 14 s… tidak jatuh pada beat. Masa scene dikekalkan; tempo yang diubah |
| Peralihan 5→6: cross-fade | Wipe gelang (sama seperti 1→2) | Pola bookend daripada reference |
| Sarikata putih | Putih → kuning `#FFD23F` semasa disebut | Karaoke fill. Font, saiz, garis luar dan kedudukan ikut storyboard |
| Sarikata pada scene 1 dan 6 | Tiada; teks kad itu sendiri dianimasikan | Elak teks yang sama dua kali pada skrin |
| Muzik −12 dB semasa dialog | Tidak digunakan | Tiada suara untuk dilindungi; paras diubah mengikut bahagian sahaja |
| Zoom 100→106% sepanjang scene 2 | Push pada shot wide pertama sahaja | Scene dipecah kepada 3 shot |

Masa mula/tamat scene, masa dialog, dan animasi (sinaran berputar, spring watak, mainan
masuk kotak, air paip, gosok tangan, buih, angguk ayah, wap, lampu berayun, hati, lambaian,
teks sepatah-sepatah, fade ke putih) mengikut storyboard.

## Had

- **Tiada suara dialog.** Mulut watak bergerak mengikut masa dialog dan caption membawa ayatnya, tetapi tiada lakonan suara.
- **Muzik dan SFX disintesis** (`src/audio.py`): petikan seperti ukulele, loceng seperti glockenspiel, tepukan, bass, pop, ting, blup, bunyi air. Ia bukan rakaman instrumen sebenar. Sorakan "Yeay!" dan bunyi sudu-pinggan tidak dibuat.
- "Kanak-kanak berpaling ke arah ibu" dibuat sebagai kepala mendongak, bukan pusingan badan (ilustrasi hanya ada satu pandangan).
- Rupa tidak sama dengan reference (2D vektor rata, bukan 3D); yang sama ialah pola masa, caption, transition dan susunan shot.

## Fail

- `src/film.js` — garis masa, rig watak, kamera, caption, transition (`renderFrame(f)` deterministik)
- `src/stage.html` — pentas 1920×1080
- `src/render.mjs` — render frame demi frame dengan Chromium → `out/video-silent.mp4`
- `src/audio.py` — runut bunyi → `out/audio.wav`
- `fonts/` — Baloo 2 ExtraBold (lesen OFL disertakan)

Gabung:

```bash
ffmpeg -y -i out/video-silent.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 192k -shortest out/dengar-kata-ibu-ayah.mp4
```
