#!/usr/bin/env python3
"""Generate index.html for the EarFun Air Pro 3 TikTok edit.

Edit decisions (source seconds) live in SEGMENTS; every overlay, caption and
sound cue is placed on a source-time anchor and mapped to output time, so a
re-cut only needs SEGMENTS changed.
"""
import json, math, wave, struct, os, html

HERE = os.path.dirname(os.path.abspath(__file__))
SCRATCH = "/tmp/claude-0/-home-user-claude-video/1ae6ae31-393e-54ff-a7eb-79e963e7f114/scratchpad"

# ---------------------------------------------------------------- cut list
# (id, src_in, src_out, camera scale)  — pauses trimmed to ~0.1 s, "Okay, so" removed
SEGMENTS = [
    ("A1", 0.00, 0.90, 1.12),   # Pakai earbuds,
    ("A2", 1.10, 2.74, 1.20),   # tapi bunyi luar masih masuk.
    ("B",  4.06, 6.03, 1.12),   # ni earphone Air Pro 3.
    ("C",  6.30, 10.09, 1.22),  # Tekan sekali, ANC sampai 43 desibel.
    ("D",  10.33, 11.58, 1.12), # Bising, terus senyap.
    ("E1", 11.88, 12.26, 1.24), # Nampak?
    ("E2", 12.60, 15.77, 1.12), # Driver 11mm, bass memang padu.
    ("F",  16.12, 19.07, 1.20), # Chip Qualcomm aptX Adaptive, audio jelas.
    ("G",  19.47, 21.82, 1.12), # Bateri sampai 45 jam dengan case.
    ("H",  22.24, 24.63, 1.20), # Charge 10 minit, dengar 90 minit.
    ("I",  24.98, 27.37, 1.12), # Ada apps, boleh sambung 2 device serentak.
    ("J",  27.67, 29.54, 1.20), # Senang je, memang best.
    ("K",  29.90, 31.12, 1.14), # Tekan beg kuning sekarang.
]
ORIGIN = (545, 760)  # face centre in source px; scaling about it keeps hands out of frame

out = 0.0
SEGS = []
for sid, a, b, s in SEGMENTS:
    SEGS.append(dict(id=sid, a=a, b=b, s=s, o=round(out, 3)))
    out += b - a
HOLD = 1.3  # freeze on the last frame under the CTA
VID_END = round(out, 3)
TOTAL = round(out + HOLD, 3)


def T(src):
    """source second -> output second (snaps into nearest kept segment)."""
    for g in SEGS:
        if g["a"] - 1e-6 <= src <= g["b"] + 1e-6:
            return round(g["o"] + src - g["a"], 3)
    # in a removed gap: snap to next segment start
    for g in SEGS:
        if src < g["a"]:
            return g["o"]
    return TOTAL


def seg(sid):
    return next(g for g in SEGS if g["id"] == sid)

# ---------------------------------------------------------------- words (source times, from whisper large-v3 + energy check)
W = [  # text, src_start, src_end
    ("Pakai", 0.00, 0.34), ("earbuds,", 0.34, 0.84), ("tapi", 1.15, 1.30), ("bunyi", 1.30, 1.78),
    ("luar", 1.78, 2.04), ("masih", 2.04, 2.22), ("masuk?", 2.22, 2.69),
    ("Ni", 4.11, 4.49), ("earphone", 4.49, 4.86), ("Air", 4.86, 5.20), ("Pro", 5.20, 5.38), ("3.", 5.38, 5.99),
    ("Tekan", 6.34, 6.59), ("sekali,", 6.59, 7.07), ("ANC", 7.33, 8.16), ("sampai", 8.16, 8.62),
    ("43", 8.62, 9.28), ("desibel.", 9.28, 10.05),
    ("Bising,", 10.36, 10.86), ("terus", 11.06, 11.26), ("senyap.", 11.26, 11.55),
    ("Nampak?", 11.92, 12.21), ("Driver", 12.65, 13.07), ("11mm,", 13.07, 13.84),
    ("bass", 14.18, 14.54), ("memang", 14.54, 14.90), ("padu.", 14.90, 15.73),
    ("Chip", 16.16, 16.30), ("Qualcomm", 16.30, 16.68), ("aptX", 16.68, 17.24), ("Adaptive,", 17.24, 17.96),
    ("audio", 18.21, 18.40), ("jelas.", 18.40, 19.03),
    ("Bateri", 19.51, 19.87), ("sampai", 19.87, 20.02), ("45", 20.02, 20.60), ("jam", 20.60, 21.08),
    ("dengan", 21.08, 21.36), ("case.", 21.36, 21.79),
    ("Charge", 22.28, 22.48), ("10", 22.48, 22.58), ("minit,", 22.58, 23.03), ("dengar", 23.18, 23.60),
    ("90", 23.60, 23.92), ("minit.", 23.92, 24.60),
    ("Ada", 25.02, 25.20), ("apps,", 25.20, 25.46), ("boleh", 25.73, 25.94), ("sambung", 25.94, 26.24),
    ("2", 26.24, 26.38), ("device", 26.38, 26.84), ("serentak.", 26.84, 27.34),
    ("Senang", 27.70, 28.02), ("je,", 28.02, 28.14), ("memang", 28.62, 28.80), ("best.", 28.80, 29.51),
    ("Tekan", 29.94, 30.14), ("beg", 30.14, 30.24), ("kuning", 30.24, 30.54), ("sekarang!", 30.54, 30.92),
]
WI = {}
for i, (t, a, b) in enumerate(W):
    WI.setdefault(t.strip(",.?!").lower(), []).append(i)


