/* Kimia Dalam Hidup — V1 motion ad engine (1080x1920, 30fps, 44s).
   All timings are absolute seconds taken from the Whisper word timestamps of audio/vo.mp3
   (see audio/words.json). Wording of on-screen text = approved "TEKS SKRIN FINAL".
   Captions = transcript supplied by the user (docx). Deterministic: render(T) draws one frame. */
const W = 1080, H = 1920, DUR = 44.0;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let X = ctx;
const COL = { bg: '#070B09', bg2: '#0E1512', line: 'rgba(124,255,58,.40)', g: '#7CFF3A', w: '#F4F7F5',
  mut: '#8CA095', ink: '#06100A', cy: '#35D0E8', am: '#FFB020', co: '#FF6B6B', pe: '#7B8CFF' };
const HF = "Oswald, 'DejaVu Sans', 'Noto Color Emoji', sans-serif";
const MF = "'JetBrains Mono', 'DejaVu Sans Mono', monospace";
const BF = "Inter, 'DejaVu Sans', 'Noto Color Emoji', sans-serif";

/* ---------- helpers ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const p = (t, a, b) => clamp((t - a) / (b - a));
const inOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const outC = x => 1 - Math.pow(1 - x, 3);
const outBack = x => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
const rr = (x, y, w, h, r) => { X.beginPath(); X.roundRect(x, y, w, h, r); };
const line = (x1, y1, x2, y2) => { X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2); X.stroke(); };
const circ = (x, y, r) => { X.beginPath(); X.arc(x, y, r, 0, 7); };
const fnt = (face, size, w = 700) => { X.font = `${w} ${size}px ${face}`; };
function withCtx(c, fn) { const o = X; X = c; try { fn(); } finally { X = o; } }

/* ---------- global background (constant, DNA: near-black + one acid-green accent) ---------- */
function bg(T) {
  X.fillStyle = COL.bg; X.fillRect(0, 0, W, H);
  const g = X.createRadialGradient(540, 900, 0, 540, 900, 1100);
  g.addColorStop(0, rgba(COL.g, .07)); g.addColorStop(1, rgba(COL.g, 0));
  X.fillStyle = g; X.fillRect(0, 0, W, H);
  const r = rng(11);
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y0 = r() * H, sp = 8 + r() * 18, rad = 2 + r() * 6, a = .05 + r() * .08;
    const y = ((y0 - T * sp) % H + H) % H;
    X.fillStyle = rgba(COL.g, a); circ(x, y, rad); X.fill();
  }
}

/* ---------- typography: headline tokens (Oswald caps, white + accent word) ---------- */
// lines: [{at, segs:[{t, c, at, mark}]}]
function headline(lines, T, o = {}) {
  const size = o.size || 104, lh = o.lh || 1.04, cx = o.cx || 540, maxW = o.maxW || 940;
  X.save(); fnt(HF, size); X.textBaseline = 'alphabetic'; X.letterSpacing = '1px';
  const L = lines.map(ln => {
    let w = 0; const toks = ln.segs.map(s => { const tw = X.measureText(s.t).width; const o2 = { ...s, w: tw, x: w }; w += tw; return o2; });
    return { ...ln, toks, w };
  });
  const widest = Math.max(...L.map(l => l.w));
  const sc = Math.min(1, maxW / widest);
  const totalH = L.length * size * lh;
  let y = (o.y || 300);
  X.translate(cx, 0); X.scale(sc, sc);
  L.forEach((ln, i) => {
    const by = (y + i * size * lh) / sc + size * .86;
    ln.toks.forEach(tk => {
      const at = tk.at ?? ln.at ?? 0, k = p(T, at, at + .28);
      if (k <= 0) return;
      const x = -ln.w / 2 + tk.x;
      X.save(); X.globalAlpha *= clamp(k * 2);
      const sl = (1 - outC(k)) * 26; X.translate(0, sl);
      if (tk.mark) { // accent chip (reference: "BOLEH CONVERT" style)
        const mk = p(T, tk.mark, tk.mark + .25);
        const pd = tk.pad ?? 12; if (mk > 0) { X.fillStyle = COL.g; rr(x - pd, by - size * .86 - 4, tk.w * mk + pd * 2, size * .98, 10); X.fill(); }
        X.fillStyle = mk > .6 ? COL.ink : (tk.c || COL.w);
      } else X.fillStyle = (tk.cAt && T < tk.cAt) ? COL.w : (tk.c || COL.w);
      X.fillText(tk.t, x, by);
      X.restore();
    });
  });
  X.restore();
  return y + totalH * sc;
}
const W_ = (t, o = {}) => ({ t, ...o });

/* ---------- caption chips (reference: mono phrase on accent chip). Text = user's transcript. ---------- */
const CAPS = [
  [0.0, 1.5, 'Belajar kimia ni…'], [1.6, 3.15, 'sebenarnya nak guna bila?'],
  [3.8, 4.65, 'Hakikatnya,'], [4.7, 5.65, 'kau dah guna kimia'], [5.7, 7.1, 'sejak bangun tidur tadi.'],
  [7.4, 8.65, 'Telefon kau boleh hidup'], [8.7, 10.25, 'sebab bateri dia bergantung'], [10.3, 11.7, 'pada tindak balas redoks.'],
  [11.8, 13.05, 'Ya, topik yang ada'], [13.1, 14.2, 'dalam silibus tu.'],
  [14.4, 15.6, 'Basuh baju berminyak?'],
  [15.7, 17.65, 'Molekul sabun ada satu hujung'], [17.7, 18.45, 'yang suka air,'], [18.5, 20.05, 'satu hujung yang suka minyak.'],
  [20.2, 21.25, 'Sebab tu kotoran'], [21.3, 22.3, 'boleh tertanggal.'],
  [22.4, 23.85, 'Goreng telur tengah malam?'],
  [23.9, 25.05, 'Haba mengubah struktur'], [25.1, 26.45, 'protein dalam telur.'], [26.5, 27.9, 'Itulah denaturasi.'],
  [28.3, 29.05, 'Bancuh air manis?'], [29.1, 30.95, 'Gula lebih cepat larut'], [31.0, 31.85, 'dalam air panas.'],
  [31.9, 33.05, 'Itu kesan suhu'], [33.05, 33.8, 'dalam kimia.'],
  [33.9, 35.15, 'Jadi, kimia bukan'], [35.2, 36.7, 'sekadar nak lulus exam.'],
  [36.9, 38.45, 'Ia cara kau faham'], [38.5, 39.15, 'apa yang berlaku'], [39.2, 40.2, 'di sekeliling kau.'],
  [40.3, 41.55, 'Nak tahu lagi kimia'], [41.6, 42.35, 'dalam hidup harian?'], [42.4, 43.5, 'Boleh follow saya.'],
];
function caption(T) {
  const c = CAPS.find(c => T >= c[0] && T < c[1]); if (!c) return;
  const k = p(T, c[0], c[0] + .12), out = 1 - p(T, c[1] - .06, c[1]);
  X.save(); fnt(MF, 42); const tw = X.measureText(c[2]).width, w = tw + 56, h = 76, x = 540 - w / 2, y = 1500;
  X.globalAlpha = clamp(k * 1.5) * out; X.translate(0, (1 - outC(k)) * 14);
  X.fillStyle = COL.g; rr(x, y, w, h, 12); X.fill();
  X.fillStyle = COL.ink; X.textBaseline = 'middle'; X.fillText(c[2], x + 28, y + h / 2 + 2);
  X.restore();
}

