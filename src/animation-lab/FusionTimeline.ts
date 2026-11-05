import {PlayerController} from '../characters/fox/PlayerController.ts';
import {FoxAnimationController} from '../characters/fox/FoxAnimationController.ts';
import {predictLanding} from '../characters/fox/FoxLandingPrediction.ts';
import type {MotionTuning} from '../characters/fox/FoxMotionConfig.ts';
export const FUSION_DURATION=14;
const STEP=1/120;
const floor={id:'fusion-lab-floor',kind:'ground' as const,x:0,y:545,width:1280,height:.0001};
/** Simulated input on the SAME PlayerController and animator as the forest.
 * No attached keyboard, fabricated LAND event or per-state spring reset. */
export class FusionTimeline {
  readonly refined=new FoxAnimationController();readonly primary=new FoxAnimationController();
  player=new PlayerController(400,()=>floor,()=>[]);
  readonly events:{time:number;from:string;to:string;grounded:boolean;jump:number;land:number}[]=[];
  private frame=0;private key='';private last='IDLE';private secondAt=Infinity;private second=false;
  time=0;
  constructor(){this.primary.tune({enabled:false});this.primary.resetMotion();}
  seek(time:number,enabled=true,tuning:Partial<MotionTuning>={}):void {
    const frame=Math.round(Math.max(0,Math.min(FUSION_DURATION,Number.isFinite(time)?time:0))/STEP),key=JSON.stringify([enabled,tuning]);
    if(frame<this.frame||key!==this.key){this.frame=0;this.time=0;this.player.destroy();this.player=new PlayerController(400,()=>floor,()=>[]);this.events.length=0;this.last='IDLE';this.secondAt=Infinity;this.second=false;
      this.refined.tune({...tuning,enabled});this.primary.tune({...tuning,enabled:false});this.refined.resetMotion();this.primary.resetMotion();}
    this.key=key;
    while(this.frame<frame){
      const t=++this.frame*STEP;
      const axis=t<2?0:t<6?1:t<6.6?0:t<9?-1:0,walking=t>=2&&t<4;
      const first=this.frame===960,again=!this.second&&t>=this.secondAt;
      if(again)this.second=true;
      const d=this.player.step(STEP,axis,{pressed:first||again,held:t>=8&&t<9.8},walking),p=this.player;
      if(p.landedThisFrame&&p.jumpCount===1)this.secondAt=t+.11;
      const motion={...predictLanding(p.x,p.y,p.velocity,p.velocityY,p.physics.gravity,(x,y)=>p.world.below(x,y)),
        intent:{axis,walking},grounded:p.grounded,velocityY:p.velocityY,landTimer:p.landTimer,landDuration:p.physics.landDuration,
        clearance:p.clearance,impact:p.impact,jumped:p.jumpedThisFrame,landed:p.landedThisFrame,jumpId:p.jumpCount,jumpSpeed:p.physics.jumpSpeed};
      for(const a of [this.primary,this.refined])a.update(STEP,d,p.velocity,p.x,p.y,p.facing,x=>p.supportY(x),false,motion);
      const state=this.refined.animationPhase+(this.refined.currentPoseName==='FallPreparePose'?'/FALL_PREPARE':'');
      if(state!==this.last){this.events.push({time:t,from:this.last,to:state,grounded:p.grounded,jump:p.jumpCount,land:p.landCount});if(this.events.length>96)this.events.shift();this.last=state;}
    }
    this.time=this.frame*STEP;
  }
  snapshot(){const p=this.player;return {source:'LAB_SIMULATION_SAME_PLAYER_CONTROLLER',time:this.time,x:p.x,y:p.y,velocity:p.velocity,velocityY:p.velocityY,grounded:p.grounded,jumps:p.jumpCount,lands:p.landCount,state:this.refined.state,phase:this.refined.animationPhase,pose:this.refined.currentPoseName,events:this.events,bones:this.refined.bones.snapshot(),offsets:this.refined.secondaryOffsets};}
}
