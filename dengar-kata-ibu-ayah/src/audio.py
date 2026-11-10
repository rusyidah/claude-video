"""Synthesises an original backing track and sound effects for the edit (no samples, no voice).
120 BPM so that every scene boundary in storyboard.json lands on a beat.
Usage: python3 src/audio.py out/audio.wav
"""
import sys, wave
import numpy as np

SR, DUR, BEAT = 44100, 30.0, 0.5
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(0, pan)); R[i:i + len(sig)] += sig * (1 + min(0, pan))

def tt(d): return np.arange(int(d * SR)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def pluck(f, d=0.9):            # nylon-ish pluck: decaying harmonics
    t = tt(d); s = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3.5 + 2.2 * k)) / k ** 1.3 for k in range(1, 7))
    return s * np.minimum(1, t / 0.004)
def glock(f, d=1.2):            # bell: sine plus inharmonic partials
    t = tt(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 9)
                       + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 14))
def bass(f, d=0.45):
    t = tt(d); return np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * t)) * np.exp(-t * 5) * np.minimum(1, t / 0.01)
def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, mode='same')
def clap():
    t = tt(0.16); n = rng.standard_normal(len(t)); n = n - lowpass(n, 24)
    env = sum(np.exp(-np.maximum(0, t - o) * 60) * (t >= o) for o in (0, 0.011, 0.023))
    return n * env * 0.5
def pop(f0=420, f1=900, d=0.09):
    t = tt(d); f = np.linspace(f0, f1, len(t)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28)
def blup():
    return pop(260, 620, 0.12)
def ting(f=2093):
    return glock(f, 0.9) + 0.5 * glock(f * 1.5, 0.9)
def knock():
    t = tt(0.08); return np.sin(2 * np.pi * 760 * t) * np.exp(-t * 60)
def whoosh(d, up=True):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros(len(t)); y = 0.0
    a = np.linspace(0.02, 0.5, len(t)) if up else np.linspace(0.5, 0.02, len(t))
    for i in range(len(t)):      # one-pole low-pass with a moving cutoff
        y += a[i] * (n[i] - y); out[i] = y
    return out * np.sin(np.pi * t / d) ** 1.5

# harmony: C G Am F, one chord per 2-second bar
CH = {'C': [60, 64, 67, 72], 'G': [59, 62, 67, 71], 'Am': [57, 60, 64, 69], 'F': [57, 60, 65, 69]}
ROOT = {'C': 36, 'G': 43, 'Am': 45, 'F': 41}
PROG = ['C', 'G', 'Am', 'F']
MEL = {'C': [76, 79, 84, 79, 76, 79, 84, None], 'G': [74, 79, 83, 79, 74, 79, 83, None],
       'Am': [72, 76, 81, 76, 72, 76, 81, None], 'F': [72, 77, 81, 77, 72, 77, 79, None]}

def strum(ch, t, g, down=True):
    notes = CH[ch] if down else CH[ch][::-1]
    for i, n in enumerate(notes): add(pluck(midi(n)), t + i * 0.012, g * 0.16, pan=0.25)

# per-section mix: (start, end, uke, glock, clap, bass)
SECTIONS = [
    (0.0, 3.0, 1.0, 0.8, 0.0, 0.6),    # title: intro
    (3.0, 9.0, 0.55, 0.0, 0.0, 0.35),  # scene 2: quiet under the request
    (9.0, 14.0, 1.0, 0.9, 1.0, 1.0),   # scene 3: full
    (14.0, 20.0, 0.0, 0.45, 0.0, 0.8), # scene 4: pattern interrupt, sparse
    (20.0, 25.5, 1.0, 0.8, 0.7, 1.0),  # scene 5: warm, full
]
def mix(t):
    for a, b, *g in SECTIONS:
        if a <= t < b: return g
    return None

for bi in range(int(DUR / 2)):
    ch = PROG[bi % 4]
    for e in range(8):                       # eighth notes
        t = bi * 2 + e * 0.25
        g = mix(t)
        if g is None: continue
        uke, gl, cl, bs = g
        if uke and e in (0, 2, 3, 4, 6, 7): strum(ch, t, uke * (1.0 if e % 2 == 0 else 0.7), down=e % 2 == 0)
        if gl and MEL[ch][e] is not None and (gl > 0.5 or e % 4 == 0): add(glock(midi(MEL[ch][e])), t, gl * 0.13, pan=-0.3)
        if cl and e in (2, 6): add(clap(), t, cl * 0.5)
        if bs and e in (0, 4): add(bass(midi(ROOT[ch] + (7 if e == 4 else 0))), t, bs * 0.3)

# title: a pop for each title word, whoosh for the opening wipe
for i, t in enumerate((0.45, 0.91, 1.19, 1.51)): add(pop(380 + 90 * i, 800 + 150 * i), t, 0.5)
add(whoosh(0.8), 2.6, 0.5)
# scene 2: toys knocking
for t in (3.5, 4.5, 5.0, 5.5, 6.0, 6.5, 7.5, 8.0): add(knock(), t, 0.22, pan=-0.3)
add(pop(), 8.0, 0.45)                        # keyword echo
# scene 3: three tings as the toys land
for i, t in enumerate((11.5, 12.0, 12.5)): add(ting(2093 * 2 ** (i * 2 / 12)), t, 0.3)
add(whoosh(0.3), 13.85, 0.4)                 # fast push
# scene 4: running water and bubble blups
w = rng.standard_normal(int(5.9 * SR)); w = (w - lowpass(w, 6)) * 0.5 + lowpass(w, 40) * 0.5
env = np.minimum(1, tt(5.9) / 0.3) * np.minimum(1, (5.9 - tt(5.9)) / 0.4)
add(w * env, 14.05, 0.05)
for t in (14.8, 15.6, 16.4, 16.9, 17.5, 18.4, 19.1): add(blup(), t, 0.3, pan=0.3 if int(t * 10) % 2 else -0.3)
add(whoosh(0.45), 19.55, 0.4); add(blup(), 20.1, 0.5); add(pop(500, 1100), 20.25, 0.4)
# scene 5: heart pop
add(pop(600, 1200), 23.0, 0.4); add(ting(1568), 23.0, 0.18)
# music stops at 25.5, short gap, then the closing wipe and the final cadence
add(whoosh(0.8), 25.6, 0.35)
for i, n in enumerate([72, 76, 79, 84]): add(glock(midi(n), 2.0), 26.5 + i * 0.25, 0.16, pan=-0.2)
strum('F', 26.5, 0.9); strum('G', 27.0, 0.9); add(bass(midi(41), 0.5), 26.5, 0.3); add(bass(midi(43), 0.5), 27.0, 0.3)
strum('C', 27.5, 1.0); add(bass(midi(36), 1.2), 27.5, 0.35)
for i, n in enumerate([84, 88, 91, 96]): add(glock(midi(n), 2.5), 28.0 + i * 0.125, 0.14)
strum('C', 28.5, 0.8, down=False)

out = np.stack([L, R], axis=1)
out = np.tanh(out * (3.2 / np.max(np.abs(out)))) * 0.92   # soft limiter: lifts the average level without clipping
fade = np.ones(N); k = int(0.5 * SR); fade[-k:] = np.linspace(1, 0, k)   # fades with the picture
out = (out * fade[:, None] * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(out.tobytes())
print('wrote', sys.argv[1])
