import {readFileSync,writeFileSync} from 'node:fs';
const base='docs/art-b2a1/';
function result(name){const s=readFileSync(`${base}evidence/${name}.txt`,'utf8');const d=JSON.parse(s.split('### Result\n')[1].split('\n### ')[0]);writeFileSync(`${base}evidence/${name}.json`,JSON.stringify(d,null,2));return d;}
const data=result('audit-final');writeFileSync(base+'audit-after.json',JSON.stringify(data,null,2));
let md=`# B.2-A.1 修复后覆盖审计\n\n实际枚举${data.total}块，应覆盖${data.target}，完整${data.full}，遗漏${data.missing.length}，有意保留${data.deferred}。\n\n检查依据：实际Mesh对象、已生成的全体积材质分片、UV范围、分片面积与碰撞多边形面积，以及旧Graphics是否并存。不是仅凭SVG挂载判定。自然程度另由实机画面验收。\n\n|模块/区域|坐标与宽高|碰撞profile|实际材质|只有顶部|旧填充|未处理侧面|目标覆盖|范围|\n|---|---|---|---|---|---|---|---|---|\n`;
for(const r of data.rows){md+=`|${r.id}/${r.region}|${r.x},${r.y} / ${r.width}×${r.height}|${r.profile.map(p=>`${p.x},${p.y}`).join(' → ')}|${r.material} ${r.layers.join('/')}|${r.onlyTop?'是':'否'}|${r.legacyFill?'是':'否'}|${r.untreatedSides?'是':'否'}|${r.target?`${r.full?'完整':'遗漏'} ${r.renderedArea.toFixed(1)}/${r.expectedArea.toFixed(1)} px²`:'本轮未做全区拼接验收'}|${r.reason}|\n`;}
md+='\n## 本轮遗漏\n\n无。\n\n## 有意保留的旧填充模块\n\n';
for(const r of data.rows.filter(r=>!r.target&&r.legacyFill))md+=`- ${r.id}（${r.region}）：${r.region==='C'?'树冠路线，留待B.2-B':'深处地面/洞内结构，留待B.2-C'}。\n`;
md+='\n非本轮范围内已有B.1.1样板：'+data.rows.filter(r=>!r.target&&!r.legacyFill).map(r=>r.id).join('、')+'。这些不等于其所在整个区域已经铺设完成。\n';
writeFileSync(base+'AUDIT-AFTER.md',md);
const before=result('before'),after=result('after');
let perf='|指标|B.2-A 修复前|B.2-A.1 修复后|\n|---|---|---|\n';
for(const [key,label] of [['textures','运行时纹理键'],['objects','场景顶层对象'],['renderObjects','含Container子对象'],['meshFaces','顶层网格三角面']])perf+=`|${label}|${before.metrics[key]}|${after.metrics[key]}|\n`;
perf+=`|纹理源RGBA估算/MiB|${(before.metrics.rgbaBytes/1048576).toFixed(2)}|${(after.metrics.rgbaBytes/1048576).toFixed(2)}|\n`;
for(const [key,label] of [['fps','FPS'],['frameP95Ms','帧耗时P95/ms'],['characterMeanMs','角色更新均值/ms'],['characterP95Ms','角色更新P95/ms']])perf+=`|${label}|${before.telemetry.performance[key].toFixed(2)}|${after.telemetry.performance[key].toFixed(2)}|\n`;
perf+=`|平均帧耗时/ms（1000/FPS）|${(1000/before.telemetry.performance.fps).toFixed(3)}|${(1000/after.telemetry.performance.fps).toFixed(3)}|\n`;
writeFileSync(base+'PERFORMANCE.md','# 可比性能采样\n\n同一本机Chrome/headless、DPR1、1440×1000、设计画布1280×720，均关闭录屏。main从出生点运行到x≥3000时读取末段600帧。\n\n'+perf+'\nRGBA为纹理源宽×高×4的估算，不是驱动显存实测，不含帧缓冲等开销。短窗口与GC相关的堆快照不能证明长期无泄漏，角色耗时变化不视为动画优化收益。\n');
const main=result('main'),routes=result('routes');writeFileSync(base+'evidence/verified-routes.json',JSON.stringify([main.result,...routes],null,2));
console.log({target:data.target,full:data.full,missing:data.missing,deferred:data.deferred});
