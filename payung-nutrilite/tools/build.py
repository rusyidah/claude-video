#!/usr/bin/env python3
"""Builds the HyperFrames project (index.html + compositions/*.html) for the
"Payung Nutrilite" vertical edit from the data/ files.

Data in:
  data/edl_timeline.json  - the A-roll cut list (source in/out -> edit time)
  data/words_raw.json     - word timings on the edited voice track
  data/faces.json         - face boxes on the source video (for safe placement)

Run:  python3 tools/build.py   (from the project folder)
"""
import json, os, html
from string import Template

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda *p: os.path.join(ROOT, *p)

EDL = json.load(open(D("data", "edl_timeline.json")))
WORDS = json.load(open(D("data", "words_raw.json")))
FACES = [f for f in json.load(open(D("data", "faces.json"))) if f["x"] is not None]

W, H, FPS = 1080, 1920, 30
VOICE_END = round(EDL[-1]["start"] + EDL[-1]["dur"], 3)
TOTAL = 44.8

# ------------------------------------------------------------------ palette
CSS_TOKENS = """
  --forest: #0B3D2E;      /* deep Nutrilite-ish green: text + cards */
  --leaf: #1E7B4A;        /* mid green */
  --lime: #C8F169;        /* accent: one meaning per frame */
  --cream: #FFF6E3;       /* paper */
  --paper: #F4EDDB;
  --coral: #FF7A59;       /* only for the WOW / BEST beats */
  --ink: #0B3D2E;
  --font-display: "Archivo Black", "Inter", sans-serif;
  --font-serif: "Playfair Display", serif;
  --font-ui: "Inter", sans-serif;
"""

# ------------------------------------------------------------------ icons
LEAF = ('<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M30 60 C30 44 33 26 42 6" '
        'stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        '<ellipse rx="6.5" ry="13" transform="translate(23 44) rotate(-48)" fill="currentColor"/>'
        '<ellipse rx="6.5" ry="13" transform="translate(41 38) rotate(42)" fill="currentColor"/>'
        '<ellipse rx="6" ry="12" transform="translate(26 28) rotate(-40)" fill="currentColor"/>'
        '<ellipse rx="6" ry="12" transform="translate(44 22) rotate(48)" fill="currentColor"/>'
        '<ellipse rx="5" ry="10" transform="translate(41 8) rotate(10)" fill="currentColor"/></svg>')
UMBRELLA = ('<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 32 Q32 2 58 32 Q51.5 27 45 32 '
            'Q38.5 27 32 32 Q25.5 27 19 32 Q12.5 27 6 32 Z" fill="currentColor"/>'
            '<path d="M32 31 V52 Q32 59 25 59 Q20 59 20 54" stroke="currentColor" stroke-width="4" '
            'fill="none" stroke-linecap="round"/></svg>')
BOTTLE = ('<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="20" y="4" width="24" height="10" rx="3" '
          'fill="currentColor"/><rect x="14" y="16" width="36" height="44" rx="8" fill="currentColor"/>'
          '<rect x="20" y="28" width="24" height="18" rx="3" fill="#0B3D2E" opacity=".35"/></svg>')
BAG = ('<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 24 V18 Q22 8 32 8 Q42 8 42 18 V24" '
       'stroke="currentColor" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
       '<path d="M10 22 H54 L50 58 H14 Z" fill="currentColor" stroke-linejoin="round"/>'
       '<circle cx="24" cy="30" r="3" fill="#0B3D2E"/><circle cx="40" cy="30" r="3" fill="#0B3D2E"/></svg>')
CHECK = ('<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 34 L26 48 L52 16" stroke="currentColor" '
         'stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>')
ARROW_DOWN = ('<svg viewBox="0 0 64 120" aria-hidden="true"><path d="M32 6 V100 M10 78 L32 108 L54 78" '
              'stroke="currentColor" stroke-width="10" fill="none" stroke-linecap="round" '
              'stroke-linejoin="round"/></svg>')
GLOBE = ('<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.5">'
         '<circle cx="32" cy="32" r="26"/><ellipse cx="32" cy="32" rx="11" ry="26"/>'
         '<path d="M6 32 H58 M10 18 H54 M10 46 H54"/></svg>')
SPARK = ('<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 2 C34 22 42 30 62 32 C42 34 34 42 32 62 '
         'C30 42 22 34 2 32 C22 30 30 22 32 2 Z" fill="currentColor"/></svg>')
PIN = ('<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 60 C32 60 12 38 12 24 A20 20 0 0 1 52 24 '
       'C52 38 32 60 32 60 Z" fill="currentColor"/><circle cx="32" cy="24" r="7" fill="#0B3D2E"/></svg>')


def stamp_svg(sid, text, fill="#C8F169", ink="#0B3D2E"):
    return f'''<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs><path id="{sid}-c" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs>
  <circle cx="100" cy="100" r="98" fill="{fill}"/>
  <circle cx="100" cy="100" r="54" fill="none" stroke="{ink}" stroke-width="2.5" stroke-dasharray="3 6"/>
  <text font-family="Archivo Black" font-size="19.5" letter-spacing="2.6" fill="{ink}">
    <textPath href="#{sid}-c">{text}</textPath></text>
  <g transform="translate(70 66) scale(0.95)" color="{ink}">{LEAF.replace('<svg', '<svg width="64" height="64"')}</g>
</svg>'''


# ------------------------------------------------------------------ helpers
def face_center(src_in, src_out):
    fs = [f for f in FACES if src_in <= f["t"] <= src_out and f["y"] + f["h"] < 1160]
    if not fs:
        return 400, 780
    cx = sorted(f["x"] + f["w"] / 2 for f in fs)[len(fs) // 2]
    cy = sorted(f["y"] + f["h"] / 2 for f in fs)[len(fs) // 2]
    return round(cx), round(cy)


def scene(cid, css, markup, js):
    if HIDDEN:
        css += "    " + ", ".join(HIDDEN) + " { opacity: 0; }\n"
        HIDDEN.clear()
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: visible; }}
{css}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="{W}" data-height="{H}">
{markup}
  </div>
  <script>
    (function () {{
      const tl = gsap.timeline({{ paused: true }});
{js}
      window.__timelines["{cid}"] = tl;
    }})();
  </script>
