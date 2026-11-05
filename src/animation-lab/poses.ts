import {FOX_BONES,FoxBones,LEG_BIND} from '../characters/fox/FoxBones.ts';
import type {BoneId,BoneTransform} from '../characters/fox/FoxBones.ts';
import type {Vec} from '../characters/fox/CharacterConfig.ts';
import {FOX_POSES,ANIMATION_CONFIG} from '../characters/fox/FoxPoseLibrary.ts';
import type {PoseName} from '../characters/fox/FoxPoseLibrary.ts';
export type LabPoseId='IDLE'|'WALK'|'RUN'|'ANTICIPATION'|'AIRBORNE'|'FALL_PREPARE'|'LAND_IMPACT';
export interface PoseFoot {sole:Vec;roll:number;contact:boolean}
export interface KeyPose {id:LabPoseId;name:string;intent:string;bones:Record<BoneId,BoneTransform>;feet:readonly [PoseFoot,PoseFoot]}
export const LAB_GAME_POSE:Record<LabPoseId,PoseName>={IDLE:'IdlePose',WALK:'WalkPose',RUN:'RunPose',ANTICIPATION:'AnticipationPose',AIRBORNE:'JumpForwardPose',FALL_PREPARE:'FallPreparePose',LAND_IMPACT:'LandHeavyPose'};
const entries:readonly [LabPoseId,string,string][]=[['IDLE','自然站立','放松支撑 · 头颈独立'],['RUN','跑步跨步','前膝抬起 · 后脚蹬伸 · 屈肘摆臂'],['ANTICIPATION','起跳蓄力','骨盆下沉 · 腰胸折叠 · 双臂后摆'],['AIRBORNE','向前腾空','腰胸前倾 · 两腿收起 · 视线向前'],['FALL_PREPARE','下落准备','四肢展开 · 头部低看 · 提前着陆准备'],['LAND_IMPACT','落地卸力','双膝屈曲 · 腰胸前折 · 双臂平衡']];
function make([id,name,intent]:readonly [LabPoseId,string,string]):KeyPose {
  const b=new FoxBones(),source=FOX_POSES[LAB_GAME_POSE[id]];b.setPose(source.bones);
  if(id==='WALK'){b.setPose({...source.bones,pelvis:{angle:-.015,x:1,y:6}});b.solveLeg(0,{x:137,y:210},-.02,0);b.solveLeg(1,{x:118,y:205},.15,0);}
  b.constrainWorldAngle('head',ANIMATION_CONFIG.headUpLimit,ANIMATION_CONFIG.headDownLimit);
  const bones=Object.fromEntries(FOX_BONES.map(d=>[d.id,{angle:b.angle(d.id),x:source.bones[d.id]?.x??0,y:source.bones[d.id]?.y??0}])) as Record<BoneId,BoneTransform>;
  if(id==='WALK')bones.pelvis={angle:-.015,x:1,y:6};
  const feet=LEG_BIND.map((ids,i)=>({sole:b.position(ids.foot),roll:b.worldAngle(ids.ankle),contact:['IDLE','WALK','ANTICIPATION','LAND_IMPACT'].includes(id)||id==='RUN'&&i===1})) as [PoseFoot,PoseFoot];
  return {id,name,intent,bones,feet};
}
export const KEY_POSES:readonly KeyPose[]=entries.map(make);
const walk=make(['WALK','走路复核','自然迈步 · 双脚交替支撑']);
export const poseById=(id:LabPoseId)=>id==='WALK'?walk:KEY_POSES.find(p=>p.id===id)!;
export const JOINT_LABELS:Partial<Record<BoneId,string>>={
  pelvis:'骨盆',lowerSpine:'腰部',chest:'胸腔',neck:'颈部',head:'头部',
  nearShoulder:'近肩',nearElbow:'近肘',nearWrist:'近腕',farShoulder:'远肩',farElbow:'远肘',
  nearHip:'近髋',nearKnee:'近膝',nearAnkle:'近踝',farHip:'远髋',farKnee:'远膝',farAnkle:'远踝',
  nearEar:'近耳根',farEar:'远耳根',tailRoot:'尾根',tailMiddle:'尾中段',tailFlex:'尾第二中段',tailTip:'尾尖',tailEnd:'尾端',backpack:'背包',
};
