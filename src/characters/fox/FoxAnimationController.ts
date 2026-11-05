import {FoxTailAvoidance} from './FoxTailContact.ts';
import type {TailEnvironment} from './FoxTailContact.ts';
import {MOTION_DEFAULTS as PREVIOUS_MOTION_DEFAULTS} from '../../animation-lab/baseline/PreviousMotionConfig.ts';
import {swingFoot} from './FoxGait.ts';
import {CHARACTER_CONFIG as C} from './CharacterConfig.ts';
import type {AnimationState,RigPartId,Vec} from './CharacterConfig.ts';
import {clamp,mix,smooth,blendPoint} from './poseMath.ts';
import {FoxBones,LEG_BIND} from './FoxBones.ts';
import type {BoneId,BonePose} from './FoxBones.ts';
import {FOX_POSES,ANIMATION_CONFIG,blendPoses,runPose,walkPose,idlePose,landingPose} from './FoxPoseLibrary.ts';
import type {FoxPose,PoseName,AnimationPhase} from './FoxPoseLibrary.ts';
import {FoxAnimationBlender} from './FoxAnimationBlender.ts';
import {FoxSecondaryMotion} from './FoxSecondaryMotion.ts';
import {MOTION_DEFAULTS,tuneMotion} from './FoxMotionConfig.ts';
import type {MotionTuning} from './FoxMotionConfig.ts';
import {FoxMotionDriver} from './FoxMotionDriver.ts';
import type {MotionSignals} from './FoxMotionDriver.ts';
import {FoxHeadMotion} from './FoxHeadMotion.ts';
import {FoxLocomotion} from './FoxLocomotion.ts';
import type {LocomotionIntent} from './FoxLocomotion.ts';
import {FoxBodySkin} from './FoxBodySkin.ts';
import {FOX_POSES as PREVIOUS_POSES,ANIMATION_CONFIG as PREVIOUS_CONFIG,runPose as previousRun,walkPose as previousWalk,idlePose as previousIdle,landingPose as previousLanding} from '../../animation-lab/baseline/PreviousPoses.ts';
import {FoxBodySkin as PreviousBodySkin} from '../../animation-lab/baseline/PreviousBodySkin.ts';
import {FoxSecondaryMotion as PreviousSecondary} from '../../animation-lab/baseline/PreviousSecondaryMotion.ts';
import {FoxLocomotion as PreviousLocomotion} from '../../animation-lab/baseline/PreviousLocomotion.ts';
import {FoxHeadMotion as PreviousHeadMotion} from '../../animation-lab/baseline/PreviousHeadMotion.ts';
import {FoxAnimationBlender as PreviousBlender} from '../../animation-lab/baseline/PreviousAnimationBlender.ts';

const SOLES=[{x:124,y:210},{x:133,y:205}];
interface Contact {active:boolean;x:number}
interface FootTarget {sole:Vec;roll:number;stance:boolean}
export interface MotionPose {
  grounded:boolean;velocityY:number;landTimer:number;landDuration:number;clearance:number;impact:number;
  intent?:LocomotionIntent;
  jumped?:boolean;landed?:boolean;jumpId?:number;jumpSpeed?:number;
  visualScale?:number;landingReliable?:boolean;timeToLand?:number;
}