def w(text, nth=0):
    """source start of a word."""
    return W[WI[text.lower()][nth]][1]

# caption groups: (first word index, last word index), hook line (0-6) is the headline instead
GROUPS = [(7, 8), (9, 11), (12, 13), (14, 15), (16, 17), (18, 18), (19, 20), (21, 21), (22, 23), (24, 26),
          (27, 28), (29, 30), (31, 32), (33, 34), (35, 36), (37, 38), (39, 41), (42, 44), (45, 46), (47, 48),
          (49, 51), (52, 53), (54, 55), (56, 57), (58, 58)]
HOT = {"Nampak?", "Air", "Pro", "3.", "ANC", "43", "senyap.", "11mm,", "padu.", "Qualcomm", "aptX", "45", "jam", "10", "90",
       "2", "device", "best.", "beg", "kuning"}
YELLOW = {"beg", "kuning", "Nampak"}

# ---------------------------------------------------------------- voice level for the EQ dock (output-time, 30 fps)
db_src = None
try:
    import numpy as np
    db_src = np.load(os.path.join(SCRATCH, "db.npy"))  # 10 ms frames of the source
except Exception:
    pass
FPS = 30
LEVELS = []
for f in range(int(TOTAL * FPS) + 2):
    t_out = f / FPS
    # output -> source
    src = None
    for g in SEGS:
        if g["o"] <= t_out < g["o"] + (g["b"] - g["a"]):
            src = g["a"] + (t_out - g["o"])
            break
    v = 0.0
    if src is not None and db_src is not None:
        i = int(src * 100)
        seg_db = db_src[max(0, i - 2): i + 3]
        d = float(seg_db.max()) if len(seg_db) else -80
        v = max(0.0, min(1.0, (d + 46) / 30))
    LEVELS.append(round(v, 2))

# ---------------------------------------------------------------- timed overlay plan (output seconds)
t_tap = T(w("tekan"))
t_anc = T(w("anc"))
t_43 = T(w("43"))
t_bising = T(w("bising"))
t_terus = T(w("terus"))
t_senyap = T(w("senyap"))
t_11 = T(w("11mm"))
t_padu = T(w("padu"))
t_qual = T(w("qualcomm"))
t_45 = T(w("45"))
t_10 = T(w("10"))
t_90 = T(w("90"))
t_2 = T(w("2"))
t_best = T(w("best"))
t_cta = T(w("tekan", 1))
t_kuning = T(w("kuning"))

# headlines in the top band (y 180-330): id, start, end
HEAD = {
    "h-hook": (0.0, seg("B")["o"]),
    "h-name": (seg("B")["o"] + 0.05, seg("C")["o"]),
    "h-anc": (t_anc - 0.05, seg("D")["o"]),
    "h-senyap": (t_senyap - 0.04, seg("E1")["o"] - 0.02),
    "h-nampak": (seg("E1")["o"] - 0.03, t_11 - 0.07),
    "h-driver": (t_11 - 0.05, seg("F")["o"]),
    "h-chip": (t_qual - 0.08, seg("G")["o"]),
    "h-batt": (t_45 - 0.08, seg("H")["o"]),
    "h-charge": (seg("H")["o"] + 0.05, seg("I")["o"]),
    "h-device": (seg("I")["o"] + 0.05, seg("J")["o"]),
    "h-best": (seg("J")["o"] + 0.05, seg("K")["o"]),
    "h-cta": (seg("K")["o"], TOTAL),
}
# flying b-roll cards: id, image, side, in, out
CARDS = [
    ("c-box", "earfun1.jpeg", "R", seg("B")["o"] + 0.15, seg("C")["o"] + 0.25),
    ("c-anc", "earfun5.jpeg", "L", t_anc - 0.10, seg("D")["o"] + 0.10),
    ("c-bud", "earfun3.jpeg", "R", T(w("driver")) - 0.05, seg("F")["o"] + 0.10),
    ("c-chip", "earfun2.jpeg", "L", t_qual - 0.12, seg("G")["o"] + 0.05),
    ("c-batt", "earfun4.jpeg", "R", T(w("bateri")) - 0.02, seg("I")["o"] + 0.10),
    ("c-hero", "earfun1.jpeg", "L", seg("K")["o"] - 0.05, TOTAL),
]

# sound cues: id, file, start, volume
SFX = []
whooshes = ["whoosh-1", "whoosh-2", "whoosh-4"]
for i, c in enumerate(CARDS):
    SFX.append((f"sfx-wh-{c[0]}", f"assets/sfx/{whooshes[i % 3]}.mp3", max(0, c[3] - 0.04), 0.42))
