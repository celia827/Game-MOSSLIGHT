import type Phaser from 'phaser';
import {ART_SCALE} from '../config/game';
import type {CheckpointState} from './CheckpointModel';
export const REST_TEXTURE='mosslight-rest';
export function preloadCheckpoints(scene:Phaser.Scene):void {if(!scene.textures.exists(REST_TEXTURE))scene.load.svg(REST_TEXTURE,`${import.meta.env.BASE_URL}assets/checkpoints/rest-atlas.svg`,{scale:ART_SCALE});}
/** Cached SVG sprites; no collision, generated textures, tweens or timers. */
export class CheckpointView {
  private body:Phaser.GameObjects.Image;private leaves:Phaser.GameObjects.Image;private glow:Phaser.GameObjects.Image;
  private sparks:Phaser.GameObjects.Image[];private reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(scene:Phaser.Scene,private state:CheckpointState) {
    const texture=scene.textures.get(REST_TEXTURE);for(const [id,x]of [['rest-body',2],['rest-leaves',114]] as const)if(!texture.has(id))texture.add(id,0,x*ART_SCALE,2*ART_SCALE,108*ART_SCALE,110*ART_SCALE);
    const {x,y}=state.definition.worldPosition;
    this.glow=scene.add.image(x,y-52,'mosslight-dewdrops','dew-halo').setDisplaySize(100,100).setTint(0xffe2a1).setDepth(44.4);
    this.body=scene.add.image(x,y+8,REST_TEXTURE,'rest-body').setOrigin(.5,1).setDisplaySize(108,110).setDepth(44.5);
    this.leaves=scene.add.image(x,y+8,REST_TEXTURE,'rest-leaves').setOrigin(.5,1).setDisplaySize(108,110).setDepth(44.6);
    this.sparks=[0,1,2].map(()=>scene.add.image(x,y-50,'mosslight-dewdrops','dew-spark').setDisplaySize(8,8).setDepth(44.7).setVisible(false));
    this.update(0);
  }
  update(clock:number):void {
    const s=this.state,lit=s.activationState!=='dormant',age=s.activatedAt===null?Infinity:clock-s.activatedAt;
    const u=Math.min(1,age/1.6),ease=lit?(this.reduced?1:u*u*(3-2*u)):0;
    const {x,y}=s.definition.worldPosition,breathe=this.reduced?0:Math.sin(clock*1.7)*.015;
    this.glow.setAlpha(lit?.24+ease*.2:.07+breathe).setDisplaySize(100+(lit?ease*38:0),100+(lit?ease*38:0));
    this.leaves.setDisplaySize(108*(.9+ease*.1),110*(.94+ease*.06)).setAngle(this.reduced?0:Math.sin(clock*.8)*.4).setAlpha(lit?1:.88);
    this.body.setTint(lit?0xffffff:0xd1dfca);
    this.sparks.forEach((spark,i)=>{const t=(age-i*.18)/1.5,on=lit&&!this.reduced&&t>=0&&t<1;spark.setVisible(on);if(on)spark.setPosition(x+(i-1)*17+Math.sin(t*5+i)*5,y-48-t*55).setAlpha(Math.sin(t*Math.PI)*.7);});
  }
  destroy():void {for(const o of [this.body,this.leaves,this.glow,...this.sparks])o.destroy();}
}
