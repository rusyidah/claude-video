# Editing DNA — video reference (`sampel_video.mp4`)

Dokumen ini merekod **behaviour editing sahaja**. Watak, lagu, lirik, logo dan branding
dalam reference bukan untuk disalin; ia disebut di sini hanya sebagai penanda lokasi.

## 1. Apa yang sebenarnya diperiksa

| Perkara | Status | Cara |
|---|---|---|
| Fail video | Dibaca penuh | `ffprobe`: 129.1 s, 1280×720, 25 fps, H.264, audio AAC stereo 44.1 kHz |
| Visual | Sample frame, bukan tontonan berterusan | 1 frame/saat untuk keseluruhan video (129 frame) + strip padat 3–12.5 fps di 8 bahagian: 5.2–8.2, 12.8–21.8, 24.2–29.2, 26.4–36.9, 36.0–38.4, 55.6–60.4, 104.8–116.8 s |
| Cut | Separa automatik | `ffmpeg` scene detection (threshold 0.30 dan 0.12) disemak silang dengan frame |
| Audio | Diukur, **tidak didengar** | Loudness per saat, silence detection, anggaran tempo, nisbah bass/treble |
| Transkrip | Automatik | Whisper `small` (CPU), bahasa Melayu. Ada salah dengar; dibetulkan hanya di tempat caption on-screen mengesahkan |

**Had yang perlu diketahui**

- Timestamp cut tepat pada grid frame 25 fps (±0.04 s). Timestamp lain yang ditulis `~` ialah anggaran daripada sample frame.
- Scene detection terlepas beberapa cut dan transition laju (contoh: wipe di 6.4 s dan 116.4 s tidak dikesan). Senarai cut di bawah ialah **had bawah**, bukan senarai lengkap.
- Easing, motion blur dan gerakan halus antara sample frame tidak dapat disahkan.
- Saya tidak boleh mendengar audio. Jenis instrumen, genre, dan kewujudan SFX kecil (whoosh, pop, ding) **tidak disahkan**. Yang disahkan hanyalah paras bunyi, senyap, dan bila nyanyian/dialog berlaku.
- Tempo: autokorelasi memberi calon 172 / 86 / 117.5 / 123 / 60 BPM — tidak muktamad. Grid cut 2 s / 4 s paling padan dengan ~120 BPM (1 bar = 2 s), tetapi ini inferens, bukan ukuran pasti.
- Nama font tidak dikenal pasti; hanya rupa yang diterangkan.

## 2. Struktur keseluruhan (diperhatikan)

| Masa | Bahagian | Apa yang berlaku |
|---|---|---|
| 0.0–6.4 | Kad tajuk | Latar gradient biru, 2 watak di kiri-kanan, logo masuk dahulu, kemudian tajuk episod (~5 s). Jeda senyap 0.6 s di 4.45–5.05 sebelum tajuk disebut |
| 6.4–7.3 | Transition | Wipe jalur menegak pelbagai warna + ikon kecil, ~0.9 s |
| 7.3–24.4 | Cold open (dialog) | Babak cerita pendek tanpa muzik kuat: paras bunyi jatuh ke −43 hingga −48 dB di 7–9 s dan 12 s. Shot lebih panjang (2.4–8.6 s). Tiada caption |
| 24.4–36.8 | Verse 1 | Muzik masuk (purata naik ke ~−16 dB). Caption lirik mula. Corak "ayat → gema satu perkataan" |
| 36.8–41.0 | Pre-chorus | Tukar ke latar grafik abstrak (teal + ikon terapung), watak pop naik dari bawah frame |
| 41.0–56.4 | Chorus 1 | Set "pentas" tetap + sisipan closeup berlatar warna rata |
| 56.4–59.8 | Bridge / gag | Satu watak closeup atas latar pucat; paras bunyi turun ~5 dB; ditutup dengan wipe bentuk organik ke warna penuh |
| 59.8–72.2 | Verse 2 | Struktur sama dengan verse 1, lokasi lain |
| 72.2–76.4 | Pre-chorus | Ulang shot pre-chorus yang sama |
| 76.4–92.8 | Chorus 2 | Ulang susunan shot chorus 1 (watak ada perubahan kecil pada rupa) |
| 92.8–114.2 | Chorus 3 (final) | Lirik sama, tetapi shot **baharu** di lokasi cerita; ditutup dengan group shot paling panjang (~9 s) dan push ke closeup |
| 114.2–116.4 | Butang penutup | Muzik berhenti (senyap 114.2–115.1 dan 115.6–116.5), closeup reaksi, ucapan penutup |
| 116.4–117.0 | Transition | Wipe jalur yang sama seperti di 6.4 s |
| 117–122 | Kad mesej | Teks 2–3 baris di atas, watak di bucu bawah, bar sosial kecil di bawah-tengah |
| 122–124.9 | End card | Soalan pendek → logo + teks kiri/kanan |
| 124.9–129 | Kredit | Panel bentuk organik atas latar bercorak, tukar halaman ~1 s sekali |

