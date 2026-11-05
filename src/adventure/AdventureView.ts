import Phaser from 'phaser';
import type {AdventureModel,Flower} from './AdventureModel';

/** Additive world feedback. Never changes terrain, collision, camera or the fox rig. */
export class AdventureView {
  private garden:Phaser.GameObjects.Graphics;private tree:Phaser.GameObjects.Graphics;
  private prompt:Phaser.GameObjects.Text;private title:Phaser.GameObjects.Text;private halo:Phaser.GameObjects.Image;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private pulse=-1;private pulseUntil=0;
  constructor(scene:Phaser.Scene,readonly flowers:Flower[],private finish:{x:number;y:number}) {
    this.garden=scene.add.graphics().setDepth(42.5).setName('adventure:listening-garden');
    this.halo=scene.add.image(finish.x,finish.y-165,'mosslight-dewdrops','dew-halo').setDisplaySize(440,440).setTint(0xffe6a4).setDepth(41).setAlpha(0);
    this.tree=scene.add.graphics().setDepth(45).setName('adventure:awakening');
    this.prompt=scene.add.text(0,0,'',{fontFamily:'system-ui,sans-serif',fontSize:'14px',color:'#fff1c8',backgroundColor:'#204a3ee8',padding:{x:10,y:7}}).setOrigin(.5,0).setDepth(80);
    this.title=scene.add.text(flowers[1].x,flowers[1].y-270,'听 风 花',{fontFamily:'serif',fontSize:'17px',color:'#f3e5b3',stroke:'#315744',strokeThickness:3}).setOrigin(.5).setDepth(46);
  }
  feedback(index:number,time:number):void {this.pulse=index;this.pulseUntil=time+.55;}
  update(model:AdventureModel,near:number,paused:boolean):void {
    const t=this.reduced?0:model.clock,g=this.garden;g.clear();
    this.flowers.forEach((f,i)=>{
      const lit=model.song||model.singing===i||this.pulse===i&&model.clock<this.pulseUntil;
      const head=f.y-180-i*12,sway=this.reduced?0:Math.sin(t*1.4+i)*2;
      g.lineStyle(3,0x62896a,1).beginPath().moveTo(f.x,f.y-2).lineTo(f.x-4,head+22).lineTo(f.x+sway,head).strokePath();
      g.fillStyle(0x83aa73,.95).fillEllipse(f.x-9,head+31,21,9).fillEllipse(f.x+7,head+43,20,8);
      if(lit){g.fillStyle(0xf5db96,.12).fillCircle(f.x+sway,head,36);g.fillStyle(0xf5db96,.16).fillCircle(f.x+sway,head,24);}
      for(let p=0;p<5;p++){const a=p*Math.PI*2/5-Math.PI/2;g.fillStyle(lit?0xffedb5:[0x9fceb4,0xd1d99b,0xdac7a2][i],1).fillEllipse(f.x+sway+Math.cos(a)*13,head+Math.sin(a)*13,16,20);}
      g.fillStyle(lit?0xfff5d0:0x45684d,1).fillCircle(f.x+sway,head,5);
      for(let n=0;n<=i;n++)g.fillStyle(0xe5e2ae,.9).fillCircle(f.x-4*i+n*8,f.y-17,2);
    });
    if(model.song)for(let i=0;i<7;i++)g.fillStyle(0xffe5a0,.6).fillCircle(this.flowers[1].x+Math.sin(t*.5+i*2)*100,this.flowers[1].y-120+Math.cos(t*.7+i)*48,2);
    this.prompt.setVisible(!paused&&near>=0);
    if(near>=0){const f=this.flowers[near];this.prompt.setPosition(f.x,f.y+12).setText(model.song?'风记住了你的歌':model.listening?'听，光点正在唱歌…':!model.introduced?'E 聆听风的旋律':`E 回应 ${model.step}/3 · Q 再听一次`);}
    const a=this.tree,{x,y}=this.finish;a.clear();
    this.halo.setAlpha(model.complete?.5: model.arrived?.22:.06).setDisplaySize(model.complete?470:300,model.complete?470:300);
    // Vines embrace the accepted arch rather than changing its footprint.
    a.lineStyle(5,model.arrived?0x72976b:0x557b61,.95);
    for(const side of [-1,1]){a.beginPath().moveTo(x+side*62,y).lineTo(x+side*68,y-60).lineTo(x+side*55,y-135).lineTo(x+side*60,y-205).lineTo(x+side*20,y-215).strokePath();for(let j=0;j<4;j++)a.fillStyle(0x9cb27b,.95).fillEllipse(x+side*(j%2?66:53),y-35-j*44,22,10);}
    if(model.complete){a.lineStyle(2,0xd6c68b,.35);for(let i=0;i<7;i++){const angle=-Math.PI+i*Math.PI/6;a.lineBetween(x+Math.cos(angle)*40,y-166+Math.sin(angle)*40,x+Math.cos(angle)*100,y-166+Math.sin(angle)*100);}}
    if(model.arrived){a.fillStyle(0xf5db96,.1).fillCircle(x,y-168,48);a.lineStyle(2,0xf0dd9a,.7).strokeCircle(x,y-167,25);}
    for(let i=0;i<2;i++){
      const cx=x+(i?1:-1)*61,cy=y-160-i*36,lit=model.dew.has(i?'dew-hidden-roots':'dew-canopy-lookout');
      for(let p=0;p<6;p++){const angle=p*Math.PI/3;a.fillStyle(lit?0xf5d999:0x79977b,lit?1:.8).fillEllipse(cx+Math.cos(angle)*(lit?17:5),cy+Math.sin(angle)*(lit?17:5),lit?21:8,lit?24:10);}
      a.fillStyle(lit?0xfff2bf:0x4e735a,1).fillCircle(cx,cy,5);
    }
    if(model.complete)for(let i=0;i<(model.song?16:9);i++){const px=x+Math.sin(t*.32+i*2.4)*(48+i*4),py=y-120+Math.cos(t*.5+i*1.6)*(50+i*2);a.fillStyle(0xf9e5a5,.12).fillCircle(px,py,8);a.fillStyle(0xffe9ad,.65).fillCircle(px,py,2);}
  }
  destroy():void {this.garden.destroy();this.tree.destroy();this.prompt.destroy();this.title.destroy();this.halo.destroy();}
}
