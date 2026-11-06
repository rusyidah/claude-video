// Menjana 7 SVG statik (1080x1920) ke ../svg. Jalankan: node generate.js
const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'..','svg');
const C={bg:'#F7F2E8',ink:'#1B2A41',mut:'#5B6678',grid:'#E6DECD',gridM:'#D8CEB8',white:'#FFFFFF',
 yellow:'#F2B705',teal:'#0E9F8E',green:'#2E9E5B',blue:'#2D7FF9',orange:'#F26B21',red:'#E5484D',
 pBlue:'#DCEBFF',pOrange:'#FFE0CC',pYellow:'#FFF1BF',pTeal:'#D3F1EC',pGreen:'#D8F0DF',pRed:'#FFDADB'};
const T=(x,y,s,o={})=>`<text x="${x}" y="${y}" font-family="Inter, sans-serif" font-size="${o.size||48}" font-weight="${o.w||700}" fill="${o.fill||C.ink}" text-anchor="${o.a||'middle'}" style="font-feature-settings:'cv08'">${s}</text>`;
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function arrow(x1,y1,x2,y2,col,w=6,h=20){const a=Math.atan2(y2-y1,x2-x1),bx=x2-Math.cos(a)*h*.8,by=y2-Math.sin(a)*h*.8;
 const px=-Math.sin(a)*h*.45,py=Math.cos(a)*h*.45;
 return `<line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><polygon points="${x2},${y2} ${bx+px},${by+py} ${bx-px},${by-py}" fill="${col}"/>`}
