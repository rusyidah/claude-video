# V1 preview — Kimia Dalam Hidup (9:16, 1080x1920, 30 fps, 44 s)

- `out/V1_preview.mp4` — preview render.
- `index.html` + `ad.js` — editable source (canvas; `render(T)` draws one frame).
- `render.mjs` — renders PNG frames with Playwright (`node render.mjs full <dir>`), then ffmpeg encodes (see below).
- `transcribe.py` — Whisper (small) word timestamps -> `audio/words.json` (timing only; wording comes from the user transcript).
- `make_audio.py` — code-generated SFX + soft pluck bed (`audio/sfx.wav`, `audio/bed.wav`).
- `audio/vo.mp3` — copy of the user's supplied VO (original left untouched in uploads).
- Fonts: Oswald 700 and JetBrains Mono 700 (SIL OFL, via fontsource).

Encode: `ffmpeg -framerate 30 -i frames/f%05d.png -i audio/vo.mp3 -i audio/sfx.wav -i audio/bed.wav -filter_complex "[1:a]aresample=48000[vo];[2:a]volume=0.55[sx];[3:a]volume=0.22[bd];[vo][sx][bd]amix=inputs=3:normalize=0:duration=longest,volume=4dB,alimiter=limit=0.89:level=0,apad=whole_dur=44[a]" -map 0:v -map "[a]" -c:v libx264 -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -t 44 out/V1_preview.mp4`
