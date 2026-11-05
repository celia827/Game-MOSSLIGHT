import {readFileSync} from 'node:fs';
import {path,line,ellipse} from './svg.mjs';

const f = v => +v.toFixed(2);
// A local generator keeps texture changes from reshuffling every other asset.
function random(seed) { return (lo=0,hi=1) => {seed=(seed*1664525+1013904223)>>>0;return lo+seed/4294967296*(hi-lo);}; }

export function barkTexture(silhouette,cx,id) {
  const r=random(cx*7919);
  let body='';
  for(let i=0;i<32;i++) {
    const x=cx+r(-44,48),y=r(172,600),len=r(20,90),bend=r(-15,15);
    body+=line(`M${f(x)} ${f(y)}q${f(bend)} ${f(len*.3)} ${f(bend*.3)} ${f(len*.63)}t${f(-bend*.3)} ${f(len*.37)}`,i%4?'#355c48':'#ded095',r(.7,1.5),`opacity="${i%4?.3:.42}"`);
    if(i%3===0) body+=path(`M${f(x+4)} ${f(y+5)}q-7 14 1 26q7-11-1-26Z`,'#45684c','opacity=".24"');
  }
  for(let i=0;i<35;i++) {
    const x=cx+r(-39,39),y=r(380,630),s=r(2,7);
    body+=path(`M${f(x)} ${f(y)}q${f(-s)} ${f(-s*1.4)} ${f(-s*1.3)} 0q${f(-s)} ${f(s*.2)} 0 ${f(s)}q${f(s)} ${f(s)} ${f(s*1.4)} ${f(-s*.3)}q${f(s*.5)} ${f(-s*.8)} ${f(-s*.1)} ${f(-s*.7)}Z`,i%3?'#adc181':'#c9c792',`opacity="${r(.22,.5)}"`);
  }
  return `<defs><clipPath id="${id}">${path(silhouette,'#fff')}</clipPath></defs><g clip-path="url(#${id})">${body}</g>`;
}

export function shelfFungi(x,y) {
  let b='';
  for(const [dx,dy,s] of [[0,0,1],[4,17,.7],[-4,29,.45]])b+=`<g transform="translate(${x+dx} ${y+dy}) scale(${s})">${path('M0 1Q11-13 23-8Q30-5 25 0Q9 6 0 1Z','#b78c63','stroke="#5c7250" stroke-width="1.2"')}${path('M1 1Q13-6 27-3Q24 4 7 5Z','#e4c99a')}${line('M5-1Q15-7 23-5','#e6bb83',1.3)}${line('M7 3L11 0 M13 3L16 0 M19 2L22-1','#bda87f',.7)}</g>`;
  return b;
}

