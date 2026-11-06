# V5 — 3D animated version (based on V3 avatar + handle, dark cinematic look)
Real 3D (three.js r160, software WebGL via SwiftShader) for every beat: 3D icon blocks, phone + battery cutaway with electrons, soap micelle (heads/tails on a 3D sphere), egg in pan with protein chains, sugar glasses/thermometers, hexagon + orbiting icons, CTA floaters and 3D confetti. Moving camera per beat.
2D layer (ad.js) still draws headlines, typed hook text, captions, paper tear, avatar, handle, Follow button, grade (bloom/vignette/grain).
Same VO, timing, captions, locked on-screen text. `lib/three.min.js` is three.js (MIT), vendored.
Render: `node render.mjs full <dir>` then the ffmpeg command in `../v1/README.md`.
