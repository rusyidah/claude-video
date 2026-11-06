/* V5 — real 3D layer (three.js, software WebGL). Draws every beat as 3D objects with a moving camera.
   2D text/captions/CTA overlays come from ad.js. Units: 1 unit = 320 px at z=0 with camera at z=12, fov 28. */
(() => {
  const T3 = THREE;
  const R = new T3.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  R.setSize(1080, 1920); R.setPixelRatio(1); R.setClearColor(0x000000, 0);
  R.toneMapping = T3.ACESFilmicToneMapping; R.toneMappingExposure = 1.15;
  const scene = new T3.Scene();
  const cam = new T3.PerspectiveCamera(28, 1080 / 1920, .1, 100);
  scene.add(new T3.HemisphereLight(0xcfe9ff, 0x1a2a2a, 1.0));
  const key = new T3.DirectionalLight(0xffffff, 2.6); key.position.set(3, 5, 7); scene.add(key);
  const rim = new T3.PointLight(0x7CFF3A, 14, 14); rim.position.set(-3, 2, -3); scene.add(rim);
  const warm = new T3.PointLight(0xffb070, 6, 12); warm.position.set(3, -2, 4); scene.add(warm);

  const M = (c, o = {}) => new T3.MeshStandardMaterial({ color: c, roughness: o.r ?? .4, metalness: o.m ?? .05, transparent: (o.o ?? 1) < 1, opacity: o.o ?? 1,
    emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, side: o.side ?? T3.FrontSide, depthWrite: (o.o ?? 1) >= 1 });
  const sph = (r, mat, seg = 24) => new T3.Mesh(new T3.SphereGeometry(r, seg, seg), mat);
  function rbox(w, h, d, r, bev = .03) {
    const s = new T3.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new T3.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -d / 2); return g;
  }
  const G = () => { const g = new T3.Group(); scene.add(g); g.visible = false; return g; };
  const pop = (T, at, d = .45) => { const k = p(T, at, at + d); return k <= 0 ? 0 : Math.max(.001, outBack(k)); };
  const vis = (g, T, a, b) => (g.visible = T >= a && T < b);
  const canvasTex = (c) => { const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; t.anisotropy = 4; return t; };

  /* ---------- icon blocks (textured with the 2D vector glyphs) ---------- */
  const iconKinds = ['phone', 'soap', 'egg', 'glass'];
  const icons = iconKinds.map(k => {
    const g = new T3.Group(), c = document.createElement('canvas'); c.width = c.height = 256;
    withCtx(c.getContext('2d'), () => drawIcon(k, 128, 128, 232));
    g.add(new T3.Mesh(rbox(.6, .6, .2, .13, .02), M(ICON_COL[k], { r: .35, m: .1 })));
    const face = new T3.Mesh(new T3.PlaneGeometry(.66, .66), new T3.MeshBasicMaterial({ map: canvasTex(c), transparent: true }));
    face.position.z = .122; g.add(face); scene.add(g); g.visible = false; return g;
  });

  /* ---------- hook: "?" sphere + flasks ---------- */
  const gHook = G();
  const qC = document.createElement('canvas'); qC.width = qC.height = 256; { const x = qC.getContext('2d'); x.font = "700 220px Oswald, sans-serif"; x.fillStyle = '#10200f'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 128, 140); }
  const qS = sph(.46, M(0xF2B632, { r: .25, m: .1 }), 48); qS.position.set(0, -.9, 0); gHook.add(qS);
  const qTex = canvasTex(qC); let qDone = false; const qP = new T3.Mesh(new T3.PlaneGeometry(.7, .7), new T3.MeshBasicMaterial({ map: qTex, transparent: true })); qP.position.set(0, -.9, .48); gHook.add(qP);
  function flask(liq) {
    const g = new T3.Group();
    const prof = [[0, -.5], [.4, -.5], [.44, -.44], [.2, .08], [.12, .2], [.12, .52], [.17, .56], [.17, .6]].map(([x, y]) => new T3.Vector2(x, y));
    g.add(new T3.Mesh(new T3.LatheGeometry(prof, 40), M(0xffffff, { r: .05, m: 0, o: .28, side: T3.DoubleSide })));
    const lp = [[0, -.48], [.38, -.48], [.42, -.43], [.3, -.15], [0, -.15]].map(([x, y]) => new T3.Vector2(x, y));
    g.add(new T3.Mesh(new T3.LatheGeometry(lp, 40), M(liq, { r: .2, m: 0, o: .85, e: liq, ei: .25 })));
    return g;
  }
  const flasks = [[-1.15, -1.0, 0x2FD6A0], [1.15, -1.05, 0xFFA040]].map(([x, y, c]) => { const f = flask(c); f.position.set(x, y, .2); f.scale.setScalar(.8); gHook.add(f); return [f, x, y]; });

  /* ---------- phone + battery cutaway ---------- */
  const gPhone = G(), gCut = G();
  const body = new T3.Mesh(rbox(1.0, 2.1, .13, .2, .03), M(0x2A3550, { r: .3, m: .7 })); gPhone.add(body);
  const scr = new T3.Mesh(new T3.PlaneGeometry(.9, 1.98), new T3.MeshBasicMaterial({ color: 0x0B0F2E })); scr.position.z = .1; gPhone.add(scr);
  const bC = document.createElement('canvas'); bC.width = 512; bC.height = 256; const bX = bC.getContext('2d'); const bTex = canvasTex(bC);
  const bat = new T3.Mesh(new T3.PlaneGeometry(.78, .39), new T3.MeshBasicMaterial({ map: bTex, transparent: true })); bat.position.set(0, 0, .105); gPhone.add(bat);
  function drawBat(fill, col, blink) {
    bX.clearRect(0, 0, 512, 256); bX.lineWidth = 16; bX.strokeStyle = '#fff'; bX.beginPath(); bX.roundRect(20, 50, 440, 156, 36); bX.stroke();
    bX.fillStyle = '#fff'; bX.beginPath(); bX.roundRect(468, 100, 26, 56, 8); bX.fill();
    if (fill > 0) { bX.globalAlpha = blink; bX.fillStyle = col; bX.beginPath(); bX.roundRect(40, 70, 400 * fill, 116, 22); bX.fill(); bX.globalAlpha = 1; }
    bTex.needsUpdate = true;
  }
  // cutaway cell
  const cell = new T3.Mesh(rbox(2.9, 1.25, .7, .22, .03), M(0xCFE9DD, { r: .1, m: 0, o: .22 })); gCut.add(cell);
  const nub = new T3.Mesh(rbox(.15, .42, .3, .05), M(0xE9ECFF, { r: .3, m: .4 })); nub.position.set(1.52, 0, 0); gCut.add(nub);
  const edges = new T3.LineSegments(new T3.EdgesGeometry(rbox(2.9, 1.25, .7, .22, .03), 30), new T3.LineBasicMaterial({ color: 0xE9ECFF })); gCut.add(edges);
  const elyte = new T3.Mesh(new T3.BoxGeometry(1.5, 1.0, .5), M(0x4A8CFF, { r: .1, m: 0, o: .3 })); gCut.add(elyte);
  const eL = new T3.Mesh(rbox(.34, 1.0, .5, .05), M(0x5B6B78, { r: .35, m: .8, e: 0xFFB020, ei: .0 })); eL.position.x = -1.0; gCut.add(eL);
  const eR = new T3.Mesh(rbox(.34, 1.0, .5, .05), M(0xD9DCFF, { r: .3, m: .7 })); eR.position.x = 1.0; gCut.add(eR);
  const mark = (x, plus) => { const m = M(0xffffff, { e: 0xffffff, ei: .6 }); const a = new T3.Mesh(new T3.BoxGeometry(.2, .05, .02), m); a.position.set(x, 0, .27); gCut.add(a); if (plus) { const b = new T3.Mesh(new T3.BoxGeometry(.05, .2, .02), m); b.position.set(x, 0, .27); gCut.add(b); } };
  mark(-1.0, false); mark(1.0, true);
  const wirePts = [[-1.0, .5, 0], [-1.0, 1.25, 0], [1.0, 1.25, 0], [1.0, .5, 0]].map(a => new T3.Vector3(...a));
  const wireCurve = new T3.CatmullRomCurve3(wirePts, false, 'catmullrom', .02);
  gCut.add(new T3.Mesh(new T3.TubeGeometry(wireCurve, 60, .035, 12), M(0x8FA0B0, { r: .3, m: .8 })));
  const electrons = Array.from({ length: 12 }, () => { const m = sph(.075, M(0x7CFF3A, { e: 0x7CFF3A, ei: 1.6 })); gCut.add(m); return m; });
  const ions = Array.from({ length: 16 }, (_, i) => { const m = sph(.055, M(i % 2 ? 0x35D0E8 : 0xFFB020, { e: i % 2 ? 0x35D0E8 : 0xFFB020, ei: .5 })); gCut.add(m); return m; });

  /* ---------- soap micelle ---------- */
  const gSoap = G();
  const cc = document.createElement('canvas'); cc.width = cc.height = 512; { const x = cc.getContext('2d'); x.fillStyle = '#C9D3CF'; x.fillRect(0, 0, 512, 512); x.strokeStyle = 'rgba(70,90,80,.45)'; x.lineWidth = 3; for (let i = 0; i <= 512; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); } }
  const clothTex = canvasTex(cc); clothTex.wrapS = clothTex.wrapT = T3.RepeatWrapping; clothTex.repeat.set(3, 2);
  const cloth = new T3.Mesh(new T3.PlaneGeometry(3.6, 2.2), new T3.MeshStandardMaterial({ map: clothTex, roughness: .9 })); cloth.rotation.x = -Math.PI / 2 + .25; cloth.position.set(0, -1.38, 0); gSoap.add(cloth);
  const stain = new T3.Mesh(new T3.CircleGeometry(.5, 40), new T3.MeshBasicMaterial({ color: 0xF29A3A, transparent: true, opacity: .8 })); stain.rotation.x = -Math.PI / 2 + .25; stain.position.set(0, -1.37, .02); stain.scale.set(1, .5, 1); gSoap.add(stain);
  const drop = sph(.36, new T3.MeshPhysicalMaterial({ color: 0xF5A03A, roughness: .12, metalness: 0, clearcoat: 1, emissive: 0xF5A03A, emissiveIntensity: .25 }), 48); gSoap.add(drop);
  const SN = 54, mol = [];
  { const r = rng(21); for (let i = 0; i < SN; i++) {
    const y = 1 - (i + .5) / SN * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963; const dir = new T3.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad);
    const g = new T3.Group(); const head = sph(.085, new T3.MeshPhysicalMaterial({ color: 0x3C78E0, roughness: .2, clearcoat: 1, emissive: 0x3C78E0, emissiveIntensity: .15 })); g.add(head);
    const pts = Array.from({ length: 6 }, (_, j) => new T3.Vector3(Math.sin(j * 1.5) * .025, -j * .045, Math.cos(j * 1.5) * .025));
    const tail = new T3.Mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(pts), 16, .02, 8), M(0xF29A3A, { r: .4 })); g.add(tail); gSoap.add(g);
    const bottom = dir.y < -.25;
    mol.push({ g, dir, at: bottom ? 20.2 + r() * .9 : 15.4 + r() * 4.3, pop: 14.6 + i * .03, f: new T3.Vector3((r() - .5) * 3.0, (r() - .5) * 1.6 + .1, (r() - .5) * 1.6), ph: r() * 6.28 });
  } }
  const bubbles = Array.from({ length: 14 }, (_, i) => { const m = sph(.05 + (i % 4) * .02, M(0xAADDFF, { o: .25, r: .1 })); gSoap.add(m); return m; });

  /* ---------- egg in pan + protein chains ---------- */
  const gEgg = G();
  const panProf = [[0, 0], [.7, 0], [.76, .02], [.84, .22], [.88, .24], [.88, .2], [.82, .16], [.7, -.02], [.0, -.04]].map(([x, y]) => new T3.Vector2(x, y));
  const panMat = new T3.MeshStandardMaterial({ color: 0x2B3047, roughness: .35, metalness: .8, emissive: 0xE8546A, emissiveIntensity: 0, side: T3.DoubleSide }); panMat.color.set(0x1d2234);
  const pan = new T3.Mesh(new T3.LatheGeometry(panProf, 64), panMat); gEgg.add(pan);
  const handle = new T3.Mesh(new T3.CylinderGeometry(.07, .06, 1.2, 20), M(0x2B3047, { r: .4, m: .7 })); handle.rotation.z = Math.PI / 2 - .35; handle.position.set(1.35, .2, 0); gEgg.add(handle);
  const wg = new T3.SphereGeometry(1, 64, 24); { const pp = wg.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i), a = Math.atan2(z, x), f = 1 + .12 * Math.sin(3 * a + .6) + .07 * Math.sin(5 * a + 2) + .05 * Math.sin(2 * a); pp.setX(i, x * f); pp.setZ(i, z * f); } wg.computeVertexNormals(); }
  const white = new T3.Mesh(wg, new T3.MeshStandardMaterial({ color: 0xC8E6FF, roughness: .2, transparent: true, opacity: .5 })); white.scale.set(.62, .06, .58); white.position.y = .05; gEgg.add(white);
  const yolk = sph(.25, new T3.MeshPhysicalMaterial({ color: 0xFFB300, roughness: .15, clearcoat: 1, emissive: 0xFFB300, emissiveIntensity: .15 }), 40); yolk.scale.y = .8; yolk.position.set(.06, .14, -.02); gEgg.add(yolk);
  const heatL = new T3.PointLight(0xE8546A, 0, 6); heatL.position.set(0, .4, 0); gEgg.add(heatL);
  const steam = Array.from({ length: 10 }, () => { const m = sph(.07, M(0xffffff, { o: .25 })); gEgg.add(m); return m; });
  const disc = new T3.Group(); gEgg.add(disc);
  disc.add(new T3.Mesh(new T3.CircleGeometry(.5, 48), M(0xFFFFFF, { o: .13, side: T3.DoubleSide })));
  const ring = new T3.Mesh(new T3.TorusGeometry(.5, .018, 12, 64), M(0x35D0E8, { e: 0x35D0E8, ei: .6 })); disc.add(ring);
  const CB = 61, chainMesh = new T3.InstancedMesh(new T3.SphereGeometry(.03, 10, 10), new T3.MeshStandardMaterial({ roughness: .3, emissive: 0xffffff, emissiveIntensity: .25 }), CB * 3); chainMesh.instanceMatrix.setUsage(T3.DynamicDrawUsage); disc.add(chainMesh);
  const tmpM = new T3.Matrix4(), tmpC = new T3.Color();

  /* ---------- sugar glasses ---------- */
  const gSug = G();
  function glassMesh(x, hot) {
    const g = new T3.Group(); g.position.set(x, -.1, 0);
    g.add(new T3.Mesh(new T3.CylinderGeometry(.5, .38, 1.3, 48, 1, true), M(0xffffff, { r: .05, m: 0, o: .22, side: T3.DoubleSide })));
    const water = new T3.Mesh(new T3.CylinderGeometry(.47, .37, 1.05, 48), M(hot ? 0xFF6A4C : 0x4F8FFF, { r: .1, o: hot ? .72 : .6, e: hot ? 0xE8546A : 0x3C78E0, ei: hot ? .35 : .25 })); water.position.y = -.12; g.add(water);
    g.add(new T3.Mesh(new T3.CylinderGeometry(.38, .38, .04, 48), M(0xffffff, { o: .4, r: .1 })).translateY(-.66));
    const th = new T3.Group(); th.position.set(hot ? .78 : -.78, 0, 0); g.add(th);
    th.add(new T3.Mesh(new T3.CylinderGeometry(.045, .045, 1.15, 16), M(0xE9EFEC, { o: .55, r: .1 })));
    const bulb = sph(.1, M(hot ? 0xE8546A : 0x3C78E0, { e: hot ? 0xE8546A : 0x3C78E0, ei: .5 })); bulb.position.y = -.62; th.add(bulb);
    const merc = new T3.Mesh(new T3.CylinderGeometry(.02, .02, 1, 12), M(hot ? 0xE8546A : 0x3C78E0, { e: hot ? 0xE8546A : 0x3C78E0, ei: .6 })); merc.position.y = -.55; th.add(merc);
    gSug.add(g);
    const r = rng(hot ? 91 : 51), gr = [];
    for (let i = 0; i < 30; i++) {
      const m = new T3.Mesh(new T3.BoxGeometry(.07, .07, .07), M(0xFFF6D8, { r: .5 })); m.rotation.set(r() * 3, r() * 3, r() * 3); g.add(m);
      const a = r() * 6.28, rd = Math.sqrt(r()) * .3;
      gr.push({ m, x: Math.cos(a) * rd, z: Math.sin(a) * rd, y: -.58 + r() * .08 + (1 - rd / .3) * .1, drop: 28.45 + r() * 1.0, ts: hot ? 30.2 + r() * 1.2 : 30.2 + r() * 3, dur: hot ? 1.0 : 3.2, flag: hot ? 1 : (r() < .22 ? 1 : .12) });
    }
    const ice = hot ? [] : [0, 1].map(i => { const m = new T3.Mesh(rbox(.2, .2, .2, .04), M(0xC8F0FF, { o: .6, r: .05 })); m.position.set(-.12 + i * .22, .38, (i - .5) * .1); g.add(m); return m; });
    return { g, gr, merc, ice };
  }
  const gC = glassMesh(-.58, false), gH = glassMesh(.58, true);
  const divider = new T3.Mesh(new T3.PlaneGeometry(.01, 2.4), new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .2 })); gSug.add(divider);
  const steamS = Array.from({ length: 6 }, () => { const m = sph(.06, M(0xffffff, { o: .3 })); gSug.add(m); return m; });

  /* ---------- emphasis hexagon + CTA floaters ---------- */
  const gEmph = G();
  const hex = new T3.Mesh(new T3.CylinderGeometry(1.15, 1.15, .1, 6), M(0xF2B632, { r: .4, m: .1, o: .22 })); hex.rotation.x = Math.PI / 2; hex.position.z = -.6; gEmph.add(hex);
  const hexE = new T3.LineSegments(new T3.EdgesGeometry(new T3.CylinderGeometry(1.15, 1.15, .1, 6)), new T3.LineBasicMaterial({ color: 0x7CFF3A })); hexE.rotation.x = Math.PI / 2; hexE.position.z = -.6; gEmph.add(hexE);
  const gCta = G();
  const floaters = Array.from({ length: 16 }, (_, i) => { const r = rng(i + 70); const m = sph(.06 + r() * .1, M([0x7CFF3A, 0x35D0E8, 0xFFB020, 0xE8546A][i % 4], { r: .3, e: [0x7CFF3A, 0x35D0E8, 0xFFB020, 0xE8546A][i % 4], ei: .35 })); m.userData = { x: (r() < .5 ? -1 : 1) * (1.55 + r() * .45), y: (r() - .5) * 5, z: -1 - r() * 2, s: .2 + r() * .4 }; gCta.add(m); return m; });
  const conf = Array.from({ length: 36 }, (_, i) => { const r = rng(i + 200); const m = sph(.035 + r() * .03, M([0x7CFF3A, 0xffffff, 0xFFB020][i % 3], { e: [0x7CFF3A, 0xffffff, 0xFFB020][i % 3], ei: .6 })); m.userData = { a: r() * 6.28, b: (r() - .3) * 2, v: 1 + r() * 2.2 }; gCta.add(m); return m; });

  /* ---------- camera helper ---------- */
  function setCam(x, y, z, lx, ly, lz) { cam.position.set(x, y, z); cam.lookAt(lx, ly, lz); }

  const pu = (T, a, b) => outC(p(T, a, b));

  function update(T) {
    if (!qDone && document.fonts.check('700 20px Oswald')) { const x = qC.getContext('2d'); x.clearRect(0, 0, 256, 256); x.font = '700 220px Oswald, sans-serif'; x.fillStyle = '#10200f'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 128, 140); qTex.needsUpdate = true; qDone = true; }
    // visibility per beat
    vis(gHook, T, 0, 3.7); vis(gPhone, T, 7.2, 14.2); vis(gCut, T, 9.3, 12.9); vis(gSoap, T, 14.2, 22.3); vis(gEgg, T, 22.3, 28.0);
    vis(gSug, T, 28.0, 33.55); vis(gEmph, T, 33.55, 40.2); vis(gCta, T, 40.2, 44.1);
    // default camera: slow drift
    let cx = Math.sin(T * .35) * .25, cy = Math.cos(T * .3) * .1, cz = 12, lx = 0, ly = 0, lz = 0;
    // icons
    const rowX = [-1.1, -.37, .37, 1.1], corner = [[-1.16, 1.25], [1.16, 1.25], [-1.16, -1.34], [1.16, -1.34]];
    icons.forEach((ic, i) => {
      let show = false, x = 0, y = 0, z = 0, s = 1, ry = 0;
      if (T >= 3.5 && T < 7.2) { const k = pop(T, 4.35 + i * .22, .5); show = k > 0; x = rowX[i]; y = -.84 + Math.sin(T * 2.4 + i) * .02; s = k; ry = (1 - Math.min(1, k)) * Math.PI * 2; z = .1; }
      else if (T >= 33.55 && T < 40.2) {
        const kp = pop(T, 33.55 + i * .12, .4), e = inOut(p(T, 36.9 + i * .16, 36.9 + i * .16 + .8)); show = kp > 0;
        x = lerp(rowX[i], corner[i][0], e); y = lerp(-1.19, corner[i][1], e) + Math.sin(T * 2 + i * 1.7) * .03 * e; z = Math.sin(T * 1.2 + i) * .25 * e + .1; s = kp * lerp(1, .85, e); ry = Math.sin(T * .9 + i) * .5 * e + (1 - Math.min(1, kp)) * Math.PI * 2;
      }
      ic.visible = show; ic.position.set(x, y, z); ic.scale.setScalar(Math.max(.001, s)); ic.rotation.set(0, ry, 0);
    });

    if (gHook.visible) {
      const k = pop(T, .5, .5) * (1 - pu(T, 3.2, 3.6)); qS.scale.setScalar(Math.max(.001, k)); qP.scale.setScalar(Math.max(.001, k)); qS.rotation.y = T * .8; qP.position.z = .47 * k;
      flasks.forEach(([f, x, y], i) => { f.scale.setScalar(Math.max(.001, .8 * pop(T, .7 + i * .12, .5) * (1 - pu(T, 3.2, 3.6)))); f.rotation.z = Math.sin(T * 1.6 + i) * .25; f.position.set(x + Math.sin(T + i) * .06, y + Math.sin(T * 1.7 + i) * .06, .2); });
      cx = Math.sin(T * .5) * .35; cz = 12 - T * .1;
    }

    if (gPhone.visible) {
      const zoom = inOut(p(T, 8.6, 9.4)), back = inOut(p(T, 12.5, 13.3));
      gPhone.visible = !(T >= 9.3 && T < 12.5);
      gPhone.position.set(0, 0, 0); gPhone.rotation.set(Math.sin(T * .8) * .05, Math.sin(T * .6) * .35, 0);
      const lit = p(T, 13.0, 13.5), blink = T < 8.6 ? (Math.floor(T * 3) % 2 ? .45 : 1) : 1;
      drawBat(lit > 0 ? lerp(.08, .92, lit) : .08, lit > .2 ? '#2FA37A' : '#E8546A', blink);
      cz = 12; if (T < 9.4) cz = lerp(12, 1.7, zoom); else if (T >= 12.5) cz = lerp(5, 12, back);
      gPhone.scale.setScalar(1.15);
      lx = 0; ly = 0;
    }
    if (gCut.visible) {
      const k = pop(T, 9.3, .5) * (1 - pu(T, 12.3, 12.8)); gCut.scale.setScalar(Math.max(.001, k * .78)); gCut.position.set(0, -.4, 0);
      const ct = Math.max(0, T - 9.6); gCut.rotation.set(.18 + Math.sin(T * .7) * .05, Math.sin(T * .55) * .4, 0);
      electrons.forEach((e, i) => { const u = ((ct * .32 + i / 12) % 1); e.position.copy(wireCurve.getPoint(u)); e.scale.setScalar(.85 + .25 * Math.sin(T * 8 + i)); });
      ions.forEach((m, i) => { const r = rng(i + 3), y0 = r() - .5, ph = r(), dir = i % 2 ? 1 : -1; const u = (((ph + dir * ct * .12) % 1) + 1) % 1; m.position.set(-.7 + u * 1.4, y0 * .8 + Math.sin(T * 2 + i) * .04, (r() - .5) * .35); });
      eL.material.emissiveIntensity = .4 + .4 * Math.sin(T * 5);
      cz = lerp(5, 12, pu(T, 9.3, 10.4));
    }

    if (gSoap.visible) {
      const Lp = inOut(p(T, 20.2, 22.0)), sc = Math.max(.001, pop(T, 14.3, .5));
      const C = new T3.Vector3(Math.sin(T * 2.2) * .03 * Lp, lerp(-1.02, .55, Lp) + Math.sin(T * 3) * .03 * Lp, 0);
      drop.position.copy(C); drop.scale.setScalar(sc); cloth.scale.setScalar(sc); stain.material.opacity = .8 * (1 - p(Lp, .15, .9)); stain.scale.setScalar(sc);
      const spin = T * .35;
      mol.forEach((m, i) => {
        const k = pop(T, m.pop, .35), a = inOut(p(T, m.at, m.at + .9));
        const tgt = m.dir.clone().multiplyScalar(.36 + .21).add(C);
        const free = new T3.Vector3(m.f.x + Math.sin(T * 1.2 + m.ph) * .1, m.f.y + .3 + Math.cos(T * 1.1 + m.ph) * .08, m.f.z + Math.sin(T + m.ph) * .1);
        m.g.position.lerpVectors(free, tgt, a); m.g.scale.setScalar(Math.max(.001, k));
        const td = new T3.Vector3().subVectors(C, m.g.position).normalize(), fd = new T3.Vector3(Math.sin(m.ph + T), -.6, Math.cos(m.ph + T * .8)).normalize();
        const dir = fd.lerp(td, a).normalize(); m.g.quaternion.setFromUnitVectors(new T3.Vector3(0, -1, 0), dir);
      });
      bubbles.forEach((b, i) => { const r = rng(i + 9); b.position.set((r() - .5) * 3, ((r() * 4 + T * (.2 + r() * .2)) % 4) - 1.5, -.8 - r()); });
      const ang = lerp(-.25, .5, p(T, 14.2, 22.3)); cx = Math.sin(ang) * 11.5; cz = Math.cos(ang) * 11.5; cy = lerp(.4, .2, p(T, 14.2, 22.3)); ly = lerp(-.55, .1, Lp);
    }

    if (gEgg.visible) {
      const heat = p(T, 23.9, 25.5), cook = inOut(p(T, 24.3, 26.4)), ek = pop(T, 22.4, .5);
      gEgg.scale.setScalar(Math.max(.001, ek)); gEgg.position.set(0, .35, 0); gEgg.rotation.set(0, Math.sin(T * .5) * .15, 0);
      white.scale.set(.62 * pop(T, 22.7, .4), .06, .58 * pop(T, 22.7, .4)); yolk.scale.set(1, .8, 1).multiplyScalar(Math.max(.001, pop(T, 22.8, .4)));
      white.material.opacity = lerp(.5, 1, cook); white.material.color.setRGB(lerp(.78, 1, cook), lerp(.9, 1, cook), 1);
      panMat.emissiveIntensity = heat * .22; heatL.intensity = heat * 2.5;
      steam.forEach((s, i) => { const r = rng(i + 5), ph = (T * (.5 + r() * .4) + r()) % 1; s.position.set((r() - .5) * 1.0, .3 + ph * 1.4, (r() - .5) * .8); s.scale.setScalar(heat * (1 - ph) * 1.2 + .001); });
      // protein chains in a floating disc
      const da = p(T, 24.4, 24.9) * (1 - p(T, 27.7, 28)); disc.visible = da > .01; disc.scale.setScalar(Math.max(.001, da)); disc.position.set(0, -1.15, .6); disc.quaternion.copy(cam.quaternion);
      const u = inOut(p(T, 24.9, 26.4)), v = inOut(p(T, 26.4, 27.5));
      for (let k = 0; k < 3; k++) for (let j = 0; j < CB; j++) {
        const [px, py] = chainPt(j / (CB - 1), k, u, v), wob = (1 - u) * .01 * Math.sin(T * 16 + k);
        tmpM.makeTranslation(px * .0032 + wob, -py * .0032, .02); chainMesh.setMatrixAt(k * CB + j, tmpM);
        tmpC.set(v > .3 ? 0xE8743B : [0x2FA37A, 0x3C78E0, 0x7B6CF0][k]); chainMesh.setColorAt(k * CB + j, tmpC);
      }
      chainMesh.instanceMatrix.needsUpdate = true; if (chainMesh.instanceColor) chainMesh.instanceColor.needsUpdate = true;
      ring.material.color.setRGB(lerp(.2, 1, heat), lerp(.8, .7, heat), lerp(.9, .1, heat)); ring.material.emissive.copy(ring.material.color);
      const pa = lerp(.0, .55, p(T, 22.3, 24.0)); cx = Math.sin(pa * 2) * 1.2; cy = lerp(4.6, 5.6, pa); cz = lerp(9.6, 8.2, pa); ly = -.1;
    }

    if (gSug.visible) {
      const gk = pop(T, 28.35, .5); gSug.scale.setScalar(Math.max(.001, gk)); gSug.position.y = .1;
      divider.position.set(0, -.1, 0);
      [gC, gH].forEach((G_, hot) => {
        const tk = p(T, 29.0, 30.0), tk2 = p(T, 30.8, 31.8), lvl = hot ? lerp(.18, .88, tk2) * tk : .18 * tk;
        G_.merc.scale.y = Math.max(.001, lvl * 1.0); G_.merc.position.y = -.55 + lvl * .5;
        G_.gr.forEach((g, i) => {
          const k = p(T, g.drop, g.drop + .5), d = p(T, g.ts, g.ts + g.dur) * g.flag, y = lerp(.9, g.y, k * k);
          g.m.position.set(g.x, y, g.z); g.m.scale.setScalar(Math.max(.001, (k > 0 ? 1 : 0) * (1 - d * .92)));
        });
        G_.ice.forEach((m, i) => { m.position.y = .38 + Math.sin(T * 2 + i) * .02; });
      });
      steamS.forEach((s, i) => { const ph = (T * .6 + i * .17) % 1; s.position.set(.58 + (i - 2.5) * .12, .75 + ph * .7, 0); s.scale.setScalar(Math.max(.001, (1 - ph) * p(T, 30.2, 31.2))); });
      cx = Math.sin(T * .45) * .5; cy = .5; cz = lerp(12, 9.6, p(T, 28, 33.5)); ly = .0;
    }

    if (gEmph.visible) {
      hex.scale.setScalar(Math.max(.001, pop(T, 33.55, .6))); hexE.scale.copy(hex.scale); hex.rotation.z = T * .1; hexE.rotation.z = T * .1;
      cx = Math.sin(T * .4) * .5; cz = lerp(12.4, 11, p(T, 33.5, 40.2));
    }
    if (gCta.visible) {
      floaters.forEach((m, i) => { const u = m.userData; m.position.set(u.x + Math.sin(T * u.s + i) * .3, u.y + Math.cos(T * u.s * .8 + i) * .3, u.z); });
      const ck = p(T, 43.0, 44.0);
      conf.forEach((m, i) => { const u = m.userData; const d = outC(ck) * u.v; m.visible = ck > 0 && ck < 1; m.position.set(Math.cos(u.a) * d * 1.5, -1.0 + Math.sin(u.a) * d * .9 + u.b * d * .5 - ck * ck * .6, .3); m.scale.setScalar(1 - ck * .6); });
      cz = 12;
    }
    setCam(cx, cy, cz, lx, ly, lz);
    R.render(scene, cam);
  }
  window.S3 = { update, canvas: R.domElement };
})();
