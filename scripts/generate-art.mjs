import {barkTexture,shelfFungi,surface,platformSurface,edgeY,soilTexture,turfFringe,rockTexture,bluebells} from './art/materials.mjs';
import {path,line,ellipse,grad,radial,svg} from './art/svg.mjs';
import {drawNori} from './art/nori.mjs';
/** Original Mosslight artwork. All geometry is local, deterministic, and editable. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = resolve('public/assets');
let seed = 241026;
const rand = (a = 0, b = 1) => { seed = (seed * 1664525 + 1013904223) >>> 0; return a + seed / 4294967296 * (b - a); };
const n = v => Number(v.toFixed(2));
async function save(folder,name,w,h,body,defs='') { await mkdir(`${out}/${folder}`,{recursive:true}); await writeFile(`${out}/${folder}/${name}.svg`, svg(w,h,body,defs)); }

// Smooth, lobed foliage silhouettes, not geometric stand-ins.
function crown(cx,cy,rx,ry,fill,phase=0) {
  const pts = Array.from({length:24},(_,i) => { const t=i*Math.PI/12; const r=1+.10*Math.sin(i*2.7+phase)+.04*Math.cos(i*4.2);return [n(cx+Math.cos(t)*rx*r),n(cy+Math.sin(t)*ry*r)]; });
  let d=`M${pts[0]}`;
  for(let i=0;i<pts.length;i++){const p0=pts[(i+23)%24],p1=pts[i],p2=pts[(i+1)%24],p3=pts[(i+2)%24];d+=` C${n(p1[0]+(p2[0]-p0[0])/6)},${n(p1[1]+(p2[1]-p0[1])/6)} ${n(p2[0]-(p3[0]-p1[0])/6)},${n(p2[1]-(p3[1]-p1[1])/6)} ${p2}`;}
  return path(d+'Z',fill);
}
function leaf(x,y,s,angle,color,vein=true) {
  const detail=vein ? path('M0-2Q-2-25-7-50C9-37 17-15 0-2Z','#235f4c','opacity=".15"')+
    line('M0-3 Q-2-22-7-45 M-2-13L-12-21 M-2-14L6-25 M-3-24L-14-30 M-3-26L2-36','#d7ebac',.9,'opacity=".35"')+
    line('M-9-43Q-17-32-15-25','#e1e3a3',1.2,'opacity=".35"') : '';
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${angle}) scale(${s})">${path('M0 0 C-20-9-24-30-7-52 C10-40 18-15 0 0Z',color)}${detail}</g>`;
}
function grass(x,y,s,color) {return `<g transform="translate(${n(x)} ${n(y)}) scale(${s})">${path('M-13 0 Q-14-12-22-22 Q-7-19-5-9 Q-6-32 0-39 Q7-20 5-8 Q14-26 25-27 Q15-14 14 0Z',color)}</g>`;}
function fern(x,y,s,angle=0,color='#3f9875') {
  let body=line('M0 0 Q-11-38 3-97','#9fcb83',2);
  for(let i=0;i<8;i++){let yy=-10-i*10,xx=-3-Math.sin(i*.4)*4,sz=(9-i)*2.4;body+=path(`M${xx} ${yy} Q${xx-sz-5} ${yy+2} ${xx-sz-9} ${yy-14} Q${xx-5} ${yy-17} ${xx} ${yy-3}Z`,color);body+=path(`M${xx} ${yy-2} Q${xx+sz+6} ${yy-3} ${xx+sz+7} ${yy-18} Q${xx+4} ${yy-16} ${xx} ${yy-5}Z`,color);body+=line(`M${xx-2} ${yy-4}Q${xx-sz*.6} ${yy-3} ${xx-sz-5} ${yy-12} M${xx+1} ${yy-6}Q${xx+sz*.5} ${yy-7} ${xx+sz+4} ${yy-16}`,'#d0daa1',.7,'opacity=".33"');}
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${s})">${body}</g>`;
}
function flower(x,y,s,color='#f9e8a3') {let b=line('M0 0 Q-4-16 0-28','#51855b',2)+leaf(-1,-8,.24,-65,'#8eb96a',false);for(let a=0;a<360;a+=72)b+=`<g transform="translate(0 -29) rotate(${a})">${path('M0 1 C-10-4-9-14-3-14 C4-15 7-5 0 1Z',color)}</g>`;return `<g transform="translate(${x} ${y}) scale(${s})">${b}${ellipse(0,-30,3.2,3.4,'#d69e4f')}</g>`;}

await save('backgrounds','sky',1280,720,
  path('M0 0H1280V720H0Z','url(#sky)')+ellipse(546,206,540,380,'url(#sunwash)')+
  path('M0 470 Q280 410 590 445 T1280 420V720H0Z','#d4e5b4'),
  grad('sky','#b2dad9','#edf0c8','0%','100%')+radial('sunwash','#fff4c6'));

let clouds='';
for(const [x,y,s,o] of [[282,105,1.1,.6],[782,90,.68,.5],[1115,182,.85,.45],[475,239,.54,.3]]) clouds+=`<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}">${path('M-146 12 C-155-2-126-17-101-14 C-100-33-76-43-52-33 C-27-77 37-67 47-34 C80-49 111-26 109-11 C146-12 161 7 145 15 C75 23-75 28-146 12Z','#fff9df')}</g>`;
await save('backgrounds','clouds',1280,720,clouds);
await save('backgrounds','mountains',1280,720,
 path('M0 397 Q82 310 164 339 Q246 222 344 313 Q419 245 507 331 Q641 192 751 303 Q842 265 908 321 Q1006 210 1109 306 Q1195 259 1280 327V720H0Z','url(#mountainFar)')+
 path('M0 426 Q120 351 224 414 Q330 292 461 390 Q571 341 661 401 Q792 282 927 393 Q1101 318 1280 398V720H0Z','url(#mountainNear)'),
 grad('mountainFar','#9cc7bd','#c3d8bc')+grad('mountainNear','#83b5a5','#c1d5aa'));

let forest='';
for(let i=0;i<30;i++) {let x=i*47-35,h=rand(120,255),y=490,w=rand(22,49);forest+=path(`M${n(x-8)} ${y} Q${n(x+1)} ${n(y-h*.4)} ${n(x-5)} ${n(y-h)} Q${n(x+7)} ${n(y-h-13)} ${n(x+12)} ${n(y-h)} L${n(x+18)} ${y}Z`,'#73a99a');forest+=crown(x,y-h+18,w,h*.27,'#8bb9a3',i);forest+=crown(x-15,y-h+56,w*1.15,h*.24,'#8bb9a3',i+1);}
forest+=path('M0 488 C190 448 318 504 477 459 S786 506 970 467 S1166 449 1280 466V720H0Z','url(#haze)');
await save('backgrounds','distant-forest',1280,720,forest,grad('haze','#c8dbac','#e1e7bd'));

await save('backgrounds','distant-path',1280,720,
path('M0 513 C147 423 252 442 392 489 Q514 459 675 486 Q802 414 954 456 Q1147 399 1280 446V720H0Z','url(#hill)')+
path('M755 472 C692 491 698 504 752 519 C810 534 794 564 721 593 L925 607 C942 557 839 538 797 521 C739 503 742 486 791 470Z','url(#trail)')+
line('M764 481 Q733 497 770 510 M814 537 Q878 563 853 578','#f5e7a4',2,'opacity=".5"'),
grad('hill','#81b793','#b6ce91')+grad('trail','#ced39d','#eff0c2'));

// Atmosphere is a separate, transparent layer, rasterized by the SVG loader.
await save('atmosphere','sunbeams',1280,720,
path('M320-50 L438-50 L1029 634 L780 638Z','url(#beam)')+
path('M448-40 L478-40 L1120 585 L1022 587Z','url(#beam)')+
path('M220-40 L250-40 L608 587 L486 589Z','url(#beam)')+
ellipse(552,306,330,260,'url(#glow)'),
`<linearGradient id="beam" x1="0" y1="0" x2="60%" y2="100%"><stop stop-color="#fff6c5" stop-opacity=".3"/><stop offset=".7" stop-color="#fff7bc" stop-opacity=".13"/><stop offset="1" stop-color="#fff7bc" stop-opacity="0"/></linearGradient>${radial('glow','#fff7ce')}`);
await save('atmosphere','mist',1280,720,
ellipse(662,455,485,74,'url(#fog)')+ellipse(141,418,260,68,'url(#fog)')+ellipse(1131,404,266,54,'url(#fog)'),radial('fog','#e9efd0'));

let motes='';for(let i=0;i<47;i++){const x=rand(130,1200),y=rand(110,542),r=rand(.8,2.2);motes+=ellipse(n(x),n(y),n(r),n(r),'#fff1af',`opacity="${n(rand(.25,.85))}"`);if(i%8===0)motes+=path(`M${n(x)} ${n(y-5)}Q${n(x+1)} ${n(y-1)} ${n(x+5)} ${n(y)}Q${n(x+1)} ${n(y+1)} ${n(x)} ${n(y+5)}Q${n(x-1)} ${n(y+1)} ${n(x-5)} ${n(y)}Q${n(x-1)} ${n(y-1)} ${n(x)} ${n(y-5)}Z`,'#fff8d6');}
await save('atmosphere','pollen',1280,720,motes);

// Midground trunks: different silhouettes, articulated forks, bark and moss.
let grove='';
for(const [x,y,s,c] of [[74,150,1,'#669e87'],[298,208,.65,'#78ab90'],[558,214,.58,'#84b394'],[865,174,.78,'#6ca28b'],[1058,136,.95,'#60957e'],[1260,180,.75,'#679d82']]) {
  grove+=`<g transform="translate(${x} ${y}) scale(${s})">${path('M-20 408 C-9 322-13 212-28 128 L-68 82 L-81 39 L-62 43 L-42 76 L-15 93 L-17 0 L5-4 L13 86 L49 56 L65 7 L79 13 L68 69 L22 128 Q17 280 45 408Z',c)}${line('M-2 374 Q6 246-1 142 M-10 110L-39 91 M19 114L53 72','#b1c391',3,'opacity=".4"')}${crown(-40,18,92,55,c,x)}${crown(39,-8,109,58,c,x+1)}${crown(95,46,78,45,c,x+2)}</g>`;
}
await save('backgrounds','woodland',1280,720,grove);

function canopyPalette(base,light,shadow) {
  let c=crown(111,119,126,83,shadow,2)+crown(244,98,145,89,shadow,4)+crown(341,145,111,62,shadow,8);
  c+=crown(64,74,101,66,base,9)+crown(168,55,126,75,base,6)+crown(301,58,129,86,base,5)+crown(386,102,80,59,base,12);
  c+=crown(118,23,98,50,light,3)+crown(261,6,103,53,light,8);
  for(const [x,y,a] of [[40,86,-19],[134,117,22],[238,91,-14],[324,125,21],[368,76,45]]) { c+=`<g transform="translate(${x} ${y}) rotate(${a})">${line('M-21 3Q0-2 24-9','#acc887',1.2,'opacity=".45"')}${leaf(-9,2,.24,-49,'#b2cf8b')}${leaf(2,-2,.27,54,'#90b878')}${leaf(12,-6,.22,-33,'#c2d995')}</g>`; }
  for(let i=0;i<100;i++) {const x=rand(4,422),y=rand(0,155);c+=leaf(x,y,rand(.09,.19),rand(-110,120),i%3===0?'#b9d17e':'#83b57a',false);}
  for(const [x,y,s] of [[43,95,.4],[122,152,.35],[214,118,.4],[327,133,.36],[381,66,.34]])c+=line(`M${x-8} ${y}q10-8 23-2 M${x-3} ${y+7}q12-5 19 0`,'#b7d183',s*3,'opacity=".5"');
  return c;
}
const leftTreeSilhouette='M92 642 C126 584 133 475 133 383 C132 314 107 258 83 218 C65 192 25 168 8 139 L18 121 C51 146 72 158 95 167 C64 111 70 76 80 33 L99 37 C87 96 112 145 144 166 C151 106 177 68 213 35 L227 49 C190 95 180 141 184 200 C213 192 240 166 267 134 L284 146 C261 187 228 217 185 234 C177 321 206 392 201 462 C199 536 216 601 257 639 C226 650 205 643 177 627 Q149 655 92 642Z';
let leftTree=path(leftTreeSilhouette,'url(#bark)', 'stroke="#315f52" stroke-width="3"');
leftTree+=path('M102 635 C147 542 139 468 148 395 C159 316 142 240 117 197 C151 235 166 303 168 376 C163 501 176 562 200 632 Q175 618 156 631Z','#b5b97b','opacity=".45"');
leftTree+=path('M164 214 Q202 200 251 164 Q222 212 182 232 L184 285Z','#557e61');
leftTree+=line('M113 599 Q145 528 148 447 M179 586 Q166 524 174 488 M155 338 Q150 291 136 261 M95 180 Q68 164 41 144 M184 183 Q186 123 210 85','#315f50',3);
leftTree+=line('M121 584 Q145 527 143 492 M154 466 Q169 408 153 370 M123 212 L140 243','#d0ca8c',3,'opacity=".65"');
leftTree+=barkTexture(leftTreeSilhouette,155,'willow-bark');
leftTree+=path('M143 379 C118 360 127 324 143 315 C165 330 166 364 143 379Z','#456c55')+path('M143 369 C130 350 137 333 143 329 Q156 350 143 369Z','#2d574b');
leftTree+=path('M113 584 Q111 533 125 503 Q145 519 141 551 Q130 563 131 587Z','#6a9d62');
leftTree+=shelfFungi(191,457);
leftTree+=canopyPalette('url(#leafMid)','url(#leafLight)','url(#leafDark)');
leftTree+=line('M35 184 C21 265 79 259 67 331 C59 373 38 382 47 412','#5d9870',3)+leaf(53,295,.47,-63,'#88b77b')+leaf(52,364,.4,56,'#80b573');
await save('vegetation','old-willow',530,650,`<g transform="translate(40 0)">${leftTree}</g>`,grad('bark','#9aab77','#365b47')+grad('leafMid','#78ac72','#3b805e')+grad('leafLight','#a0c181','#629b67')+grad('leafDark','#387957','#255c48'));

const rightTreeSilhouette='M177 654 C219 591 209 514 216 449 C225 366 234 291 205 237 C175 210 144 220 113 191 Q62 155 45 104 L62 97 C98 155 139 165 178 170 C142 118 150 65 165 23 L184 29 C168 103 194 128 231 156 C242 115 264 80 309 54 L321 72 C267 113 266 164 262 198 C301 168 343 176 379 141 L394 154 C367 194 325 197 281 231 C262 297 295 341 282 423 C271 517 290 604 335 647 Q291 672 261 646 Q219 671 177 654Z';
let rightTree=path(rightTreeSilhouette,'url(#bark)','stroke="#2d5b4b" stroke-width="3"');
rightTree+=path('M228 632 C249 556 235 504 249 422 C261 340 249 299 244 252 C269 286 272 352 262 435 C255 520 265 593 284 640Z','#a6a46f','opacity=".6"');
rightTree+=line('M226 591 Q222 531 233 472 M269 571 Q260 514 269 459 M243 396 Q257 328 238 279 M211 214 Q160 190 130 186 M251 186 Q252 128 284 99','#355d48',3);
rightTree+=barkTexture(rightTreeSilhouette,246,'oak-bark');
rightTree+=path('M242 413 C209 403 208 350 231 332 C258 340 273 390 242 413Z','#5b7852')+path('M239 402 C221 385 221 360 232 350 C247 364 254 387 239 402Z','#315a47')+line('M230 421 Q263 422 273 398','#b4b17a',2);
rightTree+=path('M278 478 C294 454 278 430 285 412 Q312 436 299 478Z','#80a167');
rightTree+=shelfFungi(272,507);
rightTree+=canopyPalette('url(#leafMid)','url(#leafLight)','url(#leafDark)');
rightTree+=line('M347 171 C319 211 372 257 334 302 C318 320 325 344 340 357','#7cab6c',3)+leaf(340,233,.4,-65,'#93b978')+leaf(339,286,.5,53,'#84b271');
await save('vegetation','hollow-oak',530,670,`<g transform="translate(40 0)">${rightTree}</g>`,grad('bark','#9ca674','#375c47')+grad('leafMid','#6ca46e','#377b58')+grad('leafLight','#99be7c','#5c9864')+grad('leafDark','#357655','#265e47'));

// A slimmer, curved birch gives the inner grove a different rhythm.
let birch=path('M111 484 C130 413 112 339 134 267 C153 203 151 151 127 103 Q103 76 84 46 L96 35 Q119 70 145 79 Q148 41 169 8 L182 17 Q158 70 175 120 Q196 92 224 77 L234 90 Q193 126 184 164 C188 231 161 278 159 320 C155 383 173 441 187 484Z','url(#birch)');
birch+=line('M133 454 Q151 408 141 359 M152 295 Q177 214 165 171 M112 71L144 102','#7d9e73',3);
for(let i=0;i<13;i++){let y=152+i*23,x=154-Math.sin(i*.6)*10;birch+=path(`M${x-11} ${y}q15-5 24 1q-13 6-24 1Z`,'#648c6c','opacity=".7"');}
birch+=crown(79,72,75,48,'#73ab76',6)+crown(177,44,99,57,'#85b67c',8)+crown(237,98,78,48,'#659d70',2)+crown(152,9,76,38,'#a2c585',5);
for(let i=0;i<30;i++)birch+=leaf(rand(30,270),rand(10,112),.15,rand(-90,90),'#bed491',false);
// Transparent bleed preserves the existing crown instead of slicing its top flat.
await save('vegetation','silver-birch',370,554,`<g transform="translate(20 64)">${birch}</g>`,grad('birch','#d1cc92','#88a67c'));

let shrub=crown(62,76,60,38,'#397f5d',4)+crown(133,66,72,48,'#438b62',8)+crown(212,82,68,39,'#397f5d',11)+crown(107,43,60,32,'#6aa467',7)+crown(174,48,56,32,'#579b63',9);
for(let i=0;i<65;i++)shrub+=leaf(rand(12,270),rand(35,106),rand(.12,.26),rand(-95,100),i%3?'#8ab96f':'#acc77c',false);
for(const [x,y] of [[43,59],[93,78],[169,38],[229,79]])shrub+=ellipse(x,y,3,4,'#e4d18d')+ellipse(x+4,y-4,2,3,'#f7e8a6');
await save('vegetation','woodland-shrub',290,120,shrub);

let groundSide=path(`${surface}V230H0Z`,'url(#soil)');
groundSide+=path('M0 92 C136 76 201 98 298 79 S477 76 556 100 S724 109 814 85 S986 80 1080 91 S1200 76 1280 82V125 C1144 115 1087 143 969 122 S777 143 673 140 S472 111 370 121 S120 133 0 117Z','#8e8958','opacity=".4"');
groundSide+=path('M0 162 C169 137 215 180 370 150 S575 184 711 161 S936 154 1024 174 S1182 148 1280 155V230H0Z','#3b5447','opacity=".48"');
let pebbles='';
for(let i=0;i<150;i++){let x=rand(0,1280),y=rand(105,229),w=rand(2,9),h=rand(1.5,4);pebbles+=path(`M${n(x-w)} ${n(y)}q${n(w*.3)}-${n(h*1.8)} ${n(w)}-${n(h)}q${n(w)}-${n(h)} ${n(w*1.6)} ${n(h)}q-${n(w*.8)} ${n(h)}-${n(w*2.6)} 0Z`,i%3===0?'#a49b69':i%3===1?'#4c6150':'#7a8057','opacity=".65"');}
groundSide+=pebbles;
groundSide+=line('M133 94 C151 119 180 110 193 146 Q200 164 224 172 M177 130Q150 133 137 146 M510 109 Q491 131 516 149 Q535 166 524 195 M514 151Q548 148 560 170 M1024 100 C1005 126 1033 136 1015 163 Q1004 179 1022 192','#b5a06c',3,'opacity=".45"');
groundSide+=soilTexture();
let groundSurface=path(`${surface}L1280 79 C1171 77 1095 91 1022 79 S851 81 773 98 S610 111 536 88 S431 78 368 78 S249 72 187 80 S74 76 0 88Z`,'url(#turf)','stroke="#487650" stroke-width="2"');
groundSurface+=path(`${surface}L1280 58 C1179 51 1124 73 1035 61 S863 61 790 79 S624 94 540 73 S429 54 369 62 S252 56 188 63 S68 56 0 70Z`,'#b5cf75');
groundSurface+=turfFringe();
// The visible support edge is continuous; grass tips remain decorative.
groundSurface+=line(surface,'#628e55',1.6)+line(surface,'#d8df94',1.2,'transform="translate(0 2)"');
const groundDefs=grad('soil','#9b8e5b','#30483e')+grad('turf','#92b86a','#417a50');
await save('terrain','forest-floor-soil',1280,230,groundSide,groundDefs);
await save('terrain','forest-floor-surface',1280,230,groundSurface,groundDefs);
await save('terrain','forest-floor',1280,230,groundSide+groundSurface,groundDefs);

let platformSide=path('M20 54 Q36 33 71 40 L136 32 Q197 27 251 38 L300 30 Q333 36 340 58 L326 91 Q314 112 285 119 L265 147 L219 148 L193 132 Q140 142 101 127 L63 115 L46 87Z','url(#rock)','stroke="#536e54" stroke-width="2.5"');
platformSide+=path('M33 66 L86 76 L115 117 L71 108 L53 88Z','#b4b28a')+path('M93 73 L158 61 L187 84 L162 129 L118 118Z','#a3a982')+path('M192 86 L242 69 L280 80 L258 135 L219 141 L191 125Z','#889b76')+path('M280 76 L326 58 L315 96 L282 114 L271 131Z','#637f64');
platformSide+=line('M89 78 L109 93 L113 117 M153 69L176 85L162 110 M282 82L293 96 M206 110L225 101L247 105','#5f7b62',2);
let platformSurfaceArt=path(`${platformSurface} L345 51 Q320 56 314 69 Q286 63 272 73 Q250 65 234 75 Q208 62 189 71 Q164 60 148 71 Q123 62 109 73 Q78 66 60 75 L36 65 L17 68Z`,'url(#moss)','stroke="#5e8c53" stroke-width="2"');
platformSurfaceArt+=line('M24 44 Q65 30 108 33 Q152 23 191 34 Q235 44 281 32 Q313 27 329 38','#d4df8a',4);
platformSurfaceArt+=path('M65 66 Q75 92 64 108 Q51 91 55 70 M248 71Q261 96 250 108Q237 96 241 73','#74a563');
for(let i=0;i<26;i++)platformSurfaceArt+=grass(30+i*11,32+Math.sin(i*.5)*6,.22,'#a8c979');
platformSide+=rockTexture();
platformSide+=line('M300 54 C281 83 313 104 283 143 M297 96Q277 103 280 120','#577f57',3)+leaf(295,95,.37,56,'#87ae6d')+leaf(288,126,.29,-51,'#92b575');
platformSurfaceArt+=line(platformSurface,'#5c8b53',1.8)+line(platformSurface,'#dce594',1.4,'transform="translate(0 2)"');
const platformDefs=grad('rock','#b6b38b','#6b8868')+grad('moss','#adca74','#649b58');
await save('terrain','mossy-rise-side',360,160,platformSide,platformDefs);
await save('terrain','mossy-rise-surface',360,160,platformSurfaceArt,platformDefs);
await save('terrain','mossy-rise',360,160,platformSide+platformSurfaceArt,platformDefs);

let rocks=path('M4 70 L19 40 L43 24 L87 29 L109 57 L104 73 Q58 86 4 70Z','url(#stone)','stroke="#64836b" stroke-width="2"')+path('M20 42L44 29L77 34L61 57L12 64Z','#c0c2a0')+path('M68 58L87 32L103 57L97 68L72 72Z','#7d9d83')+line('M46 35L61 54L51 69 M84 59L96 56','#77937a',2)+path('M10 62 Q35 52 50 60 Q72 47 97 61 L100 69 Q79 63 58 71 Q29 68 7 73Z','#81a26a');
await save('terrain','river-stones',118,88,rocks,grad('stone','#afbaa0','#718d77'));
let roots=path('M9 48 C62 28 91 37 121 13 Q140 3 144 0 Q150 32 126 43 Q162 40 183 61 L173 67 Q138 48 111 60 Q96 78 59 75 L54 68 Q90 64 99 50 Q62 50 21 61Z','url(#root)','stroke="#576f50" stroke-width="2"')+line('M23 48 Q77 35 109 29 M113 42Q134 45 152 50 M71 68Q100 58 108 47','#c3b17c',3);
await save('terrain','exposed-roots',190,88,roots,grad('root','#a5a06c','#6c8058'));

let fernBody=fern(60,141,1,-25,'#3e9971')+fern(75,140,1.15,14,'#5eae79')+fern(82,141,.83,51,'#83bc7f')+fern(51,140,.65,-57,'#6aaf73')+grass(70,146,.55,'#578b58');
await save('vegetation','fern',155,155,fernBody);
let flowers='';for(const [x,y,s,c] of [[19,87,.65,'#f8edb3'],[40,83,1,'#fff0bd'],[69,89,.76,'#f0dca6'],[88,89,.5,'#e6e7bc']])flowers+=flower(x,y,s,c);flowers+=grass(38,91,.4,'#739c5e')+grass(73,94,.3,'#96b96e');
await save('vegetation','bluebells',120,124,bluebells(),grad('bell','#badbd8','#79aab0'));
await save('vegetation','meadow-flowers',110,100,flowers);
let mushrooms='';for(const [x,y,s] of [[54,94,1],[95,101,.65],[26,101,.49]])mushrooms+=`<g transform="translate(${x} ${y}) scale(${s})">${path('M-8 0 Q-2-20-5-44 L6-44 Q4-19 11 0 Q0 6-8 0Z','#ede0b3','stroke="#b9ad81" stroke-width="1.5"')}${path('M-32-41 C-27-69-10-77 3-75 C20-73 30-55 34-42 Q3-31-32-41Z','url(#cap)','stroke="#9b694e" stroke-width="1.5"')}${path('M-29-41 Q1-47 30-42 Q5-30-29-41Z','#f4d2a0')}${ellipse(-10,-59,4,3,'#f5d8ac')}${ellipse(10,-64,5,3,'#fbe0b3')}${ellipse(21,-51,3,2,'#f2d6a3')}${line('M-21-45Q-6-65 4-67','#efb27a',2)}</g>`;
await save('vegetation','amber-mushrooms',126,112,mushrooms,grad('cap','#dfb16f','#c17d51'));
let glowPlant=ellipse(77,60,74,58,'url(#aura)');
for(const [x,y,s] of [[30,104,.7],[66,113,1],[108,108,.8]])glowPlant+=`<g transform="translate(${x} ${y}) scale(${s})">${line('M0 0 Q-15-31 2-62','#88bca0',3)}${leaf(-2,-16,.47,-70,'#5fae8b')}${leaf(-4,-32,.4,65,'#7abf96')}${path('M1-59 C-13-62-18-78-10-88 Q0-91 6-82 Q17-93 25-82 Q29-67 1-59Z','url(#bloom)')}${line('M3-66 Q0-75-5-79 M7-66L18-78','#ecf9c8',1.5)}</g>`;
await save('vegetation','lantern-blooms',154,127,glowPlant,radial('aura','#c7e8aa')+grad('bloom','#f3edba','#8acfa8'));

let foreground='';
for(const [x,y,s,a,c] of [[5,240,2.2,-21,'#245d4f'],[73,240,2,-37,'#34785b'],[111,254,1.8,-5,'#377e5f'],[168,255,1.45,30,'#468a62'],[35,254,2.2,54,'#418766'],[213,270,1.2,60,'#5c9b68']]) foreground+=leaf(x,y,s,a,c);
foreground+=fern(83,253,1.5,-47,'#3c8b69')+fern(177,275,1.05,26,'#6aa174');
await save('foreground','leaf-frame',280,280,foreground);
let vines='';for(const [x,y,s] of [[36,0,1],[117,-40,.8],[207,-70,1.1]]){vines+=`<g transform="translate(${x} ${y}) scale(${s})">${line('M0-10 C-23 29 24 67 0 104 C-22 140 17 166-4 207','#507e57',3)}${leaf(-3,43,.5,-72,'#77a76d')}${leaf(1,78,.45,56,'#619861')}${leaf(-5,117,.4,-59,'#7aaa70')}${leaf(0,160,.33,63,'#8bb778')}${leaf(-3,199,.27,-38,'#89b479')}</g>`;}
await save('foreground','hanging-vines',260,240,vines);

const nori = drawNori();
await save('characters','nori-fox-idle',200,220,nori.body,nori.defs);
await save('characters','contact-shadow',220,50,ellipse(110,25,106,21,'url(#shadow)'),radial('shadow','#355946'));

console.log('Generated original SVG artwork in public/assets. Seed: 241026.');