/* ---------- panel (reference: dark rounded card with thin accent border) ---------- */
function panelBegin(T, at, x = 60, y = 560, w = 960, h = 860, glow = 0) {
  const k = p(T, at, at + .32), s = lerp(.94, 1, outC(k));
  X.save(); X.globalAlpha *= clamp(k * 2.2);
  X.translate(x + w / 2, y + h / 2); X.scale(s, s); X.translate(-(x + w / 2), -(y + h / 2));
  X.shadowColor = rgba(COL.g, .25 + glow * .35); X.shadowBlur = 30 + glow * 30;
  X.fillStyle = COL.bg2; rr(x, y, w, h, 40); X.fill(); X.shadowBlur = 0;
  X.strokeStyle = COL.line; X.lineWidth = 3; rr(x, y, w, h, 40); X.stroke();
  X.save(); rr(x, y, w, h, 40); X.clip();
}
function panelEnd() { X.restore(); X.restore(); }

/* ---------- icons (flat vector) ---------- */
const ICON_COL = { phone: COL.pe, soap: COL.cy, egg: COL.am, glass: COL.co };
function drawIcon(kind, cx, cy, s) {
  X.save(); X.translate(cx, cy);
  X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 24; X.shadowOffsetY = 8;
  X.fillStyle = ICON_COL[kind]; rr(-s / 2, -s / 2, s, s, s * .24); X.fill(); X.shadowBlur = 0; X.shadowOffsetY = 0;
  const u = s / 200;
  X.scale(u, u); X.lineJoin = 'round'; X.lineCap = 'round';
  if (kind === 'phone') {
    X.fillStyle = '#F4F7FF'; rr(-46, -76, 92, 152, 16); X.fill();
    X.fillStyle = '#10143A'; rr(-37, -62, 74, 124, 9); X.fill();
    X.strokeStyle = '#fff'; X.lineWidth = 5; rr(-24, -10, 44, 22, 5); X.stroke();
    X.fillStyle = COL.co; rr(-20, -6, 8, 14, 2); X.fill();
    X.fillStyle = '#fff'; rr(21, -3, 5, 8, 2); X.fill();
  } else if (kind === 'soap') {
    X.rotate(-.2); X.fillStyle = '#fff'; rr(-62, -34, 124, 68, 24); X.fill();
    X.fillStyle = rgba(COL.cy, .35); rr(-50, -22, 100, 20, 10); X.fill();
    X.strokeStyle = '#fff'; X.lineWidth = 6;
    circ(-48, -70, 14); X.stroke(); circ(-20, -88, 9); X.stroke(); circ(40, -72, 12); X.stroke(); circ(62, -54, 7); X.stroke();
  } else if (kind === 'egg') {
    X.fillStyle = '#fff'; X.beginPath(); X.moveTo(-70, 0);
    X.bezierCurveTo(-76, -52, -20, -76, 22, -62); X.bezierCurveTo(70, -56, 84, -10, 62, 28);
    X.bezierCurveTo(46, 66, -4, 74, -36, 56); X.bezierCurveTo(-64, 42, -66, 24, -70, 0); X.fill();
    X.fillStyle = '#FFB300'; circ(4, 2, 28); X.fill(); X.fillStyle = 'rgba(255,255,255,.55)'; circ(-6, -8, 8); X.fill();
  } else {
    X.beginPath(); X.moveTo(-52, -66); X.lineTo(52, -66); X.lineTo(40, 70); X.lineTo(-40, 70); X.closePath();
    X.fillStyle = 'rgba(255,255,255,.22)'; X.fill();
    X.save(); X.beginPath(); X.moveTo(-50, -34); X.lineTo(50, -34); X.lineTo(39, 70); X.lineTo(-39, 70); X.closePath(); X.clip();
    X.fillStyle = '#fff'; X.fillRect(-60, -34, 120, 120); X.restore();
    X.strokeStyle = '#fff'; X.lineWidth = 7; X.beginPath(); X.moveTo(-52, -66); X.lineTo(-40, 70); X.lineTo(40, 70); X.lineTo(52, -66); X.stroke();
    X.fillStyle = COL.co; for (let i = 0; i < 6; i++) { rr(-26 + (i % 3) * 20, 48 - Math.floor(i / 3) * 14, 10, 10, 2); X.fill(); }
  }
  X.restore();
}
const ICON_ROW = [['phone', 186], ['soap', 422], ['egg', 658], ['glass', 894]];