SFX += [
    ("sfx-tap", "assets/sfx/tap-3.mp3", t_tap - 0.02, 0.9),
    ("sfx-pop-nampak", "assets/sfx/pop-3.mp3", seg("E1")["o"], 0.45),
    ("sfx-pop-43", "assets/sfx/pop-3.mp3", t_43 + 0.02, 0.38),
    ("sfx-vacuum", "assets/sfx/vacuum-1.mp3", t_terus - 0.05, 0.55),
    ("sfx-bass", "assets/sfx/bass-1.mp3", t_padu - 0.03, 0.55),
    ("sfx-pop-45", "assets/sfx/pop-3.mp3", t_45 + 0.02, 0.38),
    ("sfx-pop-90", "assets/sfx/pop-3.mp3", t_90 + 0.02, 0.38),
    ("sfx-pop-2", "assets/sfx/pop-3.mp3", t_2 + 0.02, 0.38),
    ("sfx-pop-best", "assets/sfx/pop-3.mp3", t_best + 0.05, 0.38),
    ("sfx-riser", "assets/sfx/riser-3.mp3", max(0, t_cta - 1.05), 0.35),
    ("sfx-ching", "assets/sfx/ching-2.mp3", t_kuning - 0.15, 0.6),
]
SFX_DUR = {"whoosh": 0.8, "tap": 0.6, "pop": 0.48, "vacuum": 1.48, "bass": 1.2, "riser": 2.0, "ching": 1.0}

# city noise envelope (clip-local seconds): loud in the hook, ducked under talk, ANC tap kills it,
# "Bising" brings it back for the demo, "terus senyap" sucks it out.
noise_end = t_senyap + 0.05
NOISE_PTS = [
    (0.0, 0.30), (seg("A2")["o"] + 1.2, 0.30), (seg("B")["o"], 0.16), (t_tap, 0.16), (t_tap + 0.5, 0.02),
    (t_bising - 0.15, 0.02), (t_bising, 0.34), (t_terus, 0.30), (t_senyap, 0.0), (noise_end, 0.0),
]
# music bed: under the voice the whole way, opens up after the last word
last_word = T(W[-1][2])
BGM_PTS = [(0, 0.16), (last_word - 0.1, 0.16), (last_word + 0.25, 0.42), (TOTAL, 0.42)]
BGM_MEDIA_START = max(0.0, 27.25 - TOTAL)  # land the track's own ending on the last frame


def auto(points):
    return json.dumps({"version": 1, "lanes": [{"target": "volume", "points": [{"t": round(t, 3), "v": v} for t, v in points]}]})

# ---------------------------------------------------------------- noise squiggle frames (deterministic)
def noise_path(side, k, amp):
    # concentric jagged arcs pointing at the head; side L arcs open to the right
    import random
    rnd = random.Random(1000 * (1 if side == "L" else 2) + k)
    paths = []
    for r_i, r in enumerate((60, 120, 180)):
        pts = []
        for j in range(15):
            ang = -60 + j * (120 / 14)
            jitter = (rnd.random() - 0.5) * amp * (1 + r_i * 0.4)
            rr = r + jitter
            x = rr * math.cos(math.radians(ang))
            y = rr * math.sin(math.radians(ang))
            if side == "L":
                x = -x
            pts.append(f"{x + (230 if side == 'L' else 70):.1f},{y + 190:.1f}")
        paths.append("M" + " L".join(pts))
    return paths

NOISE_FRAMES = 40

# ---------------------------------------------------------------- HTML
esc = html.escape
parts = []
P = parts.append