function wave(x1,y1,x2,y2,amp,cyc,col,w,op=1){const n=80,a=Math.atan2(y2-y1,x2-x1),L=Math.hypot(x2-x1,y2-y1);let d='';
 for(let i=0;i<=n;i++){const u=i/n,o=amp*Math.sin(2*Math.PI*cyc*u),x=x1+Math.cos(a)*L*u-Math.sin(a)*o,y=y1+Math.sin(a)*L*u+Math.cos(a)*o;d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}
 return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`}
function hex(cx,cy,r,rot=-90){return Array.from({length:6},(_,i)=>{const a=(rot+60*i)*Math.PI/180;return (cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1)}).join(' ')}
const benz=(cx,cy,r,col,w=4)=>`<polygon points="${hex(cx,cy,r)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${r*.6}" fill="none" stroke="${col}" stroke-width="${w*.7}"/>`;
const e_=(x,y,s=22)=>`<circle cx="${x}" cy="${y}" r="${s}" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3"/><text x="${x-4}" y="${y+8}" font-family="Inter, sans-serif" font-size="${s*.95}" font-weight="700" fill="${C.ink}" text-anchor="middle">e<tspan dy="-${s*.4}" font-size="${s*.7}">−</tspan></text>`;

function frame(title,inner){return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
<title>${title}</title>
<defs>
<pattern id="g1" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${C.grid}" stroke-width="1.5"/></pattern>
<pattern id="g2" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M200 0H0V200" fill="none" stroke="${C.gridM}" stroke-width="2"/></pattern>
<g id="flask" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
<path d="M-22,-90H22V-34L64,56Q72,84 48,84H-48Q-72,84 -64,56L-22,-34Z" fill="#fff"/>
<path d="M-44,22H44L64,56Q72,84 48,84H-48Q-72,84 -64,56Z" fill="currentColor" stroke="none"/>
<path d="M-22,-90H22V-34L64,56Q72,84 48,84H-48Q-72,84 -64,56L-22,-34Z"/><path d="M-32,-90H32" stroke-width="9"/></g>
</defs>
<rect width="1080" height="1920" fill="${C.bg}"/><rect width="1080" height="1920" fill="url(#g1)"/><rect width="1080" height="1920" fill="url(#g2)"/>
<rect x="40" y="40" width="1000" height="1840" rx="28" fill="none" stroke="${C.ink}" stroke-opacity=".18" stroke-width="2"/>
${[[70,70],[1010,70],[70,1850],[1010,1850]].map(([x,y])=>`<path d="M${x-14} ${y}H${x+14}M${x} ${y-14}V${y+14}" stroke="${C.ink}" stroke-opacity=".35" stroke-width="2"/>`).join('')}
${inner}
</svg>`}

// ---- ikon (sekitar -50..50)
const ICON={
 phone:()=>`<rect x="-27" y="-46" width="54" height="92" rx="11" fill="#fff" stroke="${C.ink}" stroke-width="5"/><polygon points="5,-28 -13,6 -2,6 -6,28 14,-8 2,-8" fill="${C.green}"/><line x1="-8" y1="38" x2="8" y2="38" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`,
 soap:()=>`<circle cx="-4" cy="6" r="34" fill="${C.pBlue}" stroke="${C.blue}" stroke-width="5"/><path d="M-22,-8Q-16,-20 -4,-20" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="30" cy="-30" r="14" fill="${C.pBlue}" stroke="${C.blue}" stroke-width="4"/><circle cx="-34" cy="38" r="10" fill="${C.pBlue}" stroke="${C.blue}" stroke-width="4"/>`,
 egg:()=>`<path d="M-44,0C-48,-30 -20,-46 6,-40C34,-48 52,-22 44,4C50,32 20,46 -6,40C-34,48 -50,28 -44,0Z" fill="#fff" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/><circle cx="2" cy="0" r="17" fill="${C.yellow}" stroke="${C.orange}" stroke-width="3"/>`,
 cup:()=>`<path d="M-30,-18H30L24,36Q23,42 17,42H-17Q-23,42 -24,36Z" fill="${C.pRed}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/><path d="M30,-6Q54,-6 50,14Q46,28 26,26" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/><path d="M-12,-28Q-20,-38 -12,-46Q-4,-54 -12,-62M8,-28Q0,-38 8,-46Q16,-54 8,-62" fill="none" stroke="${C.red}" stroke-width="4" stroke-linecap="round"/>`
};
const icon=(n,x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${ICON[n]()}</g>`;

// ================= B01
function B01(){let s='';
 s+=T(540,360,'Belajar kimia ni…',{size:88});
 s+=T(540,468,'nak guna bila?',{size:88,fill:C.orange});
 s+=`<circle cx="540" cy="970" r="395" fill="none" stroke="${C.ink}" stroke-opacity=".35" stroke-width="3" stroke-dasharray="4 14" stroke-linecap="round"/>`;
 s+=`<circle cx="540" cy="970" r="330" fill="${C.yellow}" stroke="${C.ink}" stroke-width="6"/>`;
 s+=`<text x="540" y="1160" font-family="Inter, sans-serif" font-size="520" font-weight="900" fill="${C.ink}" text-anchor="middle">?</text>`;
 s+=`<use href="#flask" transform="translate(150 700) rotate(-14) scale(1.25)" color="${C.teal}"/>`;
 s+=`<use href="#flask" transform="translate(930 1260) rotate(14) scale(1.25)" color="${C.orange}"/>`;
 s+=`<use href="#flask" transform="translate(150 1390) rotate(10) scale(.9)" color="${C.blue}"/>`;
 s+=benz(925,690,62,C.teal,5)+benz(130,1020,46,C.blue,4)+benz(920,1480,50,C.green,4)+benz(250,1530,34,C.orange,4);
 [[820,570],[290,520],[820,1420]].forEach(([x,y])=>s+=`<circle cx="${x}" cy="${y}" r="9" fill="${C.ink}" fill-opacity=".5"/>`);
 return frame('B01 Hook: Belajar kimia ni nak guna bila',s)}

// ================= B02
function B02(){let s='';
 s+=T(540,350,'Kau dah guna.',{size:100});
 s+=T(540,460,'Hari ni.',{size:100,fill:C.teal});
 s+=T(540,545,'Hakikatnya, kau dah guna kimia',{size:34,w:500,fill:C.mut});
 s+=T(540,590,'sejak bangun tidur tadi.',{size:34,w:500,fill:C.mut});
 const rows=[['phone','Bateri telefon','tindak balas redoks',C.green,C.pGreen],['soap','Sabun','suka air · suka minyak',C.blue,C.pBlue],['egg','Telur goreng','protein ternyahasli (denaturasi)',C.orange,C.pOrange],['cup','Air panas','gula cepat larut',C.red,C.pRed]];
 const ys=[760,990,1220,1450];
 s+=`<line x1="230" y1="${ys[0]}" x2="230" y2="${ys[3]}" stroke="${C.ink}" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"/>`;
 rows.forEach((r,i)=>{const y=ys[i];
  s+=`<rect x="110" y="${y-90}" width="860" height="180" rx="34" fill="#fff" fill-opacity=".75" stroke="${r[3]}" stroke-width="3"/>`;
  s+=`<circle cx="230" cy="${y}" r="68" fill="${r[4]}" stroke="${r[3]}" stroke-width="6"/>`+icon(r[0],230,y,.95);
  s+=T(335,y-6,r[1],{size:52,a:'start'})+T(335,y+44,r[2],{size:32,w:500,fill:C.mut,a:'start'});
  if(i<3)s+=arrow(230,y+100,230,ys[i+1]-100,C.ink,5,18);});
 return frame('B02 Kau dah guna kimia hari ni',s)}

// ================= B03
function B03(){let s='';
 s+=T(540,350,'Bateri telefon',{size:88});
 s+=T(540,450,'tindak balas redoks',{size:60,fill:C.green});
 // wayar
 s+=`<path d="M310,790V650H492M588,650H770V790" fill="none" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>`;
 s+=icon('phone',540,650,1.35);
 s+=e_(310,720)+e_(405,650)+e_(675,650)+e_(770,720);
 s+=arrow(340,650,368,650,C.ink,5,16)+arrow(715,650,745,650,C.ink,5,16);
 // sel
 s+=`<rect x="170" y="800" width="740" height="380" rx="38" fill="#E8F5EF" stroke="${C.ink}" stroke-width="6"/>`;
 s+=`<rect x="288" y="775" width="44" height="345" rx="8" fill="#AEB8C6" stroke="${C.ink}" stroke-width="5"/>`;
 s+=`<rect x="748" y="775" width="44" height="345" rx="8" fill="#6B7A90" stroke="${C.ink}" stroke-width="5"/>`;
 s+=T(310,860,'−',{size:46,fill:C.ink}).replace('x="310"','x="310"')+'';
 // ion
 const ion=(x,y,sg,col,dir)=>`<circle cx="${x}" cy="${y}" r="20" fill="#fff" stroke="${col}" stroke-width="4"/><text x="${x}" y="${y+9}" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="${col}" text-anchor="middle">${sg}</text>`+arrow(x-dir*10,y+42,x+dir*50,y+42,col,4,14);
 s+=ion(440,900,'+',C.blue,1)+ion(600,1040,'+',C.blue,1)+ion(520,960,'−',C.orange,-1).replace(/y\+42/g,'')+'';
 s+=ion(660,930,'−',C.orange,-1);
 // label
 s+=T(310,1270,'Anod (−)',{size:48,fill:C.green})+T(310,1325,'pengoksidaan',{size:38})+T(310,1372,'kehilangan elektron',{size:28,w:500,fill:C.mut});
 s+=T(770,1270,'Katod (+)',{size:48,fill:C.blue})+T(770,1325,'penurunan',{size:38})+T(770,1372,'penerimaan elektron',{size:28,w:500,fill:C.mut});
 s+=T(540,1520,'Telefon kau boleh hidup',{size:46});
 return frame('B03 Bateri dan tindak balas redoks',s)}

// ================= B04
function B04(){let s='';
 s+=T(540,350,'Molekul sabun',{size:88});
 s+=T(540,430,'satu hujung suka air,',{size:44,w:600,fill:C.mut});
 s+=T(540,486,'satu hujung suka minyak',{size:44,w:600,fill:C.mut});
 // molekul besar
 s+=wave(350,790,810,790,13,4,C.orange,16);
 s+=`<circle cx="300" cy="790" r="64" fill="${C.blue}" stroke="${C.ink}" stroke-width="6"/>`;
 s+=T(300,680,'suka air',{size:42,fill:C.blue})+T(590,680,'suka minyak',{size:42,fill:C.orange});
 s+=`<path d="M300 700V716M590 700V716" stroke="${C.ink}" stroke-width="3"/>`;
 // misel
 const cx=540,cy=1200;
 s+=`<circle cx="${cx}" cy="${cy}" r="335" fill="${C.pBlue}" fill-opacity=".55" stroke="${C.blue}" stroke-opacity=".4" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round"/>`;
 s+=`<circle cx="${cx}" cy="${cy}" r="150" fill="#FFC9A3" stroke="${C.orange}" stroke-width="5"/>`;
 const N=14;
 for(let i=0;i<N;i++){const a=2*Math.PI*i/N-Math.PI/2,p=(r)=>[cx+r*Math.cos(a),cy+r*Math.sin(a)];
  const [hx,hy]=p(268),[t1x,t1y]=p(240),[t2x,t2y]=p(125);
  s+=wave(t1x,t1y,t2x,t2y,6,4,C.orange,9)+`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="27" fill="${C.blue}" stroke="${C.ink}" stroke-width="4"/>`;}
 s+=T(cx,cy+14,'minyak',{size:42});
 s+=T(540,1580,'Sebab tu kotoran boleh tertanggal.',{size:40,w:600});
 return frame('B04 Molekul sabun suka air suka minyak',s)}

// ================= B05
function B05(){let s='';
 s+=T(540,345,'Goreng telur tengah malam?',{size:58,w:600});
 s+=T(540,445,'Itulah denaturasi.',{size:80,fill:C.orange});
 // panel A
 s+=`<rect x="100" y="540" width="880" height="360" rx="36" fill="${C.pTeal}" stroke="${C.teal}" stroke-width="4"/>`;
 s+=T(540,600,'protein asal',{size:40,fill:C.teal});
 const NB=34;let dense=[];
 for(let i=0;i<=2000;i++){const t=2*Math.PI*i/2000;dense.push([540+200*Math.cos(t)+45*Math.cos(3*t+1),745+78*Math.sin(2*t)+30*Math.sin(t+.5)])}
 let cum=[0];for(let i=1;i<dense.length;i++)cum.push(cum[i-1]+Math.hypot(dense[i][0]-dense[i-1][0],dense[i][1]-dense[i-1][1]));
 let pts=[];for(let k=0;k<NB;k++){const tg=cum[cum.length-1]*k/NB;let j=cum.findIndex(c=>c>=tg);pts.push(dense[Math.max(j,0)])}
 let d='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z';
 s+=`<path d="${d}" fill="none" stroke="${C.teal}" stroke-width="6" stroke-linejoin="round" opacity=".75"/>`;
 pts.forEach(p=>s+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="13" fill="${C.teal}" stroke="${C.ink}" stroke-width="3"/>`);
 // haba
 s+=`<path d="M0,-52C10,-30 34,-18 34,12C34,36 18,52 0,52C-20,52 -34,36 -34,14C-34,-2 -26,-12 -18,-22C-14,-8 -8,-4 -4,-6C-6,-26 -2,-40 0,-52Z" transform="translate(540 1005) scale(1.15)" fill="${C.red}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><path d="M0,10C10,20 14,34 0,44C-14,34 -10,20 0,10Z" transform="translate(540 1005) scale(1.15)" fill="${C.yellow}"/>`;
 s+=T(620,1018,'haba',{size:46,fill:C.red,a:'start'});
 s+=arrow(540,925,540,950,C.ink,6,18).replace(/.*/,'')+arrow(540,1085,540,1135,C.ink,7,24);
 // panel B
 s+=`<rect x="100" y="1160" width="880" height="360" rx="36" fill="${C.pOrange}" stroke="${C.orange}" stroke-width="4"/>`;
 s+=T(540,1222,'ternyahasli (denaturasi)',{size:40,fill:C.orange});
 let q=[];for(let i=0;i<NB;i++){const u=i/(NB-1);q.push([160+760*u,1370+60*Math.sin(u*Math.PI*3)])}
 s+=`<path d="M${q.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')}" fill="none" stroke="${C.orange}" stroke-width="6" stroke-linejoin="round" opacity=".75"/>`;
 q.forEach(p=>s+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="13" fill="${C.orange}" stroke="${C.ink}" stroke-width="3"/>`);
 return frame('B05 Denaturasi protein telur',s)}

// ================= B06
function B06(){let s='';
 s+=T(540,345,'Bancuh air manis?',{size:68,w:600});
 s+=T(540,425,'Gula lebih cepat larut',{size:58});
 s+=T(540,495,'dalam air panas.',{size:58,fill:C.red});
 const r=rng(7);
 const glass=(cx,col,pal,hot)=>{let g='';
  const L=hot?50:22,n=hot?15:7,placed=[];
  g+=`<path d="M${cx-146} 720H${cx+146}L${cx+122} 1140Q${cx+120} 1160 ${cx+100} 1160H${cx-100}Q${cx-120} 1160 ${cx-122} 1140Z" fill="${pal}"/>`;
  let tries=0;while(placed.length<n&&tries++<4000){const x=cx-90+r()*180,y=790+r()*250;if(placed.every(p=>Math.hypot(p[0]-x,p[1]-y)>(hot?52:60)))placed.push([x,y,r()*Math.PI*2])}
  placed.forEach(([x,y,a])=>{const dx=Math.cos(a)*L/2,dy=Math.sin(a)*L/2;g+=`<circle cx="${(x-dx).toFixed(1)}" cy="${(y-dy).toFixed(1)}" r="6" fill="${col}"/>`+arrow(x-dx,y-dy,x+dx,y+dy,col,hot?5:4,hot?15:12)});
  if(hot){g+=`<rect x="${cx-22}" y="1112" width="44" height="44" rx="4" fill="#fff" stroke="${C.ink}" stroke-width="4" stroke-dasharray="6 5"/>`;
   for(let i=0;i<7;i++)g+=`<circle cx="${(cx-85+r()*170).toFixed(1)}" cy="${(1070+r()*70).toFixed(1)}" r="5" fill="${C.ink}" fill-opacity=".55"/>`;
   [-45,0,45].forEach((o,i)=>g+=wave(cx+o,610,cx+o,545,9,1.5,C.red,6,.55));}
  else g+=`<rect x="${cx-38}" y="1084" width="76" height="72" rx="6" fill="#fff" stroke="${C.ink}" stroke-width="5"/><path d="M${cx-38} 1108H${cx+38}" stroke="${C.ink}" stroke-opacity=".25" stroke-width="3"/>`;
  g+=`<path d="M${cx-150} 640L${cx-122} 1140Q${cx-120} 1160 ${cx-100} 1160H${cx+100}Q${cx+120} 1160 ${cx+122} 1140L${cx+150} 640" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><line x1="${cx-146}" y1="720" x2="${cx+146}" y2="720" stroke="${col}" stroke-width="4"/>`;
  g+=T(cx,1245,hot?'Air panas':'Air sejuk',{size:46,fill:col});
  g+=T(cx,1293,hot?'zarah bergerak laju':'zarah bergerak perlahan',{size:28,w:500,fill:C.mut});
  // termometer
  const lv=hot?95:25;
  g+=`<rect x="${cx-11}" y="1335" width="22" height="100" rx="11" fill="#fff" stroke="${C.ink}" stroke-width="4"/><rect x="${cx-5}" y="${1430-lv}" width="10" height="${lv}" fill="${col}"/><circle cx="${cx}" cy="1450" r="21" fill="${col}" stroke="${C.ink}" stroke-width="4"/>`;
  return g};
 s+=glass(300,C.blue,'#CFE3FF',false)+glass(780,C.red,'#FFD5D2',true);
 s+=T(540,1550,'Itu kesan suhu dalam kimia.',{size:40,w:600});
 return frame('B06 Gula larut dalam air panas',s)}

// ================= B07
function B07(){let s='';
 s+=T(540,350,'Kimia bukan sekadar',{size:72});
 s+=T(540,440,'untuk lulus exam.',{size:72,fill:C.teal});
 const cx=540,cy=950;
 const nodes=[['phone',240,650,C.green,C.pGreen,'Bateri'],['soap',840,650,C.blue,C.pBlue,'Sabun'],['egg',240,1250,C.orange,C.pOrange,'Telur'],['cup',840,1250,C.red,C.pRed,'Air panas']];
 nodes.forEach(n=>{s+=`<line x1="${n[1]}" y1="${n[2]}" x2="${cx}" y2="${cy}" stroke="${n[3]}" stroke-width="5" stroke-dasharray="4 12" stroke-linecap="round"/>`});
 s+=`<polygon points="${hex(cx,cy,235)}" fill="#fff" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/>`;
 s+=`<polygon points="${hex(cx,cy,185)}" fill="${C.pYellow}" stroke="${C.yellow}" stroke-width="4" stroke-linejoin="round"/>`;
 s+=`<circle cx="${cx}" cy="${cy}" r="120" fill="none" stroke="${C.ink}" stroke-opacity=".3" stroke-width="3" stroke-dasharray="3 10" stroke-linecap="round"/>`;
 s+=T(cx,cy+22,'Kimia',{size:70,w:800});
 nodes.forEach(n=>{s+=`<circle cx="${n[1]}" cy="${n[2]}" r="100" fill="${n[4]}" stroke="${n[3]}" stroke-width="7"/>`+icon(n[0],n[1],n[2],1.45)+T(n[1],n[2]+148,n[5],{size:38,fill:n[3]})});
 s+=T(540,1475,'Ia cara kau faham apa yang berlaku',{size:42,w:600});
 s+=T(540,1530,'di sekeliling kau.',{size:42,w:600});
 return frame('B07 Kimia bukan sekadar lulus exam',s)}

const files={'B01_hook-nak-guna-bila':B01,'B02_kau-dah-guna-hari-ni':B02,'B03_bateri-tindak-balas-redoks':B03,'B04_molekul-sabun-air-minyak':B04,'B05_denaturasi-protein-telur':B05,'B06_gula-larut-air-panas':B06,'B07_kimia-bukan-sekadar-exam':B07};
for(const [n,f] of Object.entries(files))fs.writeFileSync(path.join(OUT,n+'.svg'),f());
console.log('SVG ok',Object.keys(files).length);
