/* Rajah Fasa: Air & CO₂ — enjin animasi berasaskan frame.
 *
 * Setiap scene ialah fail SVG asal dari footage/scenes. Elemen dicapai melalui
 * indeks anak (lihat `at`) dan digerakkan sebagai fungsi tulen nombor frame,
 * jadi `renderFrame(f)` boleh dipanggil dalam apa-apa turutan (render luar talian
 * atau pratonton masa nyata).
 */
'use strict';

const FPS = 30, TOTAL = 1350;
const NS = 'http://www.w3.org/2000/svg';
const SCENE_FILES = [
  '01-tajuk', '02-apa-itu-rajah-fasa', '03-rajah-fasa-air', '04-istimewanya-air',
  '05-rajah-fasa-co2', '06-ais-kering', '07-perbandingan',
];
const START = [0, 120, 300, 540, 780, 990, 1200, 1350];

// ---------- matematik ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (f, a, b) => clamp((f - a) / (b - a));
const outCubic = t => 1 - Math.pow(1 - t, 3);
const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const TAU = Math.PI * 2;
/** Skala pop-in 0 → 1.1 → 1. */
function popScale(f, start, dur = 20) {
  const p = prog(f, start, start + dur);
  if (p <= 0) return 0;
  return p < 0.6 ? 1.1 * outCubic(p / 0.6) : 1.1 - 0.1 * inOut((p - 0.6) / 0.4);
}
/** Denyut sekali: 0 → 1 → 0. */
const bump = (f, start, dur) => Math.sin(Math.PI * prog(f, start, start + dur));

