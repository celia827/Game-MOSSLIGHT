import {PICKUP_SECONDS} from './CollectibleModel.ts';
/** Deterministic local animation: one breath, a warm response, then a soft shrink. */
export function collectibleVisual(clock:number,collected:boolean,elapsed:number) {
  if(!collected)return{visible:true,scale:1+Math.sin(clock*2.1)*.035,y:-Math.sin(clock*1.7)*3,alpha:1,halo:.28+Math.sin(clock*2.1)*.055,haloScale:1,spark:0,progress:0};
  const t=Math.max(0,Math.min(1,elapsed/PICKUP_SECONDS)),ease=t*t*(3-2*t);
  return{visible:t<1,scale:t<.2?1+.22*Math.sin(t/.2*Math.PI*.5):1.22*(1-(t-.2)/.8)**2,y:-ease*18,alpha:1-ease,halo:Math.sin(Math.PI*t)*.7,haloScale:1+ease*.65,spark:Math.sin(Math.PI*t),progress:ease};
}
