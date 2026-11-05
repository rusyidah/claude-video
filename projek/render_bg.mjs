// usage: node render_bg.mjs <scale> <outDir> [t1,t2]
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('playwright'); import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
const [scale='0.5', out='bg', only] = process.argv.slice(2); fs.mkdirSync(out,{recursive:true});
const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1080,height:1920}, deviceScaleFactor:+scale });
await p.goto(pathToFileURL(path.resolve('composition/bg.html')).href); await p.waitForFunction(()=>window.render);
const times = only? only.split(',').map(Number) : [...Array(Math.ceil(30.146*25)).keys()].map(i=>i/25);
let n=0; for(const t of times){ await p.evaluate(t=>window.render(t),t); await p.screenshot({path: only?`${out}/t${t}.png`:`${out}/${String(n++).padStart(5,'0')}.png`}); }
await b.close(); console.log('done',times.length);