// The exact top contour is shared by the soil silhouette and fine grass roots.
const terrainShapes=JSON.parse(readFileSync(new URL('../../src/world/terrain/shapes.json',import.meta.url),'utf8'));
const curves=terrainShapes.ground.top;
const curvePath=cs=>`M${cs[0][0]} ${cs[0][1]}`+cs.map(c=>` C${c.slice(2).join(' ')}`).join('');
export const surface=curvePath(curves);
export const platformSurface=curvePath(terrainShapes.platform.top);
const bez=(a,b,c,d,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d;
export function edgeY(x) {
  const c=curves.find(v=>x<=v[6])??curves.at(-1);
  let lo=0,hi=1;
  for(let i=0;i<20;i++){const t=(lo+hi)/2;if(bez(c[0],c[2],c[4],c[6],t)<x)lo=t;else hi=t;}
  return bez(c[1],c[3],c[5],c[7],(lo+hi)/2);
}

export function soilTexture() {
  const r=random(73724);let b='';
  for(let i=0;i<195;i++) {
    const x=r(0,1280),y=r(92,229),s=r(1,6);
    b+=line(`M${f(x)} ${f(y)}q${f(s)} ${f(-s*.5)} ${f(s*2.4)} ${f(-s*.15)}`,i%3?'#c2ad78':'#273f37',r(.5,1.5),`opacity="${r(.12,.28)}"`);
  }
  for(const [x,len,bend] of [[49,83,18],[283,104,-18],[742,98,-14],[1178,68,-14]]) {
    const y=edgeY(x)+20;
    b+=line(`M${x} ${f(y)}c${bend} 20 ${-bend} 42 ${bend*.6} ${len*.62}q20 25 7 ${len*.38}`,'#b9a777',2,'opacity=".48"');
    b+=line(`M${x+bend*.4} ${f(y+len*.5)}q-20 5-27 24m26-24q18-6 25 6`,'#b9a777',1,'opacity=".4"');
  }
  // Dappled upper soil and occasional embedded slate fragments.
  for(let i=0;i<14;i++) {
    const x=r(20,1240),y=r(116,209),w=r(8,21);
    b+=path(`M${f(x)} ${f(y)}l${f(w*.5)}-6 ${f(w*.9)} 3 ${f(w*.4)} 7-${f(w*.8)} 3Z`,'#577366','opacity=".7"');
    b+=line(`M${f(x+2)} ${f(y)}l${f(w*.55)}-3 ${f(w*.7)} 2`,'#a7ae85',.9,'opacity=".5"');
  }
  return b;
}

export function turfFringe() {
  const r=random(7256);let b='';
  for(let x=0;x<1280;x+=r(4,9)) {
    const y=edgeY(x),len=r(4,14),bend=r(-7,8),w=r(1.4,3.5);
    b+=path(`M${f(x)} ${f(y+2)}q${f(-w)} ${f(-len*.5)} ${f(bend)} ${f(-len)}q${f(w*.2-bend)} ${f(len*.7)} ${f(w)} ${f(len)}Z`,x%3<1?'#dfdf91':x%3<2?'#8fb864':'#aed181');
  }
  for(let x=23;x<1270;x+=r(18,38)) {
    const y=edgeY(x)+9,w=r(5,13),h=r(4,12);
    b+=path(`M${f(x)} ${f(y)}q${f(w*.2)} ${f(h)} ${f(w*.55)} ${f(h*.55)}l2 3q${f(w*.6)}-3 ${f(w*.5)} ${f(-h*.8)}Z`,'#77a564','opacity=".85"');
    b+=line(`M${f(x+2)} ${f(y+2)}q3 5 5 3`,'#b7cf80',1,'opacity=".55"');
  }
  // Sparse light patches, with an irregular outline rather than a smooth stripe.
  for(const x of [210,282,448,578,821,1040,1174]) {
    const y=edgeY(x)+6;
    b+=path(`M${x-21} ${f(y)}q16-5 32-1l-4 3 14 1-8 3-33-2Z`,'#f2e7a5','opacity=".35"');
  }
  return b;
}

export function rockTexture() {
  let b=line('M32 73L62 85L83 107 M121 85L142 81 M123 92L145 88 M214 120L232 112L244 116 M281 90L286 100L277 110','#d2cf9d',1.1,'opacity=".65"');
  b+=line('M84 78L94 92L91 101 M188 87L186 104 M263 101L257 116L262 121','#506d58',1,'opacity=".7"');
  for(const [x,y] of [[50,84],[139,109],[217,103],[298,84],[186,118],[76,96]])b+=path(`M${x} ${y}q-4-4-6 0q-4 5 3 5q6 1 3-5Z`,'#c4c698','opacity=".35"');
  b+=path('M40 61Q47 82 43 91Q56 91 58 75L64 80L65 67Z','#5c9560','opacity=".9"');
  b+=line('M46 67Q47 79 45 83 M250 74Q254 85 250 92','#b8cf82',1.4);
  return b;
}

export function bluebells() {
  let b='';
  for(const [x,y,h,s] of [[24,106,57,.86],[55,110,79,1],[80,113,53,.72]]) {
    b+=line(`M${x} ${y}Q${x-14} ${y-h*.45} ${x-2} ${y-h}`,'#50856a',2);
    b+=path(`M${x-2} ${y-10}Q${x-30} ${y-15} ${x-25} ${y-38}Q${x-2} ${y-30} ${x-2} ${y-10}Z`,'#73aa7b');
    b+=path(`M${x+1} ${y-6}Q${x+24} ${y-11} ${x+29} ${y-31}Q${x+9} ${y-32} ${x+1} ${y-6}Z`,'#94ba7f');
    for(let i=0;i<3;i++)b+=`<g transform="translate(${x-1+i*5} ${y-h+i*14}) scale(${s})">${line('M0 0Q9-6 12 1','#648f78',1.2)}${path('M8 0Q12-9 19-4Q24 0 22 7L26 9Q17 17 8 10L10 7Z','url(#bell)','stroke="#769b9b" stroke-width="1"')}${path('M8 10Q16 5 26 9Q19 15 8 10Z','#cfe4dc')}${line('M14-1L13 6 M18-1L19 5','#d9eee0',.8)}</g>`;
  }
  return b;
}
