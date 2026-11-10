// Dengar Kata Ibu Ayah — deterministic frame renderer.
// window.renderFrame(f) draws frame f (0..899) at 30 fps. No timers, no randomness.
'use strict';

const FPS = 30, W = 1920, H = 1080, BEAT = 0.5; // 120 BPM: every scene boundary lands on a beat
const NS = 'http://www.w3.org/2000/svg';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eio = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const eout = p => 1 - Math.pow(1 - p, 3);
const back = p => { const c = 2.2; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const spring = p => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(9 * p));
const pulse = (t, t0, d) => { const p = prog(t, t0, t0 + d); return p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p); };
const hop = (t, amp = 8, phase = 0) => -amp * Math.abs(Math.sin(Math.PI * (t / BEAT + phase)));
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};

// ---------------------------------------------------------------- rigging
function rig(g) {
  const ch = [...g.children];
  const arms = [];
  let last = -1;
  for (let i = 0; i < ch.length - 2; i++) {
    const a = ch[i], b = ch[i + 1], c = ch[i + 2];
    if (a.tagName === 'line' && b.tagName === 'line' && c.tagName === 'circle' &&
        a.getAttribute('x1') === b.getAttribute('x1') && a.getAttribute('y1') === b.getAttribute('y1')) {
      arms.push({ px: +a.getAttribute('x1'), py: +a.getAttribute('y1'), hy: +a.getAttribute('y2'), els: [a, b, c] });
      last = i + 2; i += 2;
    }
  }
  for (const arm of arms) {
    arm.g = el('g');
    g.insertBefore(arm.g, arm.els[0]);
    arm.els.forEach(e => arm.g.appendChild(e));
    arm.raised = arm.hy < arm.py - 40;
  }
  const headEls = ch.slice(last + 1).filter(e => e.tagName !== 'g');
  const body = ch.find(e => e.tagName === 'rect' && +e.getAttribute('width') >= 100);
  const neckY = body ? +body.getAttribute('y') : (arms[0] ? arms[0].py - 30 : 0);
  const head = el('g');
  if (headEls.length) { g.insertBefore(head, headEls[0]); headEls.forEach(e => head.appendChild(e)); }
  const mouthEls = headEls.filter(e => ['#8C2F39', '#F27D8B'].includes(e.getAttribute('fill')));
  let mouth = null, mouthY = 0;
  if (mouthEls.length) {
    mouth = el('g'); head.insertBefore(mouth, mouthEls[0]); mouthEls.forEach(e => mouth.appendChild(e));
    mouthY = +mouthEls[0].getAttribute('d').split(/\s+/)[2];
  }
  const held = ch.filter(e => e.tagName === 'g');
  return { g, base: g.getAttribute('transform'), arms, head, neckY, mouth, mouthY, held };
}

function pose(r, o = {}) {
  const { dx = 0, dy = 0, sx = 1, sy = 1, head = 0, arms = [], talk = -1 } = o;
  r.g.setAttribute('transform', `translate(${dx} ${dy}) ${r.base} scale(${sx} ${sy})`);
  r.head.setAttribute('transform', `rotate(${head} 0 ${r.neckY})`);
  r.arms.forEach((a, i) => a.g.setAttribute('transform', `rotate(${arms[i] || 0} ${a.px} ${a.py})`));
  if (r.mouth) {
    const s = talk < 0 ? 1 : 0.35 + 0.65 * Math.abs(Math.sin(Math.PI * 6.5 * talk));
    r.mouth.setAttribute('transform', `translate(0 ${r.mouthY}) scale(1 ${s}) translate(0 ${-r.mouthY})`);
  }
}
const talking = (t, a, b) => (t >= a && t <= b ? t - a : -1);
// wave every raised arm of a character
const waveArms = (r, t, amp, speed = 2, phase = 0) =>
  r.arms.map(a => (a.raised ? amp * Math.sin(2 * Math.PI * speed * t + phase) : 0));