P(f"""<!doctype html>
<html lang="ms" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {{
        --ink: #0a0e1a;
        --ink-2: #131a2e;
        --cyan: #3be2ff;
        --cyan-deep: #00a9d6;
        --yellow: #ffd60a;
        --noise: #ff4b3e;
        --paper: #f7faff;
        --display: "Archivo Black", sans-serif;
        --text: "Inter", sans-serif;
        --mono: "JetBrains Mono", monospace;
      }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: var(--ink); }}
      #root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: var(--text); }}
      #stage-bg {{ position: absolute; inset: 0; background: var(--ink); }}
      .world {{ position: absolute; left: -60px; top: -100px; width: 1200px; height: 2120px; }}
      .world img {{ width: 1200px; height: 2120px; object-fit: cover; display: block; }}
      #w-quiet {{ clip-path: circle(0px at 605px 840px); }}
      #w-quiet-tint {{ position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 38%, rgba(59,226,255,0.0) 30%, rgba(59,226,255,0.14) 100%); }}
      #cam {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; transform-origin: {ORIGIN[0]}px {ORIGIN[1]}px; }}
      #cam video {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }}

      /* ---------- top headline band (y 180-330, inside the TikTok/IG safe zone) */
      .head {{ position: absolute; left: 0; top: 176px; width: 1080px; height: 170px; display: flex; flex-direction: column;
               align-items: center; justify-content: center; text-align: center; }}
      .hin {{ display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; }}
      .hl {{ font-family: var(--display); color: var(--ink); text-transform: uppercase; line-height: 0.95; letter-spacing: -0.01em;
             text-shadow: 0 0 3px #fff, 0 0 16px rgba(255,255,255,0.95), 0 0 34px rgba(255,255,255,0.8); }}
      .slab {{ text-shadow: none; }}
      .slab {{ display: inline-block; padding: 4px 18px 8px; border-radius: 14px; background: var(--cyan); color: var(--ink); }}
      .slab.y {{ background: var(--yellow); }}
      .slab.k {{ background: var(--ink); color: var(--paper); }}
      .kicker {{ font-family: var(--mono); font-weight: 700; font-size: 30px; letter-spacing: 0.18em; color: var(--ink);
                 text-transform: uppercase; margin-bottom: 10px;
                 text-shadow: 0 0 3px #fff, 0 0 12px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.9); }}
      .kicker b {{ color: var(--cyan-deep); }}
      .big {{ font-size: 132px; }}
      .mid {{ font-size: 84px; }}
      .sm {{ font-size: 62px; }}
      .unit {{ font-size: 64px; vertical-align: top; margin-left: 6px; text-transform: none; }}
      .row {{ display: flex; align-items: center; gap: 18px; }}
      .hook-line {{ font-size: 74px; }}
      .hook-line .nz {{ color: var(--noise); }}
      .stars {{ display: flex; gap: 10px; margin-top: 8px; }}
      .star {{ width: 54px; height: 54px; }}

      /* ---------- flying b-roll cards in the side gutters (never over the face) */
      .card {{ position: absolute; width: 300px; height: 300px; opacity: 0; }}
      .card .inner {{ width: 100%; height: 100%; border-radius: 30px; overflow: hidden; background: #fff;
                      border: 7px solid #fff; box-shadow: 0 26px 60px rgba(5, 10, 30, 0.45), 0 0 0 3px rgba(59, 226, 255, 0.9); }}
      .card img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
      .card.L {{ left: 8px; top: 560px; }}
      .card.R {{ left: 772px; top: 520px; }}

      /* ---------- noise arcs (hook) */
      .noise {{ position: absolute; top: 470px; width: 300px; height: 380px; opacity: 0; }}
      .noise.L {{ left: 0; }}
      .noise.R {{ left: 780px; }}
      .noise path {{ fill: none; stroke: var(--noise); stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; }}

      /* ---------- captions (chest band y ~1190-1320, below the chin) */
      #cap-layer {{ position: absolute; left: 0; top: 1186px; width: 1080px; height: 140px; }}
      .cap {{ position: absolute; left: 0; top: 0; width: 1080px; height: 140px; display: flex; align-items: center;
              justify-content: center; font-family: var(--display); text-transform: uppercase;
              font-size: 70px; color: var(--paper); letter-spacing: -0.005em;
              text-shadow: 0 4px 0 var(--ink), 0 0 24px rgba(10, 14, 26, 0.85); }}
      .cin {{ display: flex; gap: 28px; align-items: center; justify-content: center; opacity: 0; }}
      .cap .wd {{ display: inline-block; }}
      .cap .wd.hot {{ color: var(--cyan); }}
      .cap .wd.hot.y {{ color: var(--yellow); }}

      /* ---------- player dock (bottom, covers the hand zone; UI-safe decoration only) */
      #dock {{ position: absolute; left: 0; top: 1462px; width: 1080px; height: 458px; }}
      #dock-bg {{ position: absolute; inset: 0;
                  background: linear-gradient(180deg, rgba(10,14,26,0) 0px, rgba(10,14,26,0.92) 46px, var(--ink) 70px, var(--ink) 100%); }}
      #dock-line {{ position: absolute; left: 0; top: 64px; width: 1080px; height: 3px; background: linear-gradient(90deg, rgba(59,226,255,0), var(--cyan), rgba(59,226,255,0)); opacity: 0.85; }}
      #eq {{ position: absolute; left: 40px; top: 96px; width: 1000px; height: 150px; display: flex; align-items: center; gap: 8px; }}
      .bar {{ flex: 1; height: 150px; border-radius: 10px; background: linear-gradient(180deg, var(--cyan), var(--cyan-deep));
              transform-origin: 50% 50%; transform: scaleY(0.06); opacity: 0.9; }}
      #anc-pill {{ position: absolute; left: 40px; top: 276px; height: 58px; padding: 0 22px; border-radius: 29px;
                   display: flex; align-items: center; gap: 14px; background: #1c2338; font-family: var(--mono);
                   font-weight: 700; font-size: 26px; color: #8a93ad; letter-spacing: 0.12em; }}
      #anc-dot {{ width: 18px; height: 18px; border-radius: 50%; background: var(--noise); }}
      #anc-on {{ position: absolute; left: 0; top: 0; height: 58px; padding: 0 22px; border-radius: 29px; display: flex;
                 align-items: center; gap: 14px; background: var(--cyan); color: var(--ink); opacity: 0; white-space: nowrap; }}
      #anc-on i {{ width: 18px; height: 18px; border-radius: 50%; background: var(--ink); display: inline-block; }}
      #prog {{ position: absolute; left: 40px; top: 370px; width: 1000px; height: 6px; border-radius: 3px; background: #232b44; overflow: hidden; }}
      #prog-fill {{ width: 1000px; height: 6px; background: var(--cyan); transform-origin: 0 50%; transform: scaleX(0); }}
      #dock-title {{ position: absolute; right: 40px; top: 282px; font-family: var(--mono); font-size: 24px; letter-spacing: 0.14em; color: #8a93ad; text-transform: uppercase; }}

      /* ---------- CTA */
      #cta {{ position: absolute; left: 0; top: 1186px; width: 1080px; height: 140px; display: flex; align-items: center; justify-content: center; }}
      #cta-pill {{ display: flex; align-items: center; gap: 22px; padding: 18px 40px 18px 26px; border-radius: 80px; background: var(--yellow);
                   font-family: var(--display); font-size: 58px; color: var(--ink); text-transform: uppercase; box-shadow: 0 18px 50px rgba(255, 214, 10, 0.45); }}
      #cta-bag {{ width: 84px; height: 84px; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920" data-motion-blur="on">
      <div id="stage-bg"></div>
      <div id="w-noisy" class="world" data-layout-ignore data-motion-blur="off"><img id="img-noisy" src="assets/img/bg-noisy.jpg" alt="" /></div>
      <div id="w-quiet" class="world" data-layout-ignore data-motion-blur="off"><img id="img-quiet" src="assets/img/bg-quiet.jpg" alt="" /><div id="w-quiet-tint"></div></div>
      <div id="cam">
""")

