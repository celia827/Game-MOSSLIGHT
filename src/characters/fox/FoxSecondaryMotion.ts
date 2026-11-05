import type {BoneId,BonePose} from './FoxBones.ts';
import {DampedSpring} from './DampedSpring.ts';
import {FoxMicroMotion} from './FoxMicroMotion.ts';
import type {MotionSignals} from './FoxMotionDriver.ts';
import type {MotionTuning} from './FoxMotionConfig.ts';
import {clamp} from './poseMath.ts';
/** One causal spring bank, evaluated once after the blended primary pose.
 * Offsets are reconstructed every step; no rendered transform feeds back in. */
export class FoxSecondaryMotion {
  private springs=new Map<BoneId,DampedSpring>();
  private packLift=new DampedSpring();
  private micro=new FoxMicroMotion();
  private previousArm=new Map<BoneId,number>();
  readonly offsets:Partial<Record<BoneId,number>>={};
  update(primary:BonePose,dt:number,time:number,idle:boolean,s:MotionSignals,c:MotionTuning,intensity:number,_refined=true):BonePose {
    const result:BonePose=structuredClone(primary),micro=this.micro.sample(time,idle);
    const add=(id:BoneId,target:number,k:number,z:number,limit:number,gain=1)=>{
      const spring=this.springs.get(id)??new DampedSpring();this.springs.set(id,spring);
      // Limit the composed contribution as well as the oscillator state. A UI
      // strength boost cannot exceed the mesh's safe angular envelope.
      const offset=clamp(spring.step(clamp(target,-limit,limit),dt,k,z,limit)*intensity*gain,-limit,limit);
      this.offsets[id]=offset;result[id]={...result[id],angle:(primary[id]?.angle??0)+offset};return spring;
    };
    const earForce=-s.speed*.00018-s.accelerationX*.000055+s.accelerationY*.000030+s.velocityY*.000020+s.bodyAcceleration*.000090-s.headVelocity*.032;
    for(const [root,middle,tip,asym,gesture] of [
      ['nearEar','nearEarMiddle','nearEarTip',1,micro.near],
      ['farEar','farEarMiddle','farEarTip',.88,micro.far],
    ] as const) {
      const gain=c.ears?c.earStrength:0;
      const a=add(root,earForce*.65*asym+gesture*.25,c.earSpring*1.8,c.earDamping+.16,c.earLimit*.45,gain);
      const b=add(middle,earForce*.70+a.value*.65-a.velocity*.024+gesture*.7,c.earSpring*1.05*asym,c.earDamping+.06,c.earLimit*.78,gain);
      add(tip,b.value*.78-b.velocity*.038+earForce*.85+gesture,c.earSpring*.72*asym,c.earDamping+.12,c.earLimit,gain);
    }
    // Faster pelvic root, progressively heavier distal links. Angular velocity
    // transfer supplies a brief counter-bend followed by a damped return.
    const force=s.accelerationX*.000050+s.accelerationY*.000030-s.velocityY*.000025+s.bodyAcceleration*.000090-s.pelvisVelocity*.026-(s.torsoVelocity??0)*.020;
    const gain=c.tail?c.tailStrength:0;
    let parent=add('tailRoot',force*.65+micro.tail*.5,c.tailSpring*2.3,c.tailDamping+.12,c.tailLimit*.65,gain);
    for(const [id,k,limit] of [['tailMiddle',1.5,1],['tailFlex',1.2,1],['tailTip',.9,.80],['tailEnd',.75,.40]] as const) {
      parent=add(id,parent.value*.65-parent.velocity*.022+force*(id==='tailEnd'?.2:.65)+micro.tail*.35,c.tailSpring*k,c.tailDamping+.03,limit*c.tailLimit,gain);
    }
    const pack=add('backpack',-s.accelerationX*.000075+s.accelerationY*.000028+s.bodyAcceleration*.000040-(s.torsoVelocity??0)*.021,c.backpackSpring,c.backpackDamping,c.backpackLimit,c.backpackStrength);
    const lift=this.packLift.step(clamp(-s.accelerationY*.00011-s.bodyAcceleration*.00016-pack.velocity*.08,-.6,.6),dt,c.backpackSpring*.8,c.backpackDamping,.6);
    result.backpack={...result.backpack,y:(primary.backpack?.y??0)+clamp(lift*intensity*c.backpackStrength,-.6,.6)};
    add('coatHem',-s.accelerationX*.000035+s.bodyAcceleration*.000022,195,.77,.085);
    for(const id of ['nearWrist','farWrist'] as const) {
      const elbow=id==='nearWrist'?'nearElbow':'farElbow',angle=primary[elbow]?.angle??0,last=this.previousArm.get(elbow)??angle;
      this.previousArm.set(elbow,angle);add(id,-clamp((angle-last)/Math.max(dt,1e-5),-8,8)*.013,270,.80,.09);
    }
    return result;
  }
  reset():void {this.springs.clear();this.packLift.reset();this.micro.reset();this.previousArm.clear();for(const id of Object.keys(this.offsets) as BoneId[])delete this.offsets[id];}
}
