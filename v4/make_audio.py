"""Code-generated SFX + soft pluck bed for V1 (original, no external audio). Output: audio/sfx.wav, audio/bed.wav"""
import numpy as np, wave
SR=48000; DUR=44.0; N=int(SR*DUR)
rng=np.random.default_rng(7)
def add(buf,t,sig,g=1.0):
    i=int(t*SR); j=min(N,i+len(sig))
    if i<N: buf[i:j]+=g*sig[:j-i]
def env(n,a=.004,d=.12):
    t=np.arange(n)/SR; return np.minimum(t/a,1)*np.exp(-t/d)
def tone(f,dur=.25,d=.08,harm=(1,.3,.1)):
    n=int(dur*SR); t=np.arange(n)/SR
    s=sum(h*np.sin(2*np.pi*f*(k+1)*t) for k,h in enumerate(harm))
    return s*env(n,.003,d)
def pop(): return tone(820,.12,.03)*0.7
def tick(): return tone(1500,.04,.01,(1,))*0.35
def whoosh(dur=.45,lo=300,hi=3500):
    n=int(dur*SR); x=rng.standard_normal(n); S=np.fft.rfft(x); f=np.fft.rfftfreq(n,1/SR)
    S*= ((f>lo)&(f<hi)); y=np.fft.irfft(S,n); t=np.linspace(0,1,n)
    return y/np.abs(y).max()*np.sin(np.pi*t)**2*0.8
def chime(f=880): return (tone(f,.5,.18)+tone(f*1.5,.5,.18)*.6)*0.6
def pluck(f,dur=.9):
    n=int(dur*SR); L=int(SR/f); b=rng.uniform(-1,1,L); out=np.zeros(n)
    for i in range(n):
        out[i]=b[i%L]; b[i%L]=0.5*(b[i%L]+b[(i+1)%L])*0.996
    return out
sfx=np.zeros(N)
for t in np.arange(0.0,1.4,.09): add(sfx,t,tick())
for t in np.arange(2.2,3.1,.09): add(sfx,t,tick())
add(sfx,3.15,chime(660),.6)                     # emoji pop
add(sfx,3.5,whoosh(.7,200,5000),.9)             # paper tear
for t in (4.35,4.57,4.79,5.01): add(sfx,t,pop(),.8)
for t in (4.75,5.7): add(sfx,t,pop())
for t in (7.2,14.2,22.3,28.0,33.8,40.2): add(sfx,t,whoosh(.4),.6)
for t in (7.4,7.7,14.5,15.6,18.4,22.5,23.9,25.1,28.4,29.1,34.6,35.3,35.9,40.35,41.1,41.5): add(sfx,t,pop(),.7)
for t,f in ((11.0,988),(17.7,784),(19.4,740),(27.1,988),(30.5,988),(35.0,988)): add(sfx,t,chime(f),.7)
add(sfx,8.6,whoosh(.9,200,2500),.5)             # zoom into battery
add(sfx,12.6,whoosh(.8,200,2500),.5)            # zoom out
add(sfx,13.0,chime(1175),.6)                    # phone alive
add(sfx,43.0,tone(500,.1,.04)*.8,1)             # tap
add(sfx,43.05,chime(1046),.9); add(sfx,43.2,chime(1397),.7)
def boom():
    n=int(.9*SR); t=np.arange(n)/SR; f=40+45*np.exp(-t*6); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-t/.25)*0.9
for t in (7.2,14.2,22.3,28.0,33.8,40.2,3.5): add(sfx,t,boom(),1.0)
bed=np.zeros(N); pent=[220,247.5,293.7,330,370,440]
beat=60/100*0.5; k=0
for t in np.arange(0.2,DUR-1,beat):
    add(bed,t,pluck(pent[[0,2,4,2,5,3,1,3][k%8]]*(2 if k%16>=8 else 1)),0.5); k+=1
for ch in (sfx,bed): ch/= max(1e-9,np.abs(ch).max())
sfx*=.7; bed*=.5
for name,x in (('sfx',sfx),('bed',bed)):
    w=wave.open(f'audio/{name}.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes()); w.close()
print('ok')
