import type {LevelMap} from './MapModule.ts';
import {buildCollision} from '../../world/terrain/geometry.ts';

const line=(points:{x:number;y:number}[])=>points.map(p=>`${p.x},${p.y}`).join(' ');
/** This same data-driven overview is exported as a standalone SVG for review. */
export function overviewSvg(map:LevelMap):string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -120 ${map.width+160} ${map.height+240}" role="img" aria-label="晨光林地完整地图拓扑" style="width:100%;height:100%">
  <rect x="-80" y="-120" width="${map.width+160}" height="${map.height+240}" rx="32" fill="#183d36"/>
  ${map.regions.map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="18" fill="#b7d5a4" fill-opacity=".035" stroke="#b7d5a4" stroke-opacity=".18" stroke-dasharray="12 12"/><text x="${r.x+22}" y="${r.y+42}" fill="#dce5c7" font-size="32">${r.id} · ${r.name}</text>`).join('')}
  ${map.modules.map(m=>{const c=buildCollision(m);return `<polygon points="${line(c.polygon)}" fill="${m.region==='D'?'#41615b':'#667851'}" fill-opacity=".7" stroke="#b7cca1" stroke-width="2"/><polyline points="${line(c.top)}" fill="none" stroke="${m.oneWay?'#d0d9af':'#9ebd7e'}" stroke-width="6" ${m.oneWay?'stroke-dasharray="15 7"':''}/>`;}).join('')}
  ${map.routes.map(r=>`<polyline points="${line(r.points)}" fill="none" stroke="${r.color}" stroke-width="9" stroke-linejoin="round" stroke-dasharray="18 10"/>`).join('')}
  ${(map.guides??[]).map(g=>`<polyline points="${line(g.points)}" fill="none" stroke="${g.color}" stroke-width="6" stroke-dasharray="12 14"/>`).join('')}
  ${map.connections.map(c=>`<circle cx="${c.x}" cy="${c.y}" r="16" fill="#203c36" stroke="#f0d998" stroke-width="6"/><text x="${c.x+23}" y="${c.y+55}" fill="#f0dcac" font-size="27">${c.label}</text>`).join('')}
  ${(map.landmarks??[]).map(n=>`<path d="M${n.x} ${n.y-35}l15 15l-15 15l-15-15Z" fill="#f1d0a0"/><text x="${n.x+22}" y="${n.y-30}" fill="#f1d0a0" font-size="28">${n.label}</text>`).join('')}
  <circle cx="${map.spawn.x}" cy="${map.spawn.y}" r="19" fill="#f2e2aa"/><text x="80" y="1020" fill="#f2e2aa" font-size="30">出生点</text>
  <path d="M3580 900V710H3680V900" fill="none" stroke="#f2e2aa" stroke-width="12"/>
  <circle id="map-player" cx="${map.spawn.x}" cy="${map.spawn.y}" r="21" fill="#eea475" stroke="white" stroke-width="5"/>
  <rect id="map-camera" x="0" y="420" width="1280" height="720" fill="none" stroke="white" stroke-opacity=".35" stroke-width="4"/>
  <text x="30" y="-40" fill="#ecedd3" font-size="42">晨光林地 A.1 · ${map.width} × ${map.height} · 碰撞与路线总览</text>
  ${map.routes.map((r,i)=>`<text x="${60+i*890}" y="1800" fill="${r.color}" font-size="32">━━ ${r.label}</text>`).join('')}
  </svg>`;
}
