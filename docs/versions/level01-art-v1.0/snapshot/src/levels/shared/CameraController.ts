import type Phaser from 'phaser';
const clamp=(v:number,max:number)=>Math.max(0,Math.min(max,v));
/** Frame-independent damping; the fox's feet sit below center, leaving room above. */
export class CameraController {
  private camera:Phaser.Cameras.Scene2D.Camera;private width:number;private height:number;
  constructor(camera:Phaser.Cameras.Scene2D.Camera,width:number,height:number) {
    this.camera=camera;this.width=width;this.height=height;
    camera.setBounds(0,0,width,height);camera.roundPixels=false;
  }
  reset(x:number,y:number):void {this.camera.setScroll(clamp(x-640,this.width-1280),clamp(y-480,this.height-720));}
  update(dt:number,x:number,y:number):void {
    const camera=this.camera;
    const tx=clamp(x-640,this.width-1280),ty=clamp(y-480,this.height-720);
    camera.setScroll(camera.scrollX+(tx-camera.scrollX)*(1-Math.exp(-dt/0.16)),camera.scrollY+(ty-camera.scrollY)*(1-Math.exp(-dt/0.22)));
  }
}
