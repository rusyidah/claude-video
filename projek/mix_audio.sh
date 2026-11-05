#!/usr/bin/env bash
# voice cleanup + music bed (auto-ducked under the voice) + SFX  ->  audio/mix.wav  (-14 LUFS, -1 dBTP)
set -e
SRC=${SRC:-source-avatar.mp4}; MUSIC=${MUSIC:-audio/music-b.mp3}
ffmpeg -v error -y -i "$SRC" -i "$MUSIC" -i audio/sfx.wav -filter_complex "
 [0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,highpass=f=85,afftdn=nf=-30:tn=1,
   equalizer=f=280:t=q:w=1.1:g=-2.5,equalizer=f=3600:t=q:w=1.0:g=3,equalizer=f=10500:t=q:w=0.8:g=2,
   acompressor=threshold=-21dB:ratio=3:attack=6:release=90:makeup=3,
   adelay=0|0,apad=whole_dur=30.2[vx];
 [vx]asplit=2[voice][key];
 [1:a]aresample=48000,atrim=0:30.2,volume=0.62,afade=t=in:d=0.25,afade=t=out:st=29.55:d=0.6[mus];
 [mus][key]sidechaincompress=threshold=0.06:ratio=3:attack=25:release=350:makeup=1[duck];
 [2:a]volume=1.0[fx];
 [voice][duck][fx]amix=inputs=3:normalize=0:duration=first,
   loudnorm=I=-14:TP=-1.0:LRA=9,aresample=48000[out]" -map "[out]" -t 30.15 -c:a pcm_s16le audio/mix.wav
