import shapes from './shapes.json' with { type: 'json' };
import type { Point, TerrainCollision, TerrainDefinition } from './types.ts';

const bezier = (a: number,b: number,c: number,d: number,t: number): number =>
  (1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t*t*c + t**3*d;

export function validateTerrain(def: TerrainDefinition): void {
  if (![def.x,def.y,def.width,def.height].every(Number.isFinite) || def.width <= 0 || def.height <= 0) {
    throw new Error(`Invalid terrain dimensions: ${def.id}`);
  }
  if(def.profile&&(def.profile.length<2||def.profile.some((p,i,a)=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>def.width||p.y>def.height||(i>0&&p.x<=a[i-1].x)))) {
    throw new Error(`Invalid terrain profile: ${def.id}`);
  }
}

/** Queries the authored top, independently of SVG textures and Phaser. */
export function surfaceY(def: TerrainDefinition, worldX: number): number | undefined {
  validateTerrain(def);
  if(!Number.isFinite(worldX))return undefined;
  if(def.profile) {
    const x=worldX-def.x,points=def.profile;
    if(x<points[0].x-1e-7||x>points[points.length-1].x+1e-7)return undefined;
    const localX=Math.max(points[0].x,Math.min(points[points.length-1].x,x));
    const i=Math.max(1,points.findIndex(p=>p.x>=localX));
    const a=points[i-1],b=points[i];
    return def.y+a.y+(b.y-a.y)*Math.max(0,Math.min(1,(localX-a.x)/(b.x-a.x)));
  }
  const shape = shapes[def.kind];
  if(!Number.isFinite(worldX)) return undefined;
  const localX = (worldX - def.x) * shape.width / def.width;
  const curves = shape.top;
  const first=curves[0][0],last=curves[curves.length-1][6];
  // Inverse transforms at resized endpoints can differ by a few machine epsilons.
  if(localX<first-1e-7||localX>last+1e-7) return undefined;
  const x=Math.max(first,Math.min(last,localX));
  const c = curves.find(v => x <= v[6])!;
  let lo = 0, hi = 1;
  for (let i=0;i<32;i++) {
    const t = (lo+hi)/2;
    if (bezier(c[0],c[2],c[4],c[6],t) < x) lo=t; else hi=t;
  }
  return def.y + bezier(c[1],c[3],c[5],c[7],(lo+hi)/2) * def.height / shape.height;
}

/** Reusable world geometry, independent of art textures and engine bodies. */
export function buildCollision(def: TerrainDefinition): TerrainCollision {
  validateTerrain(def);
  if(def.profile) {
    const top=def.profile.map(p=>({x:def.x+p.x,y:def.y+p.y}));
    return {id:def.id,top,polygon:[...top,{x:def.x+def.width,y:def.y+def.height},{x:def.x,y:def.y+def.height}]};
  }
  const shape = shapes[def.kind];
  const transform = (x: number,y: number): Point => ({
    x: def.x+x*def.width/shape.width, y: def.y+y*def.height/shape.height,
  });
  const top: Point[] = [];
  for (const c of shape.top) {
    const steps = Math.max(4,Math.ceil((c[6]-c[0])*def.width/shape.width/8));
    for (let i=top.length ? 1 : 0;i<=steps;i++) {
      const t=i/steps;
      top.push(transform(bezier(c[0],c[2],c[4],c[6],t),bezier(c[1],c[3],c[5],c[7],t)));
    }
  }
  return {id:def.id,top,polygon:[...top,...shape.solidReturn.map(([x,y])=>transform(x,y))]};
}