## 3. Editing DNA mengikut kategori

### Flow / pacing

Cut yang dikesan (saat):
`10.44, 12.84, 21.44, 24.44, 26.44, 30.84, 35.04, 36.84, 41.04, 45.04, 49.04, 51.04, 53.04, 56.44, 59.84, 64.24, 68.64, 70.44, 72.24, 76.44, 80.44, 84.44, 86.44, 88.44, 92.80, 100.84, 104.84, 124.88`

- **Chorus terkunci pada grid 2 s / 4 s**: 41.04 → 45.04 → 49.04 → 51.04 → 53.04, dan sekali lagi 76.44 → 80.44 → 84.44 → 86.44 → 88.44. Satu baris lirik = satu shot.
- **Chorus 2 mengulang susunan shot chorus 1** dengan jarak yang sama (4, 4, 2, 2, ~3.4 s).
- Verse lebih longgar: 4.4, 4.2, 1.8 s (verse 1) dan 4.4, 4.4, 1.8, 1.8 s (verse 2), tetapi ada tambahan transition dalam shot (lihat Transition).
- Dialog pembuka paling perlahan (shot hingga 8.6 s); tenaga naik berperingkat: dialog → verse → pre-chorus → chorus.
- Chorus terakhir memanjangkan shot (8 s, 4 s, ~9 s) dan bukan memendekkannya — penamat terasa "mendarat", bukan memecut.

Rule boleh guna semula:
1. Tetapkan satu unit masa (1 bar). Semua cut dalam bahagian bertenaga tinggi jatuh pada gandaan unit itu.
2. Satu idea/ayat = satu shot. Jangan potong di tengah ayat.
3. Bahagian yang berulang guna susunan shot yang sama; simpan visual baharu untuk ulangan terakhir.
4. Mula perlahan tanpa muzik penuh, kemudian masukkan muzik serentak dengan cut pertama bahagian utama.

### Text / typography

Diperhatikan (24.4 s hingga ~114 s; tiada caption semasa dialog):

- Satu baris sahaja, tengah-bawah (dalam ~18% bawah frame), 2–4 perkataan.
- Huruf bulat, tebal, gaya tulisan tangan/kartun; isian warna terang + outline gelap sewarna (bukan hitam).
- **Karaoke fill**: baris muncul penuh dalam warna A (merah jambu), kemudian diisi warna B (hijau) dari kiri ke kanan, huruf demi huruf, mengikut nyanyian. Disahkan frame demi frame di 24.4–26.4 s (isi penuh dalam ~2 s).
- **Gema satu perkataan**: selepas ayat penuh, kata kunci terakhir muncul bersendirian di tengah dan fill berulang (contoh di ~26.9–28.5 s: kitaran fill ~0.5–0.7 s sekali).
- Baris caption bertukar tepat pada cut atau pada baris lirik baharu; tiada animasi masuk/keluar yang dapat dikesan (muncul/hilang terus).
- Kad tajuk: perkataan dipecah 2 baris, setiap perkataan warna berbeza (kuning / hijau / merah jambu), outline tebal.
- Kad mesej (117–122 s): teks tengah-atas 2 baris + 1 baris sumber lebih kecil; warna kontras atas latar hangat.

Rule:
1. Caption pendek, satu baris, kedudukan tetap sepanjang video.
2. Dua warna sahaja untuk caption; perubahan warna = penunjuk "sedang disebut sekarang".
3. Ulang kata kunci secara bersendirian selepas ayat untuk penekanan.
4. Tiada caption semasa dialog/cerita; caption hanya untuk bahagian yang mahu penonton ikut.

### Motion

- Kad tajuk: elemen masuk berperingkat (watak → logo → tajuk), bukan serentak.
- Watak "pop" naik dari bawah frame ke hadapan elemen lain (pre-chorus ~37.1 s; bridge ~57.4 s).
- Ikon kecil terapung perlahan di latar grafik (37–41 s, 72–76 s).
- Dalam chorus, kamera statik; gerakan datang daripada subjek (menari) — frame tetap, subjek bergerak.
- Dalam verse, ada gerakan kamera (pan/track dari objek ke watak, ~26.4–28 s).
- Push-in ke closeup pada penutup (~114.4 → 115 s).

Rule: bila subjek sibuk bergerak, kunci kamera; bila subjek tenang, gerakkan kamera. Simpan push-in untuk satu detik penekanan.

### Transition

