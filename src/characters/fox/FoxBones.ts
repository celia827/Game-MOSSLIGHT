import type {Vec} from './CharacterConfig.ts';
import {clamp,rotate,solveKnee} from './poseMath.ts';

const definitions=[
  ['visual',null,124,210,-.15,.15],
  ['pelvis','visual',120,170,-.3,.3],
  ['lowerSpine','pelvis',120,156,-.24,.68],
  ['chest','lowerSpine',120,136,-.24,.36],
  ['neck','chest',122,112,-.7,.6],
  ['head','neck',122,112,-.75,.65],
  ['nearEar','head',103,53,-.18,.18],['nearEarMiddle','nearEar',101,35,-.16,.16],['nearEarTip','nearEarMiddle',95,17,-.2,.2],
  ['farEar','head',121,45,-.16,.16],['farEarMiddle','farEar',122,34,-.15,.15],['farEarTip','farEarMiddle',122,24,-.18,.18],
  ['nearShoulder','chest',117,126,-1.8,1.25],
  ['nearElbow','nearShoulder',118,145,-1.9,.45],
  ['nearWrist','nearElbow',117,157,-.65,.65],
  ['nearHand','nearWrist',116,164,-.35,.35],
  ['farShoulder','chest',134,128,-1.8,1.25],
  ['farElbow','farShoulder',138,144,-1.9,.45],
  ['farWrist','farElbow',136,157,-.65,.65],
  ['farHand','farWrist',137,162,-.35,.35],
  ['backpack','chest',99,122,-.16,.16],['coatHem','pelvis',124,172,-.12,.12],
  ['nearHip','pelvis',116,174,-2.15,1.4],
  ['nearKnee','nearHip',119,186,-.65,2.7],
  ['nearAnkle','nearKnee',119,198,-2.5,2.5],
  ['nearFoot','nearAnkle',124,210,-.4,.4],
  ['farHip','pelvis',126,172,-2.15,1.4],
  ['farKnee','farHip',129,183,-.65,2.7],
  ['farAnkle','farKnee',127,195,-2.5,2.5],
  ['farFoot','farAnkle',133,205,-.4,.4],
  ['tailRoot','pelvis',108,170,-.6,1.95],
  ['tailMiddle','tailRoot',66,176,-1.75,.65],
  ['tailFlex','tailMiddle',42,162,-1.2,1.2],
  ['tailTip','tailFlex',23,143,-1.2,1.2],
  ['tailEnd','tailTip',5,94,-.15,.15],
] as const;
export type BoneId=typeof definitions[number][0];
export interface BoneDefinition {id:BoneId;parent:BoneId|null;rest:Vec;min:number;max:number}
export const FOX_BONES:readonly BoneDefinition[]=definitions.map(([id,parent,x,y,min,max])=>({id,parent,rest:{x,y},min,max}));
export interface BoneTransform {angle:number;x:number;y:number}
export type BonePose=Partial<Record<BoneId,Partial<BoneTransform>>>;
interface Bone {def:BoneDefinition;local:BoneTransform;world:Vec;angle:number;c:number;s:number}
export const LEG_BIND=[
  {hip:'nearHip',knee:'nearKnee',ankle:'nearAnkle',foot:'nearFoot'},
  {hip:'farHip',knee:'farKnee',ankle:'farAnkle',foot:'farFoot'},
] as const;