/* ---------- notes background (hook) ---------- */
const FORMS = [
  ['n = m / M', 70, 250, 54, -.10], ['PV = nRT', 640, 210, 62, .07], ['2H₂ + O₂ → 2H₂O', 60, 470, 46, -.05],
  ['pH = −log[H⁺]', 580, 560, 48, .09], ['M = n / V', 120, 360, 44, .04], ['mol', 820, 400, 96, -.12],
  ['Kc = [C][D] / [A][B]', 60, 1250, 42, .05], ['1 mol = 6.02 × 10²³', 80, 1420, 44, .06], ['C₆H₁₂O₆', 650, 1520, 66, -.09],
  ['ΔH < 0', 90, 1640, 62, .05], ['NaCl', 760, 1730, 72, .12], ['Ar', 820, 1220, 90, -.06], ['KMnO₄', 150, 1560, 52, -.08],
];
function sNotes(T) {
  X.save();
  const z = 1 + .04 * T; X.translate(540, 960); X.scale(z, z); X.translate(-540, -960 - T * 6);
  X.fillStyle = '#0B120F'; X.fillRect(-100, -200, W + 200, H + 400);
  X.strokeStyle = 'rgba(124,255,58,.10)'; X.lineWidth = 2;
  for (let y = -100; y < H + 200; y += 68) line(-100, y, W + 100, y);
  X.strokeStyle = 'rgba(255,107,107,.30)'; X.lineWidth = 3; line(120, -200, 120, H + 300);
  FORMS.forEach(([t, x, y, s, r], i) => {
    X.save(); X.translate(x, y + Math.sin(T * .8 + i) * 4); X.rotate(r); fnt(HF, s); X.fillStyle = i % 3 ? 'rgba(244,247,245,.28)' : rgba(COL.g, .38); X.fillText(t, 0, 0); X.restore();
  });
  X.strokeStyle = 'rgba(244,247,245,.22)'; X.lineWidth = 4; // benzene doodle + flask doodle
  X.save(); X.translate(870, 780); X.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; X.lineTo(Math.cos(a) * 90, Math.sin(a) * 90); } X.closePath(); X.stroke(); circ(0, 0, 54); X.stroke(); X.restore();
  X.save(); X.translate(190, 880); X.beginPath(); X.moveTo(-18, -80); X.lineTo(-18, -20); X.lineTo(-70, 60); X.lineTo(70, 60); X.lineTo(18, -20); X.lineTo(18, -80); X.stroke(); X.restore();
  X.restore();
}
function sHook(T) {
  sNotes(T);
  X.fillStyle = 'rgba(7,11,9,.55)'; X.fillRect(0, 560, W, 760);
  const k1 = p(T, 0.0, 1.4), k2 = p(T, 2.2, 3.1);
  const l1 = 'BELAJAR KIMIA NI…', l2 = 'NAK GUNA BILA?';
  X.save(); fnt(HF, 128); X.letterSpacing = '1px';
  const w1 = X.measureText(l1).width, w2 = X.measureText(l2).width, sc = Math.min(1, 900 / Math.max(w1, w2));
  X.translate(540, 0); X.scale(sc, sc);
  const n1 = Math.floor(k1 * l1.length), n2 = Math.floor(k2 * l2.length);
  X.fillStyle = COL.w; X.fillText(l1.slice(0, n1), -w1 / 2, 800 / sc + 20);
  X.fillStyle = COL.g; X.fillText(l2.slice(0, n2), -w2 / 2, 800 / sc + 20 + 150);
  const blink = Math.floor(T * 4) % 2 === 0;
  if (T < 3.2 && blink) { X.fillStyle = COL.w; const cxp = k2 > 0 ? -w2 / 2 + X.measureText(l2.slice(0, n2)).width + 8 : -w1 / 2 + X.measureText(l1.slice(0, n1)).width + 8; const cyp = k2 > 0 ? 800 / sc + 170 : 800 / sc + 20; X.fillRect(cxp, cyp - 110, 10, 120); }
  X.restore();
  const ek = p(T, 3.0, 3.35);
  if (ek > 0) { X.save(); X.translate(540, 1130); const s = outBack(ek); X.scale(s, s); X.rotate(Math.sin(T * 6) * .06 * (1 - ek) + .04); X.font = `110px ${BF}`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText('🤔', 0, 0); X.restore(); }
}

/* ---------- scene: pusing (notes tear, formulas -> 4 icons) ---------- */
const off = document.createElement('canvas'); off.width = W; off.height = H; const offX = off.getContext('2d');
const TEAR = (() => { const r = rng(5); const pts = []; for (let y = -40; y <= H + 40; y += 110) pts.push([540 + (r() - .5) * 90, y]); return pts; })();
function sPusing(T) {
  const t = T - 3.5;
  // icons
  ICON_ROW.forEach(([k, x], i) => {
    const at = 4.35 + i * .22, kk = p(T, at, at + .4); if (kk <= 0) return;
    const s = outBack(kk) * (1 + .03 * Math.sin(T * 3 + i));
    X.save(); X.translate(x, 1230 + Math.sin(T * 2.4 + i) * 6); X.scale(s, s); drawIcon(k, 0, 0, 200); X.restore();
  });
  // headline
  headline([
    { segs: [W_('KAU DAH GUNA.', { at: 4.75 })] },
    { segs: [W_('HARI NI.', { at: 5.7, c: COL.g })] },
  ], T, { y: 640, size: 150, lh: 1.05 });
  // formula flyers (to icons)
  FORMS.slice(0, 8).forEach((f, i) => {
    const t0 = 3.7 + i * .06, k = inOut(p(T, t0, t0 + .8)); if (k <= 0 || k >= 1) return;
    const ox = f[1] + 120, oy = f[2], [, tx] = ICON_ROW[i % 4], ty = 1230;
    const cx = (ox + tx) / 2, cyy = Math.min(oy, ty) - 250;
    const x = (1 - k) * (1 - k) * ox + 2 * (1 - k) * k * cx + k * k * tx, y = (1 - k) * (1 - k) * oy + 2 * (1 - k) * k * cyy + k * k * ty;
    X.save(); X.globalAlpha = 1 - k * k; X.translate(x, y); const s = lerp(1, .3, k); X.scale(s, s); fnt(HF, f[3]); X.fillStyle = i % 2 ? COL.g : COL.w; X.textAlign = 'center'; X.fillText(f[0], 0, 0); X.restore();
  });
  // paper tear
  const k = p(T, 3.5, 4.35);
  if (k < 1) {
    offX.clearRect(0, 0, W, H); withCtx(offX, () => sHook(3.49));
    const e = inOut(k);
    [-1, 1].forEach(side => {
      X.save(); X.globalAlpha = 1 - e * e;
      X.translate(side < 0 ? 0 : W, H); X.rotate(side * e * .38); X.translate(side * e * 140, e * 260); X.translate(side < 0 ? 0 : -W, -H);
      X.beginPath(); X.moveTo(side < 0 ? 0 : W, -40);
      TEAR.forEach(([x, y]) => X.lineTo(x, y)); X.lineTo(side < 0 ? 0 : W, H + 40); X.closePath(); X.clip();
      X.drawImage(off, 0, 0);
      X.restore();
      X.save(); X.globalAlpha = (1 - e * e) * .9; X.translate(side < 0 ? 0 : W, H); X.rotate(side * e * .38); X.translate(side * e * 140, e * 260); X.translate(side < 0 ? 0 : -W, -H);
      X.strokeStyle = COL.g; X.lineWidth = 6; X.lineJoin = 'round'; X.beginPath(); TEAR.forEach(([x, y], i) => i ? X.lineTo(x, y) : X.moveTo(x, y)); X.stroke(); X.restore();
    });
  }
}

