import {buildCollision,surfaceY} from './geometry.ts';
import type {TerrainDefinition,Point} from './types.ts';
export interface Support {id:string;y:number;definition:TerrainDefinition}
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function inside(p:Point,poly:Point[]):boolean {
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if(Math.abs(cross(a,b,p))<1e-6&&p.x>=Math.min(a.x,b.x)-1e-6&&p.x<=Math.max(a.x,b.x)+1e-6&&p.y>=Math.min(a.y,b.y)-1e-6&&p.y<=Math.max(a.y,b.y)+1e-6)return false;
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
  }
  return hit;
}
export class GroundCollision {
  private floor:()=>TerrainDefinition;
  private platforms:()=>readonly TerrainDefinition[];
  private key='';
  private solids:{def:TerrainDefinition;polygon:Point[]}[]=[];
  constructor(floor:()=>TerrainDefinition,platforms:()=>readonly TerrainDefinition[]) {this.floor=floor;this.platforms=platforms;}
  private refresh():void {
    const defs=this.platforms(),key=JSON.stringify(defs);
    if(key===this.key)return;this.key=key;
    this.solids=defs.filter(def=>!def.oneWay).map(def=>({def,polygon:buildCollision(def).polygon}));
  }
  surfaces(x:number):Support[] {
    return [this.floor(),...this.platforms()].flatMap(def=>{
      const y=surfaceY(def,x);return y===undefined?[]:[{id:def.id,y,definition:def}];
    }).sort((a,b)=>a.y-b.y);
  }
  near(x:number,y:number,tolerance:number):Support|undefined {
    return this.surfaces(x).filter(s=>Math.abs(s.y-y)<=tolerance).sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0];
  }
  landing(x:number,oldY:number,newY:number,oldX=x):Support|undefined {
    // Sweep against the surface at BOTH horizontal endpoints. On an uphill
    // landing the new surface can already sit above oldY by a fraction of a pixel.
    return this.surfaces(x).find(s=>oldY<=(this.surface(oldX,s.id)??s.y)+1e-6&&newY>=s.y-1e-6);
  }
  below(x:number,y:number):Support|undefined {return this.surfaces(x).find(s=>s.y>=y-1e-5);}
  surface(x:number,id:string):number|undefined {return this.surfaces(x).find(s=>s.id===id)?.y;}
  /** The bevel is the narrow shoe/ankle region, rather than a wide flat box on slopes. */
  body(x:number,y:number,halfWidth:number,height:number,bevel:number):Point[] {
    // Contact skin tolerates the subpixel difference between the Bezier surface
    // query and its sampled solid outline; the visible sole remains exactly y.
    return [{x:x-halfWidth,y:y-height},{x:x+halfWidth,y:y-height},{x:x+halfWidth,y:y-bevel},{x,y:y-.25},{x:x-halfWidth,y:y-bevel}];
  }
  overlaps(body:Point[]):boolean {
    this.refresh();
    for(const {polygon} of this.solids) {
      if(body.some(p=>inside(p,polygon))||polygon.some(p=>inside(p,body)))return true;
      for(let i=0;i<body.length;i++)for(let j=0;j<polygon.length;j++) {
        const a=body[i],b=body[(i+1)%body.length],c=polygon[j],d=polygon[(j+1)%polygon.length];
        if(cross(a,b,c)*cross(a,b,d)<-1e-8&&cross(c,d,a)*cross(c,d,b)<-1e-8)return true;
      }
    }
    return false;
  }
}
