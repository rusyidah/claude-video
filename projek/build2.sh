#!/usr/bin/env bash
# usage: build2.sh <W> <H> <crf> <maskdir> <bgdir> <overlaydir> <out.mp4> [seconds]
# layers: bokeh background -> matted presenter (graded, sharpened, walking sway/bob) -> promo overlay
set -e
W=$1; H=$2; CRF=$3; M=$4; B=$5; O=$6; OUT=$7; T=${8:-31}
k=$(awk "BEGIN{print $W/1080}")                 # px scale vs 1080 design
SW=$(awk "BEGIN{printf \"%d\", $W*1.07/2*2}")   # presenter layer 7% larger -> room to bob without exposing edges
SH=$(awk "BEGIN{printf \"%d\", $H*1.07/2*2}")
ffmpeg -v error -y -t $T -i "${SRC:-source-avatar.mp4}" -framerate 25 -i "$M/%05d.png" -framerate 25 -i "$B/%05d.png" -framerate 25 -i "$O/%05d.png" \
 -filter_complex "
 [0:v]scale=$SW:$SH:flags=lanczos,
   hqdn3d=2.2:1.6:4:3,
   colorbalance=rs=.0:gs=-.02:bs=.02:rm=.015:gm=-.06:bm=.05:rh=.02:gh=.0:bh=.02,
   curves=master='0/0.02 0.08/0.10 0.5/0.60 0.92/0.98 1/1',
   eq=contrast=1.04:saturation=1.08:brightness=0.05:gamma=0.90,
   unsharp=5:5:0.9:3:3:0.4[fg];
 [1:v]format=gray,scale=$SW:$SH:flags=bilinear,erosion,gblur=sigma=$(awk "BEGIN{print 1.6*$k}")[m];
 [fg][m]alphamerge[person];
 [2:v][person]overlay=x='(W-w)/2+$(awk "BEGIN{print 4*$k}")*sin(2*PI*0.8*t)':y='-$(awk "BEGIN{print 40*$k}")+$(awk "BEGIN{print 6*$k}")*abs(sin(2*PI*1.6*t))':eval=frame:shortest=1[comp];
 [comp][3:v]overlay=0:0:shortest=1,format=yuv420p[o]" \
 -map "[o]" -map 0:a -c:v libx264 -preset medium -crf $CRF -r 25 -c:a aac -b:a 160k -movflags +faststart "$OUT"
