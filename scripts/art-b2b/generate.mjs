/** Reuses the accepted B1.1 authoring template; six native branches + one shared support. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {moduleSvg,backdropSvg} from '../art-b1/templates.mjs';
const dir='public/assets/terrain/canopy';mkdirSync(dir,{recursive:true});
const frames={};let body='';
for(const [id,w,h,variant,x,y,seed] of [
 ['branch-short',140,100,'left',2,2,19],['branch-medium',220,100,'right',146,2,47],['branch-rest',280,100,'left',370,2,83],
 ['branch-left',140,100,'left',2,170,109],['branch-end',140,100,'right',146,170,137],['branch-joint',220,120,'joint',290,170,163],
 ['branch-support',160,220,'',654,2,0],
]){
 let s=id==='branch-support'?backdropSvg('c-'+id,id):moduleSvg('c-'+id,w,h,'branch',[[0,0],[w,0]],variant,seed);
 // Round the body ends while retaining the exact [0,w] tread and B1.1 moss/bark language.
 if(id!=='branch-support'){
  const old=s.match(/<clipPath[^>]*><path d="([^"]+)"/)[1];
  const shape=`M0 64L${w} 64Q${w} 82 ${w-13} 94Q${w*.78} 115 ${w*.5} 103Q${w*.2} 119 12 94Q0 87 0 64Z`;
  s=s.split(`d="${old}"`).join(`d="${shape}"`);
 }
 writeFileSync(`${dir}/${id}.svg`,s);frames[id]={x,y,width:w,height:id==='branch-support'?h:h+64,tread:id==='branch-support'?null:64};
 body+=`<svg x="${x}" y="${y}" width="${w}" height="${frames[id].height}" viewBox="0 0 ${w} ${frames[id].height}">${s.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg>`;
}
writeFileSync(`${dir}/canopy-atlas.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="816" height="360" viewBox="0 0 816 360">${body}</svg>`);
writeFileSync('src/art/canopy/frames.json',JSON.stringify(frames,null,2)+'\n');
console.log('B.2-B: 7 reusable resources, 816×360 atlas, 2px gutters. B1.1 assets unchanged.');