/* ---------- scene: telefon / redoks ---------- */
const BC = { x: 540, y: 990 };
function drawPhone(T, a) {
  X.save(); X.globalAlpha *= a;
  X.shadowColor = 'rgba(0,0,0,.6)'; X.shadowBlur = 40;
  X.fillStyle = '#EEF1FF'; rr(BC.x - 200, BC.y - 370, 400, 740, 64); X.fill(); X.shadowBlur = 0;
  X.fillStyle = '#0B0F2E'; rr(BC.x - 182, BC.y - 352, 364, 704, 50); X.fill();
  X.fillStyle = '#0B0F2E'; X.strokeStyle = '#EEF1FF'; rr(BC.x - 46, BC.y - 338, 92, 22, 11); X.fillStyle = '#05071c'; X.fill();
  return () => X.restore();
}
function drawBatteryIcon(T, fill, col) {
  X.save(); X.strokeStyle = '#fff'; X.lineWidth = 9; rr(BC.x - 125, BC.y - 55, 240, 110, 24); X.stroke();
  X.fillStyle = '#fff'; rr(BC.x + 117, BC.y - 24, 14, 48, 6); X.fill();
  X.fillStyle = col; if (fill > 0) { rr(BC.x - 113, BC.y - 43, 216 * fill, 86, 14); X.fill(); }
  X.restore();
}
function pathPt(pts, d) { // polyline point at distance d
  let acc = 0; for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], l = Math.hypot(x2 - x1, y2 - y1); if (d <= acc + l) { const k = (d - acc) / l; return [lerp(x1, x2, k), lerp(y1, y2, k)]; } acc += l; }
  return pts[pts.length - 1];
}
function drawCutaway(T, a) {
  const cx = 520, cy = 1020; X.save(); X.globalAlpha *= a;
  const ct = T - 9.3;
  X.fillStyle = '#12183F'; X.strokeStyle = '#E9ECFF'; X.lineWidth = 12; rr(cx - 400, cy - 190, 770, 380, 56); X.fill(); X.stroke();
  X.fillStyle = '#E9ECFF'; rr(cx + 370, cy - 70, 44, 140, 14); X.fill();
  X.save(); rr(cx - 388, cy - 178, 746, 356, 46); X.clip();
  const eg = X.createLinearGradient(cx - 235, 0, cx + 205, 0); eg.addColorStop(0, rgba(COL.pe, .20)); eg.addColorStop(1, rgba(COL.cy, .20));
  X.fillStyle = eg; X.fillRect(cx - 235, cy - 178, 440, 356);
  const pulse = .5 + .5 * Math.sin(T * 5);
  X.fillStyle = '#3A3F78'; rr(cx - 345, cy - 150, 110, 300, 12); X.fill();
  X.fillStyle = '#D9DCFF'; rr(cx + 205, cy - 150, 110, 300, 12); X.fill();
  X.shadowColor = COL.am; X.shadowBlur = 20 * pulse; X.strokeStyle = COL.am; X.lineWidth = 4; rr(cx - 345, cy - 150, 110, 300, 12); X.stroke(); X.shadowBlur = 0;
  X.fillStyle = '#fff'; X.fillRect(cx - 312, cy - 6, 44, 12); // minus
  X.fillStyle = '#12183F'; X.fillRect(cx + 238, cy - 6, 44, 12); X.fillRect(cx + 254, cy - 22, 12, 44); // plus
  for (let i = 0; i < 14; i++) { // ions
    const r = rng(i + 3), y0 = r() * 300, ph = r() * 400, dir = i % 2 ? 1 : -1;
    const x = cx - 220 + ((ph + (dir > 0 ? 1 : -1) * Math.max(0, ct) * 55) % 400 + 400) % 400;
    X.fillStyle = dir > 0 ? COL.am : COL.cy; circ(x, cy - 150 + y0 + Math.sin(T * 2 + i) * 6, 11); X.fill();
  }
  X.restore();
  // external wire + electrons (left electrode -> right electrode)
  const wire = [[cx - 290, cy - 190], [cx - 290, cy - 330], [cx + 260, cy - 330], [cx + 260, cy - 190]];
  X.strokeStyle = 'rgba(214,218,255,.5)'; X.lineWidth = 14; X.lineJoin = 'round'; X.beginPath(); wire.forEach(([x, y], i) => i ? X.lineTo(x, y) : X.moveTo(x, y)); X.stroke();
  const L = 140 + 550 + 140;
  for (let i = 0; i < 12; i++) {
    const d = ((Math.max(0, ct) * 240 + i * L / 12) % L); const [x, y] = pathPt(wire, d);
    X.shadowColor = COL.g; X.shadowBlur = 24; X.fillStyle = COL.g; circ(x, y, 13); X.fill(); X.shadowBlur = 0; X.fillStyle = '#fff'; circ(x, y, 5); X.fill();
  }
  X.restore();
}
function sPhone(T) {
  const glow = p(T, 10.3, 11.2) * (1 - p(T, 12.4, 13)) ;
  headline([
    { at: 7.4, segs: [W_('BATERI TELEFON')] },
    { at: 7.7, segs: [W_('→ TINDAK BALAS ', { }), W_('REDOKS', { c: COL.g, mark: 11.0 })] },
  ], T, { y: 250, size: 112 });
  panelBegin(T, 7.3, 60, 560, 960, 860, glow);
  const zoom = inOut(p(T, 8.6, 9.5));
  const z = T < 12.5 ? lerp(1, 6.2, zoom) : lerp(1.8, 1, inOut(p(T, 12.5, 13.3)));
  const ph = T < 12.5 ? (1 - p(z, 2.4, 4.6)) : p(T, 12.5, 12.95);
  if (ph > 0.001) {
    X.save(); X.translate(BC.x, BC.y); X.scale(z, z); X.translate(-BC.x, -BC.y);
    const end = drawPhone(T, ph);
    const lit = p(T, 13.0, 13.4);
    let fill = lit > 0 ? lerp(.08, .92, lit) : .08, col = lit > .2 ? COL.g : COL.co;
    if (lit === 0 && Math.floor(T * 3) % 2 && T < 8.6) col = rgba(COL.co, .45);
    if (lit > 0) { X.fillStyle = rgba(COL.g, .10 * lit); rr(BC.x - 182, BC.y - 352, 364, 704, 50); X.fill(); }
    drawBatteryIcon(T, fill, col);
    end(); X.restore();
  }
  const ca = p(T, 9.0, 9.6) * (1 - p(T, 12.3, 12.8));
  if (ca > 0) drawCutaway(T, ca);
  panelEnd();
}

