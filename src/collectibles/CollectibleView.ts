import type Phaser from 'phaser';
import {ART_SCALE} from '../config/game';
import type {CollectibleDefinition,CollectibleState} from './CollectibleModel';
import {collectibleVisual} from './CollectibleVisual';
import frames from './frames.json';
export const DEW_TEXTURE='mosslight-dewdrops';
export function preloadCollectibles(scene:Phaser.Scene):void {
  if(!scene.textures.exists(DEW_TEXTURE))scene.load.svg(DEW_TEXTURE,`${import.meta.env.BASE_URL}assets/collectibles/dewdrop-atlas.svg`,{scale:ART_SCALE});
}
export class CollectibleView {
  private pearl:Phaser.GameObjects.Image;private halo:Phaser.GameObjects.Image;private sparks:Phaser.GameObjects.Image[];
  constructor(scene:Phaser.Scene,private readonly d:CollectibleDefinition) {
    if(!scene.textures.exists(DEW_TEXTURE))throw new Error('苔光露珠资源未加载');
    const texture=scene.textures.get(DEW_TEXTURE);
    for(const [id,f]of Object.entries(frames))if(!texture.has(id))texture.add(id,0,f.x*ART_SCALE,f.y*ART_SCALE,f.width*ART_SCALE,f.height*ART_SCALE);
    const image=(frame:string,w:number,h=w,depth=74)=>scene.add.image(d.x,d.y,DEW_TEXTURE,frame).setDisplaySize(w,h).setDepth(depth).setName(`${d.id}:${frame}`);
    this.halo=image('dew-halo',82,82,73.8);this.pearl=image('dew-pearl',32,44);
    this.sparks=[image('dew-spark',12,12,74.1),image('dew-spark',9,9,74.1)];
  }
  update(clock:number,s:CollectibleState):void {
    const f=collectibleVisual(clock,s.collected,s.elapsed),d=this.d;
    this.pearl.setPosition(d.x,d.y+f.y).setDisplaySize(32*f.scale,44*f.scale).setAlpha(f.alpha).setVisible(f.visible);
    this.halo.setPosition(d.x,d.y+f.y*.5).setDisplaySize(82*f.haloScale,82*f.haloScale).setAlpha(f.halo).setVisible(f.visible);
    this.sparks.forEach((o,i)=>o.setPosition(d.x+(i?1:-1)*(12+f.progress*34),d.y-10-f.progress*(i?42:30)).setAlpha(f.spark*.85).setVisible(f.visible&&s.collected));
  }
  destroy():void {for(const o of [this.pearl,this.halo,...this.sparks])o.destroy();}
}