// keep an element's own transform and add an animated one in front of / behind it
function fx(e) {
  if (e.__base === undefined) e.__base = e.getAttribute('transform') || '';
  return { set: (pre = '', post = '') => e.setAttribute('transform', `${pre} ${e.__base} ${post}`.trim()) };
}

// words laid out on one centred line, each in its own group so it can pop on its own
function wordLine(parent, words, y, size, stroke, strokeW, fill = '#fff') {
  const probe = el('text', { 'font-size': size, x: 0, y: -999 }, parent);
  const widths = words.map(w => { probe.textContent = w; return probe.getComputedTextLength(); });
  probe.textContent = 'a a'; const sp = probe.getComputedTextLength();
  probe.textContent = 'aa'; const space = sp - probe.getComputedTextLength();
  probe.remove();
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let x = W / 2 - total / 2;
  return words.map((w, i) => {
    const cx = x + widths[i] / 2; x += widths[i] + space;
    const g = el('g', {}, parent);
    el('text', { x: cx, y, 'text-anchor': 'middle', 'font-size': size, fill: stroke, stroke, 'stroke-width': strokeW, 'stroke-linejoin': 'round' }, g).textContent = w;
    el('text', { x: cx, y, 'text-anchor': 'middle', 'font-size': size, fill }, g).textContent = w;
    return { g, cx, cy: y - size * 0.32 };
  });
}
const popWord = (w, p) => {
  const s = p <= 0 ? 0 : back(p);
  w.g.setAttribute('transform', `translate(${w.cx} ${w.cy}) scale(${s}) translate(${-w.cx} ${-w.cy})`);
  w.g.setAttribute('opacity', p <= 0 ? 0 : 1);
};

// ---------------------------------------------------------------- timeline data
// Camera shots: [start, end, [x, y, w] at start, [x, y, w] at end]; height follows 16:9.
const FULL = [0, 0, 1920];
const SHOTS = {
  s1: [[0, 3, FULL, FULL]],
  s2: [[3, 5, FULL, [58, 32, 1804]],            // wide, slow push
       [5, 7, [120, 540, 960], [160, 540, 960]],  // close: toys on the carpet
       [7, 9.2, [470, 270, 1240], [500, 285, 1190]]], // medium: Ibu with the children
  s3: [[9, 11, FULL, [48, 40, 1824]],
       [11, 13, [590, 600, 760], [610, 615, 720]], // close: toy box
       [13, 14.2, [40, 30, 1840], FULL]],
  s4: [[13.8, 16, FULL, FULL],                   // static, as the storyboard asks
       [16, 18, [520, 370, 800], [545, 385, 750]], // close: hands at the sink
       [18, 20.1, [560, 235, 1300], [580, 245, 1270]]],
  s5: [[20, 21.5, FULL, [30, 17, 1860]],
       [21.5, 23, [470, 320, 980], [490, 332, 940]], // close: the children
       [23, 26.1, FULL, [56, 20, 1808]]],          // long final wide
  s6: [[26, 30, FULL, [30, 0, 1860]]],
};
// Scene visibility windows (seconds)
const VIS = { s1: [0, 3], s2: [3, 9], s3: [9, 14.14], s4: [13.86, 20], s5: [20, 26], s6: [26, 30.1] };

// Captions: short single lines, karaoke fill, one keyword echo.
const CAPS = [
  [3.6, 5.0, 'Amir, Sofia,'],
  [5.0, 7.0, 'masa untuk kemas mainan'],
  [7.0, 8.4, 'ya, sayang.'],
  [8.4, 9.0, 'Kemas!', true],
  [9.3, 11.0, 'Baik, ibu!'],
  [11.3, 13.8, 'Jom kemas sama-sama, abang!'],
  [14.3, 16.0, 'Sebelum makan,'],
  [16.0, 17.3, 'basuh tangan dulu.'],
  [17.6, 19.6, 'Baik, ayah!'],
  [20.3, 21.5, 'Terima kasih'],
  [21.5, 23.0, 'sebab dengar kata.'],
  [23.3, 25.7, 'Anak-anak yang baik!'],
];
const CAP = { size: 64, fill: '#FFFFFF', sung: '#FFD23F', stroke: '#16343A', strokeW: 10, baseline: 1080 - 90 - 14 };
const RING = ['#F2637E', '#FFD23F', '#3DAA6D', '#7CCBF2'];