/* ---------- scene: sabun ---------- */
const FAB_Y = 1290, DR = 110, SN = 24;
const SOAP = (() => { const r = rng(21); return Array.from({ length: SN }, (_, i) => {
  const th = -Math.PI / 2 + (i / SN) * Math.PI * 2 + (r() - .5) * .08, bottom = Math.sin(th) > .25;
  return { th, fx: 150 + r() * 780, fy: 650 + r() * 520, ph: r() * 6.28, at: bottom ? 20.2 + r() * .9 : 15.5 + r() * 4.2, pop: 14.7 + i * .035 };
}); })();
function sSoap(T) {
  headline([
    { at: 14.5, segs: [W_('SABUN:')] },
    { at: 15.6, segs: [W_('SATU HUJUNG SUKA '), W_('AIR,', { c: COL.cy, at: 17.7 })] },
    { at: 18.4, segs: [W_('SATU HUJUNG SUKA '), W_('MINYAK', { c: COL.am, at: 19.4 })] },
  ], T, { y: 200, size: 96, lh: 1.0 });
  panelBegin(T, 14.3, 60, 560, 960, 860, p(T, 20.2, 21) * (1 - p(T, 21.8, 22.2)));
  // water
  const wg = X.createLinearGradient(0, 560, 0, 1420); wg.addColorStop(0, rgba(COL.cy, .05)); wg.addColorStop(1, rgba(COL.cy, .22)); X.fillStyle = wg; X.fillRect(60, 560, 960, 860);
  for (let i = 0; i < 8; i++) { const r = rng(i * 7 + 1), x = 120 + r() * 800, sp = 18 + r() * 20, y = 1380 - ((T * sp + r() * 800) % 800); X.strokeStyle = rgba(COL.cy, .25); X.lineWidth = 3; circ(x, y, 8 + r() * 10); X.stroke(); }
  const Lp = inOut(p(T, 20.2, 22.0));
  // fabric
  X.fillStyle = '#C9D3CF'; X.fillRect(60, FAB_Y, 960, 130);
  X.strokeStyle = 'rgba(70,90,80,.35)'; X.lineWidth = 2; for (let x = 60; x < 1020; x += 18) line(x, FAB_Y, x, FAB_Y + 130); for (let y = FAB_Y; y < FAB_Y + 130; y += 18) line(60, y, 1020, y);
  const stainA = .75 * (1 - p(Lp, .15, .9));
  if (stainA > 0) { X.fillStyle = rgba(COL.am, stainA); X.beginPath(); X.ellipse(540, FAB_Y + 14, 150, 22, 0, 0, 7); X.fill(); }
  const Cx = 540 + Math.sin(T * 2.2) * 10 * Lp, Cy = lerp(FAB_Y - DR, 800, Lp) + Math.sin(T * 3) * 8 * Lp;
  // droplet
  const dg = X.createRadialGradient(Cx - 28, Cy - 30, 8, Cx, Cy, DR); dg.addColorStop(0, '#FFE08A'); dg.addColorStop(1, COL.am);
  X.fillStyle = dg; circ(Cx, Cy, DR); X.fill(); X.fillStyle = 'rgba(255,255,255,.5)'; circ(Cx - 30, Cy - 34, 14); X.fill();
  // molecules
  SOAP.forEach((m, i) => {
    const k = p(T, m.pop, m.pop + .3); if (k <= 0) return;
    const a = inOut(p(T, m.at, m.at + .9));
    const hx = Cx + (DR + 64) * Math.cos(m.th), hy = Cy + (DR + 64) * Math.sin(m.th);
    const fx = m.fx + Math.sin(T * 1.3 + m.ph) * 22, fy = m.fy + Math.cos(T * 1.1 + m.ph) * 16;
    const x = lerp(fx, hx, a), y = lerp(fy, hy, a);
    const fa = m.ph + Math.sin(T * 2 + m.ph) * .5, tx = lerp(Math.cos(fa), -Math.cos(m.th), a), ty = lerp(Math.sin(fa), -Math.sin(m.th), a), tl = Math.hypot(tx, ty) || 1;
    const ux = tx / tl, uy = ty / tl, nx = -uy, ny = ux, s = outBack(k);
    X.save(); X.translate(x, y); X.scale(s, s); X.translate(-x, -y);
    X.strokeStyle = COL.am; X.lineWidth = 9; X.lineCap = 'round'; X.beginPath(); X.moveTo(x, y);
    for (let j = 1; j <= 10; j++) { const d = j * 6.2, w = Math.sin(j * 1.1 + T * 5 + m.ph) * 4 * (1 - a * .7); X.lineTo(x + ux * d + nx * w, y + uy * d + ny * w); } X.stroke();
    X.fillStyle = COL.cy; circ(x, y, 21); X.fill(); X.strokeStyle = '#fff'; X.lineWidth = 4; circ(x, y, 21); X.stroke();
    X.restore();
  });
  panelEnd();
}

