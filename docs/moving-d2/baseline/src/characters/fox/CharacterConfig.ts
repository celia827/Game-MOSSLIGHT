export const CHARACTER_CONFIG={
  scale:.8,
  maxSpeed:128,
  walkSpeed:60,
  walkStride:36,
  walkStanceFraction:.64,
  viewportMargin:116,
  bodyHalfWidth:18,
  bodyHeight:164,
  stride:52,
  stanceFraction:.5,
  runBlendRate:12,
  breathPeriod:3.6,
  source:{width:200,height:220,anchor:{x:124,y:210}},
} as const;

export type AnimationState='IDLE'|'WALK'|'RUN'|'START'|'STOP'|'TURN'|'JUMP'|'FALL'|'LAND';
/** Names reserved only; no other actions are implemented. */
export type FutureAnimationState=AnimationState|'ATTACK'|'HIT';
export type AnimationMode='AUTO'|'IDLE'|'WALK'|'RUN'|'JUMP_CYCLE'|'JUMP_ONCE'|'POSE';
export interface Vec {x:number;y:number}
export const RIG_PARTS=[
  {id:'tail',bounds:[-8,84,113,195]},
  {id:'far-leg',bounds:[115,164,151,208]},
  {id:'far-arm',bounds:[119,120,146,170]},
  {id:'pack',bounds:[66,89,108,173]},
  {id:'near-leg',bounds:[104,164,146,214]},
  {id:'coat-side',bounds:[97,108,144,181]},
  {id:'near-arm',bounds:[106,116,130,173]},
  {id:'neck-bridge',bounds:[103,103,141,135]},
  {id:'far-ear',bounds:[103,15,135,58]},
  {id:'near-ear',bounds:[81,5,129,71]},
  {id:'head',bounds:[66,35,186,126]},
  {id:'eyes',bounds:[130,68,153,98]},
  {id:'blink',bounds:[131,77,150,92]},
  {id:'scarf-side',bounds:[93,106,143,145]},
] as const;
export type RigPartId=typeof RIG_PARTS[number]['id'];
