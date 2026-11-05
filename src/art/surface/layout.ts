import type {MapModule} from '../../levels/shared/MapModule.ts';
import {surfaceY} from '../../world/terrain/geometry.ts';
export const isSurface=(m:MapModule)=>['A','B','E'].includes(m.region);
export const isPortal=(m:MapModule)=>['cave-west-return','cave-return'].includes(m.id);
export const isSurfaceTarget=(m:MapModule)=>isSurface(m)||isPortal(m);
export function seedOf(id:string):number {let h=2166136261;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export interface SurfaceStrip {x0:number;x1:number;y0:number;y1:number;bottom:number;tile:number;u0:number;u1:number;variant:number}
/** Split at BOTH profile corners and material periods. Never bridge a module gap. */
export function surfaceStrips(m:MapModule):SurfaceStrip[]{
 const cuts=new Set([0,m.width,...m.profile!.map(p=>p.x)]);
 for(let x=256;x<m.width;x+=256)cuts.add(x);
 // A horizontal material band may meet the fixed bottom inside a slope segment.
 for(let i=1;i<m.profile!.length;i++){const a=m.profile![i-1],b=m.profile![i];if(a.y===b.y)continue;for(let d=448;d<=m.height-Math.min(a.y,b.y);d+=256){const y=m.height-d,t=(y-a.y)/(b.y-a.y);if(t>0&&t<1)cuts.add(a.x+(b.x-a.x)*t);}}
 const xs=[...cuts].sort((a,b)=>a-b),seed=seedOf(m.id);
 return xs.slice(0,-1).map((x0,i)=>{const x1=xs[i+1],tile=Math.floor(x0/256);return {x0,x1,y0:surfaceY(m,m.x+x0)!-m.y,y1:surfaceY(m,m.x+x1)!-m.y,bottom:m.height,tile,u0:x0-tile*256,u1:x1-tile*256,variant:seedOf(`${seed}:${tile}`)%3};});
}
export function exposedEnds(m:MapModule,all:MapModule[]):[boolean,boolean]{return [!all.some(n=>n.id!==m.id&&isSurfaceTarget(n)&&n.x+n.width===m.x&&surfaceY(n,n.x+n.width)===surfaceY(m,m.x)),!all.some(n=>n.id!==m.id&&isSurfaceTarget(n)&&n.x===m.x+m.width&&surfaceY(n,n.x)===surfaceY(m,m.x+m.width))];}

export function bodyBands(s:SurfaceStrip):{t0:number;t1:number;b0:number;b1:number;depth:number}[]{
 const bands=[];for(let depth=0;depth<Math.max(s.bottom-s.y0,s.bottom-s.y1);depth+=depth===0?448:256){const size=depth===0?448:256;bands.push({t0:Math.min(s.y0+depth,s.bottom),t1:Math.min(s.y1+depth,s.bottom),b0:Math.min(s.y0+depth+size,s.bottom),b1:Math.min(s.y1+depth+size,s.bottom),depth});}return bands;
}
