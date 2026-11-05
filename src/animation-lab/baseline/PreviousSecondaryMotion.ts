import type {BoneId,BonePose} from '../../characters/fox/FoxBones.ts';
import {DampedSpring} from '../../characters/fox/DampedSpring.ts';
import {FoxMicroMotion} from '../../characters/fox/FoxMicroMotion.ts';
import type {MotionSignals} from '../../characters/fox/FoxMotionDriver.ts';
import type {MotionTuning} from './PreviousMotionConfig.ts';
import {clamp} from '../../characters/fox/poseMath.ts';
export class FoxSecondaryMotion {
  private springs=new Map<BoneId,DampedSpring>();
  private micro=new FoxMicroMotion();
  private previousArm=new Map<BoneId,number>();
  readonly offsets:Partial<Record<BoneId,number>>={};
  update(primary:BonePose,dt:number,time:number,idle:boolean,s:MotionSignals,c:MotionTuning,intensity:number,refined=true):BonePose {
    const result:BonePose=structuredClone(primary),micro=this.micro.sample(time,idle);
    const add=(id:BoneId,target:number,k:number,z:number,limit:number)=>{
      const spring=this.springs.get(id)??new DampedSpring();this.springs.set(id,spring);
      const offset=spring.step(clamp(target,-limit,limit),dt,k,z,limit)*intensity*((id.includes('Ear')&&!c.ears)||(id.startsWith('tail')&&!c.tail)?0:1);
      this.offsets[id]=offset;result[id]={...result[id],angle:(primary[id]?.angle??0)+offset};return spring;
    };
    // Shared physical causes, different masses and transfer times along each ear.
    const earForce=-s.speed*.00024-s.accelerationX*.000045+s.accelerationY*.000022+s.velocityY*.000025+s.bodyAcceleration*.000014-s.headVelocity*.024;
    for(const [root,middle,tip,asym,gesture] of [
      ['nearEar','nearEarMiddle','nearEarTip',1,micro.near],
      ['farEar','farEarMiddle','farEarTip',.89,micro.far],
    ] as const) {
      const a=add(root,earForce*asym+gesture*.35,c.earSpring*1.5,c.earDamping+.08,refined?.10:.14);
      const b=add(middle,earForce*.65+a.value*.45-a.velocity*.018+gesture*.7,c.earSpring*.82*asym,c.earDamping,refined?.10:.14);
      add(tip,b.value*.55-b.velocity*.025+earForce*.35+gesture,c.earSpring*.42*asym,c.earDamping+.12,refined?.12:.17);
    }
    // Each link receives the preceding link's displacement AND velocity, never a
    // separately phased sinusoid. Release/impact propagates from root to tip.
    const tailForce=s.accelerationX*.000035+s.accelerationY*.000022-s.velocityY*.000018+s.bodyAcceleration*.000028-s.pelvisVelocity*.018-(refined?(s.torsoVelocity??0)*.018:0);
    let parent=add('tailRoot',tailForce+micro.tail*.6,c.tailSpring*1.8,c.tailDamping+.1,refined?.105:.13);
    for(const [id,k,limit] of [['tailMiddle',1.1,.12],['tailFlex',.82,.11],['tailTip',.60,.10],['tailEnd',.42,.08]] as const) {
      parent=add(id,parent.value*.68-parent.velocity*.030+tailForce*.22+micro.tail*.5,c.tailSpring*k,c.tailDamping,refined?limit*.78:limit);
    }
    add('backpack',-s.accelerationX*.000045+s.accelerationY*.000014+s.bodyAcceleration*.000018-(s.torsoVelocity??0)*.014,310,.88,.075);
    add('coatHem',-s.accelerationX*.000035+s.bodyAcceleration*.000022,195,.67,.085);
    for(const id of ['nearWrist','farWrist'] as const) {
      const elbow=id==='nearWrist'?'nearElbow':'farElbow',angle=primary[elbow]?.angle??0,last=this.previousArm.get(elbow)??angle;
      this.previousArm.set(elbow,angle);add(id,-clamp((angle-last)/Math.max(dt,1e-5),-8,8)*.013,270,.74,.09);
    }

    return result;
  }
  reset():void {this.springs.clear();this.micro.reset();this.previousArm.clear();for(const id of Object.keys(this.offsets) as BoneId[])delete this.offsets[id];}
}
