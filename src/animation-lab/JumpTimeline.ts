import type {MotionTuning} from '../characters/fox/FoxMotionConfig.ts';
import {FoxAnimationController} from '../characters/fox/FoxAnimationController.ts';
import {FoxAnimationDebug} from '../characters/fox/FoxAnimationDebug.ts';
import {PHYSICS_CONFIG} from '../characters/fox/PhysicsConfig.ts';
export const JUMP_DURATION=1.66;
const STEP=1/120;
/** The SAME animator as the forest, driven by a repeatable virtual trajectory.
 * Rewind replays fixed steps so springs have history, even while scrubbing. */
export class JumpTimeline {
  readonly primary=new FoxAnimationController();
  readonly refined=new FoxAnimationController();
  readonly previous=new FoxAnimationController('previous');
  private flight=new FoxAnimationDebug();
  private frame=0;private enabled=true;private travel=true;
  private ears=true;private tail=true;
  private tuningKey='';
  private head=true;private waist=1;
  private vx=0;private x=640;
  time=0;offsetY=0;
  constructor(){this.primary.tune({enabled:false});this.primary.resetMotion();}
  seek(time:number,enabled=true,travel=true,head=true,waist=1,ears=true,tail=true,tuning:Partial<MotionTuning>={}):void {
    const tuningKey=JSON.stringify(tuning);
    const frame=Math.round(Math.max(0,Math.min(JUMP_DURATION,time))/STEP);
    if(tuningKey!==this.tuningKey||frame<this.frame||enabled!==this.enabled||travel!==this.travel||head!==this.head||waist!==this.waist||ears!==this.ears||tail!==this.tail){this.reset(enabled);}
    this.tuningKey=tuningKey;this.enabled=enabled;this.travel=travel;this.head=head;this.waist=waist;this.ears=ears;this.tail=tail;
    this.refined.tune({headMotion:head,waistBend:waist,ears,tail});
    for(const a of [this.previous,this.refined,this.primary])a.tune({enabled});
    this.refined.tune(tuning);this.primary.tune({...tuning,enabled:false,headMotion:false,waistBend:waist});
    while(this.frame<frame){
      const m=this.flight.sample(STEP,'JUMP_ONCE',600,1500,.16)!;
      this.frame++;
      const axis=travel&&this.flight.clock<1?1:0,target=axis*128,old=this.vx;
      const acceleration=(axis?PHYSICS_CONFIG.groundAcceleration:PHYSICS_CONFIG.groundDeceleration)*(m.grounded?1:PHYSICS_CONFIG.airControl);
      this.vx=old<target?Math.min(target,old+acceleration*STEP):Math.max(target,old-acceleration*STEP);
      const distance=(old+this.vx)*.5*STEP;this.x+=distance;
      for(const a of [this.previous,this.refined,this.primary])a.update(STEP,distance,this.vx,this.x,545+this.flight.visualOffsetY,1,()=>545,false,{...m,intent:{axis,walking:false}});
    }
    this.time=this.frame*STEP;this.offsetY=this.flight.visualOffsetY;
  }
  private reset(enabled:boolean):void {this.frame=0;this.vx=0;this.x=640;this.time=0;this.offsetY=0;this.flight.reset();for(const a of [this.previous,this.refined,this.primary]){a.tune({enabled:a===this.primary?false:enabled});a.resetMotion();}}
}
