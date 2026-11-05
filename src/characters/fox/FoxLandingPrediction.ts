import {clamp} from './poseMath.ts';
export interface LandingPrediction {landingReliable:boolean;timeToLand?:number}
/** Read-only ballistic look-ahead. It never changes support or triggers a landing. */
export function predictLanding(x:number,y:number,vx:number,vy:number,gravity:number,below:(x:number,y:number)=>{y:number}|undefined):LandingPrediction {
  if(vy<0)return {landingReliable:false};
  let sample=below(x,y);if(!sample)return {landingReliable:false};
  const time=(height:number)=>(Math.sqrt(vy*vy+2*gravity*Math.max(0,height))-vy)/gravity;
  let t=time(sample.y-y);
  sample=below(x+clamp(vx*t,-64,64),y);
  if(!sample)return {landingReliable:false};
  t=time(sample.y-y);
  return {landingReliable:true,timeToLand:t};
}