# video clips
for g in SEGS:
    dur = round(g["b"] - g["a"], 3)
    P(f'        <video id="v-{g["id"]}" class="clip" src="assets/video/speaker-cutout.webm" data-start="{g["o"]}" data-duration="{dur}" '
      f'data-media-start="{g["a"]}" data-track-index="0" muted playsinline></video>\n')
P(f'        <img id="v-hold" class="clip" src="assets/img/last-frame-cutout.png" alt="" data-start="{VID_END}" data-duration="{HOLD}" data-track-index="1" style="position:absolute;left:0;top:0;width:1080px;height:1920px;object-fit:cover" />\n')
P("      </div>\n")

# noise arcs
for side in ("L", "R"):
    P(f'      <svg id="nz-{side}" class="noise {side}" viewBox="0 0 300 380" data-layout-ignore>\n')
    p0 = noise_path(side, 0, 34)
    for k, d in enumerate(p0):
        P(f'        <path id="nz-{side}-{k}" d="{d}" />\n')
    P("      </svg>\n")

# cards
for cid, img, side, a, b in CARDS:
    P(f'      <div id="{cid}" class="card {side}"><div class="inner"><img src="assets/img/{img}" alt="" /></div></div>\n')

# headlines
STAR = '<svg class="star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#ffd60a" stroke="#0a0e1a" stroke-width="1.6" stroke-linejoin="round"/></svg>'
HEAD_HTML = {
    "h-hook": '<div class="hl hook-line">Bunyi luar</div><div class="hl hook-line"><span class="slab k">masih <span class="nz">masuk?</span></span></div>',
    "h-name": '<div class="kicker">EarFun <b>//</b> Review jujur</div><div class="hl mid"><span class="slab">Air Pro 3</span></div>',
    "h-anc": '<div class="kicker">Active Noise Cancelling</div><div class="row"><div class="hl big"><span id="n-43">0</span><span class="unit">dB</span></div><div class="hl sm"><span class="slab">ANC</span></div></div>',
    "h-senyap": '<div class="hl big row" id="senyap-word" style="gap:0">' + "".join(f'<span class="sl" id="sl-{i}" style="display:inline-block">{ch}</span>' for i, ch in enumerate("SENYAP.")) + '</div>',
    "h-nampak": '<div class="hl big"><span class="slab y" id="nampak-slab">Nampak?</span></div>',
    "h-driver": '<div class="kicker">Dynamic driver</div><div class="row"><div class="hl big">11<span class="unit">mm</span></div><div class="hl sm"><span class="slab" id="bass-slab">Bass padu</span></div></div>',
    "h-chip": '<div class="kicker">Qualcomm QCC3071</div><div class="hl mid"><span class="slab">aptX Adaptive</span></div>',
    "h-batt": '<div class="kicker">Bateri + case</div><div class="row"><div class="hl big"><span id="n-45">0</span></div><div class="hl sm"><span class="slab">Jam</span></div></div>',
    "h-charge": '<div class="kicker">Fast charge</div><div class="row"><div class="hl mid">10 min</div><div class="hl mid">&#8594;</div><div class="hl mid"><span class="slab" id="slab-90">90 min</span></div></div>',
    "h-device": '<div class="kicker">Multipoint + EarFun app</div><div class="row"><div class="hl big" id="n-2">2</div><div class="hl sm"><span class="slab">Device<br/>serentak</span></div></div>',
    "h-best": '<div class="hl mid"><span class="slab y">Memang best</span></div><div class="stars">' + "".join(f'<span id="st-{i}">{STAR}</span>' for i in range(5)) + '</div>',
    "h-cta": '<div class="kicker">Stok terhad</div><div class="hl mid">Grab <span class="slab y">sekarang</span></div>',
}
for hid, (a, b) in HEAD.items():
    P(f'      <div id="{hid}" class="head clip" data-motion-blur="off" data-start="{round(a,3)}" data-duration="{round(b-a,3)}" data-track-index="2"><div id="{hid}-in" class="hin">{HEAD_HTML[hid]}</div></div>\n')

# captions
P('      <div id="cap-layer" data-motion-blur="off">\n')
for gi, (i0, i1) in enumerate(GROUPS):
    a = T(W[i0][1]) - 0.06
    b = T(W[i1][2]) + 0.04
    if gi + 1 < len(GROUPS):
        nx = T(W[GROUPS[gi + 1][0]][1]) - 0.06
        b = nx if nx - b < 0.7 else b
    if i0 >= 56:
        continue  # the CTA pill speaks this line
    words = []
    for i in range(i0, i1 + 1):
        t = W[i][0]
        cls = "wd" + (" hot" if t in HOT else "") + (" y" if t.strip(",.?!") in YELLOW else "")
        words.append(f'<span id="w-{i}" class="{cls}">{esc(t.rstrip(",."))}</span>')
    P(f'        <div id="cap-{gi}" class="cap clip" data-start="{round(a,3)}" data-duration="{round(b-a,3)}" data-track-index="3"><div id="cap-{gi}-in" class="cin">{"".join(words)}</div></div>\n')
P("      </div>\n")

