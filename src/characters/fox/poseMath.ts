import type {Vec} from './CharacterConfig.ts';
export const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const smooth=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
export const rotate=(p:Vec,pivot:Vec,angle:number):Vec=>{
  const x=p.x-pivot.x,y=p.y-pivot.y,c=Math.cos(angle),s=Math.sin(angle);
  return {x:pivot.x+c*x-s*y,y:pivot.y+s*x+c*y};
};
export function solveKnee(hip:Vec,ankle:Vec,a:number,b:number):Vec {
  const dx=ankle.x-hip.x,dy=ankle.y-hip.y,d=Math.max(.001,Math.hypot(dx,dy));
  const length=Math.min(d,a+b-.00001),along=(a*a-b*b+length*length)/(2*length);
  const height=Math.sqrt(Math.max(0,a*a-along*along));
  return {x:hip.x+dx/d*along+dy/d*height,y:hip.y+dy/d*along-dx/d*height};
}
export const blendPoint=(a:Vec,b:Vec,t:number):Vec=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});
