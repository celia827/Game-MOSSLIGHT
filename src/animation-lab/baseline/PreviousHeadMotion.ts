import type {BonePose} from '../../characters/fox/FoxBones.ts';
import type {AnimationPhase} from '../../characters/fox/FoxPoseLibrary.ts';
import {ANIMATION_CONFIG as A} from '../../characters/fox/FoxPoseLibrary.ts';
import {DampedSpring} from '../../characters/fox/DampedSpring.ts';
import {clamp,mix,smooth} from '../../characters/fox/poseMath.ts';
export interface HeadContext {phase:AnimationPhase;time:number;gait:number;speed:number;velocityY:number;preparation:number;landAge:number;strength:number;scaleRatio:number}
/** One absolute cervical pitch target, one damped response, then local conversion.
 * Head skin and ears rotate about the jaw/neck connection, never the face center. */
export class FoxHeadMotion {
  private spring=new DampedSpring();private chest=0;
  update(pose:BonePose,dt:number,c:HeadContext,intensity=1,inertia=1,_refined=true):BonePose {
    const result=structuredClone(pose);
    const torso=(pose.pelvis?.angle??0)+(pose.lowerSpine?.angle??0)+(pose.chest?.angle??0);
    const angularSpeed=dt?clamp((torso-this.chest)/dt,-8,8):0;this.chest=torso;
    let target=torso+(pose.neck?.angle??0)+(pose.head?.angle??0);
    if(c.phase==='IDLE'){
      const observation=smooth((c.time%9.7-5.3)/.45)*(1-smooth((c.time%9.7-6.3)/.7));
      target+=.006*Math.sin(c.time*Math.PI*2/3.6-.4)-.026*observation;
    }
    // Counter the step's chest bob while retaining the authored forward gaze.
    if(c.phase==='RUN'||c.phase==='WALK')target-=.010*Math.sin(c.gait*Math.PI*4-.5);
    if(c.phase==='LAND_IMPACT')target+=c.strength*.035*Math.sin(clamp((c.landAge-.028)/.11)*Math.PI);
    const primary=clamp(target,A.headUpLimit,A.headDownLimit);
    // A short neck only needs a small angular recoil. Critical damping prevents
    // the large head from swinging repeatedly after landings or rapid turns.
    const delayed=clamp(primary-clamp(angularSpeed*(c.phase==='ANTICIPATION'?.002:.006)*inertia,-.04,.04),A.headUpLimit,A.headDownLimit);
    const omega=(c.phase==='ANTICIPATION'?64:c.phase==='TAKEOFF'?40:c.phase==='LAND_IMPACT'?26:c.phase==='LAND_RECOVER'?23:34)/(1+.25*(inertia-1));
    const pitch=this.spring.step(delayed,dt,omega*omega,1.02,.45);
    const enabled=clamp(intensity,0,1),angle=mix(primary,pitch,clamp(inertia));
    result.head={...result.head,angle:angle*enabled-torso-(result.neck?.angle??0),
      x:(pose.head?.x??0)+enabled*clamp(-this.spring.velocity*.10,-.55,.55),
      y:(pose.head?.y??0)+enabled*(c.phase==='IDLE'?.12*Math.sin(c.time*Math.PI*2/3.6-.5):0)};
    return result;
  }
  reset():void {this.spring.reset();this.chest=0;}
}