# CTA
BAG = ('<svg id="cta-bag" viewBox="0 0 64 64"><path d="M14 22h36l-3 34H17z" fill="#0a0e1a"/>'
       '<path d="M23 24v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#0a0e1a" stroke-width="5" stroke-linecap="round"/>'
       '<path d="M24 36l6 6 11-12" fill="none" stroke="#ffd60a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>')
cta_a = seg("K")["o"]
P(f'      <div id="cta" class="clip" data-motion-blur="off" data-start="{cta_a}" data-duration="{round(TOTAL-cta_a,3)}" data-track-index="4"><div id="cta-pill">{BAG}<span>Tekan beg kuning</span></div></div>\n')

# dock
P('      <div id="dock" data-layout-ignore data-motion-blur="off">\n        <div id="dock-bg"></div><div id="dock-line"></div>\n        <div id="eq">')
P("".join(f'<div class="bar" id="b{i}"></div>' for i in range(36)))
P('</div>\n        <div id="anc-pill"><span id="anc-dot"></span><span>ANC OFF</span><div id="anc-on"><i></i>ANC ON &#183; 43dB</div></div>\n')
P('        <div id="dock-title">Air Pro 3 &#183; LE Audio</div>\n        <div id="prog"><div id="prog-fill"></div></div>\n      </div>\n')

# audio
P(f'      <audio id="bgm" class="clip" src="assets/music/bgm.mp3" data-start="0" data-duration="{TOTAL}" data-media-start="{round(BGM_MEDIA_START,3)}" data-track-index="10" data-volume="1" '
  f"data-fx-chain=\"{html.escape(json.dumps({'version':1,'nodes':[{'type':'highpass','id':'hp','label':'Phone-speaker clean','params':{'frequency':110}},{'type':'peaking','id':'pk','label':'Voice pocket','params':{'frequency':2500,'gain':-4,'q':0.9}}]}), quote=True)}\" "
  f"data-automation='{auto(BGM_PTS)}'></audio>\n")
for g in SEGS:
    P(f'      <audio id="vo-{g["id"]}" class="clip" src="assets/video/voice.m4a" data-start="{g["o"]}" data-duration="{round(g["b"]-g["a"],3)}" data-media-start="{g["a"]}" data-track-index="9" data-volume="1" data-fade-in="0.015" data-fade-out="0.015"></audio>\n')
P(f"      <audio id=\"noise\" class=\"clip\" src=\"assets/sfx/city-noise.mp3\" data-start=\"0\" data-duration=\"{round(noise_end,3)}\" data-track-index=\"11\" data-volume=\"1\" data-automation='{auto(NOISE_PTS)}'></audio>\n")
for i, (sid, f, a, v) in enumerate(SFX):
    kind = f.split("/")[-1].split("-")[0]
    d = SFX_DUR.get(kind, 1.0)
    P(f'      <audio id="{sid}" class="clip" src="{f}" data-start="{round(a,3)}" data-duration="{d}" data-track-index="{12 + i % 3}" data-volume="{v}"></audio>\n')

P("    </div>\n")

# ---------------------------------------------------------------- timeline script
js = []
J = js.append
J("const tl = gsap.timeline({ paused: true });")
J(f"const TOTAL = {TOTAL};")
# camera: hard punch per cut + tiny drift inside each shot
for g in SEGS:
    dur = g["b"] - g["a"]
    J(f'tl.set("#cam", {{ scale: {g["s"]}, x: 0, y: 0 }}, {g["o"]});')
    J(f'tl.to("#cam", {{ scale: {round(g["s"] + 0.025, 3)}, duration: {round(dur, 3)}, ease: "none" }}, {g["o"]});')
    bs = round(1 + (g["s"] - 1) * 0.45, 3)
    J(f'tl.set(".world", {{ scale: {bs} }}, {g["o"]});')
    J(f'tl.to(".world", {{ scale: {round(bs + 0.012, 3)}, duration: {round(dur, 3)}, ease: "none" }}, {g["o"]});')

# background worlds follow the script: noisy street while it is loud, quiet room once ANC is on.
IRIS_C = "605px 840px"
def quiet_in(t, d=0.5):
    J(f'tl.fromTo("#w-quiet", {{ clipPath: "circle(0px at {IRIS_C})" }}, {{ clipPath: "circle(1500px at {IRIS_C})", duration: {d}, ease: "power3.inOut" }}, {round(t,3)});')
J(f'tl.set("#w-quiet", {{ clipPath: "circle(0px at {IRIS_C})" }}, 0);')
quiet_in(t_tap + 0.02, 0.55)                       # Tekan sekali -> ANC on
J(f'tl.set("#w-quiet", {{ clipPath: "circle(0px at {IRIS_C})" }}, {round(t_bising - 0.04,3)});')  # Bising -> street slams back
quiet_in(t_terus, 0.45)                             # terus senyap
# street jitter while it is noisy (deterministic hand-held shake)
import random as _r
_rng = _r.Random(7)
_t = 0.0
while _t < t_senyap:
    noisy = _t < t_tap + 0.3 or (t_bising - 0.05 <= _t < t_terus + 0.2)
    amp = 9 if noisy else 0
    J(f'tl.to("#img-noisy", {{ x: {round((_rng.random()-0.5)*2*amp,1)}, y: {round((_rng.random()-0.5)*2*amp,1)}, duration: 0.08, ease: "none" }}, {round(_t,2)});')
    _t += 0.08
# quiet room breathes very slowly (calm)
J(f'tl.fromTo("#img-quiet", {{ x: 0 }}, {{ x: -30, duration: TOTAL, ease: "none" }}, 0);')

