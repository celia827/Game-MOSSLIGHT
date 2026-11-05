import type {BonePose} from './FoxBones.ts';
import {clamp,mix} from './poseMath.ts';
export interface MotionSignals {speed:number;velocityY:number;accelerationX:number;accelerationY:number;headVelocity:number;pelvisVelocity:number;bodyAcceleration:number;torsoVelocity?:number}
/** Observe physical velocity and the evaluated primary body; mirroring is not an impulse. */
export class FoxMotionDriver {
  private previous?:{vx:number;vy:number;head:number;pelvis:number;body:number;bodyVelocity:number;torso:number};
  private ax=0;private ay=0;private headVelocity=0;private bodyAcceleration=0;
  sample(pose:BonePose,dt:number,vx:number,vy:number,facing:number,ratio:number):MotionSignals {
    const pelvis=pose.pelvis?.angle??0;
    const torso=pelvis+(pose.lowerSpine?.angle??0)+(pose.chest?.angle??0);
    const head=pelvis+(pose.lowerSpine?.angle??0)+(pose.chest?.angle??0)+(pose.neck?.angle??0)+(pose.head?.angle??0);
    const body=pose.pelvis?.y??0,p=this.previous;
    const h=Math.max(dt,1e-5),alpha=1-Math.exp(-22*h);
    const bodyV=p?(body-p.body)/h:0;
    this.ax=mix(this.ax,p?clamp((vx-p.vx)/h/ratio,-1800,1800):0,alpha);
    this.ay=mix(this.ay,p?clamp((vy-p.vy)/h/ratio,-4200,4200):0,alpha);
    this.headVelocity=mix(this.headVelocity,p?clamp((head-p.head)/h,-9,9):0,alpha);
    this.bodyAcceleration=mix(this.bodyAcceleration,p?clamp((bodyV-p.bodyVelocity)/h,-2600,2600):0,alpha);
    const signals={speed:vx*facing/ratio,velocityY:vy/ratio,accelerationX:this.ax*facing,accelerationY:this.ay,
      headVelocity:this.headVelocity,pelvisVelocity:p?clamp((pelvis-p.pelvis)/h,-5,5):0,bodyAcceleration:this.bodyAcceleration,torsoVelocity:p?clamp((torso-p.torso)/h,-8,8):0};
    this.previous={vx,vy,head,pelvis,body,bodyVelocity:bodyV,torso};return signals;
  }
  reset():void {this.previous=undefined;this.ax=0;this.ay=0;this.headVelocity=0;this.bodyAcceleration=0;}
}
