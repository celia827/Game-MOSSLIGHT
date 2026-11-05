import {writeFileSync,mkdirSync} from 'node:fs';
const dir='public/assets/collectibles';mkdirSync(dir,{recursive:true});
const pearl=`<defs>
<linearGradient id="e1-shell" x1=".15" y1=".15" x2=".8" y2="1"><stop stop-color="#e2fff0" stop-opacity=".95"/><stop offset=".42" stop-color="#8adcc3" stop-opacity=".92"/><stop offset="1" stop-color="#368e86" stop-opacity=".95"/></linearGradient>
<radialGradient id="e1-heart"><stop stop-color="#fffce0"/><stop offset=".48" stop-color="#ffe2a0"/><stop offset="1" stop-color="#e8bb65" stop-opacity=".15"/></radialGradient>
<linearGradient id="e1-rim" x2=".8" y2="1"><stop stop-color="#edffe8"/><stop offset="1" stop-color="#a4e3bf" stop-opacity=".28"/></linearGradient></defs>
<path d="M34 5 C32 17 14 29 10 46 C4 65 14 81 31 83 C48 85 60 73 58 56 C57 39 38 27 34 5Z" fill="url(#e1-shell)" stroke="#c6ecd3" stroke-width="1.7"/>
<path d="M31 18 C27 30 16 39 15 51 C14 58 15 63 18 66" fill="none" stroke="url(#e1-rim)" stroke-width="3.6" stroke-linecap="round"/>
<ellipse cx="34" cy="58" rx="20" ry="21" fill="url(#e1-heart)" opacity=".85"/>
<path d="M33 46 C22 54 24 67 33 69 C42 67 45 55 33 46Z" fill="#fff0bb" opacity=".9"/>
<path d="M32 65 Q29 55 34 50 M33 60 Q38 57 40 54" fill="none" stroke="#d1ad61" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>
<path d="M21 71 Q32 77 43 72" fill="none" stroke="#c8f3d3" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>
<ellipse cx="39" cy="37" rx="3.5" ry="5" fill="#f5ffe9" opacity=".67" transform="rotate(-24 39 37)"/>`;
const halo=`<defs><radialGradient id="e1-glow"><stop stop-color="#fff2bc" stop-opacity=".75"/><stop offset=".28" stop-color="#d3edb3" stop-opacity=".5"/><stop offset=".65" stop-color="#9ce3cb" stop-opacity=".18"/><stop offset="1" stop-color="#9ce3cb" stop-opacity="0"/></radialGradient></defs><circle cx="48" cy="48" r="47" fill="url(#e1-glow)"/>`;
const spark=`<path d="M12 1 Q13 10 23 12 Q14 13 12 23 Q11 14 1 12 Q10 11 12 1Z" fill="#fff0bc" opacity=".95"/><circle cx="12" cy="12" r="2.5" fill="#fffde7"/>`;
const frames={'dew-pearl':{x:2,y:2,width:64,height:88},'dew-halo':{x:70,y:2,width:96,height:96},'dew-spark':{x:170,y:2,width:24,height:24}};
const pieces={'dew-pearl':pearl,'dew-halo':halo,'dew-spark':spark};
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>\n`;
for(const[id,f]of Object.entries(frames))writeFileSync(`${dir}/${id}.svg`,svg(f.width,f.height,pieces[id]));
writeFileSync(`${dir}/dewdrop-atlas.svg`,svg(200,100,Object.entries(frames).map(([id,f])=>`<g transform="translate(${f.x} ${f.y})">${pieces[id]}</g>`).join('')));
writeFileSync('src/collectibles/frames.json',JSON.stringify(frames,null,2)+'\n');
console.log('E1: 3 reusable SVG frames, one 200×100 shared atlas');
