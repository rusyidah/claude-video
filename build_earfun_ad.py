#!/usr/bin/env python3
"""Build the EarFun Air Pro 3 vertical ad (1080x1920) from product images + VO lines.

Usage: build_earfun_ad.py <images_dir> <vo_dir> <out.mp4>
  images_dir: 1.jpg..5.jpg   vo_dir: l1.mp3..l7.mp3 (missing line => silent placeholder)
"""
import subprocess, sys, tempfile
from pathlib import Path

IMG, VO, OUT = (Path(p) for p in sys.argv[1:4])
FONT = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
W, H, FPS, PAD, PLACEHOLDER = 1080, 1920, 30, 0.45, 3.6

# (image, vo line, [(text, start_frac, end_frac)], zoom direction)
SEGS = [
    ("4.jpg", 1, [("BUNYI LUAR MASIH MASUK?", 0, 1)], "in"),
    ("1.jpg", 2, [("EARFUN AIR PRO 3", 0, 1)], "out"),
    ("2.jpg", 3, [("43dB ANC", 0, 1)], "in"),
    ("5.jpg", 4, [("BASS PADU", 0, 0.5), ("CIP QUALCOMM", 0.5, 1)], "in"),
    ("3.jpg", 5, [("45 JAM", 0, 0.5), ("10 MIN = 90 MIN", 0.5, 1)], "in"),
    ("1.jpg", 6, [("2 DEVICE SERENTAK", 0, 1)], "in"),
    ("4.jpg", 7, [("TEKAN BEG KUNING", 0, 1)], "in"),
]


def dur(p):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]))


def run(cmd):
    subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL)


tmp = Path(tempfile.mkdtemp())
parts = []
for i, (img, line, texts, zdir) in enumerate(SEGS, 1):
    vo = VO / f"l{line}.mp3"
    has_vo = vo.exists()
    d = (dur(vo) if has_vo else PLACEHOLDER) + PAD
    frames = int(d * FPS)
    zexpr = (f"min(1+0.12*on/{frames},1.12)" if zdir == "in" else f"max(1.12-0.12*on/{frames},1)")
    draw = ""
    for t, a, b in texts:
        ta, tb = a * d, b * d
        draw += (
            f",drawtext=fontfile={FONT}:text='{t}':fontsize={min(88, int(960 / (len(t) * 0.66)))}:fontcolor=white:"
            f"borderw=6:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.80:"
            f"alpha='if(lt(t,{ta}+0.2),(t-{ta})/0.2,1)':enable='between(t,{ta},{tb})'"
        )
    fc = (
        f"[0:v]split[a][b];"
        f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=40:5,eq=brightness=-0.15[bg];"
        f"[b]scale={W}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,scale=1620:2880,"
        f"zoompan=z='{zexpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},"
        f"format=yuv420p{draw}[v]"
    )
    seg = tmp / f"s{i}.mp4"
    audio = (["-i", str(vo)] if has_vo else ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono"])
    run(["ffmpeg", "-y", "-loop", "1", "-t", str(d), "-i", str(IMG / img), *audio,
         "-filter_complex", fc + ";[1:a]aresample=44100,apad[a]",
         "-map", "[v]", "-map", "[a]", "-t", str(d), "-r", str(FPS),
         "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", str(seg)])
    parts.append(seg)
    print(f"seg{i}: {d:.2f}s vo={'yes' if has_vo else 'PLACEHOLDER'}")

lst = tmp / "list.txt"
lst.write_text("".join(f"file '{p}'\n" for p in parts))
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
     "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
     "-movflags", "+faststart", str(OUT)])
print("total", dur(OUT))