/** Whole-body pose planner -> staggered blend -> FK / contact IK -> continuous skin. */
export class FoxAnimationController {
  readonly bones:FoxBones;
  private bodySkin:FoxBodySkin|PreviousBodySkin;
  readonly refined:boolean;
  private get poses(){return this.refined?FOX_POSES:PREVIOUS_POSES;}
  private get timing(){return this.refined?ANIMATION_CONFIG:PREVIOUS_CONFIG;}
  readonly blender:FoxAnimationBlender;
  readonly locomotion:FoxLocomotion|PreviousLocomotion;
  private secondary:FoxSecondaryMotion|PreviousSecondary;
  private headMotion:FoxHeadMotion|PreviousHeadMotion;
  readonly motionTuning:MotionTuning={...MOTION_DEFAULTS};
  private tailContact=new FoxTailAvoidance();
  private driver=new FoxMotionDriver();private motionIntensity=1;private previousSpeed=0;private previousVy=0;
  motionSignals:MotionSignals={speed:0,velocityY:0,accelerationX:0,accelerationY:0,headVelocity:0,pelvisVelocity:0,bodyAcceleration:0};
  private visualScale:number=C.scale;private launchTravel=0;private preparation=0;
  private pushContacts:Vec[]=[];private lastRoot?:Vec;private launchY=0;
  time=0;phase=.25;weight=0;state:AnimationState='IDLE';animationPhase:AnimationPhase='IDLE';
  blink=0;blinkCount=0;bindPose=false;paused=false;
  impactSpeed=0;visualOffsetY=0;
  posePreview:PoseName|null=null;
  currentPoseName:PoseName='IdlePose';
  blendDuration=ANIMATION_CONFIG.blendDuration;
  anticipationDuration=ANIMATION_CONFIG.anticipation;
  readonly overrides=new Map<BoneId,number>();
  private nextBlink=2.4;private blinkStart=-10;
  private contacts:Contact[]=[{active:false,x:0},{active:false,x:0}];
  private virtualX=0;private lastFacing=1;private lastPreview=false;private wasAir=false;private lastLandingFlag=false;
  private airAge=0;private lastJumpId=-1;private landAge=Infinity;private impactStrength=0;
  private evaluated:BonePose={};
  private feetTargets:FootTarget[]=SOLES.map(sole=>({sole:{...sole},roll:0,stance:true}));
  private constraint=1;
  private settleAge=Infinity;
  private settleFrom:FootTarget[]=[];
  private settleOrder=[0,1];
  private footWasMoving=false;
  private savedLocomotion?:ReturnType<FoxLocomotion['snapshot']>;
  private savedFeet?:{age:number;from:FootTarget[];order:number[];moving:boolean};
  private savedGameplay?:{wasAir:boolean;airAge:number;lastJumpId:number;landAge:number;phase:number;weight:number;contacts:Contact[];virtualX:number;lastPreview:boolean;impactSpeed:number;impactStrength:number;launchY:number;launchTravel:number;anticipationDuration:number;pushContacts:Vec[];lastRoot?:Vec;visualOffsetY:number};
  constructor(variant:'refined'|'previous'='refined') {
    this.refined=variant==='refined';if(!this.refined)this.tune({...PREVIOUS_MOTION_DEFAULTS});
    this.bones=new FoxBones();
    this.locomotion=this.refined?new FoxLocomotion():new PreviousLocomotion();
    this.secondary=this.refined?new FoxSecondaryMotion():new PreviousSecondary();
    this.bodySkin=this.refined?new FoxBodySkin(this.bones):new PreviousBodySkin(this.bones);
    this.headMotion=this.refined?new FoxHeadMotion():new PreviousHeadMotion();
    this.blender=this.refined?new FoxAnimationBlender():new PreviousBlender();
    this.blendDuration=this.timing.blendDuration;this.evaluated=this.poses.IdlePose.bones;
    this.blender.reset(this.poses.IdlePose);this.rebuild();
  }

