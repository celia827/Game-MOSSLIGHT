import {CHARACTER_CONFIG as C} from './CharacterConfig.ts';
import type {AnimationState} from './CharacterConfig.ts';
import {clamp,mix,smooth} from './poseMath.ts';
import {FOX_POSES,blendPoses} from './FoxPoseLibrary.ts';
import type {FoxPose} from './FoxPoseLibrary.ts';

export const LOCOMOTION_CONFIG={startDuration:.16,stopDuration:.23,turnDuration:.28,gaitFollow:14,runEnter:88,runExit:76,blendLow:65,blendHigh:110,idleEnter:1,idleExit:3} as const;
export interface LocomotionIntent {axis:number;walking:boolean}
/** Intent and actual travel are separate: a wall cannot manufacture a run cycle.
 * Transitions only shape the common primary pose; they never reset the skeleton,
 * springs, phase clock or collider. Side-view turn uses staggered joint offsets. */
export class FoxLocomotion {
  state:AnimationState='IDLE';runMix=0;age=0;turnDirection=1;
  private priorAxis=0;private priorFacing=1;private lastSpeed=0;private lastIntent=0;
  private brake=0;private active=false;
  step(dt:number,speed:number,facing:number,grounded:boolean,intent?:LocomotionIntent):void {
    const axis=intent?.axis??(Math.abs(speed)>1?Math.sign(speed):0);
    const magnitude=Math.abs(speed),runTarget=intent?.walking?0:smooth((magnitude-LOCOMOTION_CONFIG.blendLow)/(LOCOMOTION_CONFIG.blendHigh-LOCOMOTION_CONFIG.blendLow));
    this.runMix=mix(this.runMix,runTarget,1-Math.exp(-LOCOMOTION_CONFIG.gaitFollow*dt));
    this.age+=dt;
    if(!grounded){this.active=false;this.state='IDLE';}
    else {
      // Key release may last one frame between A and D. Remember intent through
      // braking, otherwise a genuine reversal is mistaken for another start.
      const reverse=axis!==0&&this.lastIntent!==0&&axis!==this.lastIntent&&Math.abs(this.lastSpeed)>8;
      const restTurn=axis!==0&&this.priorAxis===0&&axis!==this.priorFacing&&Math.abs(this.lastSpeed)<8;
      if(reverse||restTurn){this.state='TURN';this.age=0;this.turnDirection=facing;this.active=true;}
      else if(this.state==='TURN'&&facing!==this.priorFacing){this.turnDirection=facing;}
      else if(axis!==0&&this.priorAxis===0&&Math.abs(this.lastSpeed)<8){this.state='START';this.age=0;this.active=true;}
      else if(axis===0&&this.priorAxis!==0&&Math.abs(this.lastSpeed)>8){this.state='STOP';this.age=0;this.brake=clamp(Math.abs(this.lastSpeed)/C.maxSpeed,.3,1);this.active=true;}
      const duration=this.state==='START'?LOCOMOTION_CONFIG.startDuration:this.state==='STOP'?LOCOMOTION_CONFIG.stopDuration:LOCOMOTION_CONFIG.turnDuration;
      if(this.active&&this.age>=duration)this.active=false;
      if(!this.active){const moving=magnitude>(this.state==='IDLE'?LOCOMOTION_CONFIG.idleExit:LOCOMOTION_CONFIG.idleEnter);
        this.state=moving?(!intent?.walking&&magnitude>(this.state==='RUN'?LOCOMOTION_CONFIG.runExit:LOCOMOTION_CONFIG.runEnter)?'RUN':'WALK'):'IDLE';}
      // A new press cancels a braking overlay without touching the common blend.
      if(this.state==='STOP'&&axis!==0){this.active=false;this.state=this.runMix>.5?'RUN':'WALK';}
    }
    if(axis!==0)this.lastIntent=axis;
    this.priorAxis=axis;this.priorFacing=facing;this.lastSpeed=speed;
  }
  shape(base:FoxPose,facing:number):FoxPose {
    if(!this.active)return base;
    const name=this.state==='START'?'StartPose':this.state==='STOP'?'StopPose':'TurnPose';
    const duration=this.state==='START'?LOCOMOTION_CONFIG.startDuration:this.state==='STOP'?LOCOMOTION_CONFIG.stopDuration:LOCOMOTION_CONFIG.turnDuration;
    const u=clamp(this.age/duration);
    const pulse=(t:number)=>smooth(t/.28)*(1-smooth((t-.35)/.65));
    // Keep gait leg targets; the root shift is absorbed by the same contact IK.
    const p=blendPoses(base,base,0),target=FOX_POSES[name];
    for(const id of ['pelvis','lowerSpine','chest','neck','head','nearShoulder','nearElbow','farShoulder','farElbow'] as const) {
      const head=id==='head'||id==='neck';
      const delay=this.state==='STOP'?(head?.20:id==='chest'?.10:0):(head?0:id==='pelvis'?.15:id==='chest'?.07:.10);
      const weight=pulse(clamp((u-delay)/(1-delay)));
      const strength=this.state==='STOP'?this.brake:1;
      const direction=this.state==='TURN'?this.turnDirection/facing:1;
      const a=p.bones[id]!,b=target.bones[id]!;
      a.angle=mix(a.angle??0,(b.angle??0)*direction,weight*strength*(id.includes('Shoulder')||id.includes('Elbow')?.6:1));
      a.x=(a.x??0)+(b.x??0)*weight*strength*direction;
      a.y=(a.y??0)+(b.y??0)*weight*strength;
    }
    return p;
  }
  get stride():number {return mix(C.walkStride,C.stride,this.runMix);}
  get stance():number {return mix(C.walkStanceFraction,.42,this.runMix);}
  get lift():number {return mix(7,18,this.runMix);}
  get cadence():number{return Math.abs(this.lastSpeed)/this.stride;}
  snapshot() {return {state:this.state,runMix:this.runMix,age:this.age,turnDirection:this.turnDirection,priorAxis:this.priorAxis,priorFacing:this.priorFacing,lastSpeed:this.lastSpeed,lastIntent:this.lastIntent,brake:this.brake,active:this.active};}
  restore(saved:ReturnType<FoxLocomotion['snapshot']>):void {Object.assign(this,saved);}
  reset():void {this.state='IDLE';this.runMix=0;this.age=0;this.priorAxis=0;this.priorFacing=1;this.lastSpeed=0;this.lastIntent=0;this.active=false;this.brake=0;}
}
