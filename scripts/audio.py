#!/usr/bin/env python3
"""Sintesis runut bunyi: muzik ceria 105 BPM (ukulele + glockenspiel + synth lembut) dan kesan bunyi.

Muzik diperlahankan -12 dB semasa dialog (ikut storyboard.json) supaya suara latar
boleh ditambah kemudian tanpa adunan semula.

    python3 scripts/audio.py out/audio.wav
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
DUR = 45.0
FPS = 30
BPM = 105
BEAT = 60 / BPM
BAR = 4 * BEAT
N = int(SR * DUR)
rng = np.random.default_rng(7)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(buf, t0, sig, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf) or i < 0:
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig * gain


def tt(d):
    return np.arange(int(d * SR)) / SR


def pluck(m, d=1.1):
    """Petikan tali nilon: harmonik tinggi reput lebih cepat."""
    t, f = tt(d), hz(m)
    s = sum(np.sin(2 * np.pi * k * f * t) * np.exp(-t * (2.5 + 1.6 * k)) / k for k in range(1, 9))
    return s * np.minimum(1, t / 0.003)


def glock(m, d=1.2):
    t, f = tt(d), hz(m)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 4.5)
         + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 9)
         + 0.12 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 16))
    return s * np.minimum(1, t / 0.002)


def pad(notes, d):
    t = tt(d)
    env = np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.4)
    s = sum(np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(2 * np.pi * 2 * hz(m) * t + 0.6 * np.sin(2 * np.pi * 0.3 * t))
            for m in notes)
    return s * env / len(notes)


def bass(m, d=0.5):
    t, f = tt(d), hz(m)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 5) * np.minimum(1, t / 0.005)


def noise(d):
    return rng.standard_normal(int(d * SR))


def lowpass(x, cutoff):
    # Penapis FIR sinc bertetingkap: pantas dan cukup untuk bunyi hingar.
    n = 255
    k = np.sinc(2 * cutoff / SR * (np.arange(n) - (n - 1) / 2)) * np.hanning(n)
    return np.convolve(x, k / k.sum(), mode='same')


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


# ---------- muzik ----------
CHORDS = {  # (suara ukulele, triad pad, bass, nada melodi)
    'C':  ([67, 60, 64, 72], [48, 55, 64], 36, [76, 79, 84]),
    'G':  ([67, 62, 67, 71], [43, 55, 62], 43, [74, 79, 83]),
    'Am': ([69, 60, 64, 69], [45, 52, 60], 45, [72, 76, 81]),
    'F':  ([69, 60, 65, 69], [41, 53, 60], 41, [72, 77, 81]),
    'Dm': ([69, 62, 65, 69], [50, 53, 57], 38, [74, 77, 81]),
    'E':  ([68, 64, 68, 71], [40, 52, 56], 40, [76, 80, 83]),
}
# Bar 11-13 (scene CO₂, ~25-32 s) bertukar minor supaya terasa sedikit misteri.
PROG = ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am',
        'Am', 'Dm', 'E', 'C', 'G', 'Am', 'F', 'G', 'C']
STRUM = [(0, 1, 1.0), (2, 1, 0.8), (3, -1, 0.6), (5, -1, 0.6), (6, 1, 0.85), (7, -1, 0.55)]  # (not 1/8, arah, kuat)
MELODY = [
    [(0, 0), (2, 1), (4, 2), (6, 1)],
    [(0, 2), (3, 1), (4, 0), (6, 1), (7, 2)],
    [(0, 0), (1, 1), (2, 2), (4, 1), (6, 2)],
    [(0, 2), (2, 1), (4, 0), (5, 1), (6, 2)],
]


def music():
    m = np.zeros(N)
    e8 = BEAT / 2
    for b, name in enumerate(PROG):
        t0 = b * BAR
        uke, triad, root, mel = CHORDS[name]
        last = b == len(PROG) - 1
        mystery = 11 <= b <= 13
        if last:
            for j, n in enumerate(uke):
                add(m, t0 + j * 0.03, pluck(n, 1.5), 0.3)
            for j, n in enumerate(mel + [mel[0] + 12]):
                add(m, t0 + j * 0.09, glock(n), 0.22)
            add(m, t0, bass(root, 1.2), 0.5)
            continue
        add(m, t0, pad(triad, BAR + 0.3), 0.11 if not mystery else 0.16)
        if b >= 1:
            for step, direction, vel in STRUM:
                order = uke if direction > 0 else uke[::-1]
                for j, n in enumerate(order):
                    add(m, t0 + step * e8 + j * 0.012, pluck(n), 0.14 * vel)
            for beat in (0, 2):
                add(m, t0 + beat * BEAT, bass(root), 0.42)
            add(m, t0 + 3.5 * BEAT, bass(root + 7, 0.3), 0.25)
            # Penggoncang lembut pada setiap not 1/8.
            for step in range(8):
                sh = highpass(noise(0.05), 5000) * np.exp(-tt(0.05) * 70)
                add(m, t0 + step * e8, sh, 0.035 if step % 2 else 0.05)
        pattern = MELODY[b % len(MELODY)] if not mystery else [(0, 0), (3, 1), (6, 2)]
        for step, idx in pattern:
            add(m, t0 + step * e8, glock(mel[idx]), 0.2)
    return m


def duck_envelope(dialogs):
    env = np.ones(N)
    low = 10 ** (-12 / 20)
    ramp = int(0.15 * SR)
    for d in dialogs:
        a, b = int(d['mula'] * SR), int(d['tamat'] * SR)
        env[max(0, a):min(N, b)] = low
    k = np.hanning(2 * ramp)
    return np.convolve(np.pad(env, ramp, mode='edge'), k / k.sum(), mode='same')[ramp:-ramp]


# ---------- kesan bunyi ----------
def sfx_pop(f0=420, f1=950):
    t = tt(0.09)
    ph = 2 * np.pi * np.cumsum(f0 + (f1 - f0) * t / t[-1]) / SR
    return np.sin(ph) * np.exp(-t * 35)


def sfx_ting(m=88):
    return glock(m, 1.0) + 0.4 * glock(m + 12, 1.0)


def sfx_whoosh(d=0.5):
    t = tt(d)
    n = noise(d)
    lo, hi = lowpass(n, 900), lowpass(n, 3500)
    mix = t / d
    return ((1 - mix) * lo + mix * hi) * np.sin(np.pi * t / d) ** 2


def sfx_pencil(d=1.0):
    t = tt(d)
    n = highpass(lowpass(noise(d), 6000), 1800)
    return n * (0.35 + 0.65 * np.abs(np.sin(2 * np.pi * 6.5 * t))) * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.08)


def sfx_drip():
    t = tt(0.16)
    ph = 2 * np.pi * np.cumsum(1500 * np.exp(-t * 9) + 500) / SR
    a = np.sin(ph) * np.exp(-t * 22)
    out = np.zeros(int(0.4 * SR))
    add(out, 0, a)
    add(out, 0.12, a, 0.45)
    return out


def sfx_clink():
    t = tt(0.5)
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((2637, 14), (3520, 18), (4699, 26)))
    out = np.zeros(int(0.8 * SR))
    add(out, 0, s, 0.5)
    add(out, 0.11, s, 0.3)
    return out


def sfx_hiss(d):
    t = tt(d)
    n = highpass(noise(d), 4500)
    return n * (0.7 + 0.3 * np.sin(2 * np.pi * 0.9 * t)) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.6)


def sfx_sparkle():
    out = np.zeros(int(1.6 * SR))
    for j, m in enumerate([84, 88, 91, 96, 100, 103]):
        add(out, j * 0.07, glock(m, 1.0), 0.5)
    return out


def effects():
    s = np.zeros(N)
    fr = lambda f: f / FPS
    for f, pitch in ((40, 420), (55, 520), (70, 640)):
        add(s, fr(f), sfx_pop(pitch, pitch * 2.2), 0.5)
    add(s, fr(110), sfx_whoosh(0.6), 0.35)                       # wipe bulat
    add(s, fr(120), sfx_pencil(1.0), 0.10)
    for f, m in ((160, 88), (185, 91), (210, 96)):
        add(s, fr(f), sfx_ting(m), 0.28)
    add(s, fr(289), sfx_whoosh(0.65), 0.35)                      # slide ke atas
    add(s, fr(330), sfx_pencil(1.5), 0.07)
    add(s, fr(400), sfx_ting(88), 0.3)
    add(s, fr(404), sfx_drip(), 0.3)
    add(s, fr(450), sfx_ting(93), 0.3)
    add(s, fr(543), sfx_whoosh(0.45), 0.3)                       # sorotan takat tigaan
    add(s, fr(648), sfx_whoosh(0.4), 0.25)                       # garis lebur jingga
    add(s, fr(686), sfx_clink(), 0.3)
    add(s, fr(769), sfx_whoosh(0.65), 0.35)                      # slide ke kiri
    add(s, fr(780), sfx_pencil(1.0), 0.10)
    add(s, fr(868), sfx_ting(86), 0.3)
    add(s, fr(900), sfx_pencil(1.0), 0.07)
    add(s, fr(1000), sfx_whoosh(1.8), 0.16)                      # anak panah pemejalwapan
    add(s, fr(1000), sfx_hiss(6.4), 0.045)                       # desis kabus ais kering
    add(s, fr(1096), sfx_ting(91), 0.3)
    add(s, fr(1180), sfx_whoosh(1.2), 0.4)                       # wipe kabus putih
    add(s, fr(1280), sfx_sparkle(), 0.3)                         # penutup (ganti sorakan)
    return s


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'out/audio.wav')
    story = json.loads((Path(__file__).resolve().parent.parent / 'footage' / 'storyboard.json').read_text())
    dialogs = [d for sc in story['scene'] for d in sc['dialog']]
    mix = music() * duck_envelope(dialogs) + effects()
    fade = int(0.5 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    mix *= 10 ** (-1.5 / 20) / np.max(np.abs(mix))
    pcm = (np.stack([mix, mix], axis=1) * 32767).astype('<i2')
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'Audio: {out} ({DUR:.0f}s)')


if __name__ == '__main__':
    main()
