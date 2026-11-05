import {FOX_BONES} from './FoxBones.ts';
import {FOX_POSES,blendPoses} from './FoxPoseLibrary.ts';
import type {FoxPose} from './FoxPoseLibrary.ts';
import {clamp} from './poseMath.ts';
/** Absolute targets with time-based damping, never accumulated bone rotations. */
export class FoxAnimationBlender {
  current:FoxPose=blendPoses(FOX_POSES.IdlePose,FOX_POSES.IdlePose,0);
  update(target:FoxPose,dt:number,duration:number,refined=true):FoxPose {
    const next=blendPoses(this.current,target,0);
    for(const {id} of FOX_BONES) {
      const follow=refined?(id==='pelvis'?.88:id==='lowerSpine'?1.04:id==='chest'?1.27:id==='neck'?1.48:id==='head'?1.65:id.includes('Shoulder')?1.14:1):(id==='lowerSpine'?1.08:id==='chest'?1.22:id==='neck'?1.35:id==='head'?1.45:1);
      const t=1-Math.exp(-Math.log(100)*dt/Math.max(.01,duration*follow));
      const a=this.current.bones[id]!,b=target.bones[id]!;
      const rate=id==='lowerSpine'?12:id==='chest'?8:id==='neck'||id==='head'?10:24;
      const delta=(v:number,limit:number)=>refined?clamp(v,-limit*dt,limit*dt):v;
      next.bones[id]={angle:(a.angle??0)+delta(((b.angle??0)-(a.angle??0))*t,rate),x:(a.x??0)+delta(((b.x??0)-(a.x??0))*t,250),y:(a.y??0)+delta(((b.y??0)-(a.y??0))*t,360)};
    }
    if(refined){
      const pitch=(p:FoxPose)=>['pelvis','lowerSpine','chest','neck','head'].reduce((v,id)=>v+(p.bones[id as keyof typeof p.bones]?.angle??0),0);
      // Blend the gaze once in character space, independent of delayed parent joints.
      // The subsequent head spring owns inertial lag, not five compounded filters.
      const gaze=pitch(this.current)+(pitch(target)-pitch(this.current))*(1-Math.exp(-Math.log(100)*dt/Math.max(.01,duration*.75)));
      next.bones.head!.angle=gaze-['pelvis','lowerSpine','chest','neck'].reduce((v,id)=>v+(next.bones[id as keyof typeof next.bones]?.angle??0),0);
    }
    this.current=next;
    return this.current;
  }
  reset(pose:FoxPose=FOX_POSES.IdlePose):void {this.current=blendPoses(pose,pose,0);}
}