/** Parent-local FK with inverse-bind skinning. Every frame begins from bind data. */
export class FoxBones {
  private nodes:Record<BoneId,Bone>;
  constructor(pivot:'neck'|'legacy'='neck') {
    const definitions=FOX_BONES.map(def=>def.id==='head'&&pivot==='legacy'?{...def,rest:{x:122,y:84}}:def);
    this.nodes=Object.fromEntries(definitions.map(def=>[def.id,{def,local:{angle:0,x:0,y:0},world:{...def.rest},angle:0,c:1,s:0}])) as Record<BoneId,Bone>;
  }
  setPose(pose:BonePose={}):void {
    for(const def of FOX_BONES) {
      const p=pose[def.id];this.nodes[def.id].local={angle:clamp(p?.angle??0,def.min,def.max),x:p?.x??0,y:p?.y??0};
    }
    this.updateWorld();
  }
  updateWorld():void {
    for(const entry of FOX_BONES) {
      const bone=this.nodes[entry.id],def=bone.def,parent=def.parent?this.nodes[def.parent]:undefined;
      const offset={x:def.rest.x-(parent?.def.rest.x??0)+bone.local.x,y:def.rest.y-(parent?.def.rest.y??0)+bone.local.y};
      const c=parent?.c??1,s=parent?.s??0;
      const p={x:offset.x*c-offset.y*s,y:offset.x*s+offset.y*c};
      bone.world={x:(parent?.world.x??0)+p.x,y:(parent?.world.y??0)+p.y};
      bone.angle=(parent?.angle??0)+bone.local.angle;
      bone.c=Math.cos(bone.angle);bone.s=Math.sin(bone.angle);
    }
  }
  localPose():BonePose {return Object.fromEntries(FOX_BONES.map(({id})=>[id,{...this.nodes[id].local}]));}
  position(id:BoneId):Vec {return {...this.nodes[id].world};}
  rest(id:BoneId):Vec {return this.nodes[id].def.rest;}
  angle(id:BoneId):number {return this.nodes[id].local.angle;}
  skin(id:BoneId,p:Vec):Vec {
    const b=this.nodes[id],x=p.x-b.def.rest.x,y=p.y-b.def.rest.y;
    return {x:b.world.x+x*b.c-y*b.s,y:b.world.y+x*b.s+y*b.c};
  }
  setAngle(id:BoneId,angle:number):void {
    const b=this.nodes[id];b.local.angle=clamp(angle,b.def.min,b.def.max);this.updateWorld();
  }
  private setWorld(id:BoneId,position:Vec,angle:number):void {
    const b=this.nodes[id],parent=b.def.parent?this.nodes[b.def.parent]:undefined;
    const local=rotate({x:position.x-(parent?.world.x??0),y:position.y-(parent?.world.y??0)},{x:0,y:0},-(parent?.angle??0));
    b.local.x=local.x-(b.def.rest.x-(parent?.def.rest.x??0));
    b.local.y=local.y-(b.def.rest.y-(parent?.def.rest.y??0));
    b.local.angle=clamp(angle-(parent?.angle??0),b.def.min,b.def.max);this.updateWorld();
  }
  /** Contact IK changes local transforms, so descendants still inherit the chain. */
  solveLeg(index:number,sole:Vec,roll:number,stretch:number):void {
    const ids=LEG_BIND[index],hip=this.position(ids.hip),h0=this.rest(ids.hip),k0=this.rest(ids.knee),a0=this.rest(ids.ankle),f0=this.rest(ids.foot);
    const offset=rotate({x:f0.x-a0.x,y:f0.y-a0.y},{x:0,y:0},roll);
    const ankle={x:sole.x-offset.x,y:sole.y-offset.y};
    const a=Math.hypot(k0.x-h0.x,k0.y-h0.y),b=Math.hypot(a0.x-k0.x,a0.y-k0.y);
    const knee=solveKnee(hip,ankle,a+(15-a)*stretch,b+(15-b)*stretch);
    const upper=Math.atan2(knee.y-hip.y,knee.x-hip.x)-Math.atan2(k0.y-h0.y,k0.x-h0.x);
    const rawLower=Math.atan2(ankle.y-knee.y,ankle.x-knee.x)-Math.atan2(a0.y-k0.y,a0.x-k0.x);
    // A tucked shin may cross atan2's -PI/PI seam. Keep the relative knee angle
    // on its neighboring branch instead of clamping a valid fold as a backbend.
    const lower=upper+Math.atan2(Math.sin(rawLower-upper),Math.cos(rawLower-upper));
    this.setWorld(ids.hip,hip,upper);this.setWorld(ids.knee,knee,lower);this.setWorld(ids.ankle,ankle,roll);
  }
  poseWorld(id:BoneId,position:Vec,angle:number):void {this.setWorld(id,position,angle);}
  worldAngle(id:BoneId):number {return this.nodes[id].angle;}
  constrainWorldAngle(id:BoneId,min:number,max:number):void {
    const b=this.nodes[id],parent=b.def.parent?this.nodes[b.def.parent]:undefined;
    this.setAngle(id,clamp(b.angle,min,max)-(parent?.angle??0));
  }
  snapshot() {return FOX_BONES.map(def=>({id:def.id,parent:def.parent,x:this.nodes[def.id].world.x,y:this.nodes[def.id].world.y,angle:this.angle(def.id),worldAngle:this.nodes[def.id].angle}));}
}