/* ---------- scene: telur / denaturasi ---------- */
function blob(cx, cy, r0, sc = 1) { X.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, r = (r0 + 16 * Math.sin(3 * a + .6) + 10 * Math.sin(5 * a + 2) + 7 * Math.sin(2 * a)) * sc; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i ? X.lineTo(x, y) : X.moveTo(x, y); } X.closePath(); }
function chainPt(s, k, u, v) {
  const tau = s * Math.PI * 2, fx = 58 * Math.sin(2 * tau + k * 1.3) + (k - 1) * 8, fy = 58 * Math.sin(3 * tau + .5 * k);
  const ux = (s - .5) * 250, uy = 14 * Math.sin(s * Math.PI * 5 + k * 1.7) + (k - 1) * 52 * (1 - v);
  let x = lerp(fx, ux, u), y = lerp(fy, uy, u);
  const ang = (k - 1) * .6 * v, c = Math.cos(ang), sn = Math.sin(ang); return [x * c - y * sn, x * sn + y * c];
}
function sEgg(T) {
  headline([
    { at: 22.5, segs: [W_('TELUR GORENG →')] },
    { at: 23.9, segs: [W_('PROTEIN TERNYAHASLI')] },
    { at: 25.1, segs: [W_('(', {}), W_('DENATURASI', { c: COL.g, mark: 27.1, pad: 3 }), W_(')')] },
  ], T, { y: 200, size: 104, lh: 1.0 });
  panelBegin(T, 22.4, 60, 560, 960, 860, p(T, 24, 25) * (1 - p(T, 27.6, 28)));
  const heat = p(T, 23.9, 25.5), cook = inOut(p(T, 24.3, 26.4));
  const cx = 520, cy = 840;
  // heat glow
  X.save(); X.shadowColor = rgba(COL.co, .15 + .65 * heat); X.shadowBlur = 20 + 60 * heat; X.fillStyle = '#23283A'; circ(cx, cy, 262); X.fill(); X.restore();
  X.fillStyle = '#2B3047'; circ(cx, cy, 250); X.fill(); X.fillStyle = '#1A1E2E'; circ(cx, cy, 226); X.fill();
  X.strokeStyle = '#2B3047'; X.lineWidth = 46; X.lineCap = 'round'; line(cx + 215, cy - 125, 980, 610);
  // egg
  const ek = outBack(p(T, 22.7, 23.2));
  if (ek > 0) {
    X.save(); X.translate(cx, cy); X.scale(ek, ek); X.translate(-cx, -cy);
    blob(cx, cy, 168); X.fillStyle = `rgba(${lerp(200, 255, cook) | 0},${lerp(230, 255, cook) | 0},255,${lerp(.38, 1, cook)})`; X.fill();
    X.strokeStyle = `rgba(232,185,110,${.9 * p(cook, .6, 1)})`; X.lineWidth = 10; blob(cx, cy, 164); X.stroke();
    X.strokeStyle = rgba('#FFFFFF', .5); X.lineWidth = 3; blob(cx, cy, 168); X.stroke();
    X.fillStyle = cook > .5 ? '#FFB300' : '#FFC62B'; circ(cx + 18, cy - 8, 70); X.fill(); X.fillStyle = 'rgba(255,255,255,.55)'; circ(cx - 6, cy - 34, 14); X.fill();
    X.restore();
    // sizzle bubbles
    for (let i = 0; i < 10; i++) { const r = rng(i * 13 + 2), a = r() * 6.28, d = 190 + r() * 30, ph = (T * (1.2 + r()) + r() * 3) % 1; if (heat < .3) continue; X.fillStyle = `rgba(255,255,255,${.5 * (1 - ph) * heat})`; circ(cx + Math.cos(a) * d, cy + Math.sin(a) * d - ph * 40, 4 + ph * 10); X.fill(); }
  }
  // inset: protein chains
  const ix = 540, iy = 1250, ir = 145, ia = p(T, 24.4, 24.9) * (1 - p(T, 27.7, 28));
  if (ia > 0) {
    X.save(); X.globalAlpha *= ia; X.strokeStyle = rgba(COL.g, .5); X.setLineDash([10, 10]); X.lineWidth = 3; line(cx, cy + 190, ix, iy - ir - 6); X.setLineDash([]);
    X.fillStyle = '#0A0F0D'; circ(ix, iy, ir); X.fill();
    X.strokeStyle = `rgb(${lerp(53, 255, heat) | 0},${lerp(208, 176, heat) | 0},${lerp(232, 32, heat) | 0})`; X.lineWidth = 6; circ(ix, iy, ir); X.stroke();
    X.save(); circ(ix, iy, ir - 4); X.clip();
    const u = inOut(p(T, 24.9, 26.4)), v = inOut(p(T, 26.4, 27.5));
    for (let k = 0; k < 3; k++) {
      const wob = (1 - u) * 4 * Math.sin(T * 16 + k);
      const col = v > .3 ? '#fff' : [COL.cy, COL.pe, COL.g][k];
      X.strokeStyle = col; X.lineWidth = 9; X.lineJoin = 'round'; X.lineCap = 'round'; X.beginPath();
      for (let j = 0; j <= 60; j++) { const [x, y] = chainPt(j / 60, k, u, v); j ? X.lineTo(ix + x + wob, iy + y) : X.moveTo(ix + x + wob, iy + y); } X.stroke();
      X.fillStyle = col; for (let j = 0; j <= 60; j += 6) { const [x, y] = chainPt(j / 60, k, u, v); circ(ix + x + wob, iy + y, 6); X.fill(); }
    }
    X.restore(); X.restore();
  }
  panelEnd();
}

