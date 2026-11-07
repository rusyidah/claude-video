import json, sys, subprocess
src, edl, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
F=0.012
parts=[]; t=0; tl=[]
for i,(a,b,lbl) in enumerate(edl):
    d=b-a
    parts.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d={F},afade=t=out:st={d-F:.3f}:d={F}[a{i}]")
    tl.append({"i":i,"src_in":a,"src_out":b,"start":round(t,3),"dur":round(d,3),"label":lbl}); t+=d
fc=";".join(parts)+";"+"".join(f"[a{i}]" for i in range(len(edl)))+f"concat=n={len(edl)}:v=0:a=1[out]"
subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-filter_complex",fc,"-map","[out]","-ar","48000","-ac","1",out],check=True)
json.dump(tl,open(out.rsplit(".",1)[0]+"_timeline.json","w"),indent=1)
print("total",round(t,3))
