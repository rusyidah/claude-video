#!/usr/bin/env python3
"""Original 9:16 animated kids-nasyid style New Year short (20s, 120 BPM).
Renders frames with PIL, synthesizes music with numpy, muxes with ffmpeg."""
import math, random, subprocess, sys, wave
import numpy as np
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR, BPM = 1080, 1920, 24, 20.0, 120
BEAT = 60.0 / BPM
OUT = sys.argv[1] if len(sys.argv) > 1 else "tahun_baru_short.mp4"
FONT = "/usr/share/fonts/opentype/inter/Inter-Black.otf"

LYRICS = [
    ("Tahun baru,", "hati baru!"),
    ("Semangat baru,", "ayo belajar!"),
    ("Bismillah,", "kita mulai~"),
    ("Berbuat baik", "tiap hari!"),
    ("Selamat", "Tahun Baru 2027!"),
]
LINE_LEN = 4.0  # seconds per lyric line (2 bars)

# ---------- music ----------
SR = 44100
# melody per line: (beat offset, length in beats, midi); C-major pentatonic
MEL = [
    [(0, .5, 72), (.5, .5, 72), (1, 1, 76), (2, .5, 74), (2.5, .5, 72), (3, 1, 69),
     (4, .5, 67), (4.5, .5, 69), (5, 1, 72), (6, 1, 74), (7, 1, 72)],
    [(0, .5, 76), (.5, .5, 76), (1, 1, 79), (2, .5, 76), (2.5, .5, 74), (3, 1, 72),
     (4, .5, 74), (4.5, .5, 76), (5, 1, 74), (6, 1, 72), (7, 1, 67)],
    [(0, 1, 69), (1, .5, 72), (1.5, .5, 74), (2, 2, 76), (4, 1, 74), (5, .5, 72),
     (5.5, .5, 69), (6, 2, 67)],
    [(0, .5, 72), (.5, .5, 74), (1, 1, 76), (2, .5, 79), (2.5, .5, 76), (3, 1, 74),
     (4, 1, 72), (5, 1, 74), (6, 2, 76)],
    [(0, 1, 79), (1, 1, 79), (2, 1, 81), (3, 1, 79), (4, 1, 76), (5, 1, 79),
     (6, 2, 84)],
]
CHORDS = [48, 55, 57, 53]  # bass root per bar cycle: C G Am F


def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)


def add(buf, t0, sig, gain=1.0):
    i = int(t0 * SR)
    n = min(len(sig), len(buf) - i)
    if n > 0 and i >= 0:
        buf[i:i + n] += sig[:n] * gain


def marimba(freq, dur):
    t = np.arange(int((dur + 0.35) * SR)) / SR
    env = np.exp(-t * 7.0)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t * 18)
    return s * env


def bass(freq, dur):
    t = np.arange(int(dur * SR)) / SR
    tri = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * freq * t))
    return tri * np.minimum(1, (dur - t) * 30) * np.minimum(1, t * 200)


def kick():
    t = np.arange(int(.25 * SR)) / SR
    f = 120 * np.exp(-t * 28) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)


def clap(rng):
    t = np.arange(int(.18 * SR)) / SR
    return rng.standard_normal(len(t)) * np.exp(-t * 28) * 0.8


def hat(rng):
    t = np.arange(int(.05 * SR)) / SR
    n = rng.standard_normal(len(t))
    n = np.diff(n, prepend=0)
    return n * np.exp(-t * 90) * 0.5


def pop(rng):
    t = np.arange(int(.5 * SR)) / SR
    return (rng.standard_normal(len(t)) * np.exp(-t * 9) * 0.6
            + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 12))


