import {FoxBones} from './FoxBones.ts';
import type {BonePose} from './FoxBones.ts';
import type {Vec} from './CharacterConfig.ts';
import {skinFoxPart} from './FoxSkin.ts';
import {mix} from './poseMath.ts';
export interface TailEnvironment {polygons:readonly Vec[][];x:number;y:number;scale:number;facing:number}
export function insidePolygon(p:Vec,polygon:readonly Vec[]):boolean {
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
  }
  return hit;
}
const cubic=(a:Vec,b:Vec,c:Vec,d:Vec,t:number)=>({x:(1-t)**3*a.x+3*(1-t)**2*t*b.x+3*(1-t)*t*t*c.x+t**3*d.x,y:(1-t)**3*a.y+3*(1-t)**2*t*b.y+3*(1-t)*t*t*c.y+t**3*d.y});
// Same continuous outer path as the retained SVG, sampled once for contact fitting.
const curves=[[[108,160],[81,169],[42,155],[23,125]],[[23,125],[12,105],[8,87],[5,89]],[[5,89],[-4,116],[1,149],[24,173]],[[24,173],[48,198],[81,193],[109,177]]] as const;
export const TAIL_OUTLINE:Vec[]=curves.flatMap(c=>Array.from({length:15},(_,i)=>cubic(...c.map(([x,y])=>({x,y})) as [Vec,Vec,Vec,Vec],i/14)));
const samples=[...TAIL_OUTLINE];
for(let y=92;y<193;y+=8)for(let x=0;x<110;x+=8)if(insidePolygon({x,y},TAIL_OUTLINE))samples.push({x,y});
/** Continuous strand contact fitting. Preserve UVs and root; never hide painted regions. */
export class FoxTailContact {
  private probe=new FoxBones();private memory=new Map<string,{x:number;y:number;angle:number}>();private preferred?:{rise:number;spread:number};
  penetration=0;primaryPenetration=0;weight=1;
  fit(bones:FoxBones,pose:BonePose,primary:BonePose,env:TailEnvironment,dt=1/60):void {
    const ids=['tailRoot','tailMiddle','tailFlex','tailTip','tailEnd'] as const;
    const candidate=(weight:number)=>{
      const result={...pose};
      for(const id of ids)result[id]={...pose[id],angle:mix(primary[id]?.angle??0,pose[id]?.angle??0,weight)};
      return result;
    };
    const evaluate=(weight:number)=>{
      this.probe.setPose(candidate(weight));let count=0;
      for(const p of samples) {
        const q=skinFoxPart(this.probe,'tail',p,0,0,0),world={x:env.x+(q.x-124)*env.facing*env.scale,y:env.y+(q.y-210)*env.scale};
        if(env.polygons.some(poly=>insidePolygon(world,poly)))count++;
      }
      return count;
    };
    this.primaryPenetration=evaluate(0);this.weight=1;let best=evaluate(1);
    if(best>this.primaryPenetration)for(const w of [.75,.5,.25,0]) {
      const n=evaluate(w);if(n<=this.primaryPenetration){this.weight=w;best=n;break;}
    }
    bones.setPose(candidate(this.weight));this.penetration=best;
    const baseline=ids.map(id=>({id,p:bones.position(id),angle:bones.worldAngle(id)}));
    let fitted=false;
    if(this.primaryPenetration>0) {
      // Retarget the same painted strand around the upper edge, instead of
      // rotating a rigid tail through the face. Root and texture stay attached.
      let obstacle:readonly Vec[]|undefined;
      for(const p of samples) {
        if(p.x>99)continue;
        const q=skinFoxPart(bones,'tail',p,0,0,0),w={x:env.x+(q.x-124)*env.facing*env.scale,y:env.y+(q.y-210)*env.scale};
        obstacle=env.polygons.find(poly=>insidePolygon(w,poly));if(obstacle)break;
      }
      if(obstacle) {
        const root=bones.position('tailRoot'),worldRoot={x:env.x+(root.x-124)*env.facing*env.scale,y:env.y+(root.y-210)*env.scale};
        const top=Math.min(...obstacle.map(p=>p.y)),behind=-env.facing;
        const restIds=['tailRoot','tailMiddle','tailFlex','tailTip','tailEnd'] as const;
        const restore=()=>bones.setPose(candidate(this.weight));
        const count=()=>samples.filter(p=>p.x<99).reduce((n,p)=>{
          const q=skinFoxPart(bones,'tail',p,0,0,0),w={x:env.x+(q.x-124)*env.facing*env.scale,y:env.y+(q.y-210)*env.scale};
          return n+(env.polygons.some(poly=>insidePolygon(w,poly))?1:0);
        },0);
        const retarget=(rise:number,spread:number)=>{
          restore();const length=150*env.scale,h=Math.min(length*.75,Math.max(30*env.scale,worldRoot.y-top+12*env.scale));
          const offsets=[[0,0],[-3*env.scale,-length*.28],[length*.17*spread,-h-rise],[length*.4*spread,-h-rise-length*.10],[length*.55*spread,-h-rise-length*.32]];
          const points=offsets.map(([dx,dy])=>({x:124+(worldRoot.x+behind*dx-env.x)/(env.facing*env.scale),y:210+(worldRoot.y+dy-env.y)/env.scale}));
          for(let i=0;i<restIds.length;i++) {
            const id=restIds[i],next=restIds[Math.min(4,i+1)],p=points[i],q=points[Math.min(4,i+1)],a=bones.rest(id),b=bones.rest(next);
            const angle=i===4?bones.worldAngle('tailTip'):Math.atan2(q.y-p.y,q.x-p.x)-Math.atan2(b.y-a.y,b.x-a.x);
            bones.poseWorld(id,p,angle);
          }
        };
        let optimum={rise:0,spread:1,n:Infinity};
        if(this.preferred){retarget(this.preferred.rise,this.preferred.spread);optimum={...this.preferred,n:count()};}
        if(optimum.n>0)for(const rise of [0,6*env.scale,12*env.scale])for(const spread of [.8,1,1.2]) {
          retarget(rise,spread);const n=count();if(n<optimum.n)optimum={rise,spread,n};if(n===0)break;
        }
        if(optimum.n<this.penetration){retarget(optimum.rise,optimum.spread);this.penetration=optimum.n;fitted=true;this.preferred={rise:optimum.rise,spread:optimum.spread};}
        else restore();
      }
    }
    if(fitted) {
      for(const {id,p,angle} of baseline) {
        const q=bones.position(id);this.memory.set(id,{x:q.x-p.x,y:q.y-p.y,angle:bones.worldAngle(id)-angle});
      }
    } else if(this.memory.size) {
      const decay=Math.exp(-14*dt);
      for(const {id,p,angle} of baseline) {
        const offset=this.memory.get(id);if(!offset)continue;
        offset.x*=decay;offset.y*=decay;offset.angle*=decay;
        bones.poseWorld(id,{x:p.x+offset.x,y:p.y+offset.y},angle+offset.angle);
      }
    }
  }
  reset():void {this.penetration=0;this.primaryPenetration=0;this.weight=1;this.memory.clear();this.preferred=undefined;}
}