# noise arcs: flicker through precomputed frames while noisy, then flatten
nz_on, nz_dim, nz_flat = 0.0, seg("B")["o"], t_senyap
J('gsap.set([".noise"], { opacity: 0 });')
J('tl.set(".noise", { opacity: 1 }, 0);')
step = 0.1
k = 1
t = 0.1
while t < t_senyap:
    amp = 34 if t < seg("B")["o"] else (14 if t < t_tap + 0.4 else (6 if t < t_bising - 0.1 else 40))
    for side in ("L", "R"):
        for j, d in enumerate(noise_path(side, k, amp)):
            J(f'tl.set("#nz-{side}-{j}", {{ attr: {{ d: "{d}" }} }}, {round(t, 2)});')
    k += 1
    t += step
J(f'tl.to(".noise", {{ opacity: 0.35, duration: 0.3 }}, {seg("B")["o"]});')
J(f'tl.to(".noise", {{ opacity: 0.12, duration: 0.4 }}, {t_tap + 0.1});')
J(f'tl.to(".noise", {{ opacity: 1, duration: 0.1 }}, {t_bising - 0.05});')
J(f'tl.to(".noise", {{ opacity: 0, scale: 0.6, duration: 0.3, ease: "power3.in" }}, {t_senyap - 0.12});')

# headlines: entrances vary by beat; exits are short blur-outs
def head_in(hid, a, kind):
    if kind == "blur":
        J(f'tl.fromTo("#{hid}-in", {{ opacity: 0, filter: "blur(14px)", scale: 1.06 }}, {{ opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.2, ease: "power4.out" }}, {a});')
    elif kind == "drop":
        J(f'tl.fromTo("#{hid}-in", {{ opacity: 0, y: -40 }}, {{ opacity: 1, y: 0, duration: 0.45, ease: "expo.out" }}, {a});')
    elif kind == "pop":
        J(f'tl.fromTo("#{hid}-in", {{ opacity: 0, scale: 0.7 }}, {{ opacity: 1, scale: 1, duration: 0.42, ease: "back.out(1.6)" }}, {a});')
    elif kind == "whip":
        J(f'tl.fromTo("#{hid}-in", {{ opacity: 0, x: 220, filter: "blur(10px)" }}, {{ opacity: 1, x: 0, filter: "blur(0px)", duration: 0.32, ease: "expo.out" }}, {a});')
    elif kind == "now":
        J(f'tl.set("#{hid}-in", {{ opacity: 1 }}, {a});')

def head_out(hid, b):
    J(f'tl.to("#{hid}-in", {{ opacity: 0, filter: "blur(8px)", duration: 0.14, ease: "power2.in" }}, {round(b - 0.15, 3)});')

KINDS = {"h-nampak": "pop", "h-hook": "now", "h-name": "whip", "h-anc": "pop", "h-senyap": "blur", "h-driver": "drop", "h-chip": "whip",
         "h-batt": "pop", "h-charge": "drop", "h-device": "whip", "h-best": "pop", "h-cta": "blur"}
for hid, (a, b) in HEAD.items():
    head_in(hid, round(a, 3), KINDS[hid])
    if hid != "h-cta":
        head_out(hid, b)

# hook: a little shake on the noisy words
J(f'tl.fromTo("#h-hook .nz", {{ x: -3 }}, {{ x: 3, duration: 0.06, repeat: {int((seg("B")["o"]-0.2)/0.06)}, yoyo: true, ease: "none" }}, 0);')
# counters
J(f'const c43 = {{ v: 0 }}; tl.to(c43, {{ v: 43, duration: {round(t_43 + 0.25 - t_anc, 2)}, ease: "power2.out", onUpdate: () => {{ document.getElementById("n-43").textContent = Math.round(c43.v); }} }}, {t_anc});')
J(f'const c45 = {{ v: 0 }}; tl.to(c45, {{ v: 45, duration: 0.55, ease: "power2.out", onUpdate: () => {{ document.getElementById("n-45").textContent = Math.round(c45.v); }} }}, {t_45 - 0.05});')
J(f'tl.fromTo("#n-43", {{ scale: 1 }}, {{ scale: 1.12, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" }}, {t_43});')
# senyap: letters breathe apart once
for i in range(7):
    J(f'tl.fromTo("#sl-{i}", {{ x: 0 }}, {{ x: {(i-3)*14}, duration: 0.9, ease: "expo.out" }}, {t_senyap});')
# bass punch
J(f'tl.fromTo("#bass-slab", {{ scale: 1 }}, {{ scale: 1.22, duration: 0.09, yoyo: true, repeat: 3, ease: "power2.out" }}, {t_padu});')
J(f'tl.fromTo("#cam", {{ y: 0 }}, {{ y: 10, duration: 0.05, yoyo: true, repeat: 5, ease: "none" }}, {t_padu});')
# 90 min slab lands
J(f'tl.fromTo("#slab-90", {{ scale: 0.6, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.8)" }}, {t_90});')
J(f'tl.fromTo("#n-2", {{ scale: 0.3, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" }}, {t_2});')
J(f'tl.fromTo("#nampak-slab", {{ rotation: -8 }}, {{ rotation: 0, duration: 0.35, ease: "back.out(3)" }}, {seg("E1")["o"]});')
# stars
for i in range(5):
    J(f'tl.fromTo("#st-{i}", {{ scale: 0, rotation: -40 }}, {{ scale: 1, rotation: 0, duration: 0.3, ease: "back.out(2)" }}, {round(t_best + 0.05 + i*0.07,3)});')