def synth():
    rng = np.random.default_rng(7)
    buf = np.zeros(int(DUR * SR) + SR)
    nbars = int(DUR / (4 * BEAT))
    for b in range(nbars):
        t0 = b * 4 * BEAT
        for k in range(4):
            if k in (0, 2):
                add(buf, t0 + k * BEAT, kick(), 0.9)
            if k in (1, 3):
                add(buf, t0 + k * BEAT, clap(rng), 0.45)
            add(buf, t0 + k * BEAT, hat(rng), 0.35)
            add(buf, t0 + (k + .5) * BEAT, hat(rng), 0.25)
        root = CHORDS[b % 4]
        for k in range(4):  # bouncy bass: root, octave
            add(buf, t0 + k * BEAT, bass(mtof(root + (12 if k % 2 else 0)), BEAT * .9), 0.35)
        for k in range(8):  # offbeat marimba chord stabs
            if k % 2 == 1:
                for iv in (0, 7, 16):
                    add(buf, t0 + k * BEAT / 2, marimba(mtof(root + 12 + iv), .2), 0.07)
    for li, line in enumerate(MEL):
        for off, ln, m in line:
            add(buf, li * LINE_LEN + off * BEAT, marimba(mtof(m), ln * BEAT), 0.32)
    for tp in (16.0, 17.0, 18.0, 19.0):  # firework pops on final line
        add(buf, tp, pop(rng), 0.5)
    buf = buf[:int(DUR * SR)]
    buf = np.tanh(buf * 1.4) * 0.85
    fade = np.minimum(1, (len(buf) - np.arange(len(buf))) / (SR * 0.6))
    return buf * fade


