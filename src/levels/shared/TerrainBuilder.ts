import {integrateLevelArt} from '../../art/integration/ArtIntegration';
import {addCaveSkin,addCaveDecor} from '../../art/cave/CaveSkin';
import {addCanopySkin,type CanopyProof} from '../../art/canopy/CanopySkin';
import {installCoverageInspector} from '../../art/surface/CoverageInspector';
import type {CoverageProof} from '../../art/surface/coverage';
import {addSurfaceSkin,addCaveShade} from '../../art/surface/SurfaceSkin';
import {publishSurfaceMetrics} from '../../art/surface/metrics';
import {addSampleSkin} from '../../art/b1/SampleSkin';
import type Phaser from 'phaser';
import type {LevelMap,MapModule} from './MapModule.ts';
import {buildCollision,surfaceY} from '../../world/terrain/geometry.ts';
import {assets,type AssetKey} from '../../art/manifest.ts';
import type {LayerStack} from '../../world/render/LayerStack.ts';

const palette={moss:[0x536b47,0x72955b,0xb8cf83],earth:[0x67704e,0x79915c,0xb9cd8d],rock:[0x354f4c,0x58766a,0x8baa81],wood:[0x6d6644,0x92a061,0xc5d791]} as const;
/** Temporary modular terrain skin. Geometry remains authoritative and replaceable. */
export class TerrainBuilder {
  private canopyCoverage=new Map<string,CanopyProof>();
  private coverage=new Map<string,CoverageProof>();
  private backdrops:{image:Phaser.GameObjects.TileSprite;factor:number}[]=[];
  constructor(private scene:Phaser.Scene,private stack:LayerStack,private map:LevelMap) {}
  art(key:AssetKey,x:number,y:number,scale:number,alpha=1,depth=39,flip=false):void {
    const [,w,h]=assets[key];this.scene.add.image(x,y,key).setOrigin(0,0).setDisplaySize(w*scale,h*scale).setAlpha(alpha).setDepth(depth).setFlipX(flip);
  }
  build():void {
    for(const [key,factor,depth,alpha] of [['sky',0,0,1],['mountains',.1,10,.8],['forest',.24,20,.65],['woodland',.5,30,.48]] as const) {
      const image=this.scene.add.tileSprite(0,0,1280,720,key).setOrigin(0).setScrollFactor(0).setDepth(depth).setAlpha(alpha);
      // SVGs are rasterized at ART_SCALE; display stays in design pixels.
      image.setTileScale(1280/this.scene.textures.get(key).getSourceImage().width);
      this.backdrops.push({image,factor});
    }
    addCaveShade(this.scene,this.map.width,this.map.height);
    // Sparse, deliberately composed landmarks rather than repeated tree walls.
    this.art('willow',-130,260,1.02,.92);
    this.art('birch',520,290,.95,.65);
    this.art('oak',1240,245,1.12,.85);
    this.art('birch',2130,290,.95,.65,39,true);
    this.art('willow',2850,260,1.02,.78,39,true);
    this.art('oak',3400,260,1,.9);
    addCaveDecor(this.scene,this.map);
    for(const m of this.map.modules)this.module(m);
    this.art('beams',-40,120,1,.34,38);
    this.art('beams',2940,110,1,.28,38);
    this.art('roots',1042,946,1.2,.75,42);
    this.art('roots',1710,1500,.85,.85,42);
    this.art('blooms',1815,1501,.64,.9,42);
    this.art('mushrooms',1320,1410,.65,.9,42);
    this.art('stones',2260,1423,.75,.9,42);
    this.sign(330,900,'根坡 ↓   主路跳过 →');
    this.sign(570,900,'苔阶 ↑   晨光 →');
    this.sign(1930,420,'林窗 ↓ 回到林间');
    for(const n of this.map.landmarks??[]) {this.art('blooms',n.x-28,n.y-64,.5,.8,42);this.sign(n.x,n.y,n.label,new URLSearchParams(location.search).has('artBefore')?0:130);}
    this.sign(960,900,'根隙 ↓   主路跳过 →');
    this.sign(1140,1480,'← 根坡返回   根室 →');
    this.sign(2170,1480,'晨光门庭 ↗');
    this.sign(3195,900,'三径汇合 →');
    const goal=this.scene.add.graphics().setDepth(42);
    goal.lineStyle(8,0xc7d6a0,1).beginPath().moveTo(3570,900).lineTo(3570,695).lineTo(3690,695).lineTo(3690,900).strokePath();
    goal.lineStyle(2,0x648c66,1).strokeCircle(3630,733,20);
    this.scene.add.text(3630,658,'晨 光 门 庭',{fontFamily:'serif',fontSize:'20px',color:'#426247'}).setOrigin(.5).setDepth(43);
    integrateLevelArt(this.scene,this.map);
    publishSurfaceMetrics(this.scene);
    installCoverageInspector(this.scene,this.map,this.coverage,this.canopyCoverage);
  }
  private module(m:MapModule):void {
    if(addSurfaceSkin(this.scene,m,this.map.modules,this.coverage))return;
    if(addCaveSkin(this.scene,m,this.coverage))return;
    if(addCanopySkin(this.scene,m,this.canopyCoverage))return;
    if(!(m.region==='C'&&new URLSearchParams(location.search).get('canopy')==='prototype')&&addSampleSkin(this.scene,m))return;
    const {top,polygon}=buildCollision(m),[side,edge,grass]=palette[m.art.material];
    const g=this.scene.add.graphics().setDepth(40).setName(m.id);
    g.fillStyle(side,1).fillPoints(polygon,true);
    g.lineStyle(m.type==='bridge'?6:11,edge,1).strokePoints(top,false);
    g.lineStyle(3,grass,.95).strokePoints(top,false);
    if(m.type==='bridge') {
      g.lineStyle(1,0xd4d9a0,.35);
      for(let x=m.x+18;x<m.x+m.width;x+=38)g.lineBetween(x,surfaceY(m,x)!+7,x,m.y+m.height-3);
    }
    if(m.region!=='D'&&m.id!=='sunlit-bridge'&&m.id!=='return-bridge') {
      const key=m.art.accent??(m.region==='C'?'bluebells':m.region==='E'?'blooms':'fern');
      const x=m.x+m.width*.62,y=surfaceY(m,x)!;
      this.art(key,x-24,y-63,.5,.9,42);
      if(m.width>500)this.art('shrub',m.x+38,surfaceY(m,m.x+80)!-76,.7,.82,39);
    }
  }
  private sign(x:number,y:number,text:string,rise=0):void {
    const g=this.scene.add.graphics().setDepth(43);
    g.lineStyle(4,0x7b8254).lineBetween(x,y,x,y-75-rise);
    g.fillStyle(0x49684e,.96).fillRoundedRect(x-66,y-102-rise,168,31,6);
    this.scene.add.text(x+18,y-86-rise,text,{fontFamily:'sans-serif',fontSize:'12px',color:'#e7e6c5'}).setOrigin(.5).setDepth(44);
  }
  update(camera:Phaser.Cameras.Scene2D.Camera):void {
    for(const {image,factor} of this.backdrops){image.tilePositionX=camera.scrollX*factor;image.tilePositionY=camera.scrollY*factor*.22;}
  }
}
