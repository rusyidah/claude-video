// usage: node render.mjs <scale> <outDir> [t1,t2,...]   scale 0.5 = preview, 1 = final
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
const [scale='0.5', out='frames', only] = process.argv.slice(2);
const FPS = 25, DUR = 30.146; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: +scale });
await p.goto(pathToFileURL(path.resolve('composition/index.html')).href + (only ? '?bg' : '')); await p.waitForFunction(() => window.render);
await p.evaluate(() => document.fonts.ready);
const times = only ? only.split(',').map(Number) : [...Array(Math.ceil(DUR * FPS)).keys()].map(i => i / FPS);
let n = 0; for (const t of times) { await p.evaluate(t => window.render(t), t);
  await p.screenshot({ path: only ? `${out}/t${t}.png` : `${out}/${String(n++).padStart(5, '0')}.png`, omitBackground: !only }); }
await b.close(); console.log('done', times.length);
