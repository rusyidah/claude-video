#!/usr/bin/env bash
# usage: build.sh <frames_dir> <out.mp4> <width> <height> <crf>
set -e
F=$1; O=$2; W=$3; H=$4; CRF=${5:-20}
ffmpeg -v error -y -i source-avatar.mp4 -framerate 25 -i "$F/%05d.png" \
 -filter_complex "[0:v]scale=$W:$H:flags=lanczos,eq=contrast=1.06:saturation=1.12:brightness=0.01[v];[v][1:v]overlay=0:0:shortest=1,format=yuv420p[o]" \
 -map "[o]" -map 0:a -c:v libx264 -preset medium -crf $CRF -r 25 -c:a aac -b:a 160k -movflags +faststart "$O"
