import type Phaser from 'phaser';import type {LevelMap} from '../levels/shared/MapModule';import {environmentMix,ENVIRONMENT_CONFIG as C} from './mix';
/** Visual-only reader of C.1 scroll. Existing terrain, camera and textures are never rebuilt. */
export class ForestEnvironment {
 private beam:Phaser.GameObjects.Image;private vine:Phaser.GameObjects.Image;private glow?:Phaser.GameObjects.Image;
 private walls:{image:Phaser.GameObjects.Image;x:number;y:number}[];private enabled:boolean;private tick=0;private button?:HTMLButtonElement;private root:{x:number;y:number};
 constructor(private scene:Phaser.Scene,map:LevelMap){
  this.enabled=!new URLSearchParams(location.search).has('environmentOff')&&!new URLSearchParams(location.search).has('artSample');
  this.root=map.landmarks!.find(n=>n.id==='root-memory')!;
  this.beam=scene.add.image(0,0,'beams').setOrigin(0).setDisplaySize(1280,720).setScrollFactor(0).setDepth(32).setName('environment:beams');
  this.vine=scene.add.image(-110,-92,'vines').setOrigin(0).setDisplaySize(156,144).setScrollFactor(0).setDepth(61).setName('environment:corner-vine');
  const original=scene.children.list.find(o=>o.name==='cave-decor:root-glow') as Phaser.GameObjects.Image|undefined;
  if(original)this.glow=scene.add.image(original.x,original.y,original.texture.key,original.frame.name).setOrigin(0).setDisplaySize(original.displayWidth,original.displayHeight).setDepth(36.9).setName('environment:root-warmth');
  this.walls=scene.children.list.filter(o=>o.name.startsWith('cave-decor:cave-wall-')).map(o=>{const image=o as Phaser.GameObjects.Image;return{image,x:image.x,y:image.y};});
  const host=document.querySelector('.level-dev');if(host){const b=document.createElement('button');b.id='environment-toggle';b.textContent='环境效果 开/关';host.append(b);this.button=b;b.onclick=()=>{this.enabled=!this.enabled;this.tick=0;this.update(scene.cameras.main);};}
  this.update(scene.cameras.main);scene.events.once('shutdown',()=>this.button?.remove());
 }
 update(camera:Phaser.Cameras.Scene2D.Camera):void {
  const mix=environmentMix(camera.scrollX,camera.scrollY,this.root),on=this.enabled;
  this.beam.setVisible(on).setAlpha((C.surfaceBeams*mix.surface+C.canopyBeams*mix.canopy)*(1-mix.cave));
  this.vine.setVisible(on).setPosition(-110-camera.scrollX*.015,-92-camera.scrollY*.008).setAlpha(C.foregroundAlpha*(1-mix.cave));
  this.glow?.setVisible(on).setAlpha(C.rootGlow*mix.root);
  for(const w of this.walls){const dx=Math.max(-C.wallMaxShiftX,Math.min(C.wallMaxShiftX,(camera.scrollX-(w.x-640))*C.farWallX)),dy=Math.max(-C.wallMaxShiftY,Math.min(C.wallMaxShiftY,(camera.scrollY-900)*C.farWallY));w.image.setPosition(w.x+(on?dx:0),w.y+(on?dy:0));}
  this.button?.setAttribute('aria-pressed',String(on));
  if(this.tick++%15===0)document.body.dataset.environmentState=JSON.stringify({enabled:on,...mix,cameraX:camera.scrollX,cameraY:camera.scrollY,wallOffsets:this.walls.map(w=>({x:w.image.x-w.x,y:w.image.y-w.y}))});
 }
}