def write_wav(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


# ---------- visuals ----------
F_BIG = ImageFont.truetype(FONT, 118)
F_MID = ImageFont.truetype(FONT, 76)
F_TITLE = ImageFont.truetype(FONT, 104)
random.seed(3)
CLOUDS = [(random.uniform(0, W), random.uniform(120, 700), random.uniform(.8, 1.5), random.uniform(10, 30)) for _ in range(6)]
CONFETTI = [(random.uniform(0, W), random.uniform(0, H), random.uniform(80, 220), random.uniform(0, 6.28),
             random.choice([(255, 90, 120), (255, 205, 60), (90, 200, 255), (130, 220, 110), (190, 120, 255)])) for _ in range(70)]
STARS = [(random.uniform(0, W), random.uniform(0, 900), random.uniform(0, 6.28)) for _ in range(30)]


def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def bg():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    top, bot = (70, 170, 255), (200, 235, 255)
    for y in range(0, H, 8):
        d.rectangle([0, y, W, y + 8], fill=lerp(top, bot, y / H))
    return img


BG = bg()


def sunburst(d, t):
    cx, cy = W // 2, 700
    for i in range(16):
        a = i * math.pi / 8 + t * 0.15
        a2 = a + math.pi / 16
        d.polygon([(cx, cy), (cx + 2000 * math.cos(a), cy + 2000 * math.sin(a)),
                   (cx + 2000 * math.cos(a2), cy + 2000 * math.sin(a2))], fill=(255, 255, 255, 38))


def cloud(d, x, y, s):
    for dx, dy, r in [(0, 0, 60), (60, -20, 75), (130, 0, 60), (65, 25, 60)]:
        d.ellipse([x + dx * s - r * s, y + dy * s - r * s, x + dx * s + r * s, y + dy * s + r * s], fill=(255, 255, 255, 235))


def firework(d, cx, cy, age, col):
    if age < 0 or age > 1.4: return
    r = 40 + 330 * (1 - math.exp(-age * 3))
    fade = max(0, 1 - age / 1.4)
    for i in range(18):
        a = i * 2 * math.pi / 18
        x, y = cx + r * math.cos(a), cy + r * math.sin(a) + 90 * age * age
        s = 12 * fade + 3
        d.ellipse([x - s, y - s, x + s, y + s], fill=col + (int(255 * fade),))
        x2, y2 = cx + r * .72 * math.cos(a + .17), cy + r * .72 * math.sin(a + .17) + 60 * age * age
        d.ellipse([x2 - s / 2, y2 - s / 2, x2 + s / 2, y2 + s / 2], fill=(255, 255, 255, int(220 * fade)))


def star(d, x, y, r, col, rot=0):
    pts = []
    for i in range(10):
        a = rot + i * math.pi / 5 - math.pi / 2
        rr = r if i % 2 == 0 else r * .45
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    d.polygon(pts, fill=col)


def kid(d, cx, base, t, kind, phase, squash):
    """Original chibi characters. kind: 'boy' (blue cap) or 'girl' (pink hijab)."""
    bounce = abs(math.sin((t / BEAT) * math.pi + phase)) * 70
    y0 = base - bounce
    sx = 1 + .06 * (1 - bounce / 70) * squash
    sy = 1 - .06 * (1 - bounce / 70) * squash
    skin = (255, 214, 178) if kind == "boy" else (240, 195, 160)
    outfit = (255, 170, 40) if kind == "boy" else (150, 90, 220)
    hood = (60, 120, 230) if kind == "boy" else (255, 120, 170)
    # body
    bw, bh = 190 * sx, 230 * sy
    d.rounded_rectangle([cx - bw / 2, y0 - bh, cx + bw / 2, y0], 70, fill=outfit, outline=(60, 40, 80), width=6)
    # arms waving
    wv = math.sin(t * 2 * math.pi / BEAT + phase)
    for side in (-1, 1):
        ay = y0 - bh * .7 - (110 + 50 * wv * side if True else 0) * (1 if side == 1 else .4)
        d.line([(cx + side * bw / 2 * .8, y0 - bh * .65), (cx + side * (bw / 2 + 60), ay)], fill=outfit, width=44)
        d.ellipse([cx + side * (bw / 2 + 60) - 28, ay - 28, cx + side * (bw / 2 + 60) + 28, ay + 28], fill=skin, outline=(60, 40, 80), width=5)
    # head
    hr = 170
    hy = y0 - bh - hr * .75 * sy
    tilt = 14 * math.sin(t * math.pi / BEAT + phase)
    hx = cx + tilt
    if kind == "girl":
        d.ellipse([hx - hr - 22, hy - hr - 22, hx + hr + 22, hy + hr + 60], fill=hood, outline=(60, 40, 80), width=6)
    d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=skin, outline=(60, 40, 80), width=6)
    if kind == "boy":
        d.pieslice([hx - hr - 6, hy - hr - 6, hx + hr + 6, hy + hr + 6], 180, 360, fill=hood, outline=(60, 40, 80), width=6)
        d.rounded_rectangle([hx - 30, hy - hr * .3, hx + hr + 70, hy - hr * .1], 14, fill=hood, outline=(60, 40, 80), width=5)
        d.ellipse([hx - 18, hy - hr - 26, hx + 18, hy - hr + 10], fill=(255, 255, 255))
    # eyes (blink)
    blink = (t % 3.1) < 0.12
    for ex in (-62, 62):
        if blink:
            d.arc([hx + ex - 28, hy - 20, hx + ex + 28, hy + 22], 200, 340, fill=(40, 25, 50), width=8)
        else:
            d.ellipse([hx + ex - 30, hy - 40, hx + ex + 30, hy + 28], fill=(50, 30, 60))
            d.ellipse([hx + ex - 12, hy - 30, hx + ex + 10, hy - 8], fill=(255, 255, 255))
    for ex in (-100, 100):
        d.ellipse([hx + ex - 30, hy + 32, hx + ex + 30, hy + 64], fill=(255, 140, 150, 160))
    # mouth singing
    mo = (math.sin(t * 2 * math.pi / (BEAT / 2)) + 1) / 2
    d.ellipse([hx - 34, hy + 52, hx + 34, hy + 52 + 20 + 52 * mo], fill=(150, 40, 60), outline=(60, 40, 80), width=5)
    d.ellipse([hx - 18, hy + 52 + 20 + 52 * mo - 24, hx + 18, hy + 52 + 20 + 52 * mo - 2], fill=(255, 120, 130))


def text_outline(d, xy, s, font, fill, stroke=14, anchor="mm"):
    d.text(xy, s, font=font, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(50, 30, 90))


def lyric_color(i): return [(255, 215, 60), (120, 240, 140), (255, 140, 190), (120, 210, 255), (255, 235, 90)][i]