/* ---------- scene: gula / suhu ---------- */
function glass(cx, cy, hot, T) {
  const top = cy - 210, bot = cy + 210, tw = 150, bw = 112, lvl = top + 44;
  const wob = Math.sin(T * 3 + (hot ? 1 : 0)) * 3;
  const path = () => { X.beginPath(); X.moveTo(cx - tw, top); X.lineTo(cx - bw, bot); X.lineTo(cx + bw, bot); X.lineTo(cx + tw, top); X.closePath(); };
  X.save(); path(); X.fillStyle = 'rgba(255,255,255,.04)'; X.fill(); X.clip();
  const wg = X.createLinearGradient(0, lvl, 0, bot); wg.addColorStop(0, hot ? rgba('#FF8A5C', .72) : rgba(COL.cy, .42)); wg.addColorStop(1, hot ? rgba(COL.co, .55) : rgba(COL.cy, .24));
  X.fillStyle = wg; X.fillRect(cx - tw - 5, lvl + wob, tw * 2 + 10, bot - lvl);
  // sugar grains
  const r = rng(hot ? 91 : 51);
  for (let i = 0; i < 34; i++) {
    const gx = cx + (r() - .5) * 190, mound = 1 - Math.abs(gx - cx) / 120, gy = bot - 16 - Math.max(0, mound) * 46 * r() - r() * 8, rot = r() * 3;
    const drop = 28.45 + r() * 1.0, k = p(T, drop, drop + .5), y = lerp(top - 80, gy, k * k);
    const ts = hot ? 30.2 + r() * 1.2 : 30.2 + r() * 3.0, dur = hot ? 1.0 : 3.2, flag = hot ? 1 : (r() < .22 ? 1 : .12);
    const d = p(T, ts, ts + dur) * flag, sz = 15 * (1 - d * .9);
    if (k <= 0 || sz <= 1) continue;
    X.save(); X.translate(gx, y); X.rotate(rot); X.globalAlpha = 1 - d * .8; X.fillStyle = '#FFF6D8'; X.fillRect(-sz / 2, -sz / 2, sz, sz); X.restore();
    if (d > 0 && d < .95) { X.fillStyle = rgba('#fff', .5 * (1 - d)); circ(gx + Math.sin(i + T * 4) * 12, gy - d * 90, 4); X.fill(); }
  }
  if (hot) { const s = p(T, 30.2, 31.6) * (1 - p(T, 32.4, 33.6)); // convection swirl
    X.strokeStyle = rgba('#fff', .35 * s); X.lineWidth = 5; for (let i = 0; i < 3; i++) { X.beginPath(); for (let j = 0; j < 20; j++) { const a = j / 19 * 5 + T * 4 + i * 2; X.lineTo(cx + Math.cos(a) * (30 + j * 3), cy + 20 - j * 5 + Math.sin(a) * 14 + i * 40); } X.stroke(); } }
  X.restore();
  if (!hot) { // ice
    X.fillStyle = 'rgba(200,240,255,.7)'; rr(cx - 62, lvl - 14 + Math.sin(T * 2) * 5, 56, 56, 12); X.fill(); rr(cx + 6, lvl - 8 + Math.cos(T * 2) * 5, 50, 50, 12); X.fill();
  } else { // steam
    for (let i = 0; i < 3; i++) { const ph = (T * .7 + i * .33) % 1; X.strokeStyle = rgba('#fff', .5 * (1 - ph)); X.lineWidth = 6; X.beginPath(); for (let j = 0; j < 12; j++) X.lineTo(cx - 60 + i * 60 + Math.sin(j * .9 + T * 3) * 14, top - 20 - ph * 60 - j * 8); X.stroke(); }
  }
  X.strokeStyle = 'rgba(255,255,255,.85)'; X.lineWidth = 8; X.lineJoin = 'round'; path(); X.stroke();
  X.fillStyle = 'rgba(255,255,255,.18)'; X.fillRect(cx - tw + 18, top + 20, 10, 250);
}
function thermo(x, cy, level, col) {
  X.fillStyle = '#E9EFEC'; rr(x - 17, cy - 190, 34, 340, 17); X.fill(); circ(x, cy + 170, 34); X.fill();
  X.fillStyle = '#0E1512'; rr(x - 8, cy - 172, 16, 316, 8); X.fill(); circ(x, cy + 170, 24); X.fill();
  X.fillStyle = col; circ(x, cy + 170, 20); X.fill(); const h = 300 * level; rr(x - 6, cy + 150 - h, 12, h, 6); X.fill();
  X.strokeStyle = '#0E1512'; X.lineWidth = 3; for (let i = 0; i < 6; i++) line(x + 18, cy - 150 + i * 50, x + 28, cy - 150 + i * 50);
}
function sSugar(T) {
  headline([
    { at: 28.4, segs: [W_('AIR '), W_('PANAS', { c: COL.co, cAt: 31.1 }), W_(' →')] },
    { at: 29.1, segs: [W_('GULA CEPAT '), W_('LARUT', { c: COL.g, mark: 30.5 })] },
  ], T, { y: 250, size: 118 });
  panelBegin(T, 28.2, 60, 560, 960, 860, 0);
  const g1 = X.createRadialGradient(300, 1000, 0, 300, 1000, 420); g1.addColorStop(0, rgba(COL.cy, .12)); g1.addColorStop(1, rgba(COL.cy, 0)); X.fillStyle = g1; X.fillRect(60, 560, 480, 860);
  const g2 = X.createRadialGradient(780, 1000, 0, 780, 1000, 420); g2.addColorStop(0, rgba(COL.co, .28)); g2.addColorStop(1, rgba(COL.co, 0)); X.fillStyle = g2; X.fillRect(540, 560, 480, 860);
  X.strokeStyle = 'rgba(255,255,255,.25)'; X.lineWidth = 3; line(540, 600, 540, 1380);
  const gk = outBack(p(T, 28.35, 28.8));
  X.save(); X.translate(300, 1010); X.scale(gk, gk); X.translate(-300, -1010); glass(300, 1010, false, T); X.restore();
  X.save(); X.translate(780, 1010); X.scale(gk, gk); X.translate(-780, -1010); glass(780, 1010, true, T); X.restore();
  const tk = p(T, 29.0, 30.0), tk2 = p(T, 30.8, 31.8);
  thermo(112, 1010, .18 * tk, COL.cy); thermo(970, 1010, lerp(.18, .88, tk2) * tk, tk2 > .2 ? COL.co : COL.cy);
  panelEnd();
}