// ---------------------------------------------------------------- setup
const S = {}; // per-scene handles
async function setup() {
  const files = {
    s1: '01-tajuk-tanpa-teks', s2: '02-ibu-minta-kemas', s3: '03-kemas-mainan',
    s4: '04-basuh-tangan', s5: '05-makan-bersama', s6: '06-penutup-tanpa-teks',
  };
  for (const id in files) {
    const txt = await (await fetch(`../footage/scenes/${files[id]}.svg`)).text();
    const host = document.getElementById(id);
    host.innerHTML = txt;
    const svg = host.querySelector('svg');
    const top = [...svg.children].find(e => e.tagName === 'g');
    S[id] = { host, svg, top, k: [...top.children] };
  }
  await document.fonts.load("800 64px 'Baloo 2'");
  await document.fonts.ready;

  // scene 1: title card
  { const s = S.s1;
    s.rays = el('g'); s.top.insertBefore(s.rays, s.k[1]); s.k.slice(1, 25).forEach(e => s.rays.appendChild(e));
    s.stars = s.k.slice(27, 31); s.hearts = s.k.slice(31, 33);
    s.amir = rig(s.k[33]); s.sofia = rig(s.k[34]);
    s.words = [...wordLine(s.top, ['Dengar', 'Kata'], 400, 200, '#C2410C', 40),
               ...wordLine(s.top, ['Ibu', 'Ayah'], 604, 200, '#C2410C', 40)]; }
  // scene 2: living room
  { const s = S.s2; s.amir = rig(s.k[129]); s.sofia = rig(s.k[130]); s.ibu = rig(s.k[131]);
    s.toys = [121, 122, 123, 124, 125, 126, 127].map(i => s.k[i]); }
  // scene 3: tidying up
  { const s = S.s3; s.box = s.k[121]; s.amir = rig(s.k[122]); s.sofia = rig(s.k[123]);
    const front = s.box.children[4];
    s.ball = s.box.children[3];
    s.block = s.amir.held[0]; s.car = s.sofia.held[0];
    s.box.insertBefore(s.block, front); s.box.insertBefore(s.car, front); // fly behind the box front
    s.ting = s.k[124]; s.sparks = [s.k[125], s.k[126]]; s.hearts = [s.k[127], s.k[128]]; }
  // scene 4: washing hands
  { const s = S.s4; s.ayah = rig(s.k[22]); s.sofia = rig(s.k[23]); s.amir = rig(s.k[24]);
    s.bubbles = []; for (let i = 36; i < 54; i += 2) s.bubbles.push([s.k[i], s.k[i + 1]]);
    s.water = el('g'); s.top.insertBefore(s.water, s.k[35]);
    s.drops = [0, 1, 2].map(() => el('rect', { x: 826, width: 8, height: 34, rx: 4, fill: '#fff', opacity: 0.8 }, s.water)); }
  // scene 5: dinner
  { const s = S.s5; s.ayah = rig(s.k[17]); s.amir = rig(s.k[18]); s.sofia = rig(s.k[19]); s.ibu = rig(s.k[20]);
    s.lamp = el('g'); s.top.insertBefore(s.lamp, s.k[11]); s.k.slice(11, 15).forEach(e => s.lamp.appendChild(e));
    s.steam = s.k.slice(32, 35); s.heart = s.k[39]; s.stars = [s.k[40], s.k[41]]; }
  // scene 6: closing card
  { const s = S.s6; s.ayah = rig(s.k[7]); s.ibu = rig(s.k[8]); s.amir = rig(s.k[9]); s.sofia = rig(s.k[10]);
    s.hearts = s.k.slice(11, 14); s.stars = s.k.slice(14, 16);
    s.words = [...wordLine(s.top, ['Dengar', 'kata', 'ibu', 'bapa,'], 170, 112, '#1F6F78', 22),
               ...wordLine(s.top, ['keluarga', 'bahagia!'], 284.24, 112, '#1F6F78', 22)]; }

  // overlays
  const fxs = document.getElementById('fx');
  S.rings = RING.map(c => el('path', { fill: c, 'fill-rule': 'evenodd' }, fxs));
  S.bubFill = el('rect', { width: W, height: H, fill: '#BDE8F7' }, fxs);
  S.bub = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) {
    const jx = ((i * 37 + j * 91) % 60) - 30, jy = ((i * 53 + j * 29) % 50) - 25;
    S.bub.push({ c: el('circle', { cx: 192 + 384 * i + jx, cy: 180 + 360 * j + jy, fill: '#BDE8F7', stroke: '#fff', 'stroke-width': 10 }, fxs),
                 row: j, k: (i * 3 + j * 5) % 7 });
  }
  S.white = el('rect', { width: W, height: H, fill: '#fff' }, fxs);
  const cap = document.getElementById('cap');
  S.capText = el('text', { x: W / 2, y: CAP.baseline, 'text-anchor': 'middle', 'font-size': CAP.size,
    stroke: CAP.stroke, 'stroke-width': CAP.strokeW, 'stroke-linejoin': 'round', 'paint-order': 'stroke' }, cap);
  S.capKey = '';
}

