import type {MotionTuning} from './FoxMotionConfig';
import type {BoneId} from './FoxBones';
import type {PoseName,AnimationPhase} from './FoxPoseLibrary';
export interface ReviewActor {pose:PoseName;phase:AnimationPhase;enabled:boolean;offsets:Partial<Record<BoneId,number>>;bones:{id:BoneId;x:number;y:number;angle:number;worldAngle:number}[]}
export interface MotionReviewSnapshot {active:boolean;layout:'overview'|'single'|'compare';rate:number;paused:boolean;playing:boolean;time:number;travel:boolean;tuning:MotionTuning;actors:ReviewActor[]}
export interface MotionReviewControls {
  open:()=>void;close:()=>void;overview:()=>void;playOnce:(travel:boolean)=>void;
  setRate:(rate:number)=>void;setPaused:(paused:boolean)=>void;setJoints:(show:boolean)=>void;
  compare:(travel:boolean)=>void;tune:(patch:Partial<MotionTuning>)=>void;
  snapshot:()=>MotionReviewSnapshot;
}
