#!/usr/bin/env bash
# usage: build2.sh <W> <H> <crf> <maskdir> <bgdir> <overlaydir> <out.mp4> [seconds]
# layers: bokeh background -> matted presenter (graded, sharpened, walking sway/bob) -> promo overlay
set -e
W=$1; H=$2; CRF=$3; M=$4; B=$5; O=$6; OUT=$7; T=${8:-31}
k=$(awk "BEGIN{print $W/1080}")                 # px scale vs 1080 design
SW=$(awk "BEGIN{printf \"%d\", $W*1.07/2*2}")   # presenter layer 7% larger -> room to bob without exposing edges
SH=$(awk "BEGIN{printf \"%d\", $H*1.07/2*2}")
ffmpeg -v error -y -t $T -i source-avatar.mp4 -framerate 25 -i "$M/%05d.png" -framerate 25 -i "$B/%05d.png" -framerate 25 -i "$O/%05d.png" \
 -filter_complex "
 [0:v]scale=$SW:$SH:flags=lanczos,
   hqdn3d=2.2:1.6:4:3,
   colorbalance=rs=-.01:gs=-.03:bs=.03:rm=-.05:gm=-.04:bm=.09:rh=-.01:gh=-.01:bh=.03,
   curves=master='0/0 0.08/0.05 0.5/0.54 0.92/0.97 1/1',
   eq=contrast=1.06:saturation=1.04:brightness=0.04:gamma=0.95,
   unsharp=5:5:0.9:3:3:0.4[fg];
 [1:v]format=gray,scale=$SW:$SH:flags=bilinear,erosion,gblur=sigma=$(awk "BEGIN{print 1.6*$k}")[m];
 [fg][m]alphamerge[person];
 [2:v][person]overlay=x='(W-w)/2+$(awk "BEGIN{print 9*$k}")*sin(2*PI*0.9*t)':y='-$(awk "BEGIN{print 55*$k}")+$(awk "BEGIN{print 16*$k}")*abs(sin(2*PI*1.8*t))':eval=frame:shortest=1[comp];
 [comp][3:v]overlay=0:0:shortest=1,format=yuv420p[o]" \
 -map "[o]" -map 0:a -c:v libx264 -preset medium -crf $CRF -r 25 -c:a aac -b:a 160k -movflags +faststart "$OUT"
