import {isCaveTarget} from '../cave/layout';
import type {CanopyProof} from '../canopy/CanopySkin';
import type Phaser from 'phaser';import type {LevelMap} from '../../levels/shared/MapModule';import {buildCollision} from '../../world/terrain/geometry';import {coverageRows,type CoverageProof} from './coverage';
/** QA observer: render-only camera override is restored before the next simulation step. */
export function installCoverageInspector(scene:Phaser.Scene,map:LevelMap,proofs:Map<string,CoverageProof>,canopy=new Map<string,CanopyProof>()):void {
 const host=document.querySelector('.level-dev');if(!host)return;
 const button=document.createElement('button');button.id='coverage-toggle';button.textContent='地形美术覆盖检查';button.setAttribute('aria-pressed','false');host.append(button);
 const panel=document.createElement('section');panel.id='coverage-report';panel.hidden=true;panel.style.cssText='padding:12px;background:#193c35;overflow:auto;color:#dfe9d1;';host.append(panel);
 let graphics:Phaser.GameObjects.Graphics|undefined,labels:Phaser.GameObjects.Text[]=[];let focused:string|undefined,saved:{x:number;y:number;zoom:number}|undefined;
 const rows=()=>{
  const observed=new Map(canopy);
  for(const [id,proof] of canopy){const image=scene.children.getByName(`canopy:${id}`) as Phaser.GameObjects.Image|undefined;
   if(image)observed.set(id,{...proof,x:image.x,tread:image.y+64,width:image.displayWidth,bark:proof.bark&&image.texture.key==='forest-canopy'&&image.frame.name===proof.frame&&image.displayHeight>=120});
  }
  const checkedProofs=new Map(proofs);
  for(const m of map.modules){if(!isCaveTarget(m))continue;const mesh=scene.children.getByName(`cave:${m.id}`) as Phaser.GameObjects.Mesh|undefined,proof=proofs.get(m.id);
   if(proof&&mesh)checkedProofs.set(m.id,{...proof,boundedUV:proof.boundedUV&&mesh.x===m.x&&mesh.y===m.y&&mesh.texture.key==='forest-surface'&&mesh.faces.length>=proof.patches*2});
  }
  return coverageRows(map,checkedProofs,new Set(scene.children.list.filter(o=>o.active&&('visible' in o?o.visible:true)&&('alpha' in o?Number(o.alpha)>0:true)).map(o=>o.name)),observed);
 };
 const publish=()=>{const data=rows(),targets=data.filter(r=>r.target);const report={total:data.length,target:targets.length,full:targets.filter(r=>r.full).length,missing:targets.filter(r=>!r.full).map(r=>r.id),deferred:data.filter(r=>!r.target).length,cave:{target:data.filter(r=>isCaveTarget(map.modules.find(m=>m.id===r.id)!)).length,full:data.filter(r=>r.full&&isCaveTarget(map.modules.find(m=>m.id===r.id)!)).length},canopy:{target:data.filter(r=>r.region==='C').length,full:data.filter(r=>r.region==='C'&&r.full).length,missing:data.filter(r=>r.region==='C'&&!r.full).map(r=>r.id)},rows:data};document.body.dataset.artCoverage=JSON.stringify(report);return report;};
 const clear=()=>{focused=undefined;graphics?.destroy();graphics=undefined;labels.forEach(x=>x.destroy());labels=[];};
 button.onclick=()=>{
  const show=panel.hidden;panel.hidden=!show;button.setAttribute('aria-pressed',String(show));clear();if(!show)return;
  const report=publish();graphics=scene.add.graphics().setDepth(99);
  panel.innerHTML=`<strong>地下 ${report.cave.full}/${report.cave.target} · C区 ${report.canopy.full}/${report.canopy.target} · 总目标 ${report.target} · 完整 ${report.full} · 遗漏 ${report.missing.length} · 有意保留 ${report.deferred}</strong><p>绿：完整覆盖；红：本轮遗漏；灰：后续阶段。定位仅改变观察镜头，角色/碰撞不变，关闭即恢复。</p><button id="coverage-follow">恢复玩家镜头</button><button id="coverage-export">导出覆盖JSON</button><p><a href="/level01/?canopy=prototype">C区原型对照</a> · <a href="/level01/?cave=before">地下铺设前对照</a> · <a href="/level01/">全部正式美术</a></p><p>遗漏：${report.missing.join(', ')||'无'}</p><svg viewBox="0 0 ${map.width} ${map.height}" style="width:100%;background:#102c28" aria-label="美术覆盖全图">${report.rows.map(r=>{const m=map.modules.find(m=>m.id===r.id)!,c=buildCollision(m),color=r.target?(r.full?'#83cf9b':'#ed8c74'):'#53746a';return `<polygon points="${c.polygon.map(p=>`${p.x},${p.y}`).join(' ')}" fill="${color}" fill-opacity=".65" stroke="${color}" stroke-width="4"/>${r.target?`<text x="${r.x+8}" y="${r.y+35}" fill="#f4eed3" font-size="32">${r.id}</text>`:''}`;}).join('')}</svg><table><thead><tr><th>模块/区域</th><th>实际材质/层</th><th>旧填充</th><th>侧面/覆盖</th><th>观察</th></tr></thead><tbody>${report.rows.map(r=>`<tr><td>${r.id}/${r.region}</td><td>${r.material} ${r.layers.join(' / ')}</td><td>${r.legacyFill?'是':'否'}</td><td>${r.target?(r.full?'完整':'遗漏'):'留待B.2-C'}</td><td><button data-cover-focus="${r.id}">定位 ${r.id}</button></td></tr>`).join('')}</tbody></table>`;
  for(const row of report.rows){const m=map.modules.find(m=>m.id===row.id)!,color=row.target?(row.full?0x83cf9b:0xed8c74):0x53746a;graphics.lineStyle(row.target?3:1,color,.85).strokePoints(buildCollision(m).polygon,true);if(row.target)labels.push(scene.add.text(m.x+8,m.y+25,`${m.id} · ${row.full?'完整':'遗漏'}`,{fontSize:'12px',color:row.full?'#c6efb1':'#ffaf92',backgroundColor:'#183c35'}).setDepth(100));}
  panel.querySelector('#coverage-follow')!.addEventListener('click',()=>{focused=undefined;});
  panel.querySelectorAll<HTMLButtonElement>('[data-cover-focus]').forEach(b=>b.onclick=()=>{focused=b.dataset.coverFocus;});
  panel.querySelector('#coverage-export')!.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(publish(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='mosslight-art-coverage.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 };
 scene.events.once('postupdate',publish);
 const pre=()=>{if(!focused||panel.hidden)return;const m=map.modules.find(m=>m.id===focused)!,c=scene.cameras.main,top=m.y+Math.min(...m.profile!.map(p=>p.y)),height=m.y+m.height-top,zoom=Math.min(1,660/height);saved={x:c.scrollX,y:c.scrollY,zoom:c.zoom};c.setZoom(zoom);c.setScroll(Math.max(0,Math.min(map.width-1280/zoom,m.x+m.width/2-640/zoom)),Math.max(0,Math.min(map.height-720/zoom,top+height/2-360/zoom)));};
 const post=()=>{if(saved){scene.cameras.main.setZoom(saved.zoom).setScroll(saved.x,saved.y);saved=undefined;}};
 scene.events.on('prerender',pre);scene.events.on('render',post);scene.events.once('shutdown',()=>{clear();scene.events.off('prerender',pre);scene.events.off('render',post);button.remove();panel.remove();});
}
