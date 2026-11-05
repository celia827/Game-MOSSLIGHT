import {clamp} from '../../characters/fox/poseMath.ts';
export interface MotionTuning {
  enabled:boolean;headMotion:boolean;ears:boolean;tail:boolean;strength:number;earSpring:number;earDamping:number;
  tailSpring:number;tailDamping:number;headInertia:number;waistBend:number;landingCompression:number;
}
export const MOTION_DEFAULTS:Readonly<MotionTuning>={enabled:true,headMotion:true,ears:true,tail:true,strength:1,earSpring:320,earDamping:.58,tailSpring:165,tailDamping:.72,headInertia:1,waistBend:1,landingCompression:1};
export const MOTION_RANGES={strength:[0,1.5],earSpring:[100,700],earDamping:[.35,1.2],tailSpring:[60,400],tailDamping:[.4,1.2],headInertia:[0,1.6],waistBend:[.65,1.25],landingCompression:[.65,1.2]} as const;
export function tuneMotion(config:MotionTuning,patch:Partial<MotionTuning>):void {
  if(patch.enabled!==undefined)config.enabled=patch.enabled;
  if(patch.ears!==undefined)config.ears=patch.ears;
  if(patch.tail!==undefined)config.tail=patch.tail;
  if(patch.headMotion!==undefined)config.headMotion=patch.headMotion;
  for(const key of Object.keys(MOTION_RANGES) as (keyof typeof MOTION_RANGES)[]) {
    const value=patch[key];if(value!==undefined&&Number.isFinite(value))config[key]=clamp(value,...MOTION_RANGES[key]);
  }
}