// ---------- pembantu SVG ----------
function at(svg, path) {
  let e = svg.children[1];
  for (const i of String(path).split('.')) e = e && e.children[+i];
  if (!e) throw new Error(`Elemen ${path} tiada dalam ${svg.dataset.name}`);
  return e;
}
/** Balut elemen dalam <g> supaya boleh digerakkan tanpa mengusik transform asal. */
function wrap(els, origin) {
  els = [].concat(els);
  const g = document.createElementNS(NS, 'g');
  els[0].parentNode.insertBefore(g, els[0]);
  els.forEach(e => g.appendChild(e));
  if (origin) g._o = origin;
  else { const b = g.getBBox(); g._o = [b.x + b.width / 2, b.y + b.height / 2]; }
  return g;
}
function T(g, o) {
  const { x = 0, y = 0, s = 1, r = 0 } = o;
  const sx = o.sx ?? s, sy = o.sy ?? s, [cx, cy] = g._o;
  const hidden = sx === 0 || sy === 0 || o.o === 0;
  g.style.visibility = hidden ? 'hidden' : '';
  if (hidden) return;
  g.setAttribute('transform',
    `translate(${x + cx} ${y + cy}) rotate(${r}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
  g.style.opacity = o.o ?? 1;
}
function fade(el, o) { el.style.opacity = o; el.style.visibility = o <= 0 ? 'hidden' : ''; }
const pop = (g, f, start, dur = 16) => T(g, { s: popScale(f, start, dur) });
const fadeIn = (el, f, start, dur = 10) => fade(el, prog(f, start, start + dur));

/** Lukisan strok untuk laluan pejal. reverse = lukis dari hujung ke pangkal. */
function drawable(path, reverse = false) { path._L = path.getTotalLength(); path._rev = reverse; return path; }
function draw(path, p) {
  const L = path._L;
  path.style.visibility = p <= 0 ? 'hidden' : '';
  path.style.strokeDasharray = `${L} ${L}`;
  path.style.strokeDashoffset = (path._rev ? -1 : 1) * L * (1 - p);
}
/** Garis lurus putus-putus "M x1 y1 L x2 y2": panjangkan titik hujung. */
function growable(path) {
  const n = path.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
  path._seg = n; return path;
}
function grow(path, p) {
  const [x1, y1, x2, y2] = path._seg;
  path.style.visibility = p <= 0 ? 'hidden' : '';
  path.setAttribute('d', `M ${x1} ${y1} L ${x1 + (x2 - x1) * p} ${y1 + (y2 - y1) * p}`);
}
function lerpColor(a, b, t) {
  const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

// ---------- watak ----------
let MOUTH_TEMPLATE = null;
function rigChar(g, phase) {
  const feet = g.getAttribute('transform').match(/translate\(([\d.]+) ([\d.]+)\)/).slice(1).map(Number);
  const kids = [...g.children];
  const c = { phase, arms: [] };

  const lines = kids.filter(k => k.tagName === 'line');
  for (let i = 0; i < lines.length; i += 2) {
    const skin = lines[i], sleeve = lines[i + 1], hand = sleeve.nextElementSibling;
    const pivot = [+skin.getAttribute('x1'), +skin.getAttribute('y1')];
    const raised = +skin.getAttribute('y2') < pivot[1] - 20;
    const dir = Math.sign(+skin.getAttribute('x2') - pivot[0]);
    c.arms.push({ g: wrap([skin, sleeve, hand], pivot), raised, dir });
  }

  const earIdx = kids.findIndex(k => k.getAttribute('fill') === '#E9B184');
  const headKids = kids.slice(earIdx);
  c.head = wrap(headKids, [0, -228]);

  c.eyes = headKids
    .filter(k => k.tagName === 'ellipse' && k.getAttribute('fill') === '#3A2A22')
    .map(e => wrap([e, e.nextElementSibling], [+e.getAttribute('cx'), +e.getAttribute('cy')]));

  let open = headKids.filter(k => ['#8C2F39', '#F27D8B'].includes(k.getAttribute('fill')));
  c.smile = headKids.find(k => k.tagName === 'path' && k.getAttribute('stroke-width') === '6') || null;
  if (open.length) {
    if (!MOUTH_TEMPLATE) MOUTH_TEMPLATE = open.map(e => e.cloneNode(true));
  } else {
    open = MOUTH_TEMPLATE.map(e => e.cloneNode(true));
    open.forEach(e => c.head.appendChild(e));
  }
  c.mouth = wrap(open, [0, -274]);
  c.body = wrap(g, feet);
  return c;
}
function animChar(c, f, o) {
  const { talking = false, wave = 5, period = 36, y = 0 } = o;
  const ph = c.phase;
  const hop = talking ? -7 * Math.abs(Math.sin(f * 0.21 + ph)) : 0;
  T(c.body, { y: y + hop, sy: 1 + 0.008 * Math.sin(f * 0.12 + ph) });
  T(c.head, { r: talking ? 2.6 * Math.sin(f * 0.27 + ph) : 1.1 * Math.sin(f * 0.07 + ph) });
  for (const a of c.arms) {
    const amp = a.raised ? wave * (talking ? 1.3 : 1) : 1.5;
    T(a.g, { r: amp * Math.sin(f * TAU / (a.raised ? period : 50) + ph) * (a.dir || 1) });
  }
  const blink = ((f + Math.round(ph * 23)) % 78) < 3;
  for (const e of c.eyes) T(e, { sy: blink ? 0.12 : 1 });
  if (talking) {
    const syl = 0.25 + 0.85 * Math.abs(Math.sin(f * 0.85 + ph)) * (0.65 + 0.35 * Math.sin(f * 0.31));
    T(c.mouth, { sy: syl, sx: 1.04 - 0.1 * syl });
    if (c.smile) c.smile.style.visibility = 'hidden';
  } else if (c.smile) {
    T(c.mouth, { o: 0 });
    c.smile.style.visibility = '';
  } else {
    T(c.mouth, {});
  }
}
function findChars(svg) {
  const root = svg.children[1];
  const by = x => [...root.children].find(k => (k.getAttribute('transform') || '').startsWith(`translate(${x} 1850)`));
  return [by(215), by(865)];
}

// ---------- scene ----------
function scene1(svg) {
  const rays = Array.from({ length: 20 }, (_, i) => at(svg, i + 1));
  const [t1, t2] = [at(svg, 22), at(svg, 23)];
  const icons = [24, 25, 26].map(i => at(svg, i));
  const arrows = [[27, 28], [29, 30]].map(p => p.map(i => at(svg, i)));
  const labels = [31, 32, 33].map(i => at(svg, i));
  const sparks = [34, 35, 36, 37].map(i => at(svg, i));

  const rayG = wrap(rays, [540, 900]);
  const tG = [wrap(t1), wrap(t2)];
  const iconG = icons.map(e => wrap(e));
  const arrowG = arrows.map(p => wrap(p));
  const labelG = labels.map(e => wrap(e));
  const sparkG = sparks.map(e => wrap(e));
  const times = [40, 55, 70];
  return f => {
    T(rayG, { r: 6 * f / FPS });
    T(tG[0], { s: popScale(f, 5, 20) });
    T(tG[1], { s: popScale(f, 10, 20) });
    iconG.forEach((g, i) => {
      T(g, { s: popScale(f, times[i], 14), y: -6 * Math.sin((f - times[i]) * 0.11) * prog(f, times[i] + 14, times[i] + 30) });
      T(labelG[i], { s: popScale(f, times[i] + 4, 12) });
    });
    arrowG.forEach((g, i) => {
      const p = outCubic(prog(f, times[i + 1] - 6, times[i + 1] + 2));
      T(g, { x: -30 * (1 - p), o: p });
    });
    sparkG.forEach((g, i) => T(g, {
      s: popScale(f, 22 + i * 5, 12) * (1 + 0.28 * Math.sin(f * 0.22 + i * 1.7)), r: 12 * Math.sin(f * 0.1 + i),
    }));
  };
}

function scene2(svg) {
  const titles = [at(svg, 114), at(svg, 115)];
  const c = '116.';
  const polys = [2, 3, 4].map(i => at(svg, c + i));
  const sc = at(svg, c + 5);
  const curves = [6, 7, 8].map(i => at(svg, c + i));
  const axes = at(svg, c + 9), heads = at(svg, c + 10);
  const axLabels = [at(svg, c + 11), at(svg, c + 12)];
  const labels = [13, 14, 15].map(i => at(svg, c + i));
  const icons = [16, 17, 18].map(i => at(svg, c + i));

  const titleG = titles.map(e => wrap(e));
  drawable(axes); drawable(curves[0], true); drawable(curves[1]); drawable(curves[2]);
  const labelG = labels.map(e => wrap(e)), iconG = icons.map(e => wrap(e));
  const times = [160, 185, 210];
  return f => {
    titleG.forEach((g, i) => T(g, { s: 0.85 + 0.15 * outBack(prog(f, 116 + i * 3, 130 + i * 3)) }));
    draw(axes, inOut(prog(f, 120, 150)));
    fadeIn(heads, f, 146, 6);
    axLabels.forEach(l => fadeIn(l, f, 146, 10));
    curves.forEach(cv => draw(cv, inOut(prog(f, 150, 172))));
    polys.forEach((p, i) => {
      fadeIn(p, f, times[i], 12);
      pop(iconG[i], f, times[i] + 2, 14);
      pop(labelG[i], f, times[i] + 5, 14);
    });
    fadeIn(sc, f, times[2], 12);
  };
}

function scene3(svg) {
  const title = at(svg, 114);
  const c = '115.';
  const atm = at(svg, c + 6), atmLbl = at(svg, c + 7);
  const pts = [[18, 19, 20, 24], [21, 22, 23, 25]].map(a => a.map(i => at(svg, c + i)));
  const s = '118.';
  const ice = at(svg, s + 0), ar1 = [at(svg, s + 1), at(svg, s + 2)], drop = at(svg, s + 3);
  const ar2 = [at(svg, s + 4), at(svg, s + 5)], steam = at(svg, s + 6);
  const tl = [at(svg, 119), at(svg, 120)];

  const titleG = wrap(title);
  growable(atm);
  const P = pts.map(([line, dot, lbl, name]) => ({ line: growable(line), dot: wrap(dot), lbl: wrap(lbl), name: wrap(name) }));
  const strip = { ice: wrap(ice), ar1: wrap(ar1), drop: wrap(drop), ar2: wrap(ar2), steam: wrap(steam), t: tl.map(e => wrap(e)) };
  const lit = (g, f, start) => T(g, { o: 0.22 + 0.78 * prog(f, start, start + 8), s: 1 + 0.28 * bump(f, start, 16) });
  const tm = [400, 450];
  return f => {
    T(titleG, { s: 0.85 + 0.15 * outBack(prog(f, 300, 314)) });
    grow(atm, inOut(prog(f, 330, 380)));
    fadeIn(atmLbl, f, 326, 8);
    P.forEach((p, i) => {
      pop(p.dot, f, tm[i], 14);
      grow(p.line, outCubic(prog(f, tm[i] + 4, tm[i] + 18)));
      pop(p.lbl, f, tm[i] + 14, 12);
      pop(p.name, f, tm[i] + 6, 12);
    });
    lit(strip.ice, f, 380);
    lit(strip.ar1, f, 400); lit(strip.drop, f, 404); pop(strip.t[0], f, 400, 12);
    lit(strip.ar2, f, 450); lit(strip.steam, f, 454); pop(strip.t[1], f, 450, 12);
  };
}

function scene4(svg) {
  const c = '115.';
  const melt = at(svg, c + 8), ring = at(svg, c + 16), dot = at(svg, c + 17);
  const ttLbl = [at(svg, c + 18), at(svg, c + 19)];
  const crit = at(svg, c + 20), critLbl = [at(svg, c + 21), at(svg, c + 22)];
  const meltLbl = [at(svg, c + 23), at(svg, c + 24)];
  const glass = at(svg, 118), ice = at(svg, '118.2'), glassLbl = at(svg, 119);

  const ringG = wrap(ring, [400, 560]), dotG = wrap(dot), critG = wrap(crit);
  const meltLblG = wrap(meltLbl);
  const iceG = wrap(ice), glassG = wrap([glass, glassLbl]);
  glassG._o = [540, 1700];
  return f => {
    const hl = inOut(prog(f, 650, 662));
    melt.setAttribute('stroke', lerpColor('#16343A', '#F2542D', hl));
    melt.setAttribute('stroke-width', 9 + 6 * hl + 5 * bump(f, 650, 22));
    T(ringG, { s: popScale(f, 545, 14) * (1 + 0.1 * Math.sin(f * 0.2)), r: 360 * 1.6 * outCubic(prog(f, 545, 640)) });
    T(dotG, { s: popScale(f, 545, 14) * (1 + 0.12 * bump(f, 560, 20)) });
    ttLbl.forEach((l, i) => fadeIn(l, f, 556 + i * 6, 10));
    pop(critG, f, 600, 14);
    critLbl.forEach((l, i) => fadeIn(l, f, 600 + i * 5, 12));
    T(meltLblG, { s: popScale(f, 656, 14) });
    T(glassG, { s: popScale(f, 684, 18) });
    T(iceG, { y: 6 * Math.sin((f - 684) * TAU / 50), r: 4 * Math.sin((f - 684) * TAU / 70) });
  };
}

function scene5(svg) {
  const title = at(svg, 114);
  const c = '115.';
  const polys = [2, 3, 4].map(i => at(svg, c + i)), sc = at(svg, c + 5);
  const atm = at(svg, c + 6), atmLbl = at(svg, c + 7);
  const curves = [8, 9, 10].map(i => at(svg, c + i));
  const axes = at(svg, c + 11), heads = at(svg, c + 12);
  const axLabels = [at(svg, c + 13), at(svg, c + 14)];
  const labels = [15, 16, 17].map(i => at(svg, c + i));
  const ring = at(svg, c + 18), dot = at(svg, c + 19);
  const l511 = at(svg, c + 20), l511Lbl = at(svg, c + 21);
  const ttLbl = [at(svg, c + 22), at(svg, c + 23)];
  const crit = at(svg, c + 24), critLbl = [at(svg, c + 25), at(svg, c + 26)];

  const titleG = wrap(title);
  drawable(axes); drawable(curves[0], true); drawable(curves[1]); drawable(curves[2]);
  growable(atm); growable(l511);
  const labelG = labels.map(e => wrap(e));
  const ringG = wrap(ring, [430, 470]), dotG = wrap(dot), critG = wrap(crit), l511G = wrap(l511Lbl);
  return f => {
    T(titleG, { s: 0.85 + 0.15 * outBack(prog(f, 780, 794)) });
    draw(axes, inOut(prog(f, 780, 796)));
    fadeIn(heads, f, 793, 5);
    axLabels.forEach(l => fadeIn(l, f, 793, 8));
    curves.forEach(cv => draw(cv, inOut(prog(f, 794, 812))));
    polys.forEach((p, i) => { fadeIn(p, f, 800 + i * 5, 10); pop(labelG[i], f, 804 + i * 5, 12); });
    fadeIn(sc, f, 810, 10);
    grow(l511, inOut(prog(f, 850, 870)));
    T(l511G, { s: popScale(f, 850, 12) });
    T(dotG, { s: popScale(f, 868, 14) });
    T(ringG, { s: popScale(f, 870, 14) * (1 + 0.1 * Math.sin(f * 0.2)), r: (f - 870) * 2.2 });
    ttLbl.forEach((l, i) => fadeIn(l, f, 874 + i * 6, 10));
    grow(atm, inOut(prog(f, 900, 930)));
    fadeIn(atmLbl, f, 898, 8);
    pop(critG, f, 940, 14);
    critLbl.forEach((l, i) => fadeIn(l, f, 940 + i * 5, 12));
  };
}

function scene6(svg) {
  const titles = [at(svg, 114), at(svg, 115)];
  const c = '116.';
  const dropLine = at(svg, c + 18), tLbl = at(svg, c + 19);
  const shaft = at(svg, c + 20), head = at(svg, c + 21), dot = at(svg, c + 22), pem = at(svg, c + 23);
  const fogLow = [0, 1, 2, 8, 9].map(i => at(svg, '119.' + i));
  const fogHigh = [3, 4, 5].map(i => at(svg, '119.' + i));
  const block = [at(svg, '119.6'), at(svg, '119.7')];

  const titleG = wrap(titles);
  growable(dropLine); growable(shaft);
  const headG = wrap(head), dotG = wrap(dot), tLblG = wrap(tLbl), pemG = wrap(pem);
  const lowG = fogLow.map(e => wrap(e)), highG = fogHigh.map(e => wrap(e));
  const blockG = wrap(block);
  const [x1, , x2] = shaft._seg;
  return f => {
    T(titleG, { s: 1 + 0.06 * bump(f, 990, 14) });
    const p = inOut(prog(f, 1000, 1060));
    grow(shaft, p);
    T(headG, { x: (x2 - x1) * (p - 1), o: p > 0 ? 1 : 0, s: 1 + 0.2 * bump(f, 1056, 14) });
    T(dotG, { s: popScale(f, 1024, 14) });
    T(pemG, { s: popScale(f, 1062, 14) });
    grow(dropLine, outCubic(prog(f, 1088, 1098)));
    T(tLblG, { s: popScale(f, 1096, 16) * (1 + 0.1 * bump(f, 1125, 24)) });
    // Kabus: kitaran 60 frame, mengembang dan naik berterusan.
    lowG.forEach((g, i) => {
      const t = (f / 60 + i * 0.21) % 1;
      T(g, { s: 1 + 0.1 * Math.sin(t * TAU), x: 14 * Math.sin(t * TAU + i), o: 0.85 + 0.15 * Math.sin(t * TAU + i * 2) });
    });
    highG.forEach((g, i) => {
      const t = (f / 60 + i / 3) % 1;
      T(g, { y: 40 - 110 * t, s: 0.6 + 0.8 * t, x: 12 * Math.sin(t * TAU + i * 2), o: Math.sin(Math.PI * t) });
    });
    T(blockG, { r: 1.2 * Math.sin(f * 0.15), y: 1.5 * Math.sin(f * 0.3) });
  };
}

function scene7(svg) {
  const cardA = at(svg, 115), cardB = at(svg, 119);
  const arA = [at(svg, '115.12'), at(svg, '115.13')], arB = [at(svg, '119.12'), at(svg, '119.13')];
  const txtA = [116, 117, 118, 123].map(i => at(svg, i)), txtB = [120, 121, 122, 124].map(i => at(svg, i));
  const closing = [at(svg, 125), at(svg, 126)];
  const heart = at(svg, 127), sparks = [at(svg, 128), at(svg, 129)];

  const arAG = wrap(arA), arBG = wrap(arB);
  const cardAG = wrap(cardA), cardBG = wrap(cardB);
  const txtAG = txtA.map(e => wrap(e)), txtBG = txtB.map(e => wrap(e));
  const heartG = wrap(heart), sparkG = sparks.map(e => wrap(e));

  // Pecahkan teks penutup kepada perkataan; lapisan garis luar di bawah, isian di atas.
  const strokeLayer = document.createElementNS(NS, 'g'), fillLayer = document.createElementNS(NS, 'g');
  closing[0].parentNode.insertBefore(strokeLayer, closing[0]);
  closing[0].parentNode.insertBefore(fillLayer, closing[0]);
  const words = [];
  for (const el of closing) {
    const str = el.textContent;
    for (const m of str.matchAll(/\S+/g)) {
      const x = el.getStartPositionOfChar(m.index).x;
      const mk = (layer, stroked) => {
        const t = el.cloneNode(false);
        t.textContent = m[0];
        t.setAttribute('text-anchor', 'start'); t.setAttribute('x', x);
        if (!stroked) t.removeAttribute('stroke');
        layer.appendChild(t);
        return wrap(t);
      };
      words.push([mk(strokeLayer, true), mk(fillLayer, false)]);
    }
    el.remove();
  }
  return f => {
    const pA = outBack(prog(f, 1200, 1220)), pB = outBack(prog(f, 1200, 1220));
    T(cardAG, { x: -620 * (1 - pA) });
    T(cardBG, { x: 620 * (1 - pB) });
    txtAG.forEach((g, i) => T(g, { s: popScale(f, 1218 + i * 5, 12) }));
    txtBG.forEach((g, i) => T(g, { s: popScale(f, 1222 + i * 5, 12) }));
    const blink = 0.55 + 0.45 * Math.cos((f - 1220) * TAU / 20);
    const nudge = 16 * (0.5 - 0.5 * Math.cos((f - 1220) * TAU / 20));
    T(arAG, { x: -nudge, o: f < 1220 ? 1 : blink });
    T(arBG, { x: nudge, o: f < 1220 ? 1 : blink });
    words.forEach((pair, i) => {
      const s = popScale(f, 1280 + i * 8, 12);
      pair.forEach(g => T(g, { s, y: -4 * Math.sin((f - 1280 - i * 8) * 0.16) * prog(f, 1295 + i * 8, 1310 + i * 8) }));
    });
    T(heartG, { s: popScale(f, 1226, 14) * (1 + 0.12 * Math.abs(Math.sin(f * TAU / 34))) });
    sparkG.forEach((g, i) => T(g, { s: popScale(f, 1230 + i * 6, 12) * (1 + 0.3 * Math.sin(f * 0.22 + i * 2)), r: 14 * Math.sin(f * 0.1 + i) }));
  };
}
const SCENE_SETUP = [scene1, scene2, scene3, scene4, scene5, scene6, scene7];

// ---------- sarikata ----------
const SUB = { size: 60, stroke: 20, maxW: 840, lineH: 72, mid: 1225 };
function subFill(textEl, str) {
  textEl.textContent = '';
  str.split('₂').forEach((part, i) => {
    if (i > 0) {
      const sub = document.createElementNS(NS, 'tspan');
      sub.setAttribute('dy', SUB.size * 0.2); sub.setAttribute('font-size', SUB.size * 0.62);
      sub.textContent = '2';
      textEl.appendChild(sub);
      const rest = document.createElementNS(NS, 'tspan');
      rest.setAttribute('dy', -SUB.size * 0.2);
      rest.textContent = part || '​';
      textEl.appendChild(rest);
    } else textEl.appendChild(document.createTextNode(part));
  });
}
function subText(parent) {
  const t = document.createElementNS(NS, 'text');
  const a = { 'font-family': "'Baloo 2', sans-serif", 'font-weight': 800, 'font-size': SUB.size, fill: '#FFFFFF',
    stroke: '#16343A', 'stroke-width': SUB.stroke, 'stroke-linejoin': 'round', 'paint-order': 'stroke', 'text-anchor': 'middle', x: 540 };
  for (const k in a) t.setAttribute(k, a[k]);
  parent.appendChild(t);
  return t;
}
function buildSubtitles(svg, dialogs) {
  const meas = subText(svg); meas.style.visibility = 'hidden';
  const width = ws => { subFill(meas, ws.join(' ')); return meas.getComputedTextLength(); };
  const greedy = ws => {
    const lines = []; let cur = [];
    for (const w of ws) { if (cur.length && width([...cur, w]) > SUB.maxW) { lines.push(cur); cur = []; } cur.push(w); }
    if (cur.length) lines.push(cur);
    return lines;
  };
  const balance = ws => {
    if (width(ws) <= SUB.maxW) return [ws];
    let best = null;
    for (let k = 1; k < ws.length; k++) {
      const a = width(ws.slice(0, k)), b = width(ws.slice(k));
      if (a > SUB.maxW || b > SUB.maxW) continue;
      const cost = Math.abs(a - b) + (/[,.]$/.test(ws[k - 1]) ? -60 : 0);
      if (!best || cost < best.cost) best = { cost, k };
    }
    return best ? [ws.slice(0, best.k), ws.slice(best.k)] : greedy(ws).slice(0, 2);
  };
  const split = (ws, n) => {
    const total = ws.join(' ').length, chunks = []; let from = 0;
    for (let p = 1; p < n; p++) {
      const target = total * p / n; let best = null, acc = ws.slice(0, from).join(' ').length;
      for (let k = from + 1; k < ws.length; k++) {
        acc += ws[k - 1].length + 1;
        const cost = Math.abs(acc - target) - (/,$/.test(ws[k - 1]) ? 10 : 0);
        if (!best || cost < best.cost) best = { cost, k };
      }
      chunks.push(ws.slice(from, best.k)); from = best.k;
    }
    chunks.push(ws.slice(from));
    return chunks;
  };
  const pages = [];
  for (const d of dialogs) {
    const ws = d.teks.split(/\s+/);
    let n = Math.ceil(greedy(ws).length / 2), chunks;
    for (;; n++) { chunks = split(ws, n); if (chunks.every(ch => greedy(ch).length <= 2)) break; }
    const total = chunks.reduce((a, ch) => a + ch.join(' ').length, 0);
    let t = d.mula;
    for (const ch of chunks) {
      const dur = (d.tamat - d.mula) * ch.join(' ').length / total;
      const g = document.createElementNS(NS, 'g');
      svg.appendChild(g);
      const lines = balance(ch);
      lines.forEach((ln, i) => {
        const el = subText(g);
        el.setAttribute('y', SUB.mid + 20 + (i - (lines.length - 1) / 2) * SUB.lineH);
        subFill(el, ln.join(' '));
      });
      g._o = [540, SUB.mid];
      pages.push({ g, f0: Math.round(t * FPS), f1: Math.round((t + dur) * FPS) });
      t += dur;
    }
  }
  meas.remove();
  return f => {
    for (const p of pages) {
      const inn = prog(f, p.f0, p.f0 + 4), out = 1 - prog(f, p.f1 - 2, p.f1 + 1);
      const o = f >= p.f0 && f <= p.f1 ? Math.min(inn, out) : 0;
      T(p.g, { o, s: 0.9 + 0.1 * outBack(inn) });
    }
  };
}

// ---------- persediaan ----------
let renderers = [];
async function setup() {
  const stage = document.getElementById('stage');
  const [story, ...svgs] = await Promise.all([
    fetch('../footage/storyboard.json').then(r => r.json()),
    ...SCENE_FILES.map(n => fetch(`../footage/scenes/${n}.svg`).then(r => r.text())),
  ]);
  await Promise.all([
    document.fonts.load("800 60px 'Baloo 2'", 'Rajah Fasa'),
    document.fonts.load("800 60px 'Baloo 2'", '–₂'),
  ]);
  await document.fonts.ready;

  const frames = (who) => story.scene.flatMap(s => s.dialog)
    .filter(d => d.watak.includes(who)).map(d => [Math.round(d.mula * FPS), Math.round(d.tamat * FPS)]);
  const talk = { amir: frames('Amir'), sofia: frames('Sofia') };
  const isTalking = (iv, f) => iv.some(([a, b]) => f >= a && f < b);

  const sceneEls = svgs.map((txt, i) => {
    const el = new DOMParser().parseFromString(txt.replaceAll('id="frame"', `id="frame${i}"`).replaceAll('url(#frame)', `url(#frame${i})`), 'image/svg+xml').documentElement;
    el.dataset.name = SCENE_FILES[i];
    stage.appendChild(el);
    return el;
  });
  const sceneFns = sceneEls.map((el, i) => {
    const [a, s] = findChars(el);            // cari sebelum sebarang pembalutan
    const fn = SCENE_SETUP[i](el);
    const amir = rigChar(a, 0.4), sofia = rigChar(s, 2.1);
    const waving = i === 0 || i === 6;
    return f => {
      fn(f);
      const enter = i === 0 ? 1 - outBack(prog(f, 0, 15)) : 0;
      const enter2 = i === 0 ? 1 - outBack(prog(f, 3, 18)) : 0;
      const o = waving ? { wave: 13, period: 18 } : { wave: 5, period: 36 };
      animChar(amir, f, { ...o, talking: isTalking(talk.amir, f), y: 900 * enter });
      animChar(sofia, f, { ...o, talking: isTalking(talk.sofia, f), y: 900 * enter2 });
    };
  });

  // Lapisan atas: sarikata + kesan peralihan.
  const mk = () => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 1080 1920'); stage.appendChild(s); return s; };
  const subSvg = mk();
  // Dialog terakhir sudah muncul sebagai teks penutup besar di skrin (perkataan demi perkataan).
  const dialogs = story.scene.flatMap(s => s.dialog).slice(0, -1);
  const subs = buildSubtitles(subSvg, dialogs);

  const fx = mk();
  const fog = document.createElementNS(NS, 'g'); fx.appendChild(fog);
  const puffs = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
    const c = document.createElementNS(NS, 'ellipse');
    c.setAttribute('cx', 110 + col * 290 + (row % 2) * 120 - 60); c.setAttribute('cy', 1900 - row * 440);
    c.setAttribute('fill', '#fff'); fog.appendChild(c); puffs.push({ c, row });
  }
  const white = document.createElementNS(NS, 'rect');
  white.setAttribute('width', 1080); white.setAttribute('height', 1920); white.setAttribute('fill', '#fff');
  fx.appendChild(white);

  const vis = (el, on) => { el.style.display = on ? 'block' : 'none'; };
  renderers = [f => {
    // Scene yang kelihatan + peralihan.
    sceneEls.forEach((el, i) => { vis(el, f >= START[i] && f < START[i + 1]); el.style.transform = ''; el.style.clipPath = ''; });
    if (f >= 112 && f < 128) {              // wipe bulat 1 → 2
      vis(sceneEls[0], true); vis(sceneEls[1], true);
      sceneEls[1].style.clipPath = `circle(${inOut(prog(f, 112, 128)) * 1110}px at 540px 960px)`;
    }
    if (f >= 291 && f < 309) {              // slide ke atas 2 → 3
      const p = inOut(prog(f, 291, 309));
      vis(sceneEls[1], true); vis(sceneEls[2], true);
      sceneEls[1].style.transform = `translateY(${-1920 * p}px)`;
      sceneEls[2].style.transform = `translateY(${1920 * (1 - p)}px)`;
    }
    if (f >= 771 && f < 789) {              // slide ke kiri 4 → 5
      const p = inOut(prog(f, 771, 789));
      vis(sceneEls[3], true); vis(sceneEls[4], true);
      sceneEls[3].style.transform = `translateX(${-1080 * p}px)`;
      sceneEls[4].style.transform = `translateX(${1080 * (1 - p)}px)`;
    }
    sceneEls.forEach((el, i) => { if (el.style.display !== 'none') sceneFns[i](f); });
    subs(f);
    // Wipe kabus putih 6 → 7, kemudian fade ke putih di hujung.
    const fogOn = f >= 1182 && f < 1218;
    fog.style.display = fogOn ? 'block' : 'none';
    if (fogOn) {
      fog.style.opacity = 1 - prog(f, 1202, 1218);
      for (const { c, row } of puffs) {
        const p = outCubic(prog(f, 1182 + row * 2.5, 1196 + row * 2.5));
        c.setAttribute('rx', 330 * p + 30 * prog(f, 1200, 1218)); c.setAttribute('ry', 300 * p + 30 * prog(f, 1200, 1218));
      }
    }
    const w = Math.max(f >= 1196 && f < 1204 ? Math.min(prog(f, 1196, 1200), 1 - prog(f, 1200, 1204) * 0.5) : 0, prog(f, 1335, 1349));
    white.style.display = w > 0 ? 'block' : 'none';
    white.style.opacity = w;
  }];
}

window.renderFrame = f => { for (const r of renderers) r(clamp(f, 0, TOTAL - 1)); };
window.ready = setup().then(() => { window.renderFrame(0); return true; });

// ---------- pratonton masa nyata (tanpa ?render) ----------
if (!new URLSearchParams(location.search).has('render')) {
  window.ready.then(() => {
    const stage = document.getElementById('stage'), hud = document.getElementById('hud');
    const seek = document.getElementById('seek'), fr = document.getElementById('fr');
    hud.hidden = false;
    const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / 1080, innerHeight / 1920)})`; };
    addEventListener('resize', fit); fit();
    let playing = true, f = +(new URLSearchParams(location.search).get('f') || 0), last = performance.now();
    document.getElementById('play').onclick = () => { playing = !playing; last = performance.now(); };
    seek.oninput = () => { f = +seek.value; playing = false; };
    const loop = now => {
      if (playing) { f = (f + (now - last) / 1000 * FPS) % TOTAL; }
      last = now;
      window.renderFrame(Math.floor(f)); seek.value = Math.floor(f); fr.textContent = Math.floor(f);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