// ---------------------------------------------------------------- per-frame
function camera(id, t) {
  const shots = SHOTS[id];
  let sh = shots[0];
  for (const s of shots) if (t >= s[0]) sh = s;
  const p = prog(t, sh[0], sh[1]);
  const x = lerp(sh[2][0], sh[3][0], p), y = lerp(sh[2][1], sh[3][1], p), w = lerp(sh[2][2], sh[3][2], p);
  S[id].svg.setAttribute('viewBox', `${x} ${y} ${w} ${w * 9 / 16}`);
}
const twinkle = (e, t, k) => { const s = 0.75 + 0.35 * Math.sin(2 * Math.PI * (t * 1.1 + k * 0.37)); fx(e).set('', `scale(${s}) rotate(${20 * Math.sin(t * 2 + k)})`); };
const beatPulse = (e, t, k = 0) => { const s = 1 + 0.12 * Math.abs(Math.sin(Math.PI * (t / BEAT + k))); fx(e).set('', `scale(${s})`); };

function scene1(t) {
  const s = S.s1;
  s.rays.setAttribute('transform', `rotate(${6 * t} 960 620)`);
  const up = p => (1 - spring(p)) * 760;
  pose(s.amir, { dy: up(prog(t, 0, 0.6)) + hop(Math.max(0, t - 0.6), 14), arms: waveArms(s.amir, t, 14), head: 3 * Math.sin(2 * Math.PI * t) });
  pose(s.sofia, { dy: up(prog(t, 0.1, 0.7)) + hop(Math.max(0, t - 0.7), 14, 0.5), arms: waveArms(s.sofia, t, 14, 2, 1), head: -3 * Math.sin(2 * Math.PI * t) });
  [0.5, 1.0, 1.5, 2.0].forEach((t0, i) => popWord(s.words[i], prog(t, t0, t0 + 0.3)));
  s.stars.forEach((e, i) => twinkle(e, t, i));
  s.hearts.forEach((e, i) => beatPulse(e, t, i * 0.5));
}
function scene2(t) {
  const s = S.s2;
  const turn = eio(prog(t, 5.0, 5.4)); // children look up to Ibu
  pose(s.amir, { head: lerp(3 * Math.sin(2 * Math.PI * t / 1.0), 7, turn), dy: hop(t, 5) * (1 - turn) });
  pose(s.sofia, { head: lerp(3 * Math.sin(2 * Math.PI * t / 1.0 + 1.3), 7, turn), dy: hop(t, 5, 0.5) * (1 - turn) });
  const inP = eout(prog(t, 3.0, 4.0));
  pose(s.ibu, { dx: (1 - inP) * 760, dy: inP < 1 ? hop(t * 2, 10) : 0, head: 2.5 * Math.sin(2 * Math.PI * t / 1.6),
    arms: [3 * Math.sin(2 * Math.PI * t * 1.2), 0], talk: talking(t, 3.6, 8.4) });
  // toys knock on the beat
  s.toys.forEach((e, i) => { const k = pulse(t, 3.5 + ((i * 3) % 7) * 0.5, 0.3) + pulse(t, 5.0 + ((i * 2) % 4) * 0.5, 0.3) + pulse(t, 7 + (i % 3) * 0.5, 0.3);
    fx(e).set(`translate(0 ${-14 * k})`, `rotate(${6 * k * (i % 2 ? 1 : -1)})`); });
}
function scene3(t) {
  const s = S.s3;
  pose(s.amir, { dy: hop(t, 8), head: 3 * Math.sin(2 * Math.PI * t), talk: talking(t, 9.3, 11.0) });
  pose(s.sofia, { dy: hop(t, 8, 0.5), head: -3 * Math.sin(2 * Math.PI * t), talk: talking(t, 9.3, 13.8) >= 0 && !(t > 11.0 && t < 11.3) ? t : -1 });
  // toys fly into the box on an arc; coordinates are local to the box group
  const fly = (e, p, from, to, scl, flip) => {
    const q = eio(p), x = lerp(from[0], to[0], q), y = lerp(from[1], to[1], q) - 190 * Math.sin(Math.PI * q);
    const sc = scl * lerp(1, 0.8, q);
    e.setAttribute('transform', `translate(${x} ${y}) rotate(${360 * q * flip}) scale(${sc * flip} ${sc})`);
  };
  fly(s.block, prog(t, 11.05, 11.5), [-169, -290], [-20, -100], 1.08, 1);
  fly(s.car, prog(t, 11.55, 12.0), [144, -206], [40, -96], 0.62, -1);
  { const p = prog(t, 12.05, 12.5), y = lerp(-640, -150, p * p); // third toy drops in from above
    s.ball.setAttribute('transform', `translate(80 ${y}) rotate(${200 * (1 - p)})`);
    s.ball.setAttribute('opacity', t < 12.05 ? 0 : 1); }
  // 'ting' star above the box at each landing
  const k = pulse(t, 11.5, 0.42) + pulse(t, 12.0, 0.42) + pulse(t, 12.5, 0.42);
  s.ting.setAttribute('transform', `translate(960 ${700 - 30 * k}) scale(${1.9 * k}) rotate(${90 * k})`);
  s.sparks.forEach((e, i) => { const q = pulse(t, [11.55, 12.05][i], 0.4) + pulse(t, 12.55, 0.4); fx(e).set('', `scale(${1.6 * q})`); });
  s.hearts.forEach((e, i) => beatPulse(e, t, i * 0.5));
  // the box squashes a little on each landing
  const sq = 0.06 * k; fx(s.box).set('', `scale(${1 + sq} ${1 - sq})`);
}
function scene4(t) {
  const s = S.s4;
  const scrub = 7 * Math.sin(2 * Math.PI * t / 0.4); // 12-frame cycle
  const nod = 9 * (pulse(t, 18.0, 0.4) + pulse(t, 18.5, 0.4));
  pose(s.ayah, { head: nod + 1.5 * Math.sin(2 * Math.PI * t / 2), arms: [2 * Math.sin(2 * Math.PI * t), 0], talk: talking(t, 14.3, 17.3) });
  pose(s.sofia, { arms: [scrub, -scrub], head: 3 * Math.sin(2 * Math.PI * t), dy: hop(t, 4) });
  pose(s.amir, { arms: [-scrub, scrub], head: -3 * Math.sin(2 * Math.PI * t), dy: hop(t, 4, 0.5), talk: talking(t, 17.6, 19.6) });
  s.drops.forEach((d, i) => d.setAttribute('y', 444 + ((t * 300 + i * 50) % 150) * 0.78));
  s.bubbles.forEach(([b, hl], i) => {
    const period = 2.4 + (i % 3) * 0.5, ph = (t / period + i * 0.31) % 1;
    const dy = -150 * ph, dxx = 14 * Math.sin(2 * Math.PI * (ph * 1.5 + i * 0.2));
    const sc = ph > 0.9 ? 1 + (ph - 0.9) * 5 : 0.6 + 0.4 * Math.min(1, ph * 5), op = ph > 0.9 ? 1 - (ph - 0.9) * 10 : 1;
    for (const e of [b, hl]) {
      const cx = +b.getAttribute('cx'), cy = +b.getAttribute('cy');
      e.setAttribute('transform', `translate(${dxx} ${dy}) translate(${cx} ${cy}) scale(${sc}) translate(${-cx} ${-cy})`);
      e.setAttribute('opacity', op);
    }
  });
}
function scene5(t) {
  const s = S.s5;
  const proud = eout(prog(t, 23.0, 23.4));
  pose(s.ibu, { head: 2.5 * Math.sin(2 * Math.PI * t / 1.5), talk: talking(t, 20.3, 23.0) });
  pose(s.ayah, { head: 2 * Math.sin(2 * Math.PI * t / 1.5 + 1), arms: s.ayah.arms.map(a => (a.raised ? 10 * proud * Math.sin(2 * Math.PI * 2 * t) : 0)), talk: talking(t, 23.3, 25.7) });
  const joy = t >= 21.5 ? 12 : 5;
  pose(s.amir, { dy: hop(t, joy), head: 3 * Math.sin(2 * Math.PI * t) });
  pose(s.sofia, { dy: hop(t, joy, 0.5), head: -3 * Math.sin(2 * Math.PI * t) });
  s.lamp.setAttribute('transform', `rotate(${2 * Math.sin(2 * Math.PI * t / 3)} 960 0)`);
  s.steam.forEach((e, i) => { const ph = (t / 1.8 + i * 0.33) % 1;
    e.setAttribute('transform', `translate(${8 * Math.sin(2 * Math.PI * (ph + i * 0.3))} ${-46 * ph})`);
    e.setAttribute('opacity', 0.85 * Math.sin(Math.PI * ph)); });
  { const p = prog(t, 23.0, 23.45), sc = p <= 0 ? 0 : back(p) * (1 + 0.1 * Math.abs(Math.sin(Math.PI * t / BEAT)));
    s.heart.setAttribute('transform', `translate(960 ${330 - 30 * eout(prog(t, 23, 26))}) scale(${sc})`); }
  s.stars.forEach((e, i) => twinkle(e, t, i));
}
function scene6(t) {
  const s = S.s6;
  [s.ayah, s.ibu, s.amir, s.sofia].forEach((r, i) => pose(r, {
    arms: waveArms(r, t, 15, 2, i * 0.8), head: 2.5 * Math.sin(2 * Math.PI * t + i),
    dy: i >= 2 ? hop(t, 10, i * 0.5) : 0, talk: talking(t, 26.3, 29.7) }));
  s.words.forEach((w, i) => { const t0 = 26.33 + i * (1.67 - 0.3) / 5; popWord(w, prog(t, t0, t0 + 0.3)); });
  s.hearts.forEach((e, i) => { const ph = (t / 3 + i * 0.4) % 1;
    fx(e).set(`translate(${14 * Math.sin(2 * Math.PI * ph)} ${-70 * ph})`, `scale(${1 + 0.1 * Math.sin(2 * Math.PI * t * 2)})`);
    e.setAttribute('opacity', ph > 0.8 ? (1 - ph) * 5 : 1); });
  s.stars.forEach((e, i) => twinkle(e, t, i));
}