def frame(n):
    t = n / FPS
    base = BG.copy().convert("RGBA")
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    sunburst(d, t)
    for x, y, s, sp in CLOUDS:
        cloud(d, (x + t * sp) % (W + 400) - 200, y, s)
    # fireworks (pulse on beats, bigger in finale)
    fw = [(250, 560, (255, 90, 120)), (800, 430, (255, 210, 60)), (540, 300, (90, 200, 255)), (170, 900, (190, 120, 255)), (900, 800, (130, 230, 120))]
    for i, (fx, fy, col) in enumerate(fw):
        period = 2.0 if t < 16 else 1.0
        age = ((t - i * 0.4) % period) if t > 2 else -1
        if t >= 16 or i < 3 or t > 8:
            firework(d, fx, fy, age if age < 1.4 else -1, col)
    # hills
    d.ellipse([-500, 1450, 800, 2300], fill=(110, 205, 110, 255))
    d.ellipse([300, 1500, 1600, 2350], fill=(80, 185, 100, 255))
    d.rectangle([0, 1700, W, H], fill=(70, 170, 90, 255))
    # confetti
    for x, y0, sp, ph, col in CONFETTI:
        y = (y0 + t * sp) % (H + 100) - 50
        xx = x + 30 * math.sin(t * 2 + ph)
        r = 9 + 5 * math.sin(t * 6 + ph)
        d.rectangle([xx - r, y - r / 2, xx + r, y + r / 2], fill=col + (230,))
    # characters
    squash = 1.0
    kid(d, 330, 1650, t, "boy", 0.0, squash)
    kid(d, 760, 1650, t, "girl", math.pi / 2, squash)
    # stars floating
    for x, y, ph in STARS:
        a = 160 + 90 * math.sin(t * 5 + ph)
        star(d, x, y, 14 + 6 * math.sin(t * 4 + ph), (255, 245, 150, int(a)), t + ph)
    # title (first 4s only, then small tag)
    pulse = 1 + .05 * abs(math.sin(t / BEAT * math.pi))
    if t < LINE_LEN:
        ts = ImageFont.truetype(FONT, int(104 * pulse))
        text_outline(d, (W // 2, 230), "Spesial", ts, (255, 255, 255), 12)
        text_outline(d, (W // 2, 360), "Tahun Baru", ImageFont.truetype(FONT, int(150 * pulse)), (255, 215, 60), 16)
        text_outline(d, (W // 2, 500), "2027", ImageFont.truetype(FONT, int(170 * pulse)), (255, 120, 160), 16)
    else:
        text_outline(d, (W // 2, 120), "Tahun Baru 2027", F_MID, (255, 255, 255), 10)
    # lyrics
    li = min(int(t // LINE_LEN), len(LYRICS) - 1)
    lt = t - li * LINE_LEN
    pop = min(1, lt / 0.18)
    sc = 0.6 + 0.4 * (1 - (1 - pop) ** 3) + 0.04 * abs(math.sin(t / BEAT * math.pi))
    if li > 0 or lt > 0:
        a, b = LYRICS[li]
        col = lyric_color(li)
        fa = ImageFont.truetype(FONT, int(118 * sc))
        fb = ImageFont.truetype(FONT, int(104 * sc))
        if t >= LINE_LEN:
            text_outline(d, (W // 2, 780), a, fa, col, 14)
            text_outline(d, (W // 2, 930), b, fb, (255, 255, 255), 14)
    # sparkle on beat
    bp = (t / BEAT) % 1
    if bp < .25:
        r = 60 * (1 - bp / .25)
        star(d, 100 + 880 * ((int(t / BEAT) * .37) % 1), 1050, r, (255, 255, 255, 220), t)
    out = Image.alpha_composite(base, ov).convert("RGB")
    return out.tobytes()


def main():
    total = int(DUR * FPS)
    write_wav("/tmp/_music.wav", synth())
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-i", "/tmp/_music.wav", "-c:v", "libx264", "-preset", "medium",
         "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest",
         "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    with Pool(4) as p:
        for i, b in enumerate(p.imap(frame, range(total), chunksize=4)):
            ff.stdin.write(b)
            if i % 48 == 0: print(f"frame {i}/{total}", flush=True)
    ff.stdin.close(); ff.wait()
    print("done", OUT)


if __name__ == "__main__":
    main()