</template>
"""


SHARED_CSS = """
    .chip { position: absolute; display: inline-flex; align-items: center; gap: 14px;
      padding: 12px 26px 12px 18px; border-radius: 999px; background: var(--forest, #0B3D2E);
      color: var(--lime, #C8F169); font: 800 30px/1 var(--font-ui, Inter); letter-spacing: .14em;
      text-transform: uppercase; box-shadow: 0 10px 30px rgba(0,0,0,.28); white-space: nowrap; }
    .chip .ico { width: 38px; height: 38px; flex: none; }
    .big { position: absolute; font-family: var(--font-display, "Archivo Black"); color: var(--cream, #FFF6E3);
      text-transform: uppercase; line-height: .92; letter-spacing: -.01em; white-space: nowrap;
      text-shadow: 0 6px 0 rgba(11,61,46,.9), 0 14px 34px rgba(0,0,0,.45); }
    .serif { position: absolute; font-family: var(--font-serif, "Playfair Display"); font-style: italic;
      font-weight: 800; color: var(--lime, #C8F169); white-space: nowrap; line-height: 1;
      text-shadow: 0 6px 24px rgba(0,0,0,.45); }
    .ico { display: inline-block; vertical-align: middle; }
    .ico svg { width: 100%; height: 100%; display: block; }
"""


def blur_in(sel, t, dur=0.18, y=0, extra=""):
    return (f'      tl.fromTo("{sel}", {{ opacity: 0, filter: "blur(10px)", y: {y} }}, '
            f'{{ opacity: 1, filter: "blur(0px)", y: 0, duration: {dur}, ease: "power3.out"{extra} }}, {t:.3f});\n')


def blur_out(sel, t, dur=0.16):
    return (f'      tl.to("{sel}", {{ opacity: 0, filter: "blur(8px)", duration: {dur}, ease: "power2.in" }}, {t:.3f});\n')


def pop_in(sel, t, dur=0.42, rot=0, ease="back.out(1.7)"):
    return (f'      tl.fromTo("{sel}", {{ opacity: 0, scale: 0.4, rotation: {rot - 12} }}, '
            f'{{ opacity: 1, scale: 1, rotation: {rot}, duration: {dur}, ease: "{ease}" }}, {t:.3f});\n')


HIDDEN = []


def hide_at(sel, t=0):
    """Initial hidden state is authored in CSS (a tl.set at 0 does not render frame 0)."""
    HIDDEN.append(sel)
    return ""


# ================================================================== scenes
SCENES = []  # (id, start, duration, html)

# ---------------------------------------------------------------- 1 HOOK
hk_css = SHARED_CSS + """
    #hk-kicker { left: 64px; top: 182px; }
    #hk-title { left: 56px; top: 248px; font-size: 158px; }
    #hk-excl { left: 92px; top: 384px; font-size: 104px; transform: rotate(-4deg); }
    #hk-stamp { position: absolute; left: 782px; top: 168px; width: 236px; height: 236px;
      filter: drop-shadow(0 14px 26px rgba(0,0,0,.35)); }
    #hk-stamp svg { width: 100%; height: 100%; }
"""
hk_html = f"""
    <div id="hk-kicker" class="chip"><span class="ico">{LEAF}</span>Nutrilite · 90 tahun</div>
    <div id="hk-title" class="big">Payung</div>
    <div id="hk-excl" class="serif">eksklusif</div>
    <div id="hk-stamp" data-layout-ignore>{stamp_svg('hks', 'HANYA DI AMWAY • HANYA DI AMWAY • ')}</div>
"""
hk_js = ""
hk_js += '      tl.fromTo("#hk-title", { scale: 1.08, transformOrigin: "0% 50%" }, { scale: 1, duration: 0.7, ease: "expo.out" }, 0);\n'
hk_js += '      tl.fromTo("#hk-kicker", { opacity: 1, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: "expo.out" }, 0);\n'
hk_js += blur_in("#hk-excl", 0.70, 0.2)
hk_js += hide_at("#hk-stamp")
hk_js += '      tl.fromTo("#hk-stamp", { opacity: 0, scale: 0.2, rotation: -120 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.55, ease: "expo.out" }, 1.84);\n'
hk_js += '      tl.to("#hk-stamp svg", { rotation: 22, duration: 0.85, ease: "none" }, 1.84);\n'
for s in ["#hk-kicker", "#hk-title", "#hk-excl", "#hk-stamp"]:
    hk_js += blur_out(s, 2.52, 0.14)
SCENES.append(("hook", 0, 2.69, scene("hook", hk_css, hk_html, hk_js)))

# ---------------------------------------------------------------- 2 PROMO
pr_css = SHARED_CSS + """
    #pr-pill { position: absolute; left: 64px; top: 200px; display: flex; align-items: center; gap: 18px;
      padding: 20px 40px 22px 30px; border-radius: 28px; background: var(--lime, #C8F169);
      color: var(--forest, #0B3D2E); font: 400 84px/1 var(--font-display); text-transform: uppercase;
      box-shadow: 0 16px 40px rgba(0,0,0,.35); transform: rotate(-2deg); }
    #pr-pill .ico { width: 64px; height: 64px; color: var(--forest, #0B3D2E); }
    #pr-sub { position: absolute; left: 82px; top: 330px; font: 800 34px/1 var(--font-ui);
      letter-spacing: .16em; color: var(--cream, #FFF6E3); text-transform: uppercase;
      text-shadow: 0 3px 14px rgba(0,0,0,.6); }
"""
pr_html = f"""
    <div id="pr-pill"><span class="ico">{SPARK}</span>Promo</div>
    <div id="pr-sub">Bulan ni</div>
"""
pr_start = 3.95
pr_js = hide_at("#pr-pill") + hide_at("#pr-sub")
pr_js += '      tl.fromTo("#pr-pill", { opacity: 0, x: -140, filter: "blur(12px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.34, ease: "expo.out" }, 0.10);\n'
pr_js += blur_in("#pr-sub", 0.30, 0.16)
pr_js += blur_out("#pr-pill", 0.86, 0.13) + blur_out("#pr-sub", 0.86, 0.13)
SCENES.append(("promo", pr_start, 1.0, scene("promo", pr_css, pr_html, pr_js)))

# ---------------------------------------------------------------- 3 PRODUCTS (flying B-roll over full-frame video)
pd_start = 4.95


def fly_in(sel, t, dx, dy, rot0, rot1, dur=0.6):
    """Card flies in on an arc (x and y on different eases), spinning, blurred at speed, lands with a small settle."""
    return (f'      tl.fromTo("{sel}", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.12, ease: "none" }}, {t:.3f});\n'
            f'      tl.fromTo("{sel}", {{ x: {dx} }}, {{ x: 0, duration: {dur}, ease: "power3.out" }}, {t:.3f});\n'
            f'      tl.fromTo("{sel}", {{ y: {dy} }}, {{ y: 0, duration: {dur}, ease: "back.out(1.15)" }}, {t:.3f});\n'
            f'      tl.fromTo("{sel}", {{ rotation: {rot0}, scale: 0.55 }}, {{ rotation: {rot1}, scale: 1, duration: {dur}, ease: "back.out(1.6)" }}, {t:.3f});\n'
            f'      tl.fromTo("{sel}", {{ filter: "blur(14px)" }}, {{ filter: "blur(0px)", duration: {dur * 0.7:.3f}, ease: "expo.out" }}, {t:.3f});\n')


def fly_out(sel, t, dx, dy, rot, dur=0.38):
    return (f'      tl.to("{sel}", {{ x: {dx}, y: {dy}, rotation: {rot}, scale: 0.7, opacity: 0, filter: "blur(10px)", '
            f'duration: {dur}, ease: "power3.in" }}, {t:.3f});\n')


pd_css = SHARED_CSS + """
    .pd-card { position: absolute; width: 196px; height: 238px; border-radius: 26px; background: #fff;
      box-shadow: 0 22px 44px rgba(0,0,0,.38), 0 0 0 5px rgba(255,255,255,.55);
      display: flex; align-items: center; justify-content: center; }
    .pd-card img { width: 166px; height: 208px; object-fit: contain; }
    .pd-glow { position: absolute; inset: -7px; border-radius: 32px; border: 6px solid var(--lime, #C8F169);
      box-shadow: 0 0 26px rgba(200,241,105,.8); opacity: 0; }
    #pd-k1 { left: 66px; top: 200px; } #pd-k2 { left: 302px; top: 178px; }
    #pd-k3 { left: 538px; top: 198px; } #pd-k4 { left: 774px; top: 180px; }
"""
pd_html = """
    <div id="pd-k1" class="pd-card"><img src="assets/img/bioc.png" alt="Nutrilite Bio C Plus"><i class="pd-glow"></i></div>
    <div id="pd-k2" class="pd-card"><img src="assets/img/amcell.png" alt="Nutrilite AmCELL"><i class="pd-glow"></i></div>
    <div id="pd-k3" class="pd-card"><img src="assets/img/soy-berries.png" alt="Nutrilite Soy Protein Mixed Berries"><i class="pd-glow"></i></div>
    <div id="pd-k4" class="pd-card"><img src="assets/img/soy-lecithin.png" alt="Nutrilite Soy Protein Lecithin"><i class="pd-glow"></i></div>
"""
L = lambda t: round(t - pd_start, 3)
# (selector, word time, from dx, from dy, start rot, landed rot) - two from the left, two from the right
PD_FLY = [("#pd-k1", 5.08, -620, -160, -70, -7), ("#pd-k2", 5.55, -520, -460, 50, 4),
          ("#pd-k3", 6.06, 560, -460, -50, -3), ("#pd-k4", 6.90, 640, -160, 70, 6)]
pd_js = "".join(hide_at(s) for s in [".pd-card"])
for sel, t, dx, dy, r0, r1 in PD_FLY:
    pd_js += fly_in(sel, L(t), dx, dy, r0, r1)
for i, (sel, *_r) in enumerate(PD_FLY):  # lime glow passes along the row on "Nutrilite"
    t = L(8.06) + i * 0.08
    pd_js += f'      tl.fromTo("{sel} .pd-glow", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.14, ease: "power2.out" }}, {t:.3f});\n'
    pd_js += f'      tl.to("{sel} .pd-glow", {{ opacity: 0, duration: 0.4, ease: "power2.in" }}, {t + 0.5:.3f});\n'
for i, (sel, *_r) in enumerate(PD_FLY):
    pd_js += fly_out(sel, L(9.22) + i * 0.05, (-1 if i < 2 else 1) * 420, -520, (-1 if i < 2 else 1) * 40)
SCENES.append(("products", pd_start, 4.48, scene("products", pd_css, pd_html, pd_js)))

# ---------------------------------------------------------------- 4 TEBUS
tb_start = 9.6
tb_css = SHARED_CSS + """
    #tb-chip { left: 64px; top: 190px; }
    #tb-row { position: absolute; left: 60px; top: 276px; display: flex; align-items: center; gap: 22px; }
    #tb-a { position: relative; font: 400 92px/1 var(--font-display); color: var(--lime, #C8F169); text-transform: uppercase;
      text-shadow: 0 6px 0 rgba(11,61,46,.9), 0 14px 34px rgba(0,0,0,.45); }
    #tb-u { position: relative; width: 92px; height: 92px; color: var(--cream, #FFF6E3);
      filter: drop-shadow(0 8px 16px rgba(0,0,0,.45)); }
    #tb-b { position: relative; font: 400 92px/1 var(--font-display); color: var(--cream, #FFF6E3); text-transform: uppercase;
      text-shadow: 0 6px 0 rgba(11,61,46,.9), 0 14px 34px rgba(0,0,0,.45); }
"""
tb_html = f"""
    <div id="tb-chip" class="chip"><span class="ico">{BOTTLE}</span>1 suplemen pun memadai</div>
    <div id="tb-row"><div id="tb-a">Tebus</div><div id="tb-u" class="ico">{UMBRELLA}</div><div id="tb-b">Payung</div></div>
"""
L = lambda t: round(t - tb_start, 3)
tb_js = "".join(hide_at(s) for s in ["#tb-chip", "#tb-a", "#tb-u", "#tb-b"])
tb_js += '      tl.fromTo("#tb-chip", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, %.3f);\n' % L(9.80)
tb_js += blur_in("#tb-a", L(11.72), 0.16)
tb_js += pop_in("#tb-u", L(12.0), 0.45, 0)
tb_js += blur_in("#tb-b", L(12.14), 0.16)
for s in ["#tb-chip", "#tb-a", "#tb-u", "#tb-b"]:
    tb_js += blur_out(s, L(12.70), 0.13)
SCENES.append(("tebus", tb_start, 3.23, scene("tebus", tb_css, tb_html, tb_js)))

# ---------------------------------------------------------------- 5 DESIGN
dg_start = 12.85
dg_css = SHARED_CSS + """
    .dg-sp { position: absolute; color: var(--lime, #C8F169); filter: drop-shadow(0 0 12px rgba(200,241,105,.7)); }
    #dg-s1 { left: 820px; top: 230px; width: 70px; height: 70px; }
    #dg-s2 { left: 930px; top: 360px; width: 40px; height: 40px; }
    #dg-s3 { left: 720px; top: 380px; width: 34px; height: 34px; }
    #dg-chip { left: 64px; top: 190px; }
    #dg-serif { left: 66px; top: 268px; font-size: 92px; color: var(--cream, #FFF6E3); }
    #dg-serif em { color: var(--lime, #C8F169); }
"""
dg_html = f"""
    <div id="dg-s1" class="dg-sp ico">{SPARK}</div>
    <div id="dg-s2" class="dg-sp ico">{SPARK}</div>
    <div id="dg-s3" class="dg-sp ico">{SPARK}</div>
    <div id="dg-chip" class="chip"><span class="ico">{LEAF}</span>Warna hijau Nutrilite</div>
    <div id="dg-serif" class="serif">corak <em>daun</em> ✦</div>
"""
L = lambda t: round(t - dg_start, 3)
dg_js = "".join(hide_at(s) for s in ["#dg-s1", "#dg-s2", "#dg-s3", "#dg-chip", "#dg-serif"])
for i, s in enumerate(["#dg-s1", "#dg-s2", "#dg-s3"]):
    t = L(13.2) + i * 0.09
    dg_js += f'      tl.fromTo("{s}", {{ opacity: 0, scale: 0, rotation: -45 }}, {{ opacity: 1, scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2)" }}, {t:.3f});\n'
    dg_js += f'      tl.to("{s}", {{ opacity: 0, scale: 0.3, duration: 0.3, ease: "power2.in" }}, {t + 0.9:.3f});\n'
dg_js += '      tl.fromTo("#dg-chip", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, %.3f);\n' % L(14.60)
dg_js += blur_in("#dg-serif", L(14.75), 0.2)
dg_js += blur_out("#dg-chip", L(15.58), 0.13) + blur_out("#dg-serif", L(15.58), 0.13)
SCENES.append(("design", dg_start, 2.88, scene("design", dg_css, dg_html, dg_js)))

# ---------------------------------------------------------------- 6 BUKA
bk_start = 15.72
bk_css = SHARED_CSS + """
    #bk-chip { left: 64px; top: 190px; }
    #bk-l1 { left: 58px; top: 270px; font-size: 104px; }
    #bk-l2 { left: 58px; top: 376px; font-size: 104px; color: var(--lime, #C8F169); }
    #bk-btn { position: absolute; left: 640px; top: 382px; width: 92px; height: 92px; border-radius: 50%;
      background: var(--cream, #FFF6E3); box-shadow: inset 0 -8px 0 rgba(11,61,46,.25), 0 10px 26px rgba(0,0,0,.4); }
    #bk-btn i { position: absolute; left: 30px; top: 26px; width: 32px; height: 32px; border-radius: 50%; background: var(--forest, #0B3D2E); }
"""
bk_html = f"""
    <div id="bk-chip" class="chip"><span class="ico">{UMBRELLA}</span>Cara buka</div>
    <div id="bk-l1" class="big">Tekan</div>
    <div id="bk-l2" class="big">1 butang</div>
    <div id="bk-btn"><i></i></div>
"""
L = lambda t: round(t - bk_start, 3)
bk_js = "".join(hide_at(s) for s in ["#bk-chip", "#bk-l1", "#bk-l2", "#bk-btn"])
bk_js += '      tl.fromTo("#bk-chip", { opacity: 0, x: -80, filter: "blur(10px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.32, ease: "expo.out" }, %.3f);\n' % L(15.80)
bk_js += blur_in("#bk-l1", L(17.42), 0.16)
bk_js += blur_in("#bk-l2", L(17.62), 0.16)
bk_js += pop_in("#bk-btn", L(17.80), 0.4, 0)
bk_js += '      tl.to("#bk-btn", { scale: 0.86, duration: 0.08, ease: "power2.in" }, %.3f);\n' % L(18.86)
bk_js += '      tl.to("#bk-btn", { scale: 1, duration: 0.25, ease: "power3.out" }, %.3f);\n' % L(18.94)
for s in ["#bk-chip", "#bk-l1", "#bk-l2", "#bk-btn"]:
    bk_js += blur_out(s, L(19.70), 0.13)
SCENES.append(("buka", bk_start, 4.13, scene("buka", bk_css, bk_html, bk_js)))

# ---------------------------------------------------------------- 7 WOW
ww_start = 19.9
ww_css = SHARED_CSS + """
    #ww-burst { position: absolute; left: 30px; top: 120px; width: 560px; height: 420px; color: var(--lime, #C8F169); }
    #ww-burst svg { width: 100%; height: 100%; }
    #ww-text { position: absolute; left: 70px; top: 196px; font: 400 214px/1 var(--font-display); color: var(--coral, #FF7A59);
      text-transform: uppercase; transform: rotate(-7deg);
      text-shadow: 0 8px 0 var(--cream, #FFF6E3), 0 18px 40px rgba(0,0,0,.45); }
"""
rays = "".join(f'<line x1="{280 + 150*c}" y1="{210 + 110*s}" x2="{280 + 250*c}" y2="{210 + 190*s}" />'
               for c, s in [(1, 0), (0.7, -0.7), (0, -1), (-0.7, -0.7), (-1, 0), (-0.7, 0.7), (0.7, 0.7)])
ww_html = f"""
    <div id="ww-burst"><svg viewBox="0 0 560 420" stroke="currentColor" stroke-width="16" stroke-linecap="round">{rays}</svg></div>
    <div id="ww-text">Wow!</div>
"""
L = lambda t: round(t - ww_start, 3)
ww_js = hide_at("#ww-burst") + hide_at("#ww-text")
ww_js += '      tl.fromTo("#ww-text", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.2)" }, %.3f);\n' % L(19.97)
ww_js += '      tl.fromTo("#ww-burst", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1.1, duration: 0.35, ease: "expo.out" }, %.3f);\n' % L(20.0)
ww_js += '      tl.to("#ww-burst", { opacity: 0, duration: 0.25, ease: "power2.in" }, %.3f);\n' % L(20.42)
ww_js += blur_out("#ww-text", L(20.66), 0.14)
SCENES.append(("wow", ww_start, 0.92, scene("wow", ww_css, ww_html, ww_js)))

# ---------------------------------------------------------------- 8 AUTO (small confirm chip)
au_start = 21.0
au_css = SHARED_CSS + """
    #au-chip { left: 64px; top: 196px; background: var(--lime, #C8F169); color: var(--forest, #0B3D2E); }
"""
au_html = f"""    <div id="au-chip" class="chip"><span class="ico">{CHECK}</span>Sekali tekan · terus kembang</div>\n"""
au_js = hide_at("#au-chip")
au_js += '      tl.fromTo("#au-chip", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, 0.1);\n'
au_js += blur_out("#au-chip", 2.35, 0.14)
SCENES.append(("auto", au_start, 2.55, scene("auto", au_css, au_html, au_js)))

# ---------------------------------------------------------------- 9 NINETY YEARS
ny_start = 24.42
ny_css = SHARED_CSS + """
    #ny-card { position: absolute; left: 60px; top: 176px; width: 900px; height: 318px; border-radius: 40px;
      background: rgba(8, 46, 32, .93); box-shadow: 0 24px 60px rgba(0,0,0,.4); border: 2px solid rgba(200,241,105,.35); }
    #ny-since { position: absolute; left: 112px; top: 214px; font: 800 30px/1 var(--font-ui); letter-spacing: .2em;
      color: var(--lime, #C8F169); text-transform: uppercase; }
    #ny-year { position: absolute; left: 104px; top: 258px; font: 400 150px/1 var(--font-display); color: var(--cream, #FFF6E3);
      font-variant-numeric: tabular-nums; }
    #ny-90 { position: absolute; left: 100px; top: 236px; font: 400 196px/1 var(--font-display); color: var(--lime, #C8F169); }
    #ny-tahun { position: absolute; left: 432px; top: 246px; font: 400 92px/1 var(--font-display); color: var(--cream, #FFF6E3);
      text-transform: uppercase; }
    #ny-world { position: absolute; left: 434px; top: 352px; display: flex; align-items: center; gap: 14px;
      font: italic 800 56px/1 var(--font-serif); color: var(--lime, #C8F169); white-space: nowrap; }
    #ny-world .ico { width: 54px; height: 54px; color: var(--cream, #FFF6E3); }
"""
ny_html = f"""
    <div id="ny-card"></div>
    <div id="ny-since">Nutrilite sejak 1934</div>
    <div id="ny-year">1934</div>
    <div id="ny-90">90</div>
    <div id="ny-tahun">Tahun</div>
    <div id="ny-world"><span class="ico">{GLOBE}</span>di seluruh dunia</div>
"""
L = lambda t: round(t - ny_start, 3)
ny_js = "".join(hide_at(s) for s in ["#ny-card", "#ny-since", "#ny-year", "#ny-90", "#ny-tahun", "#ny-world"])
ny_js += '      tl.fromTo("#ny-card", { opacity: 0, scaleY: 0.2, transformOrigin: "50% 0%" }, { opacity: 1, scaleY: 1, duration: 0.4, ease: "expo.out" }, 0.0);\n'
ny_js += blur_in("#ny-since", 0.12, 0.16)
ny_js += '      tl.set("#ny-year", { opacity: 1 }, 0.16);\n'
ny_js += ('      const yr = document.querySelector("#ny-year"); const ctr = { v: 1934 };\n'
          '      tl.fromTo(ctr, { v: 1934 }, { v: 2024, duration: 0.62, ease: "power2.inOut", '
          'onUpdate: function () { yr.textContent = String(Math.round(ctr.v)); } }, 0.16);\n')
ny_js += '      tl.to("#ny-year", { opacity: 0, y: -40, filter: "blur(8px)", duration: 0.14, ease: "power2.in" }, %.3f);\n' % L(25.04)
ny_js += '      tl.fromTo("#ny-90", { opacity: 0, scale: 1.6, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.3, ease: "expo.out" }, %.3f);\n' % L(25.10)
ny_js += blur_in("#ny-tahun", L(25.20), 0.16)
ny_js += blur_in("#ny-world", L(26.84), 0.22)
for s in ["#ny-card", "#ny-since", "#ny-90", "#ny-tahun", "#ny-world"]:
    ny_js += blur_out(s, L(28.70), 0.16)
SCENES.append(("ninety", ny_start, 4.5, scene("ninety", ny_css, ny_html, ny_js)))

# ---------------------------------------------------------------- 10 TUTUP + TING
tt_start = 29.38
tt_css = SHARED_CSS + """
    #tt-chip { left: 64px; top: 190px; }
    #tt-tarik { left: 58px; top: 272px; font-size: 118px; }
    #tt-arrow { position: absolute; left: 420px; top: 262px; width: 70px; height: 132px; color: var(--lime, #C8F169);
      filter: drop-shadow(0 8px 16px rgba(0,0,0,.45)); }
    #tt-ting { position: absolute; left: 470px; top: 196px; font: 400 150px/1 var(--font-display); color: var(--lime, #C8F169);
      text-transform: uppercase; transform: rotate(8deg);
      text-shadow: 0 7px 0 var(--forest, #0B3D2E), 0 16px 40px rgba(0,0,0,.5); }
    .tt-sp { position: absolute; color: var(--cream, #FFF6E3); }
    #tt-s1 { left: 900px; top: 168px; width: 56px; height: 56px; }
    #tt-s2 { left: 450px; top: 360px; width: 40px; height: 40px; }
"""
tt_html = f"""
    <div id="tt-chip" class="chip"><span class="ico">{UMBRELLA}</span>Cara tutup</div>
    <div id="tt-tarik" class="big">Tarik</div>
    <div id="tt-arrow" class="ico">{ARROW_DOWN}</div>
    <div id="tt-ting">Ting!</div>
    <div id="tt-s1" class="tt-sp ico">{SPARK}</div>
    <div id="tt-s2" class="tt-sp ico">{SPARK}</div>
"""
L = lambda t: round(t - tt_start, 3)
tt_js = "".join(hide_at(s) for s in ["#tt-chip", "#tt-tarik", "#tt-arrow", "#tt-ting", "#tt-s1", "#tt-s2"])
tt_js += '      tl.fromTo("#tt-chip", { opacity: 0, x: -80, filter: "blur(10px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.32, ease: "expo.out" }, %.3f);\n' % L(29.45)
tt_js += blur_in("#tt-tarik", L(31.38), 0.16)
tt_js += '      tl.fromTo("#tt-arrow", { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }, %.3f);\n' % L(31.45)
tt_js += blur_out("#tt-tarik", L(33.02), 0.13) + blur_out("#tt-arrow", L(33.02), 0.13)
tt_js += '      tl.fromTo("#tt-ting", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.42, ease: "back.out(2.4)" }, %.3f);\n' % L(33.18)
for s, d in [("#tt-s1", 0.04), ("#tt-s2", 0.1)]:
    tt_js += f'      tl.fromTo("{s}", {{ opacity: 0, scale: 0, rotation: -60 }}, {{ opacity: 1, scale: 1, rotation: 0, duration: 0.3, ease: "back.out(2)" }}, {L(33.18) + d:.3f});\n'
    tt_js += f'      tl.to("{s}", {{ opacity: 0, scale: 0.2, duration: 0.25, ease: "power2.in" }}, {L(33.9) + d:.3f});\n'
tt_js += blur_out("#tt-ting", L(34.30), 0.15)
tt_js += blur_out("#tt-chip", L(34.30), 0.13)
SCENES.append(("tutup", tt_start, 5.1, scene("tutup", tt_css, tt_html, tt_js)))

# ---------------------------------------------------------------- 11 HANDBAG
hb_start = 37.1
hb_css = SHARED_CSS + """
    #hb-card { position: absolute; left: 60px; top: 180px; width: 640px; height: 210px; border-radius: 36px;
      background: var(--forest, #0B3D2E); box-shadow: 0 22px 50px rgba(0,0,0,.4); transform: rotate(-2.5deg); }
    #hb-icon { position: absolute; left: 92px; top: 206px; width: 150px; height: 150px; border-radius: 50%;
      background: var(--lime, #C8F169); color: var(--forest, #0B3D2E); display: flex; align-items: center; justify-content: center; }
    #hb-icon svg { width: 92px; height: 92px; }
    #hb-a { position: absolute; left: 268px; top: 214px; font: 800 30px/1 var(--font-ui); letter-spacing: .16em;
      color: var(--lime, #C8F169); text-transform: uppercase; }
    #hb-b { position: absolute; left: 262px; top: 256px; font: 400 92px/1 var(--font-display); color: var(--cream, #FFF6E3);
      text-transform: uppercase; }
    #hb-go { left: 84px; top: 418px; background: var(--lime, #C8F169); color: var(--forest, #0B3D2E); }
"""
hb_html = f"""
    <div id="hb-card"></div>
    <div id="hb-icon">{BAG}</div>
    <div id="hb-a">Muat dalam</div>
    <div id="hb-b">Handbag</div>
    <div id="hb-go" class="chip"><span class="ico">{PIN}</span>Bawa ke mana-mana</div>
"""
L = lambda t: round(t - hb_start, 3)
hb_js = "".join(hide_at(s) for s in ["#hb-card", "#hb-icon", "#hb-a", "#hb-b", "#hb-go"])
hb_js += '      tl.fromTo("#hb-card", { opacity: 0, scale: 0.5, rotation: -10 }, { opacity: 1, scale: 1, rotation: -2.5, duration: 0.45, ease: "back.out(1.5)" }, %.3f);\n' % L(37.24)
hb_js += pop_in("#hb-icon", L(37.32), 0.45, 0)
hb_js += blur_in("#hb-a", L(37.36), 0.16) + blur_in("#hb-b", L(37.44), 0.18)
hb_js += '      tl.fromTo("#hb-go", { opacity: 0, x: -120, filter: "blur(10px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.34, ease: "expo.out" }, %.3f);\n' % L(38.24)
for s in ["#hb-card", "#hb-icon", "#hb-a", "#hb-b", "#hb-go"]:
    hb_js += blur_out(s, L(39.44), 0.14)
SCENES.append(("handbag", hb_start, 2.5, scene("handbag", hb_css, hb_html, hb_js)))

# ---------------------------------------------------------------- 12 CTA (flying B-roll over full-frame video)
ct_start = 39.6
ct_css = SHARED_CSS + """
    #ct-site { position: absolute; left: 60px; top: 178px; width: 700px; height: 319px; border-radius: 22px; overflow: hidden;
      border: 8px solid #fff; box-shadow: 0 24px 50px rgba(0,0,0,.4); background: #fff; }
    #ct-site img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 0%; display: block; }
    #ct-prod { position: absolute; left: 792px; top: 186px; width: 196px; height: 238px; border-radius: 26px; background: #fff;
      box-shadow: 0 22px 44px rgba(0,0,0,.38); display: flex; align-items: center; justify-content: center; }
    #ct-prod img { width: 166px; height: 208px; object-fit: contain; }
    #ct-stamp { position: absolute; left: 806px; top: 420px; width: 196px; height: 196px; filter: drop-shadow(0 14px 26px rgba(0,0,0,.35)); }
    #ct-stamp svg { width: 100%; height: 100%; }
    #ct-best { position: absolute; left: 60px; width: 880px; top: 1166px; text-align: center; }
    #ct-best span { display: inline-block; padding: 20px 40px 22px; border-radius: 26px; background: var(--coral, #FF7A59);
      color: var(--cream, #FFF6E3); font: 400 80px/1 var(--font-display); text-transform: uppercase;
      box-shadow: 0 16px 34px rgba(0,0,0,.35); white-space: nowrap; }
"""
ct_html = f"""
    <div id="ct-site"><img src="assets/img/amway-site.png" alt="Amway Malaysia website"></div>
    <div id="ct-prod"><img src="assets/img/bioc.png" alt="Nutrilite Bio C Plus"></div>
    <div id="ct-stamp" data-layout-ignore>{stamp_svg('cts', 'TEBUS PAYUNG • TEBUS PAYUNG • ')}</div>
    <div id="ct-best"><span>Memang best!</span></div>
"""
L = lambda t: round(t - ct_start, 3)
ct_js = "".join(hide_at(s) for s in ["#ct-site", "#ct-prod", "#ct-stamp", "#ct-best"])
ct_js += fly_in("#ct-site", L(39.72), 820, -420, 28, -3, 0.65)
ct_js += fly_in("#ct-prod", L(41.06), 420, -480, 60, 6, 0.55)
ct_js += '      tl.fromTo("#ct-stamp", { opacity: 0, scale: 0.2, rotation: -150 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.55, ease: "expo.out" }, %.3f);\n' % L(41.75)
ct_js += '      tl.to("#ct-stamp svg", { rotation: 40, duration: 2.8, ease: "none" }, %.3f);\n' % L(41.75)
ct_js += fly_in("#ct-best span", L(42.62), 0, 420, -20, -3, 0.5)
ct_js += '      tl.fromTo("#ct-best", { opacity: 0 }, { opacity: 1, duration: 0.01 }, %.3f);\n' % L(42.62)
SCENES.append(("cta", ct_start, round(TOTAL - ct_start, 3), scene("cta", ct_css, ct_html, ct_js)))

# ================================================================== captions
def wd(i, text=None, s=None, e=None):
    w = WORDS[i]
    return (text if text is not None else w["w"], s if s is not None else w["s"], e if e is not None else w["e"])

HL = {"nutrilite", "nutrilite.", "amway", "dapatkan", "promo", "satu", "tebus", "payung", "button", "tekan", "tarik", "handbag", "design", "best"}
G = [
    [wd(0), wd(1), wd(2)],
    [wd(3, "design"), wd(4), wd(5)],
    [wd(6), wd(7), wd(8)],
    [wd(9), wd(10)],
    [wd(11), wd(12)],
    [wd(13), wd(14)],
    [wd(15), wd(16)],
    [("mana-mana", WORDS[17]["s"], WORDS[18]["e"])],
    [wd(19), wd(20)],
    [wd(21), wd(22), wd(23)],
    [wd(24, "memadai.")],
    [wd(25), wd(26)],
    [wd(27), wd(28)],
    [wd(29), wd(30), wd(31)],
    [wd(32), wd(33)],
    [wd(34), wd(35)],
    [wd(36, "design"), wd(37), wd(38)],
    [wd(39), wd(40), wd(41)],
    [wd(42), wd(43, "dia?")],
    [wd(44, "Nampak"), wd(45)],
    [wd(46), wd(47), wd(48)],
    [wd(49), wd(50)],
    [wd(51), wd(52)],
    # 19.92 WOW burst
    [wd(54), wd(55, "itulah", e=WORDS[56]["e"])],
    [wd(57), wd(58), wd(59)],
    [wd(60, "Dan"), wd(61)],
    [wd(62, "design"), wd(63)],
    [wd(64), wd(65), "top"],
    [wd(66), wd(67), "top"],
    # 24.42-28.9 the 90-year card carries "ada 90 tahun Nutrilite di dunia"
    [wd(74, "Huuu~", e=28.95)],
    [("Macam", 29.42, 29.66), ("mana", 29.66, 29.88), wd(76)],
    [wd(77), wd(78), wd(79, "dia?")],
    [wd(80), wd(81)],
    [wd(82), wd(83)],
    [wd(84), wd(85, "bunyi...")],
    # 33.18 TING burst
    [wd(86), wd(87), wd(88)],
    [wd(89), wd(90)],
    [wd(91), wd(92), wd(93)],
    [wd(94), wd(95), wd(96)],
    [wd(97), wd(98)],
    [("Bawalah", WORDS[99]["s"], WORDS[100]["e"]), wd(101)],
    [("mana-mana", WORDS[102]["s"], WORDS[103]["e"]), wd(104)],
    [wd(105)],
    [("mana-mana", WORDS[106]["s"], WORDS[107]["e"])],
    [wd(108), wd(109), wd(110)],
    # 42.62 "MEMANG BEST!" sticker flies into the caption slot
]
HARD_STOPS = [19.92, 24.42, 33.16, 42.6]  # a caption never runs past these

cap_groups = []
for gi, g in enumerate(G):
    top = g[-1] == "top"
    toks = [t for t in g if t != "top"]
    s = max(0.12, toks[0][1] - 0.06)
    e_last = toks[-1][2]
    nxt = None
    if gi + 1 < len(G):
        nxt = [t for t in G[gi + 1] if t != "top"][0][1] - 0.06
    end = min(e_last + 0.35, nxt) if nxt else e_last + 0.35
    for hs in HARD_STOPS:
        if s < hs < end:
            end = hs
    cap_groups.append({"id": f"cg{gi}", "s": round(s, 3), "e": round(end, 3), "top": top, "toks": toks})

cap_css = """
    .cg { position: absolute; left: 60px; width: 880px; top: 1168px; text-align: center; opacity: 0; visibility: hidden; }
    .cg.top { top: 236px; }
    .cg-in { display: inline-block; padding: 16px 30px 20px; border-radius: 26px; background: rgba(11, 61, 46, .9);
      box-shadow: 0 14px 36px rgba(0,0,0,.35); transform: rotate(-1.5deg); }
    .cw { display: inline-block; margin: 0 9px; font: 400 64px/1.12 var(--font-display, "Archivo Black");
      color: var(--cream, #FFF6E3); text-transform: uppercase; letter-spacing: .005em; }
    .cw.hl { color: var(--lime, #C8F169); }
"""
cap_html = ""
cap_js = ""
for g in cap_groups:
    words_html = "".join(
        f'<span id="{g["id"]}w{k}" class="cw{" hl" if t[0].lower().strip(".,?!~") in HL else ""}">{html.escape(t[0])}</span>'
        for k, t in enumerate(g["toks"]))
    cap_html += f'    <div id="{g["id"]}" class="cg{" top" if g["top"] else ""}"><div class="cg-in">{words_html}</div></div>\n'
    gid = "#" + g["id"]
    cap_js += f'      tl.set("{gid}", {{ visibility: "visible" }}, {g["s"]});\n'
    cap_js += (f'      tl.fromTo("{gid} .cg-in", {{ scale: 0.86, y: 14 }}, {{ scale: 1, y: 0, duration: 0.2, ease: "back.out(2)" }}, {g["s"]});\n')
    cap_js += f'      tl.fromTo("{gid}", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.08, ease: "none" }}, {g["s"]});\n'
    for k, t in enumerate(g["toks"]):
        wid = f'#{g["id"]}w{k}'
        cap_js += f'      tl.fromTo("{wid}", {{ opacity: 0.38 }}, {{ opacity: 1, duration: 0.06, ease: "none" }}, {max(g["s"], t[1] - 0.02):.3f});\n'
    cap_js += f'      tl.to("{gid}", {{ opacity: 0, duration: 0.1, ease: "power2.in" }}, {g["e"] - 0.1:.3f});\n'
    cap_js += f'      tl.set("{gid}", {{ opacity: 0, visibility: "hidden" }}, {g["e"]});\n'

captions_scene = scene("captions", cap_css, cap_html, cap_js)

# ================================================================== root
# per-segment punch-in (static scale about the face, hides the jump cut)
PUNCH = {1: 1.12, 3: 1.1, 7: 1.1, 9: 1.1, 12: 1.1, 15: 1.1, 19: 1.1}
videos = ""
for seg in EDL:
    i = seg["i"]
    if seg is EDL[-1]:  # picture runs on under the end card after the last word
        seg = dict(seg, dur=round(TOTAL - seg["start"], 3))
    cx, cy = face_center(seg["src_in"], seg["src_out"])
    sc = PUNCH.get(i, 1.0)
    tr = f"transform: scale({sc}); transform-origin: {cx}px {cy}px;" if sc != 1 else ""
    videos += (f'        <video id="v{i:02d}" class="clip aroll" src="assets/video/aroll.mp4" muted playsinline '
               f'data-start="{seg["start"]}" data-duration="{seg["dur"]}" data-media-start="{seg["src_in"]}" '
               f'data-track-index="1" style="{tr}"></video>\n')

SFX = [  # (id, file, picture time, peak offset in file, volume)
    ("sx-impact-hook", "impact2", 0.02, 0.147, 0.55),
    ("sx-stamp", "pop1", 1.86, 0.007, 0.9),
    ("sx-stamp-sh", "shimmer2", 1.90, 0.373, 0.35),
    ("sx-promo", "whoosh1", 4.12, 0.101, 0.6),
    ("sx-fly1", "whoosh1", 5.25, 0.101, 0.45),
    ("sx-land1", "pop2", 5.55, 0.248, 0.55),
    ("sx-fly2", "whoosh4", 5.72, 0.114, 0.4),
    ("sx-land2", "pop4", 6.02, 0.16, 0.55),
    ("sx-fly3", "whoosh3", 6.23, 0.368, 0.4),
    ("sx-land3", "pop1", 6.53, 0.007, 0.55),
    ("sx-fly4", "whoosh1", 7.07, 0.101, 0.45),
    ("sx-land4", "pop2", 7.37, 0.248, 0.55),
    ("sx-nutri", "shimmer4", 8.12, 0.257, 0.35),
    ("sx-flyout", "whoosh4", 9.40, 0.114, 0.45),
    ("sx-chip1", "pop4", 9.84, 0.16, 0.8),
    ("sx-umbicon", "pop1", 12.05, 0.007, 0.8),
    ("sx-sparkle", "shimmer2", 13.22, 0.373, 0.35),
    ("sx-design", "pop2", 14.63, 0.248, 0.7),
    ("sx-buka", "whoosh1", 15.84, 0.101, 0.55),
    ("sx-btn", "pop4", 17.84, 0.16, 0.8),
    ("sx-umbrella", "umb2", 19.97, 0.167, 0.85),
    ("sx-wow", "shimmer4", 20.02, 0.257, 0.4),
    ("sx-auto", "pop1", 21.12, 0.007, 0.75),
    ("sx-count", "count3", 25.04, 1.497, 0.8),
    ("sx-90", "impact1", 25.12, 0.022, 0.45),
    ("sx-world", "whoosh4", 26.88, 0.114, 0.4),
    ("sx-tutup", "whoosh1", 29.49, 0.101, 0.55),
    ("sx-tarik", "whoosh3", 31.42, 0.368, 0.45),
    ("sx-ting", "shimmer4", 33.20, 0.257, 0.35),
    ("sx-tingpop", "pop2", 33.22, 0.248, 0.6),
    ("sx-zip", "zip3", 37.30, 0.567, 0.75),
    ("sx-bag", "pop4", 37.30, 0.16, 0.6),
    ("sx-go", "whoosh1", 38.28, 0.101, 0.5),
    ("sx-site", "whoosh3", 39.92, 0.368, 0.45),
    ("sx-site-land", "pop2", 40.25, 0.248, 0.55),
    ("sx-prod", "whoosh1", 41.22, 0.101, 0.45),
    ("sx-prod-land", "pop4", 41.5, 0.16, 0.55),
    ("sx-stamp2", "pop1", 41.79, 0.007, 0.9),
    ("sx-stamp2-sh", "shimmer2", 41.82, 0.373, 0.35),
    ("sx-best", "impact1", 42.98, 0.022, 0.5),
    ("sx-best-pop", "pop2", 42.95, 0.248, 0.7),
]
SFX_DUR = {"impact2": 1.0, "impact1": 1.0, "pop1": 1.0, "pop2": 2.0, "pop4": 2.0, "shimmer2": 1.0, "shimmer4": 1.0,
           "whoosh1": 0.755, "whoosh3": 1.983, "whoosh4": 1.956, "umb2": 2.595, "count3": 2.0, "zip3": 0.956}
audio = ""
lanes_end = []  # greedy lane packing so layered hits sit on their own tracks
for sid, f, t, peak, vol in SFX:
    st = round(max(0, t + 1 / FPS - peak), 3)
    dur = min(SFX_DUR[f], round(TOTAL - st, 3))
    lane = next((k for k, e in enumerate(lanes_end) if e <= st), None)
    if lane is None:
        lanes_end.append(0); lane = len(lanes_end) - 1
    lanes_end[lane] = st + dur
    audio += (f'      <audio id="{sid}" class="clip" src="assets/audio/sfx/{f}.wav" data-start="{st}" '
              f'data-duration="{dur}" data-volume="{vol}" data-track-index="{20 + lane}" data-audio-group="sfx"></audio>\n')

music_fx = json.dumps({"version": 1, "nodes": [
    {"type": "highpass", "id": "m1", "label": "Clean low end", "params": {"frequency": 70}},
    {"type": "peaking", "id": "m2", "label": "Make room for the voice", "params": {"frequency": 2200, "gain": -5, "q": 0.8}},
    {"type": "limiter", "id": "m3", "params": {"limit": -2}}]}).replace('"', "&quot;")
music_auto = json.dumps({"version": 1, "lanes": [{"target": "volume", "points": [
    {"t": 0, "v": 0.24}, {"t": 0.6, "v": 0.17}, {"t": 19.45, "v": 0.17}, {"t": 19.7, "v": 0.27}, {"t": 20.4, "v": 0.17},
    {"t": 43.4, "v": 0.17}, {"t": 43.95, "v": 0.4}, {"t": TOTAL, "v": 0.0}]}]}).replace('"', "&quot;")

root_js = ""
root_js += '      tl.fromTo("#punch", { scale: 1.1, transformOrigin: "400px 780px" }, { scale: 1, duration: 0.8, ease: "expo.out" }, 0);\n'
root_js += '      tl.fromTo("#punch", { scale: 1, transformOrigin: "640px 520px" }, { scale: 1.07, duration: 0.12, ease: "power4.out", immediateRender: false }, 19.97);\n'
root_js += '      tl.to("#punch", { scale: 1, duration: 0.6, ease: "power2.inOut" }, 20.12);\n'
root_js += '      tl.fromTo("#punch", { y: 0 }, { y: 7, duration: 0.05, ease: "power2.out", immediateRender: false }, 33.18);\n'
root_js += '      tl.to("#punch", { y: 0, duration: 0.25, ease: "power2.out" }, 33.23);\n'

hosts = ""
for k, (sid, st, dur, _) in enumerate(SCENES):
    hosts += (f'      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" '
              f'data-start="{st}" data-duration="{dur}" data-track-index="{3 + (k % 2)}" data-track-kind="graphics" '
              f'data-width="{W}" data-height="{H}" style="z-index: 6;"></div>\n')


index = Template(r"""<!doctype html>
<html lang="ms" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Payung Nutrilite — HyperFrames edit</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {$tokens}
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #0B3D2E; }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: var(--font-ui); }
      #stage { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 2; overflow: hidden; }
      #punch { position: absolute; inset: 0; }
      .aroll { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }
      #scrim { position: absolute; left: 0; top: 0; width: 1080px; height: 640px; z-index: 3; pointer-events: none;
        background: linear-gradient(180deg, rgba(4,28,19,.62) 0%, rgba(4,28,19,.34) 45%, rgba(4,28,19,0) 100%); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="$total" data-width="1080" data-height="1920">
      <div id="stage">
        <div id="punch">
$videos        </div>
      </div>
      <div id="scrim"></div>
$hosts      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html"
        data-start="0" data-duration="$total" data-track-index="8" data-track-kind="captions"
        data-width="1080" data-height="1920" style="z-index: 9;"></div>

      <audio id="voice" class="clip" src="assets/audio/voice.wav" data-start="0" data-duration="$voice_end"
        data-volume="1" data-track-index="10" data-audio-group="voiceover"></audio>
      <audio id="music" class="clip" src="assets/audio/music/bed.mp3" data-start="0" data-duration="$total"
        data-volume="1" data-track-index="11" data-audio-group="music"
        data-fx-chain="$music_fx"
        data-automation="$music_auto"></audio>
$audio    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
$root_js      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
""").substitute(tokens=CSS_TOKENS, total=TOTAL, videos=videos, hosts=hosts,
                voice_end=VOICE_END, music_fx=music_fx, music_auto=music_auto, audio=audio, root_js=root_js)

open(D("index.html"), "w").write(index)
for sid, _, _, h in SCENES:
    open(D("compositions", f"{sid}.html"), "w").write(h)
open(D("compositions", "captions.html"), "w").write(captions_scene)
print(f"built index.html + {len(SCENES)} scenes + captions ({len(cap_groups)} groups), total {TOTAL}s, voice {VOICE_END}s")
