import type {InteractionDefinition} from './InteractionModel.ts';
export const FLOWER_TIMING={charge:.8,bloom:1,spread:1.8,guide:2.8,restore:1.6} as const;
export type FlowerStage='idle'|keyof typeof FLOWER_TIMING;
export const flowerDuration=(timing:Record<keyof typeof FLOWER_TIMING,number>=FLOWER_TIMING)=>Object.values(timing).reduce((a,b)=>a+b,0);
export interface FlowerInteractionDefinition extends InteractionDefinition {
  response?:{platforms:{x:number;y:number;width:number}[];plants:{x:number;y:number}[]};
}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
/** Presentation clock only. Input, active/cooldown rules and physics remain in D.1. */
export function flowerVisual(elapsed:number|null,idleClock=0,timing:Record<keyof typeof FLOWER_TIMING,number>=FLOWER_TIMING) {
  const breathe=Math.sin(idleClock*1.8),idle={stage:'idle' as FlowerStage,petal:1+breathe*.012,core:1,halo:.18+breathe*.045,radius:.6,energy:0,route:0,fade:0,burst:0};
  if(elapsed===null||elapsed<0)return idle;
  let start=0,stage:FlowerStage='idle',local=0;
  for(const [name,duration] of Object.entries(timing)){if(elapsed<start+duration){stage=name as FlowerStage;local=(elapsed-start)/duration;break;}start+=duration;}
  const q=smooth(local);
  if(stage==='idle')return idle;
  if(stage==='charge')return{...idle,stage,petal:1-.13*q,core:1-.12*q,halo:.2+.7*q,radius:.6-.2*q,energy:q*.4};
  if(stage==='bloom')return{...idle,stage,petal:.87+.31*q+.06*Math.sin(Math.PI*local),core:.88+.22*q,halo:.9,radius:.4+1.05*q,energy:.4+.6*q,burst:local};
  const fade=stage==='restore'?1-q:1;
  return{stage,petal:1+(.18+Math.sin(elapsed*2)*.012)*fade,core:1+.1*fade,halo:idle.halo+((stage==='spread'?.9-.24*smooth(local):.66)-idle.halo)*fade,radius:.6+.85*fade,energy:fade,route:stage==='spread'?q:1,fade,burst:0};
}
/** Fixed curved vine samples, built once; no random points or new paths per activation. */
export function flowerRoute(start:{x:number;y:number},guides:ReadonlyArray<{x:number;y:number}>) {
  const points=[start];let a=start;
  for(const b of guides){const bend={x:(a.x+b.x)/2,y:Math.min(a.y,b.y)-12};for(let j=1;j<=16;j++){const t=j/16,u=1-t;points.push({x:u*u*a.x+2*u*t*bend.x+t*t*b.x,y:u*u*a.y+2*u*t*bend.y+t*t*b.y});}a=b;}
  return points;
}
export function guideStrength(progress:number,index:number,count:number):number {return smooth((progress*(count+1)-index)/1.2);}