// bookend wipe: coloured rings close over the old scene, then open on the new one
function ringWipe(t) {
  const R = 1160, cx = W / 2, cy = H / 2;
  const hole = r => `M0 0H${W}V${H}H0Z M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  const disc = r => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  let d = RING.map(() => '');
  for (const tc of [3.0, 26.0]) {
    if (t >= tc - 0.4 && t < tc) d = RING.map((_, i) => { const r = R * eio(prog(t, tc - 0.4 + i * 0.06, tc - 0.18 + i * 0.06)); return r > 0 ? disc(r) : ''; });
    else if (t >= tc && t < tc + 0.4) d = RING.map((_, i) => { const r = R * eio(prog(t, tc + (3 - i) * 0.06, tc + 0.22 + (3 - i) * 0.06)); return r >= R ? '' : hole(Math.max(r, 0.01)); });
  }
  S.rings.forEach((p, i) => p.setAttribute('d', d[i]));
}
// bubble wipe: bubbles swell to a flat colour, hold, then pop away
function bubbleWipe(t) {
  const tc = 20.0, Rm = 340;
  const cover = t >= 19.55 && t < tc - 0.03, hold = t >= tc - 0.03 && t < tc + 0.07, open = t >= tc + 0.07 && t < tc + 0.42;
  S.bubFill.setAttribute('opacity', hold ? 1 : 0);
  S.bub.forEach(b => {
    let r = 0;
    if (cover) { const st = 19.55 + (2 - b.row) * 0.05 + b.k * 0.012; r = Rm * eout(prog(t, st, st + 0.24)); }
    else if (hold) r = Rm;
    else if (open) { const st = tc + 0.07 + b.row * 0.04 + b.k * 0.012; r = Rm * (1 - eio(prog(t, st, st + 0.2))); }
    b.c.setAttribute('r', r); b.c.setAttribute('opacity', r > 0 ? 1 : 0);
  });
}

function caption(t) {
  const c = CAPS.find(c => t >= c[0] && t < c[1]);
  const node = S.capText;
  if (!c) { if (S.capKey) { node.textContent = ''; S.capKey = ''; } return; }
  const [a, b, text, echo] = c;
  if (S.capKey !== text) {
    node.textContent = '';
    [...text].forEach(chr => { el('tspan', {}, node).textContent = chr; });
    S.capKey = text;
  }
  const n = Math.floor(prog(t, a + 0.05, echo ? a + 0.4 : b - 0.2) * text.length + 1e-6);
  [...node.children].forEach((ts, i) => ts.setAttribute('fill', i < n ? CAP.sung : CAP.fill));
  const s = echo ? 1.25 * (0.6 + 0.4 * back(prog(t, a, a + 0.2))) : 1; // the echo word is larger and pops
  node.setAttribute('transform', `translate(${W / 2} ${CAP.baseline}) scale(${s}) translate(${-W / 2} ${-CAP.baseline})`);
}

const SCENE_FN = { s1: scene1, s2: scene2, s3: scene3, s4: scene4, s5: scene5, s6: scene6 };
window.renderFrame = function (f) {
  const t = f / FPS;
  for (const id in VIS) {
    const on = t >= VIS[id][0] && t < VIS[id][1];
    S[id].host.style.display = on ? 'block' : 'none';
    S[id].host.style.transform = '';
    if (on) { camera(id, t); SCENE_FN[id](t); }
  }
  // fast push from scene 3 to scene 4 (location change)
  if (t >= 13.86 && t < 14.14) {
    const p = eio(prog(t, 13.86, 14.14));
    S.s3.host.style.transform = `translateX(${-W * p}px)`;
    S.s4.host.style.transform = `translateX(${W * (1 - p)}px)`;
  }
  ringWipe(t); bubbleWipe(t); caption(t);
  S.white.setAttribute('opacity', prog(t, 29.5, 29.97));
  return t;
};
window.ready = setup().then(() => { window.renderFrame(0); return true; });
