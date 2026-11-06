import json
from faster_whisper import WhisperModel
m=WhisperModel("small",device="cpu",compute_type="int8")
segs,info=m.transcribe(__import__("numpy").fromfile("audio/vo16k.f32",dtype="float32"),language="ms",word_timestamps=True,vad_filter=False)
out=[]
for s in segs:
    out.append({"start":s.start,"end":s.end,"text":s.text,"words":[{"w":w.word,"s":w.start,"e":w.end} for w in s.words]})
json.dump(out,open("audio/words.json","w"),ensure_ascii=False,indent=1)
for s in out: print(f'{s["start"]:.2f}-{s["end"]:.2f} {s["text"]}')
