import type {AnimationMode} from './CharacterConfig.ts';
import type {MotionPose} from './FoxAnimationController.ts';
/** A virtual trajectory for inspection. It never writes to PlayerController. */
export class FoxAnimationDebug {
  clock=0;visualOffsetY=0;finished=false;
  reset():void {this.clock=0;this.visualOffsetY=0;this.finished=false;}
  sample(dt:number,mode:AnimationMode,jumpSpeed:number,gravity:number,landDuration:number):MotionPose|undefined {
    if(mode!=='JUMP_CYCLE'&&mode!=='JUMP_ONCE'){this.visualOffsetY=0;return undefined;}
    const airTime=2*jumpSpeed/gravity,cycle=airTime+.66,lead=mode==='JUMP_ONCE'?.2:0;
    const previous=this.clock;this.clock=mode==='JUMP_ONCE'?Math.min(cycle+lead,this.clock+dt):this.clock+dt;
    this.finished=mode==='JUMP_ONCE'&&this.clock>=cycle+lead;
    const t=mode==='JUMP_ONCE'?this.clock-lead:this.clock%cycle,before=mode==='JUMP_ONCE'?previous-lead:previous%cycle;
    const airborne=t>=0&&t<airTime;
    this.visualOffsetY=airborne?-jumpSpeed*t+.5*gravity*t*t:0;
    return {grounded:!airborne,velocityY:airborne?-jumpSpeed+gravity*t:0,
      landTimer:airborne||t<0?0:Math.max(0,landDuration-(t-airTime)),landDuration,
      clearance:-this.visualOffsetY,impact:jumpSpeed,
      jumped:airborne&&(before<0||previous===0||Math.floor(previous/cycle)!==Math.floor(this.clock/cycle)),
      landed:!airborne&&t>=airTime&&before<airTime,jumpId:Math.floor(this.clock/(cycle+lead))+10000,jumpSpeed,
      landingReliable:true,timeToLand:airborne?Math.max(0,airTime-t):0};
  }
}
