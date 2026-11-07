# Payung Nutrilite — HyperFrames edit (9:16, 44.8 s)

Video promo payung Nutrilite (TikTok / IG Reels), disunting dengan **HyperFrames** (HTML → video).

## Struktur cerita (selepas potong)

| Masa | Babak | Visual / motion graphic | SFX |
| --- | --- | --- | --- |
| 0.0–2.7 | **HOOK** — "Payung Nutrilite ni, design ni hanya ada di Amway." (dipindah dari hujung video) | Tajuk "PAYUNG *eksklusif*", stamp berputar "HANYA DI AMWAY" | impact, pop + shimmer |
| 2.7–4.9 | "Bestnya untuk bulan ni, ada promo" | Pil "✦ PROMO / BULAN NI" | whoosh |
| 4.9–9.4 | "dengan pembelian mana-mana suplemen Nutrilite" | Video kekal penuh; 4 kad produk B-roll (Bio C Plus, AmCELL, Soy Protein ×2) terbang masuk dari kiri/kanan ke jalur atas, nyala lime pada "Nutrilite", terbang keluar | 4× whoosh + pop mendarat, shimmer |
| 9.4–12.8 | "satu pun memadai, kita dapat tebus payung" | Chip "1 suplemen pun memadai" → "TEBUS ☂ PAYUNG" | pop ×2 |
| 12.8–15.7 | "ni dia payung dia… design payung ni" | Bintang berkilau, "corak *daun* ✦ · warna hijau Nutrilite" | shimmer, pop |
| 15.7–19.9 | "Macam mana nak buka? Ada satu button…" | "CARA BUKA · TEKAN 1 BUTANG" + butang ditekan | whoosh, pop |
| 19.9–20.7 | Payung terbuka — "Wow!" | Burst "WOW!" + punch-in kamera | payung kembang + shimmer |
| 21–23.7 | "Macam itulah cara buka dia" | Chip "✓ Sekali tekan · terus kembang" | pop |
| 24.4–28.9 | "ada 90 tahun Nutrilite di dunia" | Kad kaunter 1934 → **90 TAHUN** · di seluruh dunia | counter tick, impact, whoosh |
| 29.4–34.7 | "Macam mana nak tutup? … tarik … *ting*" | "CARA TUTUP · TARIK ↓" → "TING!" (bunyi ting asli dikekalkan) | whoosh, shimmer + pop |
| 34.8–39.4 | "simpan dalam handbag, bawa ke mana-mana" | Kad "MUAT DALAM HANDBAG" + chip "Bawa ke mana-mana" | zip, pop, whoosh |
| 39.6–44.8 | CTA "Dapatkan mana-mana suplemen Nutrilite ni. Memang best." | Video kekal penuh; laman Amway + Bio C Plus terbang masuk ke jalur atas, stamp "TEBUS PAYUNG", sticker "MEMANG BEST!" terbang ke slot kapsyen | whoosh, pop, impact |

**Dibuang:** semua "okey"/"aa", jeda janggal, ulangan "hanya ada di Amway" (dipindah jadi hook), "memang best" ×2 (tinggal satu di penutup), "Okey so yang special ni yang payung ni", "Nampak?".  68.5 s → 44.8 s.

## Safe zone & muka
- Teks dan grafik hanya dalam jalur 168–1330 px (TikTok/IG), tiada teks di bawah rel ikon kanan (x > 940 di bahagian bawah).
- Muka dijejak setiap 0.1 s (`data/faces.json`, MediaPipe). Grafik di jalur atas (y 170–500) dan kapsyen di jalur bawah (y ~1170–1290), di luar kotak muka. Bila muka turun (di bawah payung, 23.7–25.9 s) kapsyen pindah ke atas.
- B-roll "terbang" masuk dari atas/sisi ke jalur atas sahaja; laluan terbang tak pernah melintas muka.

## Audio
- Suara: dibersihkan (high-pass, denoise ringan, EQ, compressor), −15 LUFS.
- Muzik: ElevenLabs Music (instrumental tropical-pop 108 BPM), ~20 dB di bawah suara + EQ potong 2.2 kHz supaya suara jelas; naik sedikit pada jeda dan di penutup.
- SFX premium: dijana dengan ElevenLabs Sound Effects (whoosh, pop, payung kembang, counter, shimmer, impact, zip), dinormalkan & diletak ikut puncak bunyi (peak) + 1 frame selepas gambar.
- Mix akhir: ~−12 LUFS, true peak −1.1 dBFS (diukur, bukan didengar).

## Jalankan

```bash
npm install
tools/prepare_media.sh "/path/to/test 3.mp4.mp4"   # jana assets/video/aroll.mp4 (tidak di-commit, 76 MB) + voice
python3 tools/build.py                            # jana index.html + compositions/
npx hyperframes preview                           # Studio
npm run render                                    # render akhir (kualiti tinggi)
```

`tools/build.py` ialah sumber sebenar: ubah teks/masa di situ, kemudian bina semula.
