# Dengar Kata Ibu Ayah

Video 30 saat (1920×1080, 30 fps) dibina daripada footage dalam `footage/`, mengikut
pola editing dalam `../analysis/reference-editing-dna.md`. Hanya behaviour editing yang
diambil daripada reference; watak, teks, muzik dan grafik semuanya daripada footage ini
atau dijana di sini.

- Hasil: `out/dengar-kata-ibu-ayah.mp4`
- Bina semula: lihat bahagian "Fail" di bawah

## Bahan yang diterima

6 scene ilustrasi (PNG + SVG berlapis), `skrip.md`, `storyboard.json`.
**Tiada audio**: tiada muzik, tiada rakaman suara dialog, tiada SFX. Suara dialog kemudian dijana dengan ElevenLabs (`voice/`); muzik dan SFX disintesis.

## Bagaimana style reference digunakan

| Pola daripada reference | Dalam video ini |
|---|---|
| Cut pada grid rentak; satu ayat satu shot | Muzik 120 BPM (1 beat = 0.5 s). Semua sempadan scene dan cut dalaman jatuh pada beat: 3, 5, 7, 9, 11, 13, 14, 16, 18, 20, 21.5, 23, 26 s |
| Wide → closeup "bukti" → medium | Setiap scene dipecah kepada 3 shot dengan crop kamera pada SVG: mainan di permaidani (5–7 s), kotak mainan (11–13 s), tangan di sinki (16–18 s), wajah anak-anak (21.5–23 s) |
| Caption karaoke satu baris, bawah-tengah | Dialog dipecah kepada baris 2–4 perkataan; huruf bertukar putih → kuning dari kiri ke kanan mengikut tempoh dialog |
| Gema kata kunci | Sekali sahaja: "Kemas!" di 8.0–9.0 s, pada caption sahaja (tidak disuarakan) |
| Hard cut sebagai asas; transition bergaya di sempadan bahagian | Hard cut di dalam scene dan 2→3. Push laju 3→4 (tukar lokasi). Wipe buih ke warna rata 4→5 |
| Transition pembuka = penutup | Wipe gelang berwarna yang sama di 3.0 s dan 26.0 s |
| Elemen masuk berperingkat pada kad tajuk | Watak melantun masuk, kemudian tajuk muncul sepatah-sepatah tepat semasa setiap perkataan disebut |
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
| Muzik −12 dB semasa dialog | −12 dB; −18 dB di bawah baris penutup | Kadens penutup lebih padat dan menenggelamkan suara pada −12 dB |
| Masa dialog (`mula`/`tamat`) | Mula ikut storyboard, tamat ikut suara sebenar | Suara yang dijana lebih pendek daripada slot. Baris ibu di scene 5 mula 20.7 s (bukan 20.3 s) supaya frasa kedua jatuh pada cut 21.5 s |
| Baris "Semua" disebut sama rata | Ibu dan ayah mengetuai, anak-anak di belakang (lebih perlahan) | Empat suara sama kuat serentak tidak dapat difahami semasa diuji |
| Zoom 100→106% sepanjang scene 2 | Push pada shot wide pertama sahaja | Scene dipecah kepada 3 shot |

Masa mula/tamat scene, masa dialog, dan animasi (sinaran berputar, spring watak, mainan
masuk kotak, air paip, gosok tangan, buih, angguk ayah, wap, lampu berayun, hati, lambaian,
teks sepatah-sepatah, fade ke putih) mengikut storyboard.

## Suara (ElevenLabs, model `eleven_v4`)

| Watak | Suara pustaka |
|---|---|
| Amir | Hafiz – Energetic Cartoon Character |
| Sofia | Aisyash – Animated Game Character, dinaikkan 2 semiton supaya lebih muda |
| Ibu | Aisyah – Warm, Relaxed Lifestyle Creator |
| Ayah | Zain – Gentle Kids Story Narrator |

14 baris dijana, 2 take setiap satu (1,108 kredit); take pertama digunakan. Take kedua kekal dalam flow
"Dengar Kata Ibu Ayah — suara dialog" di akaun ElevenLabs. Caption, gerakan mulut dan kemunculan
perkataan pada kad tajuk/penutup diselaraskan dengan masa perkataan sebenar dalam rakaman.

## Had

- **Suara disemak dengan transkripsi automatik, bukan didengar.** Semua baris dikenali pada masa yang dijangka, tetapi sebutan, intonasi dan kesesuaian watak perlu disahkan dengan telinga. Transkripsi meragui "bapa" (didengar sebagai "bapu"/"bapak") dalam baris penutup.
- Tiada suara kanak-kanak perempuan Melayu dalam pustaka; suara Sofia ialah suara wanita muda yang dinaikkan nadanya.
- **Muzik dan SFX disintesis** (`src/audio.py`): petikan seperti ukulele, loceng seperti glockenspiel, tepukan, bass, pop, ting, blup, bunyi air. Ia bukan rakaman instrumen sebenar. Sorakan "Yeay!" dan bunyi sudu-pinggan tidak dibuat.
- "Kanak-kanak berpaling ke arah ibu" dibuat sebagai kepala mendongak, bukan pusingan badan (ilustrasi hanya ada satu pandangan).
- Rupa tidak sama dengan reference (2D vektor rata, bukan 3D); yang sama ialah pola masa, caption, transition dan susunan shot.

## Fail

- `src/film.js` — garis masa, rig watak, kamera, caption, transition (`renderFrame(f)` deterministik)
- `src/stage.html` — pentas 1920×1080
- `src/render.mjs` — render frame demi frame dengan Chromium → `out/video-silent.mp4`
- `src/audio.py` — muzik + SFX → `out/audio.wav`
- `src/mix.py` — letak suara pada garis masa, rendahkan muzik di bawah dialog → `out/mix.wav` (perlu `ffmpeg` dengan penapis `rubberband`)
- `voice/` — 14 rakaman suara ElevenLabs yang digunakan
- `fonts/` — Baloo 2 ExtraBold (lesen OFL disertakan)

Bina semula:

```bash
python3 src/audio.py out/audio.wav
```

```bash
python3 src/mix.py out/audio.wav out/mix.wav
```

```bash
node src/render.mjs
```

```bash
ffmpeg -y -i out/video-silent.mp4 -i out/mix.wav -c:v copy -c:a aac -b:a 192k -shortest out/dengar-kata-ibu-ayah.mp4
```
