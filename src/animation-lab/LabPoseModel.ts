import {FoxBones} from '../characters/fox/FoxBones.ts';
import type {RigPartId,Vec} from '../characters/fox/CharacterConfig.ts';
import type {FoxRigPose} from '../characters/fox/FoxRig.ts';
import {LabSkin} from './LabSkin.ts';
import {poseById} from './poses.ts';
import type {LabPoseId} from './poses.ts';

/** Static evaluation only. No FoxAnimationController or PlayerController exists here. */
export class LabPoseModel implements FoxRigPose {
  readonly bones=new FoxBones();
  private skin=new LabSkin(this.bones);
  id:LabPoseId='IDLE';
  headMotion=true;waistBend=1;
  constructor(id:LabPoseId='IDLE'){this.set(id);}
  set(id:LabPoseId):void {
    this.id=id;const pose=poseById(id),bones=structuredClone(pose.bones);
    const pitch=['pelvis','lowerSpine','chest','neck','head'].reduce((sum,id)=>sum+bones[id as keyof typeof bones].angle,0);
    bones.lowerSpine.angle=Math.min(.68,bones.lowerSpine.angle*this.waistBend);
    bones.head.angle=(this.headMotion?pitch:0)-bones.pelvis.angle-bones.lowerSpine.angle-bones.chest.angle-bones.neck.angle;
    this.bones.setPose(bones);
    this.skin.attach();
    pose.feet.forEach((foot,i)=>this.bones.solveLeg(i,foot.sole,foot.roll,0));
  }
  map(id:RigPartId,p:Vec):Vec {return this.skin.map(id,p);}
  alpha(id:RigPartId):number {return id==='blink'?0:1;}
}