  update(dt:number,distance:number,speed:number,x:number,y:number,facing:number,ground:(x:number)=>number,preview=false,motion?:MotionPose):void {
    dt=Number.isFinite(dt)?Math.max(0,Math.min(.25,dt)):0;
    if(this.bindPose){this.bones.setPose();return;}
    if(this.paused){this.rebuild();return;}
    if(preview!==this.lastPreview) {
      this.contacts.forEach(c=>c.active=false);this.virtualX=x;this.lastPreview=preview;
    }
    if(facing!==this.lastFacing){this.contacts.forEach(c=>c.active=false);this.lastFacing=facing;}
    this.visualScale=motion?.visualScale??C.scale;const ratio=this.visualScale/C.scale;
    const airborne=!!motion&&!motion.grounded;
    const jumped=airborne&&motion!.velocityY<0&&((motion!.jumpId!==undefined&&motion!.jumpId!==this.lastJumpId)||motion!.jumped||!this.wasAir);
    if(jumped){
      this.airAge=0;this.landAge=Infinity;this.launchTravel=clamp(Math.abs(speed)/(C.maxSpeed*ratio));
      this.anticipationDuration=mix(this.timing.anticipation,this.timing.runAnticipation,this.launchTravel);
      const root=this.lastRoot??{x,y:y+(motion?.clearance??0)};
      this.launchY=(motion?.clearance??Infinity)<14*ratio?y+motion!.clearance:root.y;
      this.pushContacts=this.feet.map(f=>({x:root.x+facing*(f.point.x-124)*this.visualScale,y:root.y+(f.point.y-210)*this.visualScale}));
    }
    if(motion?.jumpId!==undefined)this.lastJumpId=motion.jumpId;
    if(!airborne&&(this.wasAir||motion?.landed&&!this.lastLandingFlag)) {
      this.landAge=0;this.impactSpeed=motion?.impact??450;this.impactStrength=clamp(this.impactSpeed/(this.timing.impactReferenceSpeed*ratio),.28,1);
      this.contacts.forEach(c=>c.active=false);
    }
    if(airborne!==this.wasAir)this.contacts.forEach(c=>c.active=false);
    this.wasAir=airborne;this.lastLandingFlag=!!motion?.landed;
    for(let remaining=dt,elapsed=0;remaining>1e-8;) {
      const h=Math.min(remaining,1/120);remaining-=h;elapsed+=h;
      this.time+=h;
      if(airborne)this.airAge+=h;else this.landAge+=h;
      const stepDistance=dt?distance*h/dt:0;
      this.locomotion.step(h,(Math.abs(distance-speed*dt)<1e-6?speed:mix(this.previousSpeed,speed,(elapsed-h*.5)/dt))/ratio,facing,!airborne,motion?.intent);
      const target=airborne?0:clamp(Math.abs(speed)/(26*ratio));
      this.weight=mix(this.weight,target,1-Math.exp(-C.runBlendRate*h));if(this.weight<.0001)this.weight=0;
      if(!airborne)this.phase=(this.phase+Math.abs(stepDistance)/(this.locomotion.stride*ratio))%1;
      this.virtualX=preview?this.virtualX+stepDistance:x-distance+distance*elapsed/dt;
      const gait=blendPoses((this.refined?walkPose:previousWalk)(this.phase),(this.refined?runPose:previousRun)(this.phase),this.locomotion.runMix);
      const groundedPose=this.locomotion.shape(blendPoses((this.refined?idlePose:previousIdle)(this.time),gait,this.weight),facing);
      let targetPose:FoxPose;
      if(this.posePreview) {
        targetPose=this.poses[this.posePreview];this.currentPoseName=this.posePreview;
        this.animationPhase=this.phaseForPose(this.posePreview);
        this.state=this.stateForPhase(this.animationPhase);
      } else if(airborne) {
        this.state=motion!.velocityY<-.01?'JUMP':'FALL';
        const v=motion!.velocityY/ratio,travel=clamp(Math.abs(speed)/(C.maxSpeed*ratio));
        const ascend=blendPoses(this.poses.AscendPose,this.poses.JumpForwardPose,travel);
        this.preparation=0;
        if(v<0) {
          if(this.airAge<this.anticipationDuration){
            this.animationPhase='ANTICIPATION';this.currentPoseName='AnticipationPose';
            targetPose=blendPoses(this.poses.AnticipationPose,groundedPose,this.launchTravel*.36);
          } else if(this.airAge<this.anticipationDuration+this.timing.takeoff) {
            this.animationPhase='TAKEOFF';this.currentPoseName='TakeoffPose';targetPose=this.poses.TakeoffPose;
          } else if(Math.abs(v)<this.timing.apexSpeed) {
            this.animationPhase='APEX';this.currentPoseName='ApexPose';targetPose=blendPoses(ascend,this.poses.ApexPose,smooth(1-Math.abs(v)/this.timing.apexSpeed));
          } else {this.animationPhase='ASCEND';this.currentPoseName=travel>.5?'JumpForwardPose':'AscendPose';targetPose=ascend;}
        } else if(v<this.timing.apexSpeed){this.animationPhase='APEX';this.currentPoseName='ApexPose';targetPose=blendPoses(this.poses.ApexPose,this.poses.FallEarlyPose,smooth(v/this.timing.apexSpeed));}
        else {
          this.animationPhase='DESCEND';
          this.preparation=motion!.landingReliable&&motion!.timeToLand!==undefined?
            smooth(1-motion!.timeToLand/this.timing.landingPrepareTime):smooth((v-220)/420);
          this.currentPoseName=this.preparation>.45?'FallPreparePose':'FallEarlyPose';
          targetPose=blendPoses(this.poses.FallEarlyPose,this.poses.FallPreparePose,this.preparation);
        }
      } else if(this.landAge<this.timing.landImpact+this.timing.landRecover) {
        this.state='LAND';this.animationPhase=this.landAge<this.timing.landImpact?'LAND_IMPACT':'LAND_RECOVER';
        this.currentPoseName=this.animationPhase==='LAND_RECOVER'?'LandRecoverPose':this.impactStrength<.5?'LandLightPose':this.impactStrength<.86?'LandNormalPose':'LandHeavyPose';
        this.preparation=0;targetPose=(this.refined?landingPose:previousLanding)(this.landAge,this.impactStrength,groundedPose);
      } else {
        this.state=this.locomotion.state;this.animationPhase=this.state as AnimationPhase;
        this.currentPoseName=({IDLE:'IdlePose',WALK:'WalkPose',RUN:'RunPose',START:'StartPose',STOP:'StopPose',TURN:'TurnPose'} as const)[this.state as 'IDLE'|'WALK'|'RUN'|'START'|'STOP'|'TURN'];this.preparation=0;targetPose=groundedPose;
      }
      // Primary shaping changes body joints, never the collider or global scale.
      targetPose=blendPoses(targetPose,targetPose,0);
      targetPose.bones.lowerSpine!.angle=(targetPose.bones.lowerSpine?.angle??0)*this.motionTuning.waistBend;
      if(['WALK','RUN','START','STOP','TURN'].includes(this.state)&&!this.posePreview) {
        const lean=clamp(this.motionSignals.accelerationX*.000025,-.035,.035);
        targetPose.bones.lowerSpine!.angle!+=lean;targetPose.bones.chest!.angle!-=lean*.25;
      }
      if(this.animationPhase.startsWith('LAND')) {
        targetPose.bones.pelvis!.y=(targetPose.bones.pelvis?.y??0)*this.motionTuning.landingCompression;
        targetPose.bones.pelvis!.x=(targetPose.bones.pelvis?.x??0)*this.motionTuning.landingCompression;
      }
      // Visual-only anticipation keeps the authored soles planted while the unchanged
      // collider already responds to jump input; takeoff smoothly catches up to it.
      const release=smooth((this.airAge-this.anticipationDuration)/this.timing.takeoff);
      this.visualOffsetY=!this.posePreview&&airborne&&motion!.velocityY<0?Math.max(0,this.launchY-y)*(1-release):0;
      const visualY=y+this.visualOffsetY,effectiveClearance=Math.max(0,this.launchY-y-this.visualOffsetY);
      this.planFeet(airborne,x,visualY,facing,ground,preview,speed,h);
      if(this.posePreview) {
        this.constraint=['IdlePose','StartPose','StopPose','TurnPose','AnticipationPose','LandLightPose','LandNormalPose','LandHeavyPose','LandRecoverPose'].includes(this.posePreview)?1:0;
        this.feetTargets=SOLES.map(sole=>({sole:{...sole},roll:0,stance:this.constraint===1}));
      } else {
        this.constraint=airborne?(motion!.velocityY>=0?smooth(1-motion!.clearance/(40*ratio)):0):1;
        // Physics responds immediately. A very brief planted sole visually finishes the push.
        if(airborne&&motion!.velocityY<0&&this.animationPhase==='ANTICIPATION'&&this.pushContacts.length) {
          this.constraint=1-smooth((effectiveClearance-6*ratio)/(8*ratio));
          if(this.constraint>0)this.feetTargets=this.pushContacts.map(p=>({sole:{x:124+(p.x-x)/(facing*this.visualScale),y:210+(p.y-visualY)/this.visualScale},roll:0,stance:true}));
        }
      }
      const duration=this.animationPhase==='ANTICIPATION'||this.animationPhase==='LAND_IMPACT'?Math.min(this.blendDuration,.045):this.blendDuration;
      const pose=this.blender.update(targetPose,h,duration,true);
      this.motionIntensity=mix(this.motionIntensity,this.motionTuning.enabled?this.motionTuning.strength:0,1-Math.exp(-32*h));
      if(Math.abs(this.motionIntensity)<1e-5)this.motionIntensity=0;
      const vx=mix(this.previousSpeed,speed,elapsed/dt),vy=mix(this.previousVy,motion?.velocityY??0,elapsed/dt);
      const head=this.headMotion.update(pose.bones,h,{
        phase:this.animationPhase,time:this.time,gait:this.phase,speed:vx,velocityY:vy,preparation:this.preparation,
        landAge:this.landAge,strength:this.impactStrength,scaleRatio:ratio,
        accelerationX:this.motionSignals.accelerationX,spring:this.motionTuning.headSpring,damping:this.motionTuning.headDamping,limit:this.motionTuning.headLimit,
      },this.refined?(this.motionTuning.headMotion?this.motionIntensity:0):this.motionIntensity,this.motionTuning.headInertia,true);
      this.motionSignals=this.driver.sample(head,h,vx,vy,facing,ratio);
      this.evaluated=this.secondary.update(head,h,this.time,this.state==='IDLE',this.motionSignals,this.motionTuning,this.motionIntensity,true);
      if(this.time>=this.nextBlink){this.blinkStart=this.time;this.nextBlink=this.time+3.1+.7*(1+Math.sin(this.time*1.7));this.blinkCount++;}
      const bt=(this.time-this.blinkStart)/.16;this.blink=bt>=0&&bt<=1?Math.sin(Math.PI*bt)**1.5:0;
    }
    this.rebuild();this.lastRoot={x,y:y+this.visualOffsetY};this.previousSpeed=speed;this.previousVy=motion?.velocityY??0;
  }
  private planFeet(airborne:boolean,x:number,y:number,facing:number,ground:(x:number)=>number,preview:boolean,speed:number,dt:number):void {
    const stanceFraction=this.locomotion.stance;
    const front=this.locomotion.stride*stanceFraction/(2*C.scale),scale=this.visualScale;
    const moving=Math.abs(speed)>.5;
    if(!airborne&&!moving&&this.footWasMoving) {
      this.settleAge=0;this.settleFrom=structuredClone(this.feetTargets);
      this.settleOrder=this.feetTargets[0].stance?[1,0]:[0,1];
      this.contacts.forEach(c=>c.active=false);
    }
    if(moving||airborne)this.settleAge=Infinity;
    this.footWasMoving=moving&&!airborne;
    if(!airborne&&!moving) {
      this.settleAge+=dt;
      // Finish the passing foot first, then place the trailing foot. The other
      // sole stays pinned throughout: braking never drags both feet toward bind.
      this.feetTargets=SOLES.map((ref,i)=>{
        const from=this.settleFrom[i]??{sole:ref,roll:0,stance:true};
        const t=clamp((this.settleAge-this.settleOrder.indexOf(i)*.11)/.11),u=smooth(t);
        const destination={x:ref.x,y:210+(ground(x+facing*(ref.x-124)*scale)-y)/scale-(i?5:0)};
        const sole=blendPoint(from.sole,destination,u);
        const travel=Math.hypot(destination.x-from.sole.x,destination.y-from.sole.y);
        sole.y-=Math.min(3,travel*.35)*Math.sin(Math.PI*t);
        return {sole,roll:mix(from.roll,0,u),stance:t===0?from.stance:t===1};
      });
      return;
    }
    this.feetTargets=SOLES.map((ref,i)=>{
      const u=(this.phase+i*.5)%1,stance=!airborne&&u<stanceFraction,contact=this.contacts[i];
      if(stance&&!contact.active)contact.x=this.virtualX+facing*(mix(ref.x,124+front*(1-2*u/stanceFraction),this.weight)-124)*scale;
      contact.active=stance;
      let sourceX:number,lift=0,roll=0;
      if(stance)sourceX=124+(contact.x-this.virtualX)/(facing*scale);
      else {const t=clamp((u-stanceFraction)/(1-stanceFraction));if(!airborne){const swing=swingFoot(t,this.locomotion.runMix);sourceX=124+front*swing.x;lift=this.locomotion.lift*swing.lift;roll=swing.roll;}else{sourceX=124+mix(-front,front,smooth(t));lift=this.locomotion.lift*Math.sin(Math.PI*t)**1.1;roll=-mix(.13,.28,this.locomotion.runMix)*Math.sin(Math.PI*t);}}
      if(!airborne&&this.landAge<this.timing.landImpact+this.timing.landRecover){
        // A passing foot must not fold up into a fully compressed pelvis.
        // Reduce only its swing clearance/roll; planted contact X stays locked.
        const load=smooth(((this.blender.current.bones.pelvis?.y??0)-6)/8);
        lift*=1-load;roll*=1-load;
      }
      sourceX=clamp(sourceX,94,154);
      const localX=stance?sourceX:mix(ref.x,sourceX,this.weight);
      const sampleX=preview?x+facing*(localX-124)*scale:this.virtualX+facing*(localX-124)*scale;
      const floor=(ground(sampleX)-y)/scale+210;
      return {sole:{x:localX,y:stance?floor-(i?2:0):mix(ref.y,floor-(i?2:0)-lift,this.weight)},roll:roll*this.weight,stance};
    });
  }
  private rebuild():void {
    this.bones.setPose(this.evaluated);
    this.feetTargets.forEach((f,i)=>{
      if(this.constraint<=0)return;
      const current=this.bones.position(LEG_BIND[i].foot);
      const target=blendPoint(current,f.sole,this.constraint);
      this.bones.solveLeg(i,target,f.roll,this.weight);
    });
    for(const [id,angle] of this.overrides)this.bones.setAngle(id,angle);
    this.bones.constrainWorldAngle('head',this.timing.headUpLimit,this.timing.headDownLimit);
    this.bodySkin.attach();
  }
  map(id:RigPartId,p:Vec):Vec {
    return this.bindPose?p:this.bodySkin.map(id,p,this.blink);
  }
  alpha(id:RigPartId):number {
    if(this.bindPose)return id==='blink'?0:1;
    if(id==='blink')return clamp((this.blink-.65)/.25);
    if(id==='eyes')return 1-clamp((this.blink-.7)/.25);return 1;
  }
  private phaseForPose(name:PoseName):AnimationPhase {
    return ({IdlePose:'IDLE',WalkPose:'WALK',StartPose:'START',StopPose:'STOP',TurnPose:'TURN',RunPose:'RUN',AnticipationPose:'ANTICIPATION',TakeoffPose:'TAKEOFF',AscendPose:'ASCEND',ApexPose:'APEX',JumpForwardPose:'ASCEND',FallEarlyPose:'DESCEND',FallPreparePose:'DESCEND',LandLightPose:'LAND_IMPACT',LandNormalPose:'LAND_IMPACT',LandHeavyPose:'LAND_IMPACT',LandRecoverPose:'LAND_RECOVER'} as const)[name];
  }
  private stateForPhase(phase:AnimationPhase):AnimationState {
    if(['IDLE','WALK','RUN','START','STOP','TURN'].includes(phase))return phase as AnimationState;
    return phase.startsWith('LAND')?'LAND':phase==='DESCEND'?'FALL':'JUMP';
  }
  setPosePreview(name:PoseName|null):void {
    this.posePreview=name;
    if(name){this.blender.reset(this.poses[name]);this.evaluated=this.poses[name].bones;this.constraint=['IdlePose','StartPose','StopPose','TurnPose','AnticipationPose','LandLightPose','LandNormalPose','LandHeavyPose','LandRecoverPose'].includes(name)?1:0;this.feetTargets=SOLES.map(sole=>({sole:{...sole},roll:0,stance:true}));this.animationPhase=this.phaseForPose(name);
      this.state=this.stateForPhase(this.animationPhase);this.rebuild();}
  }
  beginInspection():void {
    if(this.savedGameplay)return;
    this.savedLocomotion=this.locomotion.snapshot();this.savedFeet={age:this.settleAge,from:structuredClone(this.settleFrom),order:[...this.settleOrder],moving:this.footWasMoving};
    this.savedGameplay={wasAir:this.wasAir,airAge:this.airAge,lastJumpId:this.lastJumpId,landAge:this.landAge,
      phase:this.phase,weight:this.weight,contacts:structuredClone(this.contacts),virtualX:this.virtualX,lastPreview:this.lastPreview,impactSpeed:this.impactSpeed,impactStrength:this.impactStrength,launchY:this.launchY,launchTravel:this.launchTravel,anticipationDuration:this.anticipationDuration,pushContacts:structuredClone(this.pushContacts),lastRoot:this.lastRoot?{...this.lastRoot}:undefined,visualOffsetY:this.visualOffsetY};
  }
  endInspection():void {
    const saved=this.savedGameplay;if(!saved)return;
    this.wasAir=saved.wasAir;this.airAge=saved.airAge;this.lastJumpId=saved.lastJumpId;this.landAge=saved.landAge;
    this.phase=saved.phase;this.weight=saved.weight;this.contacts=saved.contacts;this.virtualX=saved.virtualX;this.lastPreview=saved.lastPreview;
    this.impactSpeed=saved.impactSpeed;this.impactStrength=saved.impactStrength;
    this.launchY=saved.launchY;this.launchTravel=saved.launchTravel;this.anticipationDuration=saved.anticipationDuration;
    this.pushContacts=saved.pushContacts;this.lastRoot=saved.lastRoot;this.visualOffsetY=saved.visualOffsetY;
    if(this.savedLocomotion)this.locomotion.restore(this.savedLocomotion);
    if(this.savedFeet){this.settleAge=this.savedFeet.age;this.settleFrom=this.savedFeet.from;this.settleOrder=this.savedFeet.order;this.footWasMoving=this.savedFeet.moving;}
    this.savedLocomotion=undefined;this.savedFeet=undefined;this.savedGameplay=undefined;
  }
  tune(patch:Partial<MotionTuning>):void {tuneMotion(this.motionTuning,patch);}
  avoidTailTerrain(env:TailEnvironment,dt:number):void {if(!this.bindPose&&!this.paused)this.tailContact.fit(this.bones,env,dt);}
  get tailPenetration(){return this.tailContact.penetration;}
  get tailContactWeight(){return this.tailContact.weight;}
  get tailPrimaryPenetration(){return this.tailContact.primaryPenetration;}
  get secondaryOffsets(){return {...this.secondary.offsets,...(this.headMotion instanceof FoxHeadMotion?this.headMotion.offsets:{})};}
  get joints():Vec[] {return this.bones.snapshot().map(b=>({x:b.x,y:b.y}));}
  get feet() {return LEG_BIND.map((ids,i)=>({point:this.map(i?'far-leg':'near-leg',SOLES[i]),goal:this.constraint===1?this.feetTargets[i].sole:this.bones.position(ids.foot),stance:this.constraint===1&&this.feetTargets[i].stance}));}
  get supportGoals(){return this.feetTargets;}
  get landingPreparation():number {return this.preparation;}
  get landingStrength():number {return this.impactStrength;}
  resetMotion():void {
    this.tailContact.reset();this.time=0;this.blink=0;this.blinkCount=0;this.blinkStart=-10;this.nextBlink=2.4;
    this.weight=0;this.phase=.25;this.state='IDLE';this.animationPhase='IDLE';this.airAge=0;this.landAge=Infinity;this.wasAir=false;this.lastLandingFlag=false;
    this.impactSpeed=0;this.visualOffsetY=0;this.impactStrength=0;
    this.motionSignals={speed:0,velocityY:0,accelerationX:0,accelerationY:0,headVelocity:0,pelvisVelocity:0,bodyAcceleration:0,torsoVelocity:0};
    this.preparation=0;this.launchTravel=0;this.currentPoseName='IdlePose';this.lastFacing=1;
    this.settleAge=Infinity;this.settleFrom=[];this.footWasMoving=false;
    this.contacts.forEach(c=>c.active=false);this.lastPreview=false;this.lastJumpId=-1;this.overrides.clear();
    this.savedLocomotion=undefined;this.savedFeet=undefined;this.savedGameplay=undefined;this.posePreview=null;this.paused=false;this.bindPose=false;
    this.blender.reset(this.poses.IdlePose);this.locomotion.reset();this.secondary.reset();this.headMotion.reset();this.driver.reset();this.previousSpeed=0;this.previousVy=0;this.motionIntensity=this.motionTuning.enabled?this.motionTuning.strength:0;this.lastRoot=undefined;this.pushContacts=[];this.evaluated=this.poses.IdlePose.bones;this.constraint=1;
    this.feetTargets=SOLES.map(sole=>({sole:{...sole},roll:0,stance:true}));this.rebuild();
  }
}
