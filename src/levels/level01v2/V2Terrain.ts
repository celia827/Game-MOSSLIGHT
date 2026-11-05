import type Phaser from 'phaser';
import type {LevelMap} from '../shared/MapModule';
import {buildCollision,surfaceY} from '../../world/terrain/geometry';
import {V2_DESIGN,V2_GAMEPLAY,type BridgeMode} from './V2Config';
/** Greybox skin: approved geometry is drawn literally. No V1 art layout/coverage coordinates. */
export class V2Terrain {
  private backdrops:{image:Phaser.GameObjects.TileSprite;factor:number}[]=[];
  constructor(private scene:Phaser.Scene,readonly map:LevelMap,readonly mode:BridgeMode){}
  build():void {
    const s=this.scene;
    for(const [key,factor,depth,alpha] of [['sky',0,0,1],['mountains',.1,10,.8],['forest',.24,20,.65],['woodland',.5,30,.48]] as const){
      const image=s.add.tileSprite(0,0,1280,720,key).setOrigin(0).setScrollFactor(0).setDepth(depth).setAlpha(alpha);image.setTileScale(1280/s.textures.get(key).getSourceImage().width);this.backdrops.push({image,factor});
    }
    // Existing SVGs, independently composed. They do not define contact surfaces.
    for(const [key,x,y,w,h] of [['willow',-130,260,540,650],['oak',720,260,520,650],['birch',2180,280,370,554],['oak',3400,260,530,670]] as const)s.add.image(x,y,key).setOrigin(0).setDisplaySize(w,h).setAlpha(.7).setDepth(36);
    s.add.rectangle(this.map.width/2,1400,this.map.width,900,0x193b39,.7).setDepth(35);
    const colors:Record<string,number>={A:0x526b65,B:0x56665b,C:0x68765a,D:0x486563,E:0x60706c,F:0x617553};
    for(const m of this.map.modules){
      const {polygon,top}=buildCollision(m),area=(m as typeof m&{area:string}).area;
      const g=s.add.graphics().setDepth(40).setName(`v2-terrain:${m.id}`);
      g.fillStyle(colors[area]??0x425353,m.id==='bedrock'?.6:.98).fillPoints(polygon,true);
      g.lineStyle(2,0xacc7bb,.7).strokePoints(polygon,true);g.lineStyle(m.oneWay?4:6,m.oneWay?0xd1dba7:0x99c6ba).strokePoints(top,false);
      if(m.oneWay)for(let x=m.x+10;x<m.x+m.width;x+=24)g.lineStyle(1,0xe3e7ca,.6).lineBetween(x,surfaceY(m,x)!+7,x+7,surfaceY(m,x)!+7);
      // Small reused grass/branch accents leave the literal greybox surface visible.
      if(m.id!=='bedrock'&&m.width>=150){const x=m.x+m.width*.62,y=surfaceY(m,x)!;s.add.image(x,y-3,m.region==='C'?'bluebells':m.region==='D'?'mushrooms':'fern').setOrigin(.5,1).setDisplaySize(34,32).setAlpha(.7).setDepth(41);}
    }
    const labels:[number,number,string][]=[
      [170,770,'A 森林入口 · 单跳'],[795,755,'B 古树岔口 · ↑树冠  ↓根隙'],[1460,375,'C 树冠庭院 · 高枝晨露'],[1485,1015,'D 根系洞窟 · ←三级回升'],[2660,735,'E 溪谷 · 两跳 / 下层恢复'],[3490,645,'F 晨光门庭'],
      [1650,700,'林窗 ↓ 早返'],[2330,805,'东返 ↔ 可逆'],[2270,1110,'根室 ↗ 东口'],[2790,1100,'← 重试  恢复 →']];
    labels.forEach(([x,y,t])=>this.label(x,y,t));
    const rootFork=V2_DESIGN.connections.find(n=>n.id==='root-fork')!;this.label(rootFork.x-60,rootFork.y-54,'↓ 根洞 · 跳过 →');
    this.label(1900,1148,`根桥 ${this.mode} · 静态测试`,this.mode==='OPEN'?'#e6dcaa':'#e2bdad');
    if(this.mode==='FOLDED'){const b=V2_GAMEPLAY.puzzle.surfaceBounds;s.add.graphics().setDepth(39).lineStyle(2,0xd9bc9b,.5).strokeRect(b.x,b.y,b.width,b.height);}
    // Future gameplay symbols are deliberately non-physical, no AI/HP/trigger system.
    for(const e of V2_GAMEPLAY.encounters){s.add.graphics().setDepth(39).lineStyle(1,0xd3b3c5,.6).strokeRect(e.arenaX[0],e.spawn.y-65,e.arenaX[1]-e.arenaX[0],65);this.label(e.spawn.x-75,e.spawn.y-54,`${e.id} 怪物预留 · 未启用`,'#ddd0dc',10);}
    const t=V2_GAMEPLAY.trap.rect;s.add.graphics().setDepth(42).lineStyle(2,0xe1af83,.9).strokeRect(t.x,t.y,t.width,t.height);this.label(t.x-60,t.y-40,'荆棘位置 · 无伤害','#ecd3ad',11);
    for(const p of V2_GAMEPLAY.puzzle.pads){s.add.graphics().setDepth(42).lineStyle(2,0xd9cfa7,.7).lineBetween(p.x-p.width/2,p.y-3,p.x+p.width/2,p.y-3);this.label(p.x-36,p.y-28,'踏板未开发','#d4d2ad',10);}
    const {x,y}=this.map.finish;s.add.graphics().setDepth(42).lineStyle(8,0xc7d6a0).beginPath().moveTo(x-60,y).lineTo(x-60,y-205).lineTo(x+60,y-205).lineTo(x+60,y).strokePath();
    this.label(x-52,y-248,'晨 光 门 庭','#e6e5c1',18);
    const r=V2_GAMEPLAY.rescueBand.rect;s.add.graphics().setDepth(38).lineStyle(2,0xd9ab8b,.5).lineBetween(r.x,r.y,r.x+r.width,r.y);this.label(750,r.y+15,'↓ 非伤害自动救援带 y ≥ 1500','#d4c9ad',14);
    // Source definitions remain unchanged, including the 43rd conditional module.
    document.body.dataset.v2Map=JSON.stringify({revision:V2_DESIGN.revision,mode:this.mode,width:this.map.width,height:this.map.height,defined:V2_DESIGN.modules.length,active:this.map.modules.length,omitted:this.mode==='FOLDED'?[V2_GAMEPLAY.puzzle.surfaceId]:[],modules:this.map.modules});
  }
  private label(x:number,y:number,text:string,color='#eef0d3',size=13):void{this.scene.add.text(x,y,text,{fontFamily:'system-ui,sans-serif',fontSize:`${size}px`,color,backgroundColor:'#23443ee8',padding:{x:6,y:4}}).setDepth(43);}
  update(camera:Phaser.Cameras.Scene2D.Camera):void{for(const {image,factor} of this.backdrops){image.tilePositionX=camera.scrollX*factor;image.tilePositionY=camera.scrollY*factor*.22;}}
}