| Masa | Jenis (diperhatikan) | Guna untuk |
|---|---|---|
| Majoriti | Hard cut | Dalam bahagian yang sama |
| 6.4–7.3, 116.4–~117 | Wipe jalur menegak pelbagai warna dengan ikon, bergerak kiri → kanan, ~0.9 s | Masuk/keluar "dunia cerita" (pembuka dan penutup — bentuk sama, jadi berfungsi sebagai bookend) |
| ~28.4, ~32.9 | Push menegak laju (dua shot kelihatan bertindan dalam satu frame), ≤0.2 s | Tukar lokasi di dalam verse |
| ~59.0–59.8 | Wipe bentuk organik membesar hingga penuh skrin warna rata (~0.5 s warna penuh), kemudian cut | Tamat bridge, mula verse 2 |
| 36.84, 72.24 | Hard cut ke latar grafik abstrak | Tanda masuk pre-chorus |

Rule:
1. Hard cut ialah default. Transition bergaya hanya di sempadan bahagian.
2. Satu jenis transition untuk satu fungsi; guna semula jenis yang sama setiap kali fungsi itu berulang.
3. Transition pembuka = transition penutup.

### Framing / zoom / composition

- 16:9, subjek di tengah atau simetri kiri-kanan; ruang bawah dikosongkan untuk caption.
- Selang-seli skala shot: wide/group → closeup objek/subjek → medium dua watak. Hampir setiap ayat verse diikuti closeup "bukti" (objek yang disebut).
- Chorus: wide berkumpulan frontal seperti pentas, diselang closeup tunggal berlatar warna rata.
- Sudut rendah (paras subjek kecil) untuk closeup.
- Kad tajuk dan kad mesej: teks di tengah, watak sebagai "bingkai" di tepi/bucu.

Rule: setiap kenyataan → tunjuk buktinya dalam closeup pada shot berikut. Chorus = komposisi frontal yang sama setiap kali, supaya penonton kenal "ini bahagian ulang".

### Visual treatment

- Warna sangat tepu, pencahayaan rata dan terang, tiada bayang gelap, tiada grain/vignette/filter yang kelihatan.
- Setiap bahagian ada identiti warna latar sendiri: hijau terang (cerita), teal gradient (pre-chorus), biru gelap bertekstur dan kuning-oren (sisipan chorus), biru pucat (bridge), oren hangat (kad mesej).
- Latar rata/gradient digunakan untuk mengasingkan subjek sepenuhnya daripada persekitaran.

Rule: tukar warna latar apabila bahagian bertukar; kekalkan satu warna latar bagi setiap jenis bahagian.

### Music / SFX (setakat yang boleh diukur)

- Paras purata −16.7 dB, puncak 0.0 dB.
- 7–13 s: dialog hampir tanpa muzik (−43 hingga −48 dB pada beberapa saat).
- 24–25 s: paras naik ~8 dB serentak dengan cut ke verse 1 dan caption pertama.
- 57–59 s: turun ~5 dB semasa bridge, naik semula di ~60 s.
- 114.2–116.5 s: dua jeda senyap ~0.9 s — muzik berhenti sebelum butang penutup.
- 115–129 s: tenaga bass dominan (66–80% tenaga <200 Hz) — lapisan bunyi outro berbeza daripada lagu utama.
- Transkrip: dialog 10–24 s, nyanyian 25–112 s mengikut caption, ucapan penutup ~112.5–116.5 s.
- **Tidak disahkan**: SFX individu, instrumen, sama ada transition diiringi bunyi.

Rule: muzik penuh hanya bermula bersama bahagian utama; rendahkan untuk gag/bridge; hentikan terus (bukan fade panjang) sebelum baris penutup.

### Attention control

1. **Sesuatu berubah setiap 2–4 s** dalam bahagian utama: cut, baris caption baharu, atau warna latar.
2. **Caption sentiasa bergerak** (fill) walaupun shot statik — mata ada tempat untuk diikut.
3. **Ulang dengan variasi**: struktur chorus sama 3 kali; kali ke-3 visual baharu.
4. **Pattern interrupt** di tengah (56–60 s): tukar latar, skala, paras bunyi dan transition sekali gus.
5. **Senyap sebagai tanda baca**: sebelum tajuk (4.45 s) dan sebelum penutup (114.2 s).
6. **Bookend**: transition dan logo yang sama di awal dan akhir.

## 4. Apa yang TIDAK diambil

Watak, reka bentuk dunia, lagu, melodi, lirik, tajuk, logo, kad kredit, penaja dan petikan teks
dalam reference. Hanya pola masa, susun letak, hierarki teks, logik transition dan logik
perhatian yang dicatat untuk diguna pada footage sendiri.

## 5. Nota kebolehpindahan

Reference ialah animasi 3D penuh dengan lagu yang direka khas. Dengan footage lain
(live action, rakaman skrin, tanpa lagu berentak) hasilnya akan mengikut **pola** di atas,
bukan rupa yang sama: grid cut bergantung pada rentak audio sebenar, karaoke fill bergantung
pada timing perkataan yang boleh diperoleh, dan latar warna rata bergantung pada sama ada
subjek boleh diasingkan daripada latar.
