// Eksport SVG -> PNG 1080x1920 (Chromium/Playwright). Jalankan: node render.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SVG=path.join(__dirname,'..','svg'),OUT=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
for(const f of fs.readdirSync(SVG).filter(x=>x.endsWith('.svg')).sort()){
 await p.setContent(`<html><body style="margin:0">${fs.readFileSync(path.join(SVG,f),'utf8')}</body></html>`);
 await p.evaluate(()=>document.fonts.ready);
 await p.screenshot({path:path.join(OUT,f.replace('.svg','.png')),clip:{x:0,y:0,width:1080,height:1920}});console.log('PNG',f)}
await b.close()})();
