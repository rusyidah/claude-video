import sys, subprocess, numpy as np
from PIL import Image, ImageFilter
SP = sys.argv[1]; SRC = sys.argv[2]; OUT = sys.argv[3]
W, H, FPS = 720, 1280, 30
im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)

def inpaint(a, x0, y0, x1, y1, sides):
    # fill rect by inverse-distance blend of the pixels just outside the chosen sides
    ys, xs = np.mgrid[y0:y1, x0:x1]
    acc = np.zeros((y1-y0, x1-x0, 3)); wsum = np.zeros((y1-y0, x1-x0, 1))
    if 'l' in sides: v = a[y0:y1, x0-2][:, None]; d = xs - x0 + 2; w = 1/d**2; acc += v*w[...,None]; wsum += w[...,None]
    if 'r' in sides: v = a[y0:y1, x1+1][:, None]; d = x1 + 1 - xs; w = 1/d**2; acc += v*w[...,None]; wsum += w[...,None]
    if 't' in sides: v = a[y0-2, x0:x1][None]; d = ys - y0 + 2; w = 1/d**2; acc += v*w[...,None]; wsum += w[...,None]
    if 'b' in sides: v = a[y1+1, x0:x1][None]; d = y1 + 1 - ys; w = 1/d**2; acc += v*w[...,None]; wsum += w[...,None]
    a[y0:y1, x0:x1] = acc / wsum
    # soften the patch slightly
    p = Image.fromarray(a[y0-3:y1+3, x0-3:x1+3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    a[y0:y1, x0:x1] = np.asarray(p).astype(np.float32)[3:-3, 3:-3]

# number badges (top-left) and timestamp badges (top-right) of each panel
inpaint(im, 4, 4, 78, 74, 'rb')        # 01
inpaint(im, 244, 3, 284, 32, 'lb')     # 0s
inpaint(im, 296, 4, 368, 74, 'rb')     # 02
inpaint(im, 536, 3, 573, 32, 'lb')     # 2s
inpaint(im, 4, 349, 78, 420, 'rb')     # 03
inpaint(im, 244, 350, 284, 377, 'lb')  # 4s
inpaint(im, 296, 349, 368, 420, 'rb')  # 04
inpaint(im, 536, 350, 573, 377, 'lb')  # 6s
inpaint(im, 4, 694, 78, 764, 'rb')     # 05
inpaint(im, 543, 694, 573, 722, 'lb')  # 8s
UP = 4
base = Image.fromarray(np.clip(im, 0, 255).astype(np.uint8))
Image.fromarray(np.clip(im,0,255).astype(np.uint8)).save(f'{SP}/work/clean.png')
big = base.resize((base.width*UP, base.height*UP), Image.LANCZOS).filter(ImageFilter.UnsharpMask(3, 60, 2))

# scene boundaries (seconds) come from VO timing
bounds = [float(x) for x in sys.argv[4].split(',')]  # 6 values: 0 .. 10
# each scene: (cx0, cy0, h0) -> (cx1, cy1, h1) in original px; crop width = h*9/16
S = [
  ((150, 136, 262), (150, 128, 236)),   # 01 hook, slow push-in
  ((458, 134, 258), (462, 130, 236)),   # 02 ANC, push-in toward ear
  ((129, 462, 236), (134, 452, 214)),   # 03 sound/chip, push-in, avoids chip badges
  ((382, 486, 280), (494, 486, 280)),   # 04 pan phone -> case
  ((292, 810, 236), (442, 810, 236)),   # 05 pan face -> earbuds -> bag
]
ease = lambda t: t*t*(3-2*t)
p = subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
    '-c:v','libx264','-pix_fmt','yuv420p','-crf','17','-preset','slow',OUT], stdin=subprocess.PIPE)
N = round(bounds[-1]*FPS)
for f in range(N):
    t = f / FPS
    i = max(k for k in range(5) if bounds[k] <= t + 1e-9)
    u = ease((t - bounds[i]) / (bounds[i+1] - bounds[i]))
    (a, b) = S[i]
    cx = a[0] + (b[0]-a[0])*u; cy = a[1] + (b[1]-a[1])*u; h = a[2] + (b[2]-a[2])*u
    # small "punch" zoom on each cut for TikTok energy
    pu = (t - bounds[i]); h *= 1 - 0.035*max(0, 1 - pu/0.18)
    w = h*9/16
    box = tuple(v*UP for v in (cx-w/2, cy-h/2, cx+w/2, cy+h/2))
    fr = big.transform((W, H), Image.EXTENT, box, Image.BICUBIC)
    p.stdin.write(fr.tobytes())
p.stdin.close(); p.wait()
