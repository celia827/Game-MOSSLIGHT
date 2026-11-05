import {writeFileSync,readFileSync} from 'node:fs';
import {Level01MapData as map} from '../../src/levels/level01/Level01MapData.ts';
import frames from '../../src/art/b1/frames.json' with {type:'json'};
const rows=map.modules.filter(m=>m.region==='C').map(m=>({id:m.id,x:m.x,y:m.y,width:m.width,height:m.height,profile:m.profile,collision:m.collision,current:Object.entries(frames).find(([,f])=>f.moduleId===m.id)?.[0]??'prototype Graphics',formalSample:Object.values(frames).some(f=>f.moduleId===m.id),ends:true,support:!m.id.startsWith('crown-return-'),windowReturn:m.id.startsWith('crown-return-')}));
writeFileSync('docs/art-b2b/audit-before.json',JSON.stringify(rows,null,2));
writeFileSync('docs/art-b2b/AUDIT-BEFORE.md','# C区铺设前清单\n\n实际数据：'+rows.length+'块；既有B1.1样板3块，其余16块原型。\n\n|ID|位置 x/y|宽×碰撞厚度|当前外观|林窗回落|端部/支撑|\n|---|---|---|---|---|---|\n'+rows.map(r=>`|${r.id}|${r.x}/${r.y}|${r.width}×${r.height}|${r.current}|${r.windowReturn?'是':'否'}|圆润端部 / ${r.support?'背景支撑或叶冠':'轻枝，保持视线'}|`).join('\n')+'\n');
