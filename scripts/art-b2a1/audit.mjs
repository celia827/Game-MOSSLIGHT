import {Level01MapData as map} from '../../src/levels/level01/Level01MapData.ts';
import b1 from '../../src/art/b1/frames.json' with {type:'json'};
import {writeFileSync} from 'node:fs';
const portals=['cave-west-return','cave-return'];
const rows=map.modules.map(m=>{const abe=['A','B','E'].includes(m.region),portal=portals.includes(m.id),sample=Object.values(b1).some(f=>f.moduleId===m.id),scope=abe||portal;return {id:m.id,region:m.region,x:m.x,y:m.y,width:m.width,height:m.height,profile:m.profile,collision:m.collision,scope,reason:abe?'A/B/E地表':portal?'主路正常镜头可见洞口坡面及断壁':'B.2-B/C保留',material:abe?'B2A草土网格：全体积已绘制，但大面细节稀疏':sample?'B1.1样板SVG':'原型Graphics纯色体+顶边线',onlyTopMaterial:false,legacyFill:!abe&&!sample,untreatedSides:!abe&&!sample,textureGaps:portal?'整块缺正式表层/侧壁材质':abe?'无几何漏缝；大土层缺进一步层次':'本轮不判定'};});
writeFileSync('docs/art-b2a1/audit-before.json',JSON.stringify({total:rows.length,target:rows.filter(r=>r.scope).length,fullFormalGeometry:rows.filter(r=>r.scope&&!r.legacyFill).length,missing:rows.filter(r=>r.scope&&r.legacyFill).map(r=>r.id),deferred:rows.filter(r=>!r.scope).length,rows},null,2));
let md='# B.2-A.1 修复前覆盖审计\n\n从实际地图与渲染路由枚举35块。正式草土5块已绘制整个多边形，不是只画草顶，但内部层次稀疏；两块D区入口坡面仍走旧Graphics纯色填充，因此主路可见断面漏铺。单纯按A/B/E区域筛选不足以定义视觉范围。\n\n|ID/区域|坐标/宽高|profile相对坐标|当前视觉|仅顶层|旧填充/未处理侧面|缺口/范围|\n|---|---|---|---|---|---|---|\n';
for(const r of rows)md+=`|${r.id}/${r.region}|${r.x},${r.y} / ${r.width}×${r.height}|${r.profile.map(p=>`${p.x},${p.y}`).join(' → ')}|${r.material}|${r.onlyTopMaterial?'是':'否'}|${r.legacyFill?'是':'否'}/${r.untreatedSides?'是':'否'}|${r.textureGaps}；${r.scope?'修复范围':'留待后续'}|\n`;
writeFileSync('docs/art-b2a1/AUDIT-BEFORE.md',md);
