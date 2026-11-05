import type Phaser from 'phaser';
import {CAMERA_CONFIG as C,type CameraMode} from './CameraConfig.ts';
const clamp=(v:number,max:number)=>Math.max(0,Math.min(Math.max(0,max),v));
/** Same exponential follow; only the airborne vertical focus is stabilized. */
export class CameraController {
 private originY=0;private focusY=0;private tx=0;private ty=0;private state='grounded';
 private camera:Phaser.Cameras.Scene2D.Camera;private width:number;private height:number;private mode:CameraMode;
 constructor(camera:Phaser.Cameras.Scene2D.Camera,width:number,height:number,mode:CameraMode='stable') {this.camera=camera;this.width=width;this.height=height;this.mode=mode;camera.setBounds(0,0,width,height);camera.roundPixels=false;}
 reset(x:number,y:number):void {this.originY=y;this.focusY=y;this.state='grounded';this.tx=clamp(x-C.horizontalAnchor,this.width-C.viewportWidth);this.ty=clamp(y-C.footAnchor,this.height-C.viewportHeight);this.camera.setScroll(this.tx,this.ty);}
 update(dt:number,x:number,y:number,context?:{grounded:boolean}):void {
  if(!Number.isFinite(dt)||dt<=0)return;
  if(this.mode==='baseline'||!context){this.focusY=y;this.originY=y;this.state='baseline';}
  else if(context.grounded){this.originY=y;this.focusY=y;this.state='grounded';}
  else if(y>this.originY+C.fallThreshold){this.focusY=y+C.fallLook;this.state='fall-follow';}
  else {this.focusY=Math.min(this.originY,y+C.jumpSlack);this.state=this.focusY<this.originY?'upper-guard':'jump-hold';}
  this.tx=clamp(x-C.horizontalAnchor,this.width-C.viewportWidth);this.ty=clamp(this.focusY-C.footAnchor,this.height-C.viewportHeight);
  const c=this.camera;c.setScroll(clamp(c.scrollX+(this.tx-c.scrollX)*(1-Math.exp(-dt/C.horizontalTau)),this.width-C.viewportWidth),clamp(c.scrollY+(this.ty-c.scrollY)*(1-Math.exp(-dt/C.verticalTau)),this.height-C.viewportHeight));
 }
 snapshot(x:number,y:number){return {mode:this.mode,state:this.state,screen:{x:x-this.camera.scrollX,y:y-this.camera.scrollY,head:y-this.camera.scrollY-164},focus:{x,y:this.focusY},target:{x:this.tx,y:this.ty},error:{x:this.tx-this.camera.scrollX,y:this.ty-this.camera.scrollY},bounds:{x:Math.max(0,this.width-1280),y:Math.max(0,this.height-720)}};}
}
