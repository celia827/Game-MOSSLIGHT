import {FOX_BONES} from './FoxBones.ts';
import type {FoxBones,BoneId} from './FoxBones.ts';
import type {Vec} from './CharacterConfig.ts';
import {clamp,smooth} from './poseMath.ts';

export const TAIL_CHAIN=['tailRoot','tailMiddle','tailFlex','tailTip','tailEnd'] as const;
const rest=TAIL_CHAIN.map(id=>FOX_BONES.find(b=>b.id===id)!.rest);
interface Influence {id:BoneId;weight:number}
// This cache holds only immutable bind-space weights, never animated positions.
const weights=new Map<string,readonly Influence[]>();
const catmull=(a:number,b:number,c:number,d:number,t:number)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
// A smooth centerline avoids abrupt X/Y bands across the thick, curved tail.
const curve=Array.from({length:49},(_,i)=>{
  const u=i/12,j=Math.min(3,Math.floor(u)),t=u-j;
  const a=rest[Math.max(0,j-1)],b=rest[j],c=rest[j+1],d=rest[Math.min(4,j+2)];
  return {x:catmull(a.x,b.x,c.x,d.x,t),y:catmull(a.y,b.y,c.y,d.y,t),u};
});

/** Normalized neighboring-joint weights along the original painted tail. The
 * attachment collar is welded to the pelvis, not rotated like a pasted flap. */
export function tailInfluences(p:Vec):readonly Influence[] {
  const key=`${p.x},${p.y}`,cached=weights.get(key);if(cached)return cached;
  let best=Infinity,u=0;
  for(let i=0;i<curve.length-1;i++) {
    const a=curve[i],b=curve[i+1],dx=b.x-a.x,dy=b.y-a.y;
    const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy));
    const distance=(p.x-a.x-dx*t)**2+(p.y-a.y-dy*t)**2;
    if(distance<best){best=distance;u=a.u+(b.u-a.u)*t;}
  }
  const j=Math.min(3,Math.floor(u)),t=u-j;
  // Entire authored closure (x108..109) stays on the pelvis. Flexibility grows
  // outward across the first ~20 source units, under the existing coat overlap.
  const collar=smooth((108-p.x)/20);
  const influences:Influence[]=[{id:'pelvis',weight:1-collar},{id:TAIL_CHAIN[j],weight:(1-t)*collar},{id:TAIL_CHAIN[j+1],weight:t*collar}];
  const result=influences.filter(w=>w.weight>1e-12);
  weights.set(key,result);return result;
}
export function skinTail(bones:FoxBones,p:Vec):Vec {
  let x=0,y=0;
  for(const {id,weight} of tailInfluences(p)){const q=bones.skin(id,p);x+=q.x*weight;y+=q.y*weight;}
  return {x,y};
}
