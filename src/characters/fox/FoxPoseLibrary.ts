import {shapeGait} from './FoxGait.ts';
import type {BoneId,BonePose} from './FoxBones.ts';
import {FOX_BONES,FoxBones,LEG_BIND} from './FoxBones.ts';
import {clamp,mix,smooth} from './poseMath.ts';
export const POSE_NAMES=['IdlePose','WalkPose','RunPose','StartPose','StopPose','TurnPose','AnticipationPose','TakeoffPose','AscendPose','ApexPose','JumpForwardPose','FallEarlyPose','FallPreparePose','LandLightPose','LandNormalPose','LandHeavyPose','LandRecoverPose'] as const;
export type PoseName=typeof POSE_NAMES[number];
export const POSE_LABELS:Record<PoseName,string>={IdlePose:'待机',WalkPose:'走路',StartPose:'起步重心转移',StopPose:'制动卸力',TurnPose:'侧身转向过渡',RunPose:'跑步',AnticipationPose:'屈膝弯腰蓄力',TakeoffPose:'蹬地伸展',AscendPose:'原地上升',ApexPose:'最高点平衡',JumpForwardPose:'向前腾跃',FallEarlyPose:'早期下落',FallPreparePose:'提前准备着陆',LandLightPose:'轻度落地',LandNormalPose:'普通落地卸力',LandHeavyPose:'高处落地卸力',LandRecoverPose:'腰背恢复'};
export type AnimationPhase='IDLE'|'WALK'|'RUN'|'START'|'STOP'|'TURN'|'ANTICIPATION'|'TAKEOFF'|'ASCEND'|'APEX'|'DESCEND'|'LAND_IMPACT'|'LAND_RECOVER';
export interface FoxPose {bones:BonePose}
export const ANIMATION_CONFIG={anticipation:.075,runAnticipation:.065,takeoff:.10,landImpact:.095,landRecover:.20,blendDuration:.065,apexSpeed:110,impactReferenceSpeed:720,landingPrepareTime:.23,headUpLimit:-.26,headDownLimit:.38};
const pose=(angles:Partial<Record<BoneId,number>>={},pelvisY=0,chestY=0,pelvisX=0):FoxPose=>({bones:{
  ...Object.fromEntries(FOX_BONES.map(b=>[b.id,{angle:angles[b.id]??0,x:0,y:0}])),
  pelvis:{angle:angles.pelvis??0,x:pelvisX,y:pelvisY},chest:{angle:angles.chest??0,x:0,y:chestY},
}});
export const FOX_POSES:Record<PoseName,FoxPose>={
  IdlePose:pose({nearShoulder:.025,nearElbow:-.055,nearWrist:.025,farElbow:-.05}),
  WalkPose:pose({lowerSpine:.025,chest:.018,neck:-.035,nearElbow:-.30,farElbow:-.26},1),
  StartPose:pose({pelvis:-.025,lowerSpine:.18,chest:.035,neck:-.13,head:-.015,nearShoulder:.16,farShoulder:-.12,nearElbow:-.15,farElbow:-.12},2,0,1.2),
  StopPose:pose({pelvis:.035,lowerSpine:-.13,chest:.12,neck:-.07,head:.04,nearShoulder:-.28,farShoulder:-.18,nearElbow:-.17,farElbow:-.12},3,0,-1.4),
  TurnPose:pose({pelvis:-.055,lowerSpine:.065,chest:-.12,neck:.13,head:.045,nearShoulder:-.20,farShoulder:.20,nearElbow:-.10,farElbow:-.08},2,0,-1),
  RunPose:pose({lowerSpine:.075,chest:.045,neck:-.09,head:-.015,nearShoulder:.70,nearElbow:-.80,farShoulder:-.70,farElbow:-.65,nearHip:-.65,nearKnee:1.05,nearAnkle:-.4,farHip:.35,farKnee:.25,farAnkle:-.6},2),
  AnticipationPose:pose({pelvis:-.06,lowerSpine:.52,chest:.14,neck:-.28,head:.10,nearShoulder:.8,nearElbow:-.55,farShoulder:.9,farElbow:-.65,nearHip:-.95,nearKnee:1.65,nearAnkle:-.7,farHip:-1.1,farKnee:1.8,farAnkle:-.7,tailRoot:-.10,tailMiddle:-.04},16,1,-3),
  TakeoffPose:pose({pelvis:.025,lowerSpine:-.12,chest:-.07,neck:.035,head:-.12,nearShoulder:-1.45,nearElbow:-.70,nearWrist:.12,farShoulder:-1.25,farElbow:-.75,nearHip:-.08,nearKnee:.12,nearAnkle:-.04,farHip:-.12,farKnee:.18,farAnkle:-.06,tailRoot:.12,tailMiddle:.08},-4,-2),
  AscendPose:pose({lowerSpine:-.10,chest:-.06,neck:.09,head:-.07,nearShoulder:-.75,nearElbow:-1.05,nearWrist:.12,farShoulder:-.6,farElbow:-1.0,nearHip:-1.3,nearKnee:2.05,nearAnkle:-.8,farHip:-1.5,farKnee:2.2,farAnkle:-.7,tailRoot:.12,tailMiddle:.07,tailTip:-.02},-3,-1),
  ApexPose:pose({lowerSpine:-.045,chest:.035,neck:.015,head:-.015,nearShoulder:-.38,nearElbow:-.85,farShoulder:-1.0,farElbow:-.4,nearHip:-.95,nearKnee:1.5,nearAnkle:-.65,farHip:-1.3,farKnee:1.65,farAnkle:-.35,tailRoot:-.07,tailMiddle:-.04},-1),
  JumpForwardPose:pose({pelvis:-.025,lowerSpine:.23,chest:.10,neck:-.22,head:-.04,nearShoulder:-.95,nearElbow:-1.05,farShoulder:.22,farElbow:-1.2,nearHip:.35,nearKnee:1.9,nearAnkle:-2.25,farHip:.12,farKnee:2.2,farAnkle:-2.32,tailRoot:.08,tailMiddle:.04},-2,-1,-1),
  FallEarlyPose:pose({lowerSpine:.12,chest:.055,neck:-.075,head:.07,nearShoulder:-.55,nearElbow:-.7,farShoulder:-1.15,farElbow:-.5,nearHip:-.65,nearKnee:1.15,nearAnkle:-.5,farHip:-.85,farKnee:1.2,farAnkle:-.35,tailRoot:-.06},0),
  FallPreparePose:pose({lowerSpine:.30,chest:.11,neck:-.18,head:.13,nearShoulder:-.8,nearElbow:-.85,farShoulder:-1.1,farElbow:-.75,nearHip:-.42,nearKnee:.75,nearAnkle:-.33,farHip:-.58,farKnee:.85,farAnkle:-.27,tailRoot:-.08,tailMiddle:-.04},3,.5,-1),
  LandLightPose:pose({pelvis:-.025,lowerSpine:.20,chest:.075,neck:-.13,head:.045,nearShoulder:-.4,nearElbow:-.75,farShoulder:-.7,farElbow:-.7,nearHip:-.65,nearKnee:1.1,nearAnkle:-.45,farHip:-.8,farKnee:1.3,farAnkle:-.5,tailRoot:.04},6,.5,-1),
  LandNormalPose:pose({pelvis:-.05,lowerSpine:.48,chest:.14,neck:-.28,head:.10,nearShoulder:-.65,nearElbow:-1.05,farShoulder:-.95,farElbow:-.95,nearHip:-1.0,nearKnee:1.7,nearAnkle:-.7,farHip:-1.1,farKnee:1.8,farAnkle:-.7,tailRoot:.09},14,1.5,-3),
  LandHeavyPose:pose({pelvis:-.065,lowerSpine:.60,chest:.18,neck:-.34,head:.12,nearShoulder:-.85,nearElbow:-1.2,farShoulder:-1.1,farElbow:-1.05,nearHip:-1.2,nearKnee:2.1,nearAnkle:-.9,farHip:-1.3,farKnee:2.2,farAnkle:-.9,tailRoot:.12,tailMiddle:.04},18,2,-4),
  LandRecoverPose:pose({lowerSpine:.24,chest:.075,neck:-.15,head:.08,nearShoulder:-.3,nearElbow:-.6,farShoulder:-.5,farElbow:-.55,nearHip:-.45,nearKnee:.75,nearAnkle:-.3,farHip:-.55,farKnee:.9,farAnkle:-.35},7,.5,-1),
};
/** Local pose edits on the existing rig; foot targets are baked once into joint
 * angles, not solved by moving the character root or stretching the whole actor. */
