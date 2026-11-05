import {mkdirSync,writeFileSync} from 'node:fs';import {detailSvg,backdropSvg} from '../art-b1/templates.mjs';
const dir='public/assets/terrain/cave';mkdirSync(dir,{recursive:true});const frames={};let atlas='';
const P=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const L=(d,c,w=2,o=.5)=>P(d,'none',`stroke="${c}" stroke-width="${w}" opacity="${o}" stroke-linecap="round"`);
function put(id,w,h,x,y,body){const svg=body.startsWith('<svg')?body:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;writeFileSync(`${dir}/${id}.svg`,svg);frames[id]={x,y,width:w,height:h};atlas+=`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg>`;}
for(let i=0;i<2;i++){
 const id=`cave-wall-${i}`,defs=`<defs><radialGradient id="${id}-fade"><stop stop-color="#577b72" stop-opacity=".5"/><stop offset="1" stop-color="#385b55" stop-opacity="0"/></radialGradient></defs>`;
 let body=defs+`<ellipse cx="256" cy="170" rx="256" ry="170" fill="url(#${id}-fade)"/>`;
 for(let j=0;j<5;j++){let x=34+j*99,y=58+((i*53+j*47)%120),w=96+(j%3)*23;body+=P(`M${x-30} ${y+58}Q${x-15} ${y+6} ${x+37} ${y}Q${x+w} ${y+9} ${x+w-8} ${y+82}L${x+w-31} ${y+116}Q${x+20} ${y+133} ${x-30} ${y+58}Z`,['#526e67','#6b8174','#4e716c','#668579','#52766e'][j],`opacity="${.21+(j%3)*.07}"`)+L(`M${x-8} ${y+49}Q${x+25} ${y+13} ${x+w-28} ${y+31}`,'#91a38d',2,.18);}
 body+=L(`M38 36Q94 110 151 119T295 230M151 119Q114 169 83 181`,'#829378',8,.22)+L('M395 0Q376 110 433 165T473 284','#536d59',18,.3);
 put(id,512,320,2+i*516,2,body);
}
let roof='<defs><linearGradient id="c-roof-shade" x2="0" y2="1"><stop stop-color="#2b4944" stop-opacity="0"/><stop offset=".5" stop-color="#3b5b53"/><stop offset="1" stop-color="#617f6d"/></linearGradient></defs>';
roof+=P('M0 0H512V79Q472 99 429 84Q391 117 353 94Q313 137 268 102Q208 123 166 89Q122 111 79 83Q37 101 0 79Z','url(#c-roof-shade)');
roof+=L('M0 59Q52 83 93 66T192 78T294 78T405 69T512 59','#839680',2,.4);
for(const [x,y,s] of [[42,85,.75],[193,92,.48],[345,100,.7],[458,85,.6]])roof+=`<g transform="translate(${x} ${y}) scale(${s})">${detailSvg('roof-root','roots').replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`;
roof='<defs><linearGradient id="roof-side-fade"><stop stop-color="white" stop-opacity="0"/><stop offset=".055" stop-color="white"/><stop offset=".945" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="roof-soft-sides"><rect width="512" height="180" fill="url(#roof-side-fade)"/></mask></defs><g mask="url(#roof-soft-sides)">'+roof+'</g>';
put('cave-roof',512,180,2,326,roof);
let root=backdropSvg('c-root-arch','cave-backdrop').replace('height="256" viewBox="0 0 512 256"','height="320" viewBox="0 0 512 320"').replace('</svg>',P('M32 0Q55 78 117 97Q160 104 171 146Q124 126 94 118Q54 130 24 174Q44 117 62 94Q19 51 32 0Z','#6d8068')+L('M35 5Q62 77 120 101M90 100Q61 114 38 145','#abb38a',3,.4)+P('M483 0Q456 91 415 116Q454 181 486 302L469 319Q436 189 392 128Q357 146 328 144Q383 124 402 99Q452 66 483 0Z','#5c7862')+L('M479 4Q452 78 408 117Q448 193 478 301','#a3ac83',3,.34)+'</svg>');
put('root-arch',512,320,518,326,root);
put('root-tendrils',160,100,518,650,detailSvg('c-tendrils','roots'));
let fungi=detailSvg('c-fungi','moss-mushrooms').replace('</svg>','<g fill="#eadba1"><circle cx="39" cy="35" r="2.2"/><circle cx="63" cy="31" r="2"/><circle cx="82" cy="39" r="1.7"/></g></svg>');put('moss-fungi',160,100,682,650,fungi);
let glow='<defs><radialGradient id="root-warm"><stop stop-color="#dcd39a" stop-opacity=".22"/><stop offset=".4" stop-color="#aac89a" stop-opacity=".11"/><stop offset="1" stop-color="#7fbb9e" stop-opacity="0"/></radialGradient></defs><ellipse cx="256" cy="160" rx="256" ry="160" fill="url(#root-warm)"/>';
put('root-glow',512,320,2,510,glow);
writeFileSync(`${dir}/cave-atlas.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="1032" height="832" viewBox="0 0 1032 832">${atlas}</svg>`);writeFileSync('src/art/cave/frames.json',JSON.stringify(frames,null,2)+'\n');console.log('7 reusable cave background/decor frames; floor reuses accepted surface atlas.');
