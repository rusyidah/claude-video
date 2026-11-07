#!/usr/bin/env bash
# Regenerates the two derived media files from the original clip ("test 3.mp4.mp4" from Google Drive).
#   usage: tools/prepare_media.sh "/path/to/test 3.mp4.mp4"
set -euo pipefail
SRC="$1"; cd "$(dirname "$0")/.."
# A-roll proxy: HLG/BT.2020 phone footage tone-mapped to SDR BT.709, H.264, keyframe every 0.5 s (seek-friendly)
ffmpeg -y -i "$SRC" -an -vf "zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,eq=saturation=1.06:contrast=1.03" \
  -c:v libx264 -preset medium -crf 20 -g 15 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -movflags +faststart assets/video/aroll.mp4
# Voice: cut list in data/edl_source.json (pauses, fillers and repeats removed; hook moved to the front), then cleaned
python3 tools/build_voice.py "$SRC" data/edl_source.json /tmp/voice_raw.wav
ffmpeg -y -i /tmp/voice_raw.wav -af "highpass=f=85,afftdn=nr=10:nf=-42,equalizer=f=250:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1:g=2.5,acompressor=threshold=-22dB:ratio=3:attack=8:release=120:makeup=4,loudnorm=I=-15:TP=-1.5:LRA=7" \
  -ar 48000 -ac 1 assets/audio/voice.wav
