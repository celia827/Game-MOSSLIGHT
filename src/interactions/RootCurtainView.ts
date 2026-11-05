import type Phaser from 'phaser';
import {ART_SCALE} from '../config/game';
import frames from './curtain-frames.json';
import {curtainVisual,type RootCurtainDefinition} from './RootCurtainVisual';
export const CURTAIN_TEXTURE='ancient-root-curtain';
export function preloadRootCurtain(scene:Phaser.Scene):void {if(!scene.textures.exists(CURTAIN_TEXTURE))scene.load.svg(CURTAIN_TEXTURE,`${import.meta.env.BASE_URL}assets/interactions/curtain/curtain-atlas.svg`,{scale:ART_SCALE});}
/** Decorative veil only: no collider registration, input listener or gameplay gate. */
export class RootCurtainView {
  readonly prompt:Phaser.GameObjects.Text;stage='sleeping';litGuides=0;
  private left:Phaser.GameObjects.Image;private right:Phaser.GameObjects.Image;private crown:Phaser.GameObjects.Image;private glow:Phaser.GameObjects.Image;private sparks:Phaser.GameObjects.Image[];
  private clock=0;private definition:RootCurtainDefinition;
  constructor(scene:Phaser.Scene,d:RootCurtainDefinition) {
    this.definition=d;const texture=scene.textures.get(CURTAIN_TEXTURE);
    if(!scene.textures.exists(CURTAIN_TEXTURE))throw new Error('古树藤帘资源未加载');
    for(const [id,f] of Object.entries(frames))if(!texture.has(id))texture.add(id,0,f.x*ART_SCALE,f.y*ART_SCALE,f.width*ART_SCALE,f.height*ART_SCALE);
    const image=(frame:string,x:number,y:number,w:number,h:number,depth:number)=>scene.add.image(x,y,CURTAIN_TEXTURE,frame).setDisplaySize(w,h).setDepth(depth).setName(`${d.id}:${frame}`);
    this.crown=image('curtain-crown',d.x,d.curtain.topY-36,370,83,60.2).setOrigin(.5,0).setAlpha(.78);
    this.left=image('curtain-panel',d.x,d.curtain.topY,112,246,60).setOrigin(1,0);
    this.right=image('curtain-panel',d.x,d.curtain.topY+12,112,230,60.1).setOrigin(0,0).setFlipX(true).setTint(0xd0e4da);
    this.glow=image('curtain-mist',d.curtain.glowX,d.curtain.glowY,300,260,37.7);
    this.sparks=Array.from({length:3},(_,i)=>scene.add.image(d.x+32+i*25,d.y-142-i*25,'forest-interactions','moss-spark').setDisplaySize(15,15).setDepth(59).setAlpha(.3).setName(`${d.id}:hint`));
    this.prompt=scene.add.text(d.x,d.y+24,d.prompt,{fontFamily:'system-ui,sans-serif',fontSize:'16px',color:'#fff3c5',backgroundColor:'#244e48e8',padding:{x:10,y:5}}).setOrigin(.5,0).setDepth(80).setVisible(false).setName(`${d.id}:prompt`);
    this.update(0,null,false);
  }
  get objectCount():number{return 8;}
  update(dt:number,elapsed:number|null,showPrompt:boolean,opened=false):void {
    this.clock+=dt;const d=this.definition,f=curtainVisual(elapsed,opened);this.stage=f.stage;
    this.left.setPosition(d.x-f.shift+f.shake,d.curtain.topY).setRotation(f.angle).setAlpha(f.alpha);
    this.right.setPosition(d.x+f.shift-f.shake,d.curtain.topY+12).setRotation(-f.angle*.94).setAlpha(f.alpha*.92);
    this.glow.setAlpha(.12+.05*f.progress+.38*f.pulse+.02*Math.sin(this.clock*1.7));
    this.sparks.forEach((s,i)=>{s.setPosition(d.x+32+i*25+Math.sin(this.clock*1.3+i)*3,d.y-142-i*25-Math.sin(this.clock+i)*3).setAlpha(.22+.18*f.progress+.45*f.pulse+.07*Math.sin(this.clock*2+i));});
    this.prompt.setVisible(showPrompt);
  }
  destroy():void {for(const o of [this.left,this.right,this.crown,this.glow,this.prompt,...this.sparks])o.destroy();}
}
