import type {MotionTuning} from './FoxMotionConfig';
import type {MotionSignals} from './FoxMotionDriver';
import type {AnimationMode,AnimationState} from './CharacterConfig';
import type {BoneId} from './FoxBones';
import type {PoseName,AnimationPhase} from './FoxPoseLibrary';
import type {MotionReviewControls} from './MotionReviewTypes';
export interface AnimationSnapshot {
  performance?:{samples:number;fps:number;frameP95Ms:number;characterMeanMs:number;characterP95Ms:number;heapBytes:number|null};
  state:AnimationState; mode:AnimationMode; velocity:number; facing:number;
  x:number;y:number;walking:boolean;gaitRunMix:number;locomotionAge:number;phase:number;blend:number;blinkCount:number;time:number;
  supportSlip:number;footError:number;blocked:boolean;
  feet:{point:{x:number;y:number};goal:{x:number;y:number};stance:boolean}[];
  grounded:boolean;velocityY:number;coyoteMs:number;bufferMs:number;supportId:string|null;
  jumpCount:number;landCount:number;coyoteJumps:number;bufferJumps:number;lastJumpKind:string;
  gravity:number;jumpSpeed:number;
  animationPhase:AnimationPhase;paused:boolean;previewOffsetY:number;blendDuration:number;
  impactSpeed:number;landingStrength:number;visualOffsetY:number;pose:PoseName;landingPreparation:number;
  tailPenetration:number;tailPrimaryPenetration:number;tailContactWeight:number;motionTuning:MotionTuning;motionSignals:MotionSignals;secondaryOffsets:Partial<Record<BoneId,number>>;
  bones:{id:BoneId;parent:BoneId|null;x:number;y:number;angle:number}[];
}
export interface AnimationControls {
  review:MotionReviewControls;
  tune:(patch:Partial<MotionTuning>)=>void;
  setMode:(mode:AnimationMode)=>void;
  setRate:(rate:number)=>void;
  setJoints:(show:boolean)=>void;
  setReference:(show:boolean)=>void;
  setBindPose:(show:boolean)=>void;
  setPaused:(paused:boolean)=>void;
  setPose:(pose:PoseName)=>void;
  setJoint:(id:BoneId,degrees:number)=>void;
  selectJoint:(id:BoneId)=>void;
  clearJoints:()=>void;
  setBlend:(seconds:number)=>void;
  setPhysics:(patch:{gravity?:number;jumpSpeed?:number})=>void;
  reset:()=>void;
  snapshot:()=>AnimationSnapshot;
}