function refine(name:PoseName,angles:Partial<Record<BoneId,number>>,pelvisY:number,pelvisX=0,feet?:readonly [number,number,number,number,number,number]):void {
  const result=blendPoses(FOX_POSES[name],FOX_POSES[name],0);
  for(const [id,angle] of Object.entries(angles))result.bones[id as BoneId]!.angle=angle;
  result.bones.pelvis={angle:angles.pelvis??0,x:pelvisX,y:pelvisY};
  if(feet){const b=new FoxBones();b.setPose(result.bones);[0,1].forEach(i=>b.solveLeg(i,{x:feet[i*3],y:feet[i*3+1]},feet[i*3+2],0));
    for(const ids of LEG_BIND)for(const id of [ids.hip,ids.knee,ids.ankle,ids.foot])result.bones[id]={angle:b.angle(id),x:0,y:0};}
  FOX_POSES[name]=result;
}
refine('IdlePose',{nearShoulder:.07,nearElbow:-.19,farElbow:-.18,lowerSpine:0,chest:0,neck:0,head:0},0);
refine('RunPose',{pelvis:-.025,lowerSpine:.19,chest:.045,neck:-.13,head:-.075,nearShoulder:-.96,nearElbow:-1.04,farShoulder:.78,farElbow:-.92,nearEar:-.05,farEar:-.04},3,2,[141,193,-.16,120,205,.15]);
refine('AnticipationPose',{pelvis:-.04,lowerSpine:.57,chest:.15,neck:-.29,head:-.10,nearShoulder:.98,nearElbow:-.84,farShoulder:1.02,farElbow:-.82,tailRoot:.18,tailMiddle:-.035,tailFlex:-.015,tailTip:.025,nearEar:.045,nearEarMiddle:.02,farEar:.03,backpack:-.055},16,-3,[123,210,0,134,207,0]);
refine('TurnPose',{pelvis:-.035,lowerSpine:.12,chest:.02,nearShoulder:-.30,farShoulder:.28},4,-1);
refine('StopPose',{pelvis:.03,lowerSpine:.09,chest:.11,neck:-.13,nearShoulder:-.50,nearElbow:-.55,farShoulder:-.38,farElbow:-.50},5,-2);
refine('TakeoffPose',{pelvis:.015,lowerSpine:-.12,chest:-.10,neck:.09,head:-.08,nearShoulder:-1.52,nearElbow:-.48,farShoulder:-1.32,farElbow:-.60,nearHip:-.06,nearKnee:.12,nearAnkle:-.06,farHip:-.10,farKnee:.16,farAnkle:-.06,tailRoot:.12,tailMiddle:.02,nearEar:-.05,nearEarMiddle:-.025,farEar:-.04},-6);
refine('AscendPose',{lowerSpine:.055,chest:-.035,neck:.035,head:-.08,nearShoulder:-1.1,nearElbow:-.90,farShoulder:-.85,farElbow:-1.05,tailRoot:.09,tailMiddle:.025,tailFlex:-.04,tailTip:-.02,nearEar:-.055,nearEarMiddle:-.025,farEar:-.045},-2,0,[136,188,-.18,123,195,-.15]);
refine('JumpForwardPose',{pelvis:-.03,lowerSpine:.26,chest:.08,neck:-.20,head:-.31,nearShoulder:-1.34,nearElbow:-.88,farShoulder:-.84,farElbow:-1.08,nearWrist:.10,farWrist:.08,tailRoot:.06,tailMiddle:.025,tailFlex:-.04,tailTip:-.02,nearEar:-.055,nearEarMiddle:-.025,nearEarTip:-.02,farEar:-.04,farEarMiddle:-.02,backpack:-.06},-1,-1,[140,184,-.20,122,182,-.30]);
refine('ApexPose',{pelvis:-.025,lowerSpine:.29,chest:.08,neck:-.20,head:-.12,nearShoulder:-.65,nearElbow:-.92,farShoulder:-1.1,farElbow:-.64,tailRoot:.03,tailMiddle:.015,tailFlex:-.025},-1,-1,[136,192,-.12,123,197,-.12]);
refine('FallEarlyPose',{lowerSpine:.22,chest:.07,neck:-.14,head:.06,nearShoulder:-.65,nearElbow:-.82,farShoulder:-1.0,farElbow:-.70,tailRoot:-.025,tailMiddle:.015},1,0,[130,199,-.06,136,198,-.04]);
refine('FallPreparePose',{pelvis:-.025,lowerSpine:.16,chest:.06,neck:-.10,head:.09,nearShoulder:-.85,nearElbow:-1.02,farShoulder:-.60,farElbow:-1.05,tailRoot:.02,tailMiddle:-.025,nearEar:.025,farEar:.015},2,-1,[130,208,0,137,204,.02]);
refine('LandLightPose',{pelvis:-.025,lowerSpine:.30,chest:.10,neck:-.18,head:.07,nearShoulder:-.70,nearElbow:-.88,farShoulder:-.60,farElbow:-.85,tailRoot:.05},8,-1);
refine('LandNormalPose',{pelvis:-.045,lowerSpine:.60,chest:.15,neck:-.30,head:.11,nearShoulder:-1.10,nearElbow:-.96,farShoulder:-.88,farElbow:-.92,tailRoot:.075,tailMiddle:-.045,nearEar:.045,nearEarMiddle:.02,farEar:.03},17,-3,[124,210,0,135,207,0]);
refine('LandHeavyPose',{pelvis:-.05,lowerSpine:.64,chest:.16,neck:-.32,head:.12,nearShoulder:-1.17,nearElbow:-.96,farShoulder:-1.02,farElbow:-.92,tailRoot:.07,tailMiddle:-.055,tailFlex:-.025,nearEar:.06,nearEarMiddle:.03,farEar:.045},19,-4,[124,210,0,135,207,0]);
// Character-space gaze targets. Head is now hinged at the cervical connection,
// so modest pitch changes read without moving or distorting facial features.
export const HEAD_PITCH:Partial<Record<PoseName,number>>={
  IdlePose:0,WalkPose:-.018,RunPose:-.065,StartPose:-.07,StopPose:.065,TurnPose:.025,
  AnticipationPose:.28,TakeoffPose:-.18,AscendPose:-.17,ApexPose:-.045,
  JumpForwardPose:-.18,FallEarlyPose:.055,FallPreparePose:.13,
  LandLightPose:.19,LandNormalPose:.32,LandHeavyPose:.38,LandRecoverPose:.16,
};
for(const name of POSE_NAMES){const p=FOX_POSES[name].bones;
  p.head!.angle=HEAD_PITCH[name]!-(p.pelvis?.angle??0)-(p.lowerSpine?.angle??0)-(p.chest?.angle??0)-(p.neck?.angle??0);
}
export function blendPoses(a:FoxPose,b:FoxPose,t:number):FoxPose {
  t=clamp(t);return {bones:Object.fromEntries(FOX_BONES.map(({id})=>[id,{
    angle:mix(a.bones[id]?.angle??0,b.bones[id]?.angle??0,t),
    x:mix(a.bones[id]?.x??0,b.bones[id]?.x??0,t),y:mix(a.bones[id]?.y??0,b.bones[id]?.y??0,t),
  }]))};
}
export function runPose(phase:number):FoxPose {
 return shapeGait(blendPoses(FOX_POSES.RunPose,FOX_POSES.RunPose,0),phase,true);
}
/** Four-stage walk has double support and its own load/arm/foot timing. */
export function walkPose(phase:number):FoxPose {
 return shapeGait(blendPoses(FOX_POSES.WalkPose,FOX_POSES.WalkPose,0),phase,false);
}
export function idlePose(time:number):FoxPose {
  const p=blendPoses(FOX_POSES.IdlePose,FOX_POSES.IdlePose,0);
  // One quiet weight shift through the pelvis; waist and neck compensate.
  const shift=.28*Math.sin(time*Math.PI*2/8);
  p.bones.pelvis!.x=shift;p.bones.lowerSpine!.angle=-shift*.012;
  p.bones.chest!.y=-.25*Math.sin(time*Math.PI*2/3.6);
  p.bones.neck!.angle=shift*.009;return p;
}
export function impactPose(strength:number):FoxPose {
  return strength<=.75?blendPoses(FOX_POSES.LandLightPose,FOX_POSES.LandNormalPose,clamp((strength-.2)/.55)):
    blendPoses(FOX_POSES.LandNormalPose,FOX_POSES.LandHeavyPose,clamp((strength-.75)/.25));
}
export function landingPose(age:number,strength:number,ground:FoxPose):FoxPose {
  const target=impactPose(strength),result=blendPoses(ground,target,1);
  if(age<ANIMATION_CONFIG.landImpact) {
    for(const b of FOX_BONES) {
      const delay=b.id==='lowerSpine'?.008:b.id==='chest'?.018:b.id==='neck'||b.id==='head'?.03:b.id.includes('Shoulder')?.018:0;
      const t=smooth((age-delay)/.045),a=ground.bones[b.id]!,z=target.bones[b.id]!;
      result.bones[b.id]={angle:mix(a.angle??0,z.angle??0,t),x:mix(a.x??0,z.x??0,t),y:mix(a.y??0,z.y??0,t)};
    }
    return result;
  }
  const t=smooth((age-ANIMATION_CONFIG.landImpact)/ANIMATION_CONFIG.landRecover);
  const recover=blendPoses(ground,FOX_POSES.LandRecoverPose,clamp(strength/.75));
  for(const {id} of FOX_BONES){
    const delay=id==='head'||id==='neck'?.10:id==='chest'?.035:id.includes('Shoulder')?.05:0;
    const u=smooth(clamp((t-delay)/(1-delay))),a=target.bones[id]!,b=recover.bones[id]!,z=ground.bones[id]!;
    const v=u<.55?smooth(u/.55):smooth((u-.55)/.45),from=u<.55?a:b,to=u<.55?b:z;
    result.bones[id]={angle:mix(from.angle??0,to.angle??0,v),x:mix(from.x??0,to.x??0,v),y:mix(from.y??0,to.y??0,v)};
  }
  return result;
}
