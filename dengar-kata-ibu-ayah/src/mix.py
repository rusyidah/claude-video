"""Places the ElevenLabs voice takes on the timeline, ducks the music under them and writes the final mix.
Usage: python3 src/mix.py out/audio.wav out/mix.wav      (audio.wav comes from src/audio.py)
Needs ffmpeg with the rubberband filter (pitch / tempo without changing the other).
"""
import subprocess, sys, wave
import numpy as np

SR = 44100
DUCK_DB = -12.0          # storyboard: music 12 dB down under dialogue
DUCK_DB_CLOSING = -18.0  # the closing cadence is busier, so it sits further back under the last line
SOFIA_PITCH = 1.122      # +2 semitones: the library voice is a young adult, Sofia is five

def decode(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

def rubber(x, tempo=1.0, pitch=1.0):
    if abs(tempo - 1) < 0.005 and abs(pitch - 1) < 0.005: return x
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-af', f'rubberband=tempo={tempo:.4f}:pitch={pitch:.4f}', '-f', 'f32le', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64)

def envelope(x, win=0.02):
    k = int(win * SR); return np.sqrt(np.convolve(x * x, np.ones(k) / k, mode='same'))

def speech_span(x):
    e = envelope(x); idx = np.where(e > 0.06 * e.max())[0]
    return idx[0], idx[-1]

def fit(x, target=None, pitch=1.0, split=None, targets=None):
    """Trim to the spoken part and stretch it to `target` seconds.
    With `split` (seconds into the raw clip) the two halves are stretched separately to `targets`."""
    a, b = speech_span(x)
    if split is None:
        seg = x[a:b]; return rubber(seg, tempo=(len(seg) / SR) / target, pitch=pitch)
    e = envelope(x); lo, hi = int((split - 0.25) * SR), int((split + 0.12) * SR)
    s = lo + int(np.argmin(e[lo:hi]))                       # quietest point near the phrase boundary
    parts = []
    for seg, tg in ((x[a:s], targets[0]), (x[s:b], targets[1])):
        y = rubber(seg, tempo=(len(seg) / SR) / tg, pitch=pitch)
        f = int(0.008 * SR); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
        parts.append(y)
    return np.concatenate(parts)

def level(x, rms=0.11):
    e = envelope(x); act = x[e > 0.1 * e.max()]
    return x * (rms / np.sqrt(np.mean(act ** 2)))

# (file, start, pan, kwargs for fit plus optional gain); lines spoken together share a start
V = 'voice/'
LINES = [
    ('amir-1-tajuk', 0.45, -0.15, dict(target=None)),                       # lead
    ('sofia-1-tajuk', 0.45, 0.15, dict(target=1.58, pitch=SOFIA_PITCH, gain=0.45)),
    ('ibu-2-kemas-mainan', 3.60, 0.0, dict(target=None)),
    ('amir-3-baik-ibu', 9.30, -0.15, dict(target=1.06)),
    ('sofia-3-baik-ibu', 9.30, 0.15, dict(target=1.06, pitch=SOFIA_PITCH)),
    ('sofia-3-jom-kemas', 11.30, 0.15, dict(target=None, pitch=SOFIA_PITCH)),
    ('ayah-4-basuh-tangan', 14.30, 0.0, dict(target=None)),
    ('amir-4-baik-ayah', 17.60, -0.15, dict(target=None)),
    ('ibu-5-terima-kasih', 20.70, 0.0, dict(target=None)),
    ('ayah-5-anak-baik', 23.30, 0.0, dict(target=None)),
    # closing line: the parents lead at their natural pace; the children are fitted to them and sit underneath.
    # Four equal voices in unison were not intelligible.
    ('ibu-6-penutup', 26.30, 0.1, dict(target=None)),
    ('ayah-6-penutup', 26.30, -0.1, dict(target=None)),
    ('amir-6-penutup', 26.30, -0.2, dict(split=1.62, targets=(1.27, 1.67), gain=0.25)),
    ('sofia-6-penutup', 26.30, 0.2, dict(split=1.68, targets=(1.27, 1.67), pitch=SOFIA_PITCH, gain=0.25)),
]

w = wave.open(sys.argv[1]); music = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2) / 32768.0
N = len(music)
voice = np.zeros((N, 2)); duck = np.zeros(N)
groups = {}
for name, start, pan, kw in LINES: groups[start] = groups.get(start, 0) + 1
for name, start, pan, kw in LINES:
    x = decode(V + name + '.mp3')
    kw = dict(kw); g = kw.pop('gain', 1.0)
    if 'split' not in kw and kw.get('target') is None:
        a, b = speech_span(x); kw['target'] = (b - a) / SR      # natural length, only trimmed (and pitched)
    y = level(fit(x, **kw)) * (1.15 / np.sqrt(groups[start])) * g
    i = int(start * SR); y = y[: N - i]
    voice[i:i + len(y), 0] += y * (1 - max(0, pan)); voice[i:i + len(y), 1] += y * (1 + min(0, pan))
    duck[max(0, i - int(0.1 * SR)): i + len(y) + int(0.15 * SR)] = DUCK_DB_CLOSING if start >= 26 else DUCK_DB
    print(f'{name:22s} {start:6.2f} -> {start + len(y) / SR:6.2f}')
k = int(0.12 * SR); duck = np.convolve(duck, np.ones(k) / k, mode='same')       # smooth ramps
gain = 10 ** (duck / 20)
out = music * gain[:, None] + voice
if len(sys.argv) > 3:      # optional voice-only stem, for checking intelligibility
    with wave.open(sys.argv[3], 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(voice, -1, 1) * 32767).astype(np.int16).tobytes())
out = np.tanh(out * 1.4) / np.tanh(1.4) * 0.95
with wave.open(sys.argv[2], 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((out * 32767).astype(np.int16).tobytes())
print('wrote', sys.argv[2])
