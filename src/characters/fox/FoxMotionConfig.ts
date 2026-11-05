import {clamp} from './poseMath.ts';
export interface MotionTuning {
  enabled:boolean;headMotion:boolean;ears:boolean;tail:boolean;strength:number;earSpring:number;earDamping:number;
  earStrength:number;tailStrength:number;backpackStrength:number;earLimit:number;tailLimit:number;headLimit:number;backpackLimit:number;headSpring:number;headDamping:number;backpackSpring:number;backpackDamping:number;tailSpring:number;tailDamping:number;headInertia:number;waistBend:number;landingCompression:number;
}
export const MOTION_DEFAULTS:Readonly<MotionTuning>={enabled:true,headMotion:true,ears:true,tail:true,strength:1,earStrength:1,tailStrength:1,backpackStrength:1.15,earLimit:.16,tailLimit:.16,headLimit:.12,backpackLimit:.09,headSpring:900,headDamping:.97,backpackSpring:240,backpackDamping:.82,earSpring:270,earDamping:.64,tailSpring:220,tailDamping:.76,headInertia:1.12,waistBend:1,landingCompression:1};
export const MOTION_RANGES={strength:[0,1.5],earStrength:[0,1.5],tailStrength:[0,1.5],backpackStrength:[0,1.5],earLimit:[.06,.18],tailLimit:[.06,.19],headLimit:[.03,.14],backpackLimit:[.03,.12],headSpring:[500,1800],headDamping:[.8,1.2],backpackSpring:[120,500],backpackDamping:[.6,1.2],earSpring:[100,700],earDamping:[.35,1.2],tailSpring:[60,400],tailDamping:[.4,1.2],headInertia:[0,1.6],waistBend:[.65,1.25],landingCompression:[.65,1.2]} as const;
export function tuneMotion(config:MotionTuning,patch:Partial<MotionTuning>):void {
  if(patch.enabled!==undefined)config.enabled=patch.enabled;
  if(patch.ears!==undefined)config.ears=patch.ears;
  if(patch.tail!==undefined)config.tail=patch.tail;
  if(patch.headMotion!==undefined)config.headMotion=patch.headMotion;
  for(const key of Object.keys(MOTION_RANGES) as (keyof typeof MOTION_RANGES)[]) {
    const value=patch[key];if(value!==undefined&&Number.isFinite(value))config[key]=clamp(value,...MOTION_RANGES[key]);
  }
}
