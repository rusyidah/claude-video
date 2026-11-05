# Remove the presenter's hand from the lower (scarf) area by replacing it with a clean plate
# built from nearby hand-free frames.  usage: handfix.py <in.mp4> <out.mp4> [preview_times_csv]
import sys, subprocess, numpy as np, cv2
W,H,Y0=1080,1920,1160           # work on y>=Y0 only (below chin)
vid,out=sys.argv[1:3]; prev=sys.argv[3] if len(sys.argv)>3 else None
raw=subprocess.run(["ffmpeg","-v","error","-i",vid,"-f","rawvideo","-pix_fmt","bgr24","-"],capture_output=True).stdout
n=len(raw)//(W*H*3); F=np.frombuffer(raw,np.uint8).reshape(n,H,W,3)
def crit(reg):
    hsv=cv2.cvtColor(reg,cv2.COLOR_BGR2HSV); h,sa,v=[hsv[...,i].astype(int) for i in range(3)]
    return ((h>=3)&(h<=21)&(sa>=38)&(v>=70)).astype(np.uint8)
# static yellow/orange badge on the right edge = what the *median over the whole video* flags (hand is never >50% of time)
glob=np.median(np.stack([F[i,Y0:] for i in range(0,n,6)]),axis=0).astype(np.uint8)
static=cv2.dilate(crit(glob),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(41,41)))
static[1690-Y0:]=0                      # below the badge everything skin/yellow is an intruder (hand / sleeve cuff)
def hand_mask(f):
    m=crit(f[Y0:]); m[static>0]=0
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    return cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8))
masks=[hand_mask(F[i]) for i in range(n)]
area=np.array([m.mean() for m in masks])
clean=area<0.0015
print("frames",n,"with hand",int((~clean).sum()),flush=True)
def frames():
    SEG=25
    for k in range(0,n,SEG):
        c=k+SEG//2; lo,hi=max(0,c-60),min(n,c+60)
        idx=[i for i in range(lo,hi,3) if clean[i]]
        if len(idx)<5: idx=[i for i in range(max(0,c-200),min(n,c+200),3) if clean[i]]
        plate=np.median(np.stack([F[i,Y0:] for i in idx]),axis=0).astype(np.float32)
        for i in range(k,min(n,k+SEG)):
            m=cv2.dilate(masks[i],cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(95,95)))
            a=np.clip(cv2.GaussianBlur(m.astype(np.float32),(0,0),18)[...,None]*1.6,0,1)
            reg=F[i,Y0:].astype(np.float32); keep=(m==0)
            g=(reg[keep].mean()/max(plate[keep].mean(),1)) if keep.any() else 1
            o=F[i].copy(); o[Y0:]=(reg*(1-a)+np.clip(plate*g,0,255)*a).astype(np.uint8)
            yield i,o
if prev:
    want={int(float(t)*25):t for t in prev.split(",")}
    for i,o in frames():
        if i in want: cv2.imwrite(f"{out}_t{want[i]}.png",cv2.resize(np.hstack([F[i],o]),(1080,960)))
else:
    p=subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","bgr24","-s",f"{W}x{H}","-r","25","-i","-","-i",vid,
      "-map","0:v","-map","1:a","-c:v","libx264","-crf","12","-preset","fast","-pix_fmt","yuv420p","-c:a","copy","-shortest",out],stdin=subprocess.PIPE)
    for i,o in frames(): p.stdin.write(o.tobytes())
    p.stdin.close(); p.wait()
