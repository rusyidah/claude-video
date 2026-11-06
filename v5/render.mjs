import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
import fs from 'fs';
import path from 'path';
const FPS = 30, DUR = 44.0;
const mode = process.argv[2] || 'test';
const out = process.argv[3] || '/tmp/claude-0/frames';
fs.mkdirSync(out, { recursive: true });
const url = 'file://' + path.resolve('index.html');
async function worker(id, n, frames) {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  pg.on('pageerror', e => console.error('PAGEERR', e.message));
  await pg.goto(url); await pg.evaluate(() => window.ready);
  for (const f of frames) {
    await pg.evaluate(t => window.render(t), f.t);
    await pg.locator('#c').screenshot({ path: path.join(out, f.name), type: 'png' });
  }
  await b.close();
}
let frames;
if (mode === 'test') frames = process.argv.slice(4).map(t => ({ t: +t, name: `t_${(+t).toFixed(2)}.png` }));
else if (mode === 'range') { frames = []; for (let i = +process.argv[4]; i <= +process.argv[5]; i++) frames.push({ t: i / FPS, name: `f${String(i).padStart(5, '0')}.png` }); }
else { frames = []; for (let i = 0; i < Math.round(DUR * FPS); i++) frames.push({ t: i / FPS, name: `f${String(i).padStart(5, '0')}.png` }); }
const N = mode === 'test' ? 1 : 4;
await Promise.all(Array.from({ length: N }, (_, w) => worker(w, N, frames.filter((_, i) => i % N === w))));
console.log('done', frames.length);
