# High-quality compositor:  bokeh bg  ->  graded, matted presenter (sub-pixel camera moves)  ->  promo UI  + final audio mix
# usage: python3 -I build3.py <W> <H> <crf> <maskdir> <bgdir> <overlaydir> <audio.wav> <out.mp4> [--src clean.mp4]
import sys, subprocess, math, numpy as np, cv2
W,H,CRF=int(sys.argv[1]),int(sys.argv[2]),sys.argv[3]; M,B,O,AUD,OUT=sys.argv[4:9]
SRC=sys.argv[sys.argv.index('--src')+1] if '--src' in sys.argv else 'source-avatar.mp4'
k=W/1080; FPS=25
GRADE=("hqdn3d=2.2:1.6:4:3,"
       "colorbalance=rs=.0:gs=-.02:bs=.02:rm=.015:gm=-.06:bm=.05:rh=.02:gh=.0:bh=.02,"
       "curves=master='0/0.02 0.08/0.10 0.5/0.60 0.92/0.98 1/1',"
       "eq=contrast=1.04:saturation=1.08:brightness=0.05:gamma=0.90,"
       "unsharp=5:5:0.9:3:3:0.4")
src=subprocess.Popen(["ffmpeg","-v","error","-i",SRC,"-vf",f"scale={W}:{H}:flags=lanczos,{GRADE}","-f","rawvideo","-pix_fmt","rgb24","-"],stdout=subprocess.PIPE)
enc=subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-",
    "-framerate",str(FPS),"-i",f"{O}/%05d.png","-i",AUD,
    "-filter_complex","[0:v][1:v]overlay=0:0:shortest=1,format=yuv420p[v]","-map","[v]","-map","2:a",
    "-c:v","libx264","-preset","slow","-crf",CRF,"-profile:v","high","-tune","film","-r",str(FPS),
    "-c:a","aac","-b:a","192k","-ar","48000","-shortest","-movflags","+faststart",OUT],stdin=subprocess.PIPE)

def ease_out(x): return 1-(1-x)**3
def ease_io(x): return .5-.5*math.cos(math.pi*x)
PUNCH=[(10.95,.075),(26.34,.06)]          # "Nampak?"  /  "Senang je!"
def punch(t):
    z=0
    for t0,a in PUNCH:
        d=t-t0
        if 0<=d<.22: z=max(z,a*ease_out(d/.22))
        elif .22<=d<.62: z=max(z,a)
        elif .62<=d<1.1: z=max(z,a*(1-ease_io((d-.62)/.48)))
    return z
ker=np.ones((3,3),np.uint8); sig=1.6*k; n=0
while True:
    buf=src.stdout.read(W*H*3)
    if len(buf)<W*H*3: break
    m=cv2.imread(f"{M}/{n:05d}.png",cv2.IMREAD_GRAYSCALE); bg=cv2.imread(f"{B}/{n:05d}.png")
    if m is None or bg is None: break
    t=n/FPS
    fg=np.frombuffer(buf,np.uint8).reshape(H,W,3)
    bg=cv2.cvtColor(bg,cv2.COLOR_BGR2RGB)
    if bg.shape[:2]!=(H,W): bg=cv2.resize(bg,(W,H),interpolation=cv2.INTER_AREA)
    m=cv2.resize(m,(W,H),interpolation=cv2.INTER_AREA); m=cv2.erode(m,ker); m=cv2.GaussianBlur(m,(0,0),sig)
    s=1.07*(1+.035*t/30)*(1+punch(t))                       # base overscan * slow dolly-in * punch-ins
    ax,ay=W/2,H*.30                                          # zoom anchored on the face
    dx=4*k*math.sin(2*math.pi*.8*t); dy=6*k*(abs(math.sin(2*math.pi*1.6*t))-.5)   # gentle walking sway / bob
    A=np.float32([[s,0,(1-s)*ax+dx],[0,s,(1-s)*ay+dy]])
    p=cv2.warpAffine(fg,A,(W,H),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REPLICATE)
    a=cv2.warpAffine(m,A,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0).astype(np.float32)[...,None]/255
    out=(bg.astype(np.float32)*(1-a)+p.astype(np.float32)*a)
    enc.stdin.write(np.clip(out+.5,0,255).astype(np.uint8).tobytes()); n+=1
enc.stdin.close(); enc.wait(); src.kill(); print("frames",n)
