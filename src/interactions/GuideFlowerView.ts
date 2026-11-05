import Phaser from 'phaser';
import {ART_SCALE} from '../config/game';
import {flowerVisual,flowerRoute,guideStrength,type FlowerInteractionDefinition} from './GuideFlowerVisual';
const TEXTURE='forest-interactions';
/** Small cached visual group. All effects are local, world-space and collision-free. */
export class GuideFlowerView {
  readonly prompt:Phaser.GameObjects.Text;
  private images:Phaser.GameObjects.Image[]=[];
  private stem:Phaser.GameObjects.Image;private petals:Phaser.GameObjects.Image;private core:Phaser.GameObjects.Image;
  private warm:Phaser.GameObjects.Image;private cool:Phaser.GameObjects.Image;
  private guides:{leaf:Phaser.GameObjects.Image;halo:Phaser.GameObjects.Image}[];
  private platforms:Phaser.GameObjects.Image[];private plants:Phaser.GameObjects.Image[];private sparks:Phaser.GameObjects.Image[];
  private vine:Phaser.GameObjects.Graphics;private samples:{x:number;y:number}[];private drawn=-1;
  private cx:number;private cy:number;private clock=0;private definition:FlowerInteractionDefinition;
  stage='idle';litGuides=0;
  constructor(scene:Phaser.Scene,d:FlowerInteractionDefinition) {
    this.definition=d;
    const image=(x:number,y:number,frame:string,w:number,h=w,depth=42)=>{const p=scene.add.image(x,y,TEXTURE,frame).setDisplaySize(w,h).setDepth(depth).setName(`${d.id}:${frame}`);this.images.push(p);return p;};
    // A curved stem keeps its foot on the accepted deck and reveals the bloom left of the sign.
    const unit=.85,bx=d.x-34;this.cx=bx+(62-128)*unit;this.cy=d.y-(268-80)*unit;
    this.stem=image(bx,d.y,'flower-stem',192*unit,272*unit).setOrigin(128/192,268/272);
    this.petals=image(this.cx,this.cy,'flower-petals',192*unit,272*unit).setOrigin(62/192,80/272);
    this.core=image(this.cx,this.cy,'flower-core',45);
    this.warm=image(this.cx,this.cy,'flower-glow',160,160,41.9);
    this.cool=image(this.cx,this.cy,'flower-glow',200,200,41.8).setTint(0x93e4d7);
    this.guides=d.guides.map(p=>({leaf:image(p.x,p.y,'moss-guide',40,40,42.4),halo:image(p.x,p.y,'flower-glow',112,112,41.8).setTint(0x8bdcce)}));
    this.platforms=(d.response?.platforms??[]).map(p=>image(p.x,p.y-5,'platform-halo',p.width*.86,44,42.15));
    this.plants=(d.response?.plants??[]).map(p=>image(p.x,p.y,'awaken-grass',44,40).setOrigin(.5,1));
    this.sparks=Array.from({length:6},()=>image(this.cx,this.cy,'moss-spark',18,18,42.6));
    this.samples=flowerRoute({x:this.cx,y:this.cy},d.guides);
    this.vine=scene.add.graphics().setDepth(41.95).setName(`${d.id}:living-vine`);
    this.prompt=scene.add.text(bx,d.y+20,d.prompt,{fontFamily:'system-ui, sans-serif',fontSize:'16px',color:'#fff6ce',backgroundColor:'#285e55e8',padding:{x:9,y:4}}).setOrigin(.5,0).setDepth(80).setName(`${d.id}:prompt`);
    this.update(0,null,false);
  }
  get objectCount():number{return this.images.length+2;}
  update(dt:number,elapsed:number|null,showPrompt:boolean):void {
    this.clock+=dt;const f=flowerVisual(elapsed,this.clock),t=elapsed??0,active=elapsed!==null;
    this.stage=f.stage;this.prompt.setVisible(showPrompt);
    this.petals.setScale(.85/ART_SCALE*f.petal).setRotation(-.025*f.energy*Math.sin(t*2.4));
    this.core.setScale(45/(64*ART_SCALE)*f.core);
    this.warm.setDisplaySize(160*f.radius,160*f.radius).setAlpha(f.halo);
    this.cool.setDisplaySize(200*f.radius,200*f.radius).setAlpha(f.energy*.32);
    this.stem.setRotation(Math.sin(t*3.6)*.012*f.energy);
    this.plants.forEach((p,i)=>p.setRotation(Math.sin(t*5-i*.9)*.095*f.energy).setAlpha(.85+.15*f.energy));
    this.litGuides=0;
    this.guides.forEach((g,i)=>{
      const strength=guideStrength(f.route,i,this.guides.length)*f.fade;
      if(strength>.1)this.litGuides++;
      g.leaf.setVisible(strength>0).setAlpha(strength*.95).setScale(40/(64*ART_SCALE)*(1+.08*Math.sin(t*3-i)));
      g.halo.setVisible(strength>0).setAlpha(strength*(.5+.12*Math.sin(t*2.4-i)));
    });
    this.platforms.forEach((p,i)=>{const strength=guideStrength(f.route,i+1,this.guides.length)*f.fade;p.setVisible(strength>0).setAlpha(strength*(.62+.1*Math.sin(t*2-i)));});
    const segments=Math.floor(f.route*(this.samples.length-1));
    if(segments!==this.drawn){this.drawn=segments;this.vine.clear();if(segments>0){const prefix=this.samples.slice(0,segments+1);this.vine.lineStyle(10,0x88d5ba,.09).strokePoints(prefix,false);this.vine.lineStyle(2.3,0xc3eac1,.62).strokePoints(prefix,false);}}
    this.vine.setAlpha(f.fade*.8).setVisible(active&&segments>0);
    this.sparks.forEach((p,i)=>{
      if(i<3){const q=f.stage==='bloom'?f.burst:0,angle=-2.5+i*.92;p.setVisible(q>0).setPosition(this.cx+Math.cos(angle)*q*85,this.cy+Math.sin(angle)*q*68).setAlpha(Math.sin(Math.PI*q)*.85);}
      else {const q=f.route-(i-3)*.13,index=Math.min(this.samples.length-1,Math.max(0,Math.floor(q*(this.samples.length-1))));const a=this.samples[index];p.setVisible(f.stage==='spread'&&q>0&&q<1).setPosition(a.x,a.y).setAlpha(.85*f.fade);}
    });
  }
  destroy():void {for(const p of this.images)p.destroy();this.vine.destroy();this.prompt.destroy();}
}