# cards: fly in from off-screen, drift, fly out
for cid, img, side, a, b in CARDS:
    sgn = -1 if side == "L" else 1
    J(f'tl.fromTo("#{cid}", {{ opacity: 0, x: {sgn*620}, y: 160, rotation: {sgn*38}, scale: 0.55, filter: "blur(14px)" }}, '
      f'{{ opacity: 1, x: 0, y: 0, rotation: {sgn*7}, scale: 1, filter: "blur(0px)", duration: 0.62, ease: "expo.out" }}, {round(a,3)});')
    hold = b - a - 0.62 - 0.32
    if hold > 0.2:
        J(f'tl.to("#{cid}", {{ y: -18, rotation: {sgn*4}, duration: {round(hold,3)}, ease: "none" }}, {round(a+0.62,3)});')
    if b < TOTAL - 0.05:
        J(f'tl.to("#{cid}", {{ opacity: 0, x: {sgn*560}, y: -120, rotation: {sgn*30}, scale: 0.7, filter: "blur(10px)", duration: 0.32, ease: "power3.in" }}, {round(b-0.32,3)});')

# captions: group pops in, active word lifts
for gi, (i0, i1) in enumerate(GROUPS):
    if i0 >= 56:
        continue
    a = round(T(W[i0][1]) - 0.06, 3)
    J(f'tl.fromTo("#cap-{gi}-in", {{ opacity: 0, scale: 0.86, y: 14 }}, {{ opacity: 1, scale: 1, y: 0, duration: 0.16, ease: "back.out(2)" }}, {a});')
    nxt = GROUPS[gi + 1][0] if gi + 1 < len(GROUPS) else None
    end = T(W[i1][2]) + 0.04
    if nxt is not None:
        nx = T(W[nxt][1]) - 0.06
        end = nx if nx - end < 0.7 else end
    J(f'tl.to("#cap-{gi}-in", {{ opacity: 0, duration: 0.06 }}, {round(end - 0.07, 3)});')
    for i in range(i0, i1 + 1):
        ws = T(W[i][1])
        J(f'tl.fromTo("#w-{i}", {{ scale: 1, y: 0 }}, {{ scale: 1.07, y: -6, duration: 0.08, ease: "power2.out" }}, {round(ws,3)});')
        J(f'tl.to("#w-{i}", {{ scale: 1, y: 0, duration: 0.12, ease: "power2.inOut" }}, {round(ws + 0.1, 3)});')

# ANC pill flips on the tap
J(f'tl.fromTo("#anc-on", {{ opacity: 0, scale: 0.8 }}, {{ opacity: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }}, {t_tap});')
J(f'tl.fromTo("#dock-line", {{ opacity: 0.85 }}, {{ opacity: 0.25, duration: 0.6 }}, {t_tap});')
# progress bar
J(f'tl.fromTo("#prog-fill", {{ scaleX: 0 }}, {{ scaleX: 1, duration: TOTAL, ease: "none" }}, 0);')

# EQ bars driven by the voice level (deterministic function of time)
J(f"const LV = {json.dumps(LEVELS)};")
J("const bars = Array.from(document.querySelectorAll('#eq .bar'));")
J("const eqp = { t: 0 };")
J("function drawEq(t) { const f = Math.min(LV.length - 1, Math.max(0, Math.round(t * 30))); const lv = LV[f];"
  " for (let i = 0; i < bars.length; i++) { const shape = 0.55 + 0.45 * Math.sin(i * 0.9 + t * 7.3) * Math.cos(i * 0.37 - t * 3.1);"
  " const center = 1 - Math.abs(i - bars.length / 2) / (bars.length / 2) * 0.55;"
  " const v = Math.max(0.06, Math.min(1, 0.06 + lv * center * (0.45 + 0.55 * Math.abs(shape)))); bars[i].style.transform = 'scaleY(' + v.toFixed(3) + ')'; } }")
J("tl.to(eqp, { t: TOTAL, duration: TOTAL, ease: 'none', onUpdate: () => drawEq(eqp.t) }, 0);")

# CTA
J(f'tl.fromTo("#cta-pill", {{ scale: 0.5, opacity: 0, y: 40 }}, {{ scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" }}, {cta_a});')
J(f'tl.fromTo("#cta-bag", {{ rotation: 0 }}, {{ rotation: -14, duration: 0.12, yoyo: true, repeat: 5, ease: "power1.inOut" }}, {round(t_kuning,3)});')
J(f'tl.fromTo("#cta-pill", {{ boxShadow: "0 18px 50px rgba(255,214,10,0.45)" }}, {{ boxShadow: "0 18px 90px rgba(255,214,10,0.95)", duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut" }}, {round(t_kuning,3)});')

J('window.__timelines = window.__timelines || {};')
J('window.__timelines["main"] = tl;')

P("    <script>\n      " + "\n      ".join(js) + "\n    </script>\n  </body>\n</html>\n")

open(os.path.join(HERE, "index.html"), "w").write("".join(parts))
print("TOTAL", TOTAL)
for g in SEGS:
    print(g["id"], g["o"], round(g["b"] - g["a"], 2), g["s"])
print("tap", t_tap, "anc", t_anc, "senyap", t_senyap, "padu", t_padu, "cta", t_cta, "kuning", t_kuning, "bgm start", BGM_MEDIA_START)
