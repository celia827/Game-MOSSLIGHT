import type {BonePose} from './FoxBones.ts';
import type {AnimationPhase} from './FoxPoseLibrary.ts';
import {ANIMATION_CONFIG as A} from './FoxPoseLibrary.ts';
import {DampedSpring} from './DampedSpring.ts';
import {clamp,smooth} from './poseMath.ts';
export interface HeadContext {phase:AnimationPhase;time:number;gait:number;speed:number;velocityY:number;preparation:number;landAge:number;strength:number;scaleRatio:number;accelerationX?:number;spring?:number;damping?:number;limit?:number}
/** Filter absolute gaze, then ADD only its bounded residual to the authored pose.
 * A disabled secondary layer therefore retains every authored head/neck pose. */
export class FoxHeadMotion {
  private spring=new DampedSpring();private primaryPitch=new DampedSpring();private chest=0;private initialized=false;
  readonly offsets={head:0,neck:0};
  update(pose:BonePose,dt:number,c:HeadContext,intensity=1,inertia=1,_refined=true):BonePose {
    const result=structuredClone(pose);
    const torso=(pose.pelvis?.angle??0)+(pose.lowerSpine?.angle??0)+(pose.chest?.angle??0);
    const primary=torso+(pose.neck?.angle??0)+(pose.head?.angle??0);
    if(!this.initialized){this.spring.reset(primary);this.primaryPitch.reset(primary);this.chest=torso;this.initialized=true;}
    const angularSpeed=dt?clamp((torso-this.chest)/dt,-8,8):0;this.chest=torso;
    let micro=0;
    if(c.phase==='IDLE'){
      const observation=smooth((c.time%9.7-5.3)/.45)*(1-smooth((c.time%9.7-6.3)/.7));
      micro=.006*Math.sin(c.time*Math.PI*2/3.6-.4)-.026*observation;
    }
    if(c.phase==='RUN'||c.phase==='WALK')micro-=.010*Math.sin(c.gait*Math.PI*4-.5);
    if(c.phase==='LAND_IMPACT')micro+=c.strength*.035*Math.sin(clamp((c.landAge-.028)/.11)*Math.PI);
    // Cervical coordination is part of the primary layer on BOTH sides of A/B.
    // It removes the brief torso/neck compensation spike at phase boundaries.
    const base=this.primaryPitch.step(clamp(primary,A.headUpLimit,A.headDownLimit),dt,2500*(c.phase==='ANTICIPATION'?2.7:c.phase==='TAKEOFF'?.65:1),1,.48);
    const delayed=clamp(base+micro-clamp(angularSpeed*(c.phase==='ANTICIPATION'?.002:.005)+(c.accelerationX??0)*.000008,-.035,.035),A.headUpLimit,A.headDownLimit);
    const phaseGain=c.phase==='ANTICIPATION'?4.5:c.phase==='TAKEOFF'?1.8:c.phase==='LAND_RECOVER'?.72:1;
    const pitch=this.spring.step(delayed,dt,(c.spring??900)*phaseGain,c.damping??.97,.48);
    const offset=clamp((pitch-base)*inertia*intensity,-(c.limit??.12),c.limit??.12);
    const residual=offset;
    // The short cervical chain shares the recoil; the rigid facial art stays intact.
    this.offsets.neck=residual*.22;this.offsets.head=residual*.78;
    result.neck={...result.neck,angle:(pose.neck?.angle??0)+this.offsets.neck};
    result.head={...result.head,angle:base-torso-(pose.neck?.angle??0)+this.offsets.head,
      x:(pose.head?.x??0)+clamp(-this.spring.velocity*.065*intensity*inertia,-.35,.35)};
    return result;
  }
  reset():void {this.spring.reset();this.primaryPitch.reset();this.chest=0;this.initialized=false;this.offsets.head=0;this.offsets.neck=0;}
}
