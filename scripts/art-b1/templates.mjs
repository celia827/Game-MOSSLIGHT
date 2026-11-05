// Mosslight palette sampled from forest-floor.svg, hollow-oak.svg and river-stones.svg.
const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const line=(d,color,width=1.5,opacity=1)=>path(d,'none',`stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"`);
const grad=(id,a,b)=>`<linearGradient id="${id}" x2="0" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const leaf=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M0 0C-19-8-21-23-5-35C9-25 14-9 0 0Z','#83b57a')}${line('M0-2L-5-30','#d7ebac',1,.7)}</g>`;
export function moduleSvg(id,w,h,kind,points=[[0,0],[w,0]],variant='middle',seed=undefined) {
 let state=seed??1;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const pad=64, H=h+pad, Y=x=>{let i=points.findIndex(p=>p[0]>=x);i=Math.max(1,i);let a=points[i-1],b=points[i];return pad+a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);};
 const top='M'+points.map(([x,y])=>`${x} ${y+pad}`).join('L');
 let body='',defs=grad(id+'-soil','#9b8e5b','#30483e')+grad(id+'-moss','#adca74','#649b58')+grad(id+'-bark','#9ca674','#375c47')+grad(id+'-rock','#9fae9b','#45675f');
 defs+=`<pattern id="${id}-grain" width="128" height="64" patternUnits="userSpaceOnUse">${line('M8 22q15-5 28 0m44 28q15-4 32 0','#c2ad78',1,.2)}${path('M58 40l9-5 11 3-4 6-12 1Z','#718d77','opacity=".5"')}</pattern>`;
 if(seed!==undefined){let detail='';for(let i=0;i<4;i++){const x=12+random()*220,y=18+random()*214;detail+=path(`M${x} ${y}l9-4 12 3-6 5-10-1Z`,'#718d77','opacity=".4"');}for(let i=0;i<3;i++){const x=8+random()*180,y=12+random()*228;detail+=line(`M${x} ${y}q15-4 31 0`,'#c2ad78',1,.17);}defs=defs.replace(/<pattern[^>]*>[\s\S]*?<\/pattern>/,`<pattern id="${id}-grain" width="256" height="256" patternUnits="userSpaceOnUse">${detail}</pattern>`);}
 let bottom=kind==='branch'?`Q${w*.85} ${pad+42} ${w*.7} ${pad+34}Q${w*.4} ${pad+62} 0 ${pad+32}`:`L${w} ${H}L0 ${H}`;
 let shape=top+`L${w} ${kind==='branch'?pad+32:H}`+bottom+'Z';
 if(kind==='branch'&&variant==='left')shape=top+`Q${w+0} ${pad+26} ${w-12} ${pad+32}Q${w*.55} ${pad+61} 12 ${pad+32}Q0 ${pad+24} 0 ${pad}Z`;
 if(kind==='branch'&&variant==='right')shape=top+`Q${w} ${pad+22} ${w-15} ${pad+32}Q${w*.4} ${pad+60} 0 ${pad+32}Z`;
 defs+=`<clipPath id="${id}-clip">${path(shape,'white')}</clipPath>`;
 body+=path(shape,`url(#${id}-${kind==='branch'?'bark':kind==='rock'?'rock':'soil'})`);
 body+=`<g clip-path="url(#${id}-clip)">`;
 if(kind==='branch') {
   body+=line(`M-10 ${pad+24}Q${w*.3} ${pad+46} ${w*.62} ${pad+26}T${w+10} ${pad+24}`,'#355c48',3,.55);
   body+=line(`M-5 ${pad+15}Q${w*.4} ${pad+28} ${w+8} ${pad+12}`,'#ded095',1.8,.5);
   for(let x=35;x<w;x+=79){body+=`<ellipse cx="${x}" cy="${pad+24}" rx="12" ry="5" fill="#45684c" opacity=".5"/>`;body+=line(`M${x-19} ${pad+24}q17-13 36 0m-33 5q16 6 30 0`,'#b5bd88',1,.65);}
 } else {
   body+=path(shape,`url(#${id}-grain)`);
   if(kind==='rock') {
    // Four unequal facets per 256px tile. The seam occurs inside a wrapping facet.
    for(let tile=-256;tile<=w;tile+=256)for(const [j,offset,span,deep] of [[0,0,63,39],[1,63,45,53],[2,108,86,42],[3,194,62,50]]){let x=tile+offset-22,y=Y(Math.max(0,Math.min(w,x+span/2)))+23;body+=path(`M${x} ${y+16}Q${x+8} ${y-3} ${x+span*.43} ${y-6}L${x+span-4} ${y+5}Q${x+span+8} ${y+22} ${x+span-3} ${y+deep}Q${x+span*.4} ${y+deep+7} ${x+8} ${y+deep-3}Z`,['#718d77','#819b86','#78947f','#8ba18b'][j],`stroke="#4f7166" stroke-width="1.2"`);body+=line(`M${x+9} ${y+13}Q${x+span*.4} ${y-2} ${x+span-12} ${y+7}`,'#c0c2a0',1.8,.55);if(j%2)body+=line(`M${x+span*.65} ${y+17}l-8 12 5 8`,'#456b61',1,.5);}
    body+=line(`M0 ${pad+104}Q${w*.3} ${pad+92} ${w*.5} ${pad+109}T${w} ${pad+104}`,'#a8b7a0',2,.25);
   } else {
    body+=path(top+`L${w} ${Y(w)+40}Q${w*.65} ${pad+56} ${w*.3} ${pad+45}L0 ${Y(0)+40}Z`,'#a49766','opacity=".28"');
    for(let x=seed===undefined?43:28+random()*46,i=0;x<w;x+=seed===undefined?114:90+random()*87,i++){let y=Y(x)+22+(seed===undefined?(i%2)*13:random()*32);body+=line(`M${x} ${y}c-14 19 14 26 2 50m-1-28q-20 3-24 18m26-7q18 1 21 13`,'#c2ad78',2,.55);}
   }
 }
 if(variant==='transition')for(let x=20;x<w;x+=61){let y=Y(x)+8;body+=path(`M${x} ${y}q14 8 9 26q-10 12-15-5q-4-15 6-21Z`,'#77a564');}
 if(variant==='rocksoil')for(let x=18;x<w;x+=83){let y=Y(x)+40;body+=path(`M${x} ${y}q6-14 28-10l22 12-8 22-27 4Z`,'#7d9d83');body+=line(`M${x+5} ${y}l20-5 16 7`,'#c0c2a0',1.5,.6);}
 body+='</g>';
 // Authored tread stays exactly on the collision reference. Fringe is decorative only.
 body+=path(top+`L${w} ${Y(w)+19}`+points.slice().reverse().map(([x,y])=>`L${x} ${y+pad+19}`).join('')+'Z',`url(#${id}-moss)`);
 for(let x=8,i=0;x<w-12;x+=[47,71,38,83][i++%4]){let y=Y(x),d=[4,8,3,6][i%4];body+=path(`M${x} ${y+12}q9-2 13 4q2 ${d}-5 ${d+2}q-9 0-8-${d+1}Z`,'#719f5f','opacity=".7"');}
 body+=line(top,'#dfdf91',2,.9);
 for(let x=10;x<w-8;x+=seed===undefined?19:16+random()*20){let y=Y(x),s=seed===undefined?.48+.24*(1+Math.sin(x*.21)):.45+random()*.5;body+=`<g transform="translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})">`;body+=path(`M${x-6} ${y+3}q1-7-3-10q8 1 9 7q0-12 5-16q3 12 1 16q7-9 13-8q-6 7-8 13Z`,x%2?'#8fb864':'#aed181');body+='</g>';}
 if(kind==='branch') {body+=line(`M${w*.78} ${pad+33}q-14 12-3 27t-7 25`,'#5b8b61',2.5);body+=leaf(w*.78-5,pad+60,.4);if(variant==='joint')body+=path(`M15 ${pad+23}Q42 ${pad+43} 50 ${H}L80 ${H}Q66 ${pad+35} 110 ${pad+15}Z`,'#577755');}
 if(variant==='left'||variant==='right') {let x=variant==='left'?1:w-1;body+=line(`M${x} ${pad+2}q${variant==='left'?8:-8} 25 0 56`,'#355c48',2,.5);}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}"><defs>${defs}</defs><g stroke-linejoin="round">${body}</g></svg>`;
}
export function detailSvg(id,kind) {
 const roots=line('M15 0Q32 25 68 30T120 87M65 30Q44 64 17 80M82 35Q115 40 144 62','#809476',10)+line('M15 0Q32 25 68 30T120 87M65 30Q44 64 17 80','#c0bf8d',2,.55);
 const shrooms=path('M55 88Q62 59 57 41L65 39Q72 63 68 88Z','#d8cda1')+path('M23 42Q33 13 65 20Q88 23 96 45Q63 56 23 42Z','#b78c63')+line('M30 39Q59 20 86 39','#e4c99a',3)+leaf(110,90,.7)+leaf(131,89,.45);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><g stroke-linecap="round" stroke-linejoin="round">${kind==='roots'?roots:shrooms}</g></svg>`;
}

export function backdropSvg(id,kind){
 if(kind==='branch-support')return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="220" viewBox="0 0 160 220"><defs>${grad(id+'-bark','#85986a','#375c47')}</defs>${path('M62 220Q76 145 65 93Q51 45 8 12Q55 26 84 62Q110 25 156 5Q119 47 99 98Q96 154 111 220Z',`url(#${id}-bark)`)}${line('M87 217Q83 152 83 100Q85 70 113 43','#b6b88a',3,.4)}${line('M68 89Q47 57 22 35','#355c48',3,.5)}</svg>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" viewBox="0 0 512 256"><defs><radialGradient id="${id}-fade"><stop stop-color="#83a393" stop-opacity=".15"/><stop offset="1" stop-color="#456f68" stop-opacity="0"/></radialGradient></defs><ellipse cx="256" cy="128" rx="256" ry="128" fill="url(#${id}-fade)"/>${path('M8 190Q32 74 122 36L226 21Q149 53 127 102L64 214Z','#658178','opacity=".38"')}${path('M488 220Q469 90 385 30L305 17Q380 74 399 149L443 235Z','#42675f','opacity=".5"')}${line('M38 152Q74 70 139 53M412 78Q453 139 457 193','#92a38d',3,.23)}${line('M91 48Q115 80 155 88T197 119M154 88Q151 105 133 124','#809476',5,.6)}</svg>`;
}