/* ---------- scene: penegasan ---------- */
const CORN = [[170, 560], [910, 560], [170, 1390], [910, 1390]];
function sEmph(T) {
  // soft orbit rings
  X.save(); X.strokeStyle = rgba(COL.g, .12); X.lineWidth = 3; X.setLineDash([14, 18]); X.lineDashOffset = -T * 20; circ(540, 975, 470); X.stroke(); X.restore();
  headline([
    { segs: [W_('KIMIA ', { at: 34.6 }), W_('BUKAN', { at: 35.0, mark: 35.0 })] },
    { segs: [W_('SEKADAR UNTUK', { at: 35.3 })] },
    { segs: [W_('LULUS EXAM.', { at: 35.9, c: COL.g })] },
  ], T, { y: 800, size: 150, lh: 1.04 });
  ICON_ROW.forEach(([k, x0], i) => {
    const at = 36.9 + i * .16, e = inOut(p(T, at, at + .8));
    const [tx, ty] = CORN[i], x = lerp(x0, tx, e), y = lerp(1340, ty, e);
    const s = lerp(1, .8, e) * (1 + .03 * Math.sin(T * 3 + i));
    X.save(); X.translate(x, y + Math.sin(T * 2 + i * 1.7) * 8 * e); X.scale(s, s); drawIcon(k, 0, 0, 200); X.restore();
  });
}

/* ---------- scene: CTA ---------- */
function cursor(x, y, press) {
  X.save(); X.translate(x, y); X.scale(press ? .9 : 1, press ? .9 : 1); X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 12;
  X.fillStyle = '#fff'; X.strokeStyle = '#111'; X.lineWidth = 3; X.beginPath(); X.moveTo(0, 0); X.lineTo(0, 44); X.lineTo(12, 33); X.lineTo(22, 54); X.lineTo(31, 49); X.lineTo(21, 29); X.lineTo(36, 29); X.closePath(); X.fill(); X.stroke(); X.restore();
}
function sCTA(T) {
  // avatar placeholder (no logo/handle supplied)
  const ak = outBack(p(T, 40.25, 40.7));
  if (ak > 0) {
    X.save(); X.translate(540, 520); X.scale(ak, ak);
    X.strokeStyle = COL.g; X.lineWidth = 6; X.fillStyle = '#16211B'; circ(0, 0, 118); X.fill(); X.stroke();
    X.fillStyle = '#2C3B33'; circ(0, -22, 40); X.fill(); X.beginPath(); X.ellipse(0, 78, 70, 54, 0, Math.PI, 0); X.fill();
    X.fillStyle = 'rgba(244,247,245,.16)'; rr(-130, 150, 260, 30, 15); X.fill();
    X.restore();
  }
  headline([
    { at: 40.35, segs: [W_('FOLLOW', { c: COL.g }), W_(' UNTUK LAGI')] },
    { at: 41.1, segs: [W_('KIMIA DALAM')] },
    { at: 41.5, segs: [W_('KEHIDUPAN')] },
  ], T, { y: 760, size: 124, lh: 1.04 });
  // follow button
  const bk = outBack(p(T, 42.35, 42.8)), tap = p(T, 43.0, 43.25), done = tap > .5;
  if (bk > 0.01) {
    const pr = T > 42.95 && T < 43.15 ? .93 : 1, pulse = 1 + .02 * Math.sin(T * 6);
    X.save(); X.translate(540, 1280); X.scale(bk * pr * pulse, bk * pr * pulse);
    X.shadowColor = rgba(COL.g, .45); X.shadowBlur = 36; X.fillStyle = done ? COL.w : COL.g; rr(-270, -76, 540, 152, 76); X.fill(); X.shadowBlur = 0;
    X.fillStyle = COL.ink; fnt(HF, 76); X.textBaseline = 'alphabetic'; X.letterSpacing = '2px'; const tw = X.measureText('FOLLOW').width; X.fillText('FOLLOW', -tw / 2 + 42, 26);
    X.strokeStyle = COL.ink; X.lineWidth = 12; X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath();
    if (done) { X.moveTo(-190, 2); X.lineTo(-166, 28); X.lineTo(-122, -24); } else { X.moveTo(-170, 0); X.lineTo(-110, 0); X.moveTo(-140, -30); X.lineTo(-140, 30); }
    X.stroke(); X.restore();
    if (T > 43.0 && T < 43.7) { const rp = p(T, 43.0, 43.7); X.strokeStyle = rgba(COL.g, 1 - rp); X.lineWidth = 8; X.beginPath(); X.roundRect(540 - 270 - rp * 70, 1280 - 76 - rp * 70, 540 + rp * 140, 152 + rp * 140, 76 + rp * 70); X.stroke(); }
    const cp = inOut(p(T, 42.45, 43.0)); cursor(lerp(860, 600, cp), lerp(1560, 1310, cp), T > 42.95 && T < 43.15);
    if (done) for (let i = 0; i < 16; i++) { const r = rng(i + 40), a = r() * 6.28, d = p(T, 43.1, 43.9) * (140 + r() * 220); X.fillStyle = rgba(i % 2 ? COL.g : COL.w, 1 - p(T, 43.1, 43.9)); circ(540 + Math.cos(a) * (240 + d), 1280 + Math.sin(a) * (110 + d * .6), 6 + r() * 6); X.fill(); }
  }
}

/* ---------- timeline ---------- */
const SCENES = [
  [0, 3.5, sHook], [3.5, 7.2, sPusing], [7.2, 14.2, sPhone], [14.2, 22.3, sSoap],
  [22.3, 28.0, sEgg], [28.0, 33.8, sSugar], [33.8, 40.2, sEmph], [40.2, 44.0, sCTA],
];
function render(T) {
  X = ctx; X.setTransform(1, 0, 0, 1, 0, 0); X.clearRect(0, 0, W, H);
  X.textBaseline = 'alphabetic'; X.textAlign = 'left'; X.letterSpacing = '0px'; X.globalAlpha = 1;
  if (T >= 3.5) bg(T); // notes scene (hook) is full-bleed
  for (const [s, e, fn] of SCENES) if (T >= s && T < e) { X.save(); fn(T); X.restore(); }
  X.letterSpacing = '0px'; X.textAlign = 'left'; X.globalAlpha = 1;
  caption(T);
}
window.render = render;
window.ready = Promise.all([
  document.fonts.load("700 100px Oswald"), document.fonts.load("700 40px 'JetBrains Mono'"),
  document.fonts.load("100px 'Noto Color Emoji'", '🤔'),
]).then(() => true);
