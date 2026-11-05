import Phaser from 'phaser';
import type {LevelExit} from './Level01Exit';
import {gateEnvelope,type LevelCompletionModel} from './LevelCompletionModel';
/** Nine preallocated objects, reusing existing SVG textures and the accepted gate outline. */
export class CompletionView {
  private halo:Phaser.GameObjects.Image;private contour:Phaser.GameObjects.Graphics;
  private leaves:Phaser.GameObjects.Image[];private sparks:Phaser.GameObjects.Image[];private prompt:Phaser.GameObjects.Text;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private outline:{x:number;y:number}[];
  constructor(scene:Phaser.Scene,private exit:LevelExit) {
    const {x,y,gate:g}=exit;
    this.outline=[{x:x-g.halfWidth,y},{x:x-g.halfWidth,y:y-g.height},{x:x+g.halfWidth,y:y-g.height},{x:x+g.halfWidth,y}];
    this.halo=scene.add.image(x,y-113,'mosslight-dewdrops','dew-halo').setTint(0xffe4a5).setDisplaySize(180,270).setDepth(41.7).setAlpha(0);
    this.contour=scene.add.graphics().setDepth(46);
    this.leaves=[-1,1].map(side=>scene.add.image(x+side*61,y-g.height-3,'vines').setOrigin(.5,0).setFlipX(side>0).setDisplaySize(52,48).setDepth(44.9));
    this.sparks=[0,1,2,3].map(()=>scene.add.image(x,y-60,'mosslight-dewdrops','dew-spark').setDisplaySize(9,9).setDepth(46.1).setAlpha(0));
    this.prompt=scene.add.text(x,y+30,'E 进入晨光门庭',{fontFamily:'system-ui,sans-serif',fontSize:'14px',color:'#fff1c7',backgroundColor:'#234b3ee8',padding:{x:12,y:8}}).setOrigin(.5,0).setDepth(83).setVisible(false);
  }
  update(model:LevelCompletionModel,eligible:boolean):void {
    const t=model.state==='PLAYING'?0:model.elapsed,e=gateEnvelope(t),done=model.state==='COMPLETED'||model.state==='EXPLORING';
    this.prompt.setVisible(eligible);
    this.halo.setAlpha(model.state==='PLAYING'?0:.12*e.gather+.27*e.wake).setDisplaySize(130+e.wake*70,210+e.wake*80);
    const g=this.contour;g.clear();let remaining=(this.exit.gate.height*2+this.exit.gate.halfWidth*2)*e.outline;
    if(remaining>0){g.lineStyle(5,0xffe9b1,.22+.25*e.settle).beginPath().moveTo(this.outline[0].x,this.outline[0].y);for(let i=1;i<this.outline.length;i++){const a=this.outline[i-1],b=this.outline[i],length=Math.hypot(b.x-a.x,b.y-a.y),u=Math.min(1,remaining/length);g.lineTo(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u);remaining-=length;if(remaining<=0)break;}g.strokePath();}
    this.leaves.forEach((leaf,i)=>leaf.setAngle(this.reduced?0:Math.sin(t*2.1+i)*e.wake*1.8*(1-e.settle)));
    this.sparks.forEach((spark,i)=>{const u=(t-i*.19)/1.2,on=model.state==='ACTIVATING'&&!this.reduced&&u>0&&u<1;spark.setVisible(on);if(on)spark.setPosition(this.exit.x+(i-1.5)*22+Math.sin(u*4+i)*6,this.exit.y-45-u*140).setAlpha(Math.sin(u*Math.PI)*.7);});
    if(done)this.sparks.forEach(s=>s.setVisible(false));
  }
  destroy():void {for(const o of [this.halo,this.contour,this.prompt,...this.leaves,...this.sparks])o.destroy();}
}
