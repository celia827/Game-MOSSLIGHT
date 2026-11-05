import type Phaser from 'phaser';
import {ART_SCALE} from '../config/game';
import {CANOPY_TEXTURE} from '../art/canopy/CanopySkin';
import {B1_TEXTURE} from '../art/b1/SampleSkin';
import type {MovingPlatformWorld} from './MovingPlatformWorld';
/** Reuses accepted branch/vine textures, with zero new cached textures. */
export class MovingPlatformView {
  private branch:Phaser.GameObjects.Image;private vines:Phaser.GameObjects.Image[];private bud:Phaser.GameObjects.Image;
  private ropes:Phaser.GameObjects.Graphics;private debug:Phaser.GameObjects.Graphics;private button:HTMLButtonElement;private show=false;private world:MovingPlatformWorld;
  constructor(scene:Phaser.Scene,world:MovingPlatformWorld) {
    this.world=world;const p=world.surfaces[0],normal=scene.textures.exists(CANOPY_TEXTURE);
    this.branch=scene.add.image(p.x,p.y-64,normal?CANOPY_TEXTURE:B1_TEXTURE,normal?'branch-medium':'sample-branch-medium').setOrigin(0).setDisplaySize(p.width,normal?164:96).setDepth(40.5).setName('moving:mossleaf-lift');
    const texture=scene.textures.get('vines');if(!texture.has('d2-lift-vine'))texture.add('d2-lift-vine',0,0,0,84*ART_SCALE,208*ART_SCALE);
    this.ropes=scene.add.graphics().setDepth(36.7);
    this.vines=[.15,.85].map(r=>scene.add.image(p.x+p.width*r,0,'vines','d2-lift-vine').setOrigin(.5,0).setAlpha(.6).setDepth(36.8).setName('moving:vine'));
    this.bud=scene.add.image(p.x+22,p.y-12,'blooms').setDisplaySize(26,22).setOrigin(.5,1).setDepth(42).setName('moving:bud');
    this.debug=scene.add.graphics().setDepth(98).setVisible(false);
    this.button=document.createElement('button');this.button.id='moving-debug';this.button.textContent='升降台轨迹 D.2';document.querySelector('.level-dev')?.append(this.button);
    this.button.onclick=()=>{this.show=!this.show;this.debug.setVisible(this.show);};
    scene.events.once('shutdown',()=>{this.button.remove();for(const x of [this.branch,this.bud,this.debug,this.ropes,...this.vines])x.destroy();});
    this.update();
  }
  update():void {
    const p=this.world.surfaces[0],d=this.world.definitions[0],anchor=d.to.y-50;
    this.branch.setPosition(p.x,p.y-64);this.bud.setPosition(p.x+22,p.y-12);
    this.ropes.clear();
    for(const r of [.15,.85])for(const [width,color,alpha] of [[3.2,0x507e57,.75],[1,0xb8d49d,.45]]){this.ropes.lineStyle(width,color,alpha).beginPath().moveTo(p.x+p.width*r,anchor);for(let j=1;j<=16;j++){const t=j/16;this.ropes.lineTo(p.x+p.width*r+Math.sin(t*Math.PI*2)*3,anchor+(p.y-anchor)*t);}this.ropes.strokePath();}
    this.vines.forEach((v,i)=>v.setPosition(p.x+p.width*([.15,.85][i])-1,p.y-67).setDisplaySize(28,68));
    if(this.show){this.debug.clear().lineStyle(2,0xe6d297,.8).strokeRect(d.from.x,d.to.y,d.width,d.from.y-d.to.y).lineStyle(3,0xa7ede0,1).lineBetween(p.x,p.y,p.x+p.width,p.y);}
  }
}
