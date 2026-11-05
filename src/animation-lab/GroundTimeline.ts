import type {MotionTuning} from '../characters/fox/FoxMotionConfig.ts';
import {PlayerController} from '../characters/fox/PlayerController.ts';
import {groundDemoCue} from './GroundDemo.ts';
import {FoxAnimationController} from '../characters/fox/FoxAnimationController.ts';
import {PHYSICS_CONFIG as P} from '../characters/fox/PhysicsConfig.ts';
import {gaitStage} from '../characters/fox/FoxGait.ts';
export const GROUND_DURATION=6;
export type GroundAction='IDLE'|'WALK'|'RUN'|'START'|'STOP'|'TURN'|'SPEED'|'DEMO';
export class GroundTimeline {
 readonly primary=new FoxAnimationController();
 readonly refined=new FoxAnimationController();
 readonly previous=new FoxAnimationController('previous');
 private frame=0;private key='';private mode:GroundAction='IDLE';private baseAction:GroundAction='IDLE';private requestedSpeed=60;private speedEvents:{frame:number;target:number}[]=[];private x=400;private facing=1;
 private demoPlayer=new PlayerController(400,()=>({id:'lab-demo-floor',kind:'ground',x:0,y:545,width:1280,height:.0001}),()=>[]);
 private demoOrigin=0;
 speed=0;time=0;
 constructor(){this.primary.tune({enabled:false});this.primary.resetMotion();}
 seek(time:number,action:GroundAction='WALK',speed=60,enabled=true,head=true,ears=true,tail=true,tuning:Partial<MotionTuning>={}):void {
  const key=JSON.stringify([action,enabled,head,ears,tail,tuning]),frame=Math.round(Math.max(0,time)*120);
  const changed=key!==this.key;
  const continueManual=action==='SPEED'&&this.mode!=='SPEED'&&this.key!==''&&frame>=this.frame;
  if(continueManual){this.baseAction=this.mode;this.speedEvents=[{frame:this.frame+1,target:speed}];}
  else if(changed&&action!==this.mode){this.baseAction=action;this.speedEvents=action==='SPEED'?[{frame:0,target:speed}]:[];}
  if(action==='SPEED'&&this.mode==='SPEED'&&speed!==this.requestedSpeed){
    this.speedEvents=this.speedEvents.filter(e=>e.frame<this.frame);this.speedEvents.push({frame:this.frame+1,target:speed});
  }
  if(changed&&!continueManual||frame<this.frame){this.frame=0;this.x=400;this.speed=0;this.facing=1;this.demoOrigin=0;this.demoPlayer.reset(400);this.demoPlayer.facing=1;for(const a of [this.refined,this.previous,this.primary])a.resetMotion();}
  this.key=key;this.mode=action;this.requestedSpeed=speed;
  for(const a of [this.refined,this.previous,this.primary])a.tune({enabled:a===this.primary?false:enabled,headMotion:head,ears,tail});
  this.refined.tune(tuning);this.primary.tune({...tuning,enabled:false,headMotion:false});
  while(this.frame<frame){
   const dt=1/120,t=++this.frame/120;
   let target=this.baseAction==='IDLE'?0:this.baseAction==='WALK'?60:this.baseAction==='SPEED'?speed:128;
   if(this.baseAction==='START'&&t<.35||this.baseAction==='STOP'&&t>=1.2)target=0;
   if(this.baseAction==='TURN'&&t>=1)target=-128;
   if(this.baseAction==='DEMO')target=groundDemoCue(t).speed;
   if(action==='SPEED')for(const event of this.speedEvents)if(this.frame>=event.frame)target=event.target;
   const axis=Math.sign(target),walking=Math.abs(target)>0&&Math.abs(target)<84,old=this.speed;
   const rate=(!axis||old*axis<0?P.groundDeceleration:P.groundAcceleration)*dt;
   this.speed=old<target?Math.min(target,old+rate):Math.max(target,old-rate);
   let d=(old+this.speed)*.5*dt,y=545,ground=(_x:number)=>545;
   if(this.baseAction==='DEMO'){
    // Rebase the laboratory's local floor during idle; logical world X remains
    // continuous, so repeating the script neither hits viewport limits nor slides feet.
    if(this.frame>1&&(this.frame-1)%1680===0){this.demoOrigin+=this.demoPlayer.x-400;this.demoPlayer.reset(400);}
    d=this.demoPlayer.step(dt,axis,{pressed:false,held:false},walking);
    this.speed=this.demoPlayer.velocity;this.x=this.demoOrigin+this.demoPlayer.x;this.facing=this.demoPlayer.facing;y=this.demoPlayer.y;
    ground=(x:number)=>this.demoPlayer.supportY(x-this.demoOrigin);
   }else{this.x+=d;if(Math.abs(this.speed)>6)this.facing=Math.sign(this.speed);}
   for(const a of [this.refined,this.previous,this.primary])a.update(dt,d,this.speed,this.x,y,this.facing,ground,false,{grounded:true,velocityY:0,clearance:0,landTimer:0,landDuration:.16,impact:0,intent:{axis,walking}});
  }
  this.time=this.frame/120;
 }
 get facingDirection(){return this.facing;}
 snapshot(){const snap=(a:FoxAnimationController)=>({state:a.state,phase:a.phase,stage:gaitStage(a.phase),feet:a.feet,bones:a.bones.snapshot(),offsets:a.secondaryOffsets,stride:a.locomotion.stride,stance:a.locomotion.stance,cadence:Math.abs(this.speed)/a.locomotion.stride,runMix:a.locomotion.runMix});return {demoStage:this.mode==='DEMO'?groundDemoCue(this.time).label:null,time:this.time,x:this.x,speed:this.speed,facing:this.facing,refined:snap(this.refined),previous:snap(this.previous),primary:snap(this.primary)};}
}
