# usage: python3 -I matte.py <video> <out_mask_dir>   -> 00000.png ... (8-bit alpha masks, full-res)
import sys, os, subprocess, numpy as np
from rembg import new_session, remove
from PIL import Image
vid, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
W, H = 1080, 1920
s = new_session("u2net_human_seg")
p = subprocess.Popen(["ffmpeg","-v","error","-i",vid,"-f","rawvideo","-pix_fmt","rgb24","-"], stdout=subprocess.PIPE)
i = 0
while True:
    b = p.stdout.read(W*H*3)
    if len(b) < W*H*3: break
    im = Image.fromarray(np.frombuffer(b, np.uint8).reshape(H, W, 3))
    remove(im, session=s, only_mask=True, post_process_mask=True).save(f"{out}/{i:05d}.png"); i += 1
    if i % 50 == 0: print(i, flush=True)
print("done", i)