/** Bounded visual avoidance, with no node translations or bone-length changes.
 * Unlike legacy retargeting this only curls the existing chain. It reports any
 * unresolved contact rather than stretching the tail around an impossible gap. */
const AVOIDANCE_POINTS=TAIL_OUTLINE.filter(p=>p.x<99);
export class FoxTailAvoidance {
  private probe=new FoxBones();private curl=0;
  penetration=0;primaryPenetration=0;weight=1;
  fit(bones:FoxBones,env:TailEnvironment,dt:number):void {
    const pose=bones.localPose();
    const points=AVOIDANCE_POINTS;
    const apply=(b:FoxBones,curl:number)=>{
      b.setPose(pose);
      for(const [id,gain] of [['tailRoot',.52],['tailMiddle',-.16],['tailFlex',.08],['tailTip',-.04]] as const)b.setAngle(id,(pose[id]?.angle??0)+curl*gain);
    };
    const count=(b:FoxBones)=>points.reduce((n,p)=>{
      const q=skinFoxPart(b,'tail',p,0,0,0),w={x:env.x+(q.x-124)*env.facing*env.scale,y:env.y+(q.y-210)*env.scale};
      return n+Number(env.polygons.some(poly=>insidePolygon(w,poly)));
    },0);
    this.primaryPenetration=count(bones);let target=0,best=this.primaryPenetration;
    if(best>0)for(let i=1;i<=8;i++){
      apply(this.probe,i/8);const n=count(this.probe);
      if(n<best){best=n;target=i/8;}if(best===0)break;
    }
    // Fast protective curl, slower release; capped rate prevents a wall/turn
    // event from snapping or reversing any link. Collar weld stays on pelvis.
    const maxChange=Math.max(0,Math.min(.05,dt))*(target>this.curl?9:3);
    this.curl+=Math.max(-maxChange,Math.min(maxChange,target-this.curl));
    apply(bones,this.curl);this.penetration=count(bones);this.weight=1-this.curl;
  }
  reset():void {this.curl=0;this.penetration=0;this.primaryPenetration=0;this.weight=1;}
}
