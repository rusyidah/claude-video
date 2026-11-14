#!/usr/bin/env node
/* Render video: tangkap setiap frame dengan Chromium (Playwright), kemudian ffmpeg.
 *
 *   node scripts/render.cjs                 → out/rajah-fasa-air-co2.mp4
 *   node scripts/render.cjs --still 0,60,200  → out/stills/*.png sahaja
 *   node scripts/render.cjs --serve          → pratonton di http://localhost:4173/src/
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out');
const FRAMES = path.join(OUT, 'frames');
const TOTAL = 1350, FPS = 30;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };

function serve(port = 0) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(port, '127.0.0.1', () => r(server)));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--serve')) {
    await serve(4173);
    console.log('Pratonton: http://localhost:4173/src/');
    return;
  }
  const { chromium } = require('playwright');
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/src/index.html?render`;
  const stillArg = args.indexOf('--still');
  const stills = stillArg >= 0 ? args[stillArg + 1].split(',').map(Number) : null;
  const workers = stills ? 1 : Math.max(1, Math.min(4, require('os').cpus().length));

  const browser = await chromium.launch();
  const open = async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => { console.error('Ralat halaman:', e.message); process.exitCode = 1; });
    await page.goto(url);
    await page.evaluate(() => window.ready);
    return page;
  };

  if (stills) {
    const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
    const page = await open();
    for (const f of stills) {
      await page.evaluate(n => window.renderFrame(n), f);
      await page.screenshot({ path: path.join(dir, `f${String(f).padStart(4, '0')}.png`) });
    }
    await browser.close(); server.close();
    return;
  }

  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
  let next = 0, done = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await open();
    for (;;) {
      const f = next++;
      if (f >= TOTAL) break;
      await page.evaluate(n => window.renderFrame(n), f);
      await page.screenshot({ path: path.join(FRAMES, `${String(f).padStart(5, '0')}.png`) });
      if (++done % 150 === 0) console.log(`${done}/${TOTAL} frame (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  }));
  await browser.close(); server.close();

  const audio = path.join(OUT, 'audio.wav');
  const a = spawnSync('python3', [path.join(__dirname, 'audio.py'), audio], { stdio: 'inherit' });
  const hasAudio = a.status === 0 && fs.existsSync(audio);
  const mp4 = path.join(OUT, 'rajah-fasa-air-co2.mp4');
  const ff = ['-y', '-framerate', String(FPS), '-i', path.join(FRAMES, '%05d.png')];
  if (hasAudio) ff.push('-i', audio);
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(FPS), '-frames:v', String(TOTAL));
  if (hasAudio) ff.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push('-movflags', '+faststart', mp4);
  await new Promise((res, rej) => spawn('ffmpeg', ['-loglevel', 'error', ...ff], { stdio: 'inherit' })
    .on('exit', c => (c === 0 ? res() : rej(new Error('ffmpeg gagal')))));
  console.log('Siap:', mp4);
}
main().catch(e => { console.error(e); process.exit(1); });
