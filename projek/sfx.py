# Synthesised SFX bed (whooshes on card entries, soft pops on counters, rise+impact on CTA).
# usage: python3 -I sfx.py out.wav
import sys, numpy as np, wave
SR=48000; DUR=30.2; N=int(SR*DUR); L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(3)
def env(n,a,d):  # attack/decay envelope in samples
    e=np.ones(n); a=max(1,a); e[:a]=np.linspace(0,1,a)**2; e[a:]=np.exp(-np.linspace(0,1,n-a)*d); return e
def bandsweep(n,f0,f1,q=6):
    """noise through a resonant band-pass whose centre glides f0->f1 (state-variable filter)"""
    x=rng.standard_normal(n); y=np.zeros(n); low=band=0.0
    fc=np.geomspace(f0,f1,n)
    for i in range(n):
        f=2*np.sin(np.pi*fc[i]/SR); high=x[i]-low-band/q; band+=f*high; low+=f*band; y[i]=band
    return y/ (np.abs(y).max()+1e-9)
def add(t,sig,gain,pan=0.0):
    i=int(t*SR); s=sig[:max(0,min(len(sig),N-i))]*gain
    L[i:i+len(s)]+=s*np.sqrt(.5*(1-pan)); R[i:i+len(s)]+=s*np.sqrt(.5*(1+pan))
def whoosh(dur=.45,f0=500,f1=4500):
    n=int(dur*SR); return bandsweep(n,f0,f1)*env(n,int(n*.55),6)
def pop(f=900,dur=.09):
    n=int(dur*SR); t=np.arange(n)/SR; fr=f*np.exp(-t*18); return np.sin(2*np.pi*np.cumsum(fr)/SR)*env(n,40,9)
def tick(f=2600,dur=.05):
    n=int(dur*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*f*t)*env(n,10,14)
def riser(dur=1.1):
    n=int(dur*SR); return bandsweep(n,300,7000,q=4)*np.linspace(0,1,n)**2.2
def impact(dur=.9):
    n=int(dur*SR); t=np.arange(n)/SR
    boom=np.sin(2*np.pi*np.cumsum(60*np.exp(-t*4)+38)/SR)*np.exp(-t*5)
    return boom + .35*bandsweep(n,5000,1500,q=2)*np.exp(-t*9)
# card entries (match composition/index.html SC times) — whoosh lands ~0.12s before the card settles
for i,t in enumerate([2.75,5.70,11.65,15.00,18.50,23.78]):
    add(t-.30, whoosh(.48,400+80*i,4200+300*i), .22, pan=(-.35 if i%2 else .35))
add(0.05, whoosh(.55,250,3000), .20)          # hook in
add(0.12, pop(700), .26); add(0.28, pop(950), .22)
for t in [6.1+k*0.16 for k in range(10)]: add(t, tick(2400, .04), .05)   # ANC counter ticks
add(7.75, pop(1300,.12), .25)                   # 43 dB lands
add(9.55, pop(600,.14), .22)                    # "SENYAP"
add(11.9, pop(500,.12), .26)                    # 11mm
add(18.7, tick(2000,.05), .08); add(20.0, pop(1200,.12), .24)   # battery fill done
add(21.2, pop(1500,.10), .22)                   # fast-charge pill
add(23.95, pop(800,.12), .26)                   # "2"
add(25.2, riser(1.1), .16)                      # rise into CTA
add(26.32, impact(.9), .34)
for k in range(5): add(27.0+k*0.6, tick(3200,.03), .035)  # CTA button shimmer
st=np.stack([L,R],1); st=np.tanh(st*1.2)/1.2
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767*.9).astype(np.int16).tobytes())
print("ok")
