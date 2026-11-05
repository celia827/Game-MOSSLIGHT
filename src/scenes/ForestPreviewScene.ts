import Phaser from 'phaser';
import { LayerStack } from '../world/render/LayerStack';
import { LAYER_DEFINITIONS } from '../world/layers';
import { whisperingWoods } from '../world/maps/whisperingWoods';
import { TerrainModule } from '../world/terrain/TerrainModule';
import { FoxCharacter } from '../characters/fox/FoxCharacter';
import type { MapDefinition } from '../world/types';
import type { PreviewControls } from '../ui/types';

export class ForestPreviewScene extends Phaser.Scene {
  private fox?:FoxCharacter;
  private drawDebug?:()=>void;
  private debugGraphics?:Phaser.GameObjects.Graphics;
  constructor(private onReady: (controls: PreviewControls) => void,private map: MapDefinition=whisperingWoods) {
    super('ForestPreview');
  }
  create(): void {
    const stack=new LayerStack(this);
    for(const def of LAYER_DEFINITIONS) {
      for(const item of this.map.layers[def.id]) stack.addArt(def.id,item);
    }
    const terrain=this.map.terrain.map(def=>new TerrainModule(this,stack,def));
    const ground=terrain.find(t=>t.definition.id===this.map.character.terrainId)!;
    const platform=terrain.find(t=>t.definition.kind==='platform')!;
    const fox=new FoxCharacter(this,stack,()=>ground.definition,()=>terrain.filter(t=>t.definition.kind==='platform').map(t=>t.definition),this.map.character.footX,this.map.character.scale);
    this.fox=fox;
    const debug=this.add.graphics().setDepth(1000).setName('collision-debug').setVisible(false).setScrollFactor(1);
    const redraw=()=>{
      debug.clear();
      for(const module of terrain) {
        debug.fillStyle(0xdcc27c,.07).fillPoints(module.collision.polygon,true);
        debug.lineStyle(1.5,0xf5d28c,.95).strokePoints(module.collision.polygon,true);
        debug.lineStyle(3,0x9ff4df,1).strokePoints(module.collision.top,false);
      }
      const {x,y}=fox.player;
      debug.lineStyle(1.2,0xffffff,.85).strokePoints(fox.player.body,true);
      debug.lineStyle(1.5,0xffffff,1).strokeCircle(x,y,4);
      debug.lineBetween(x-9,y,x+9,y).lineBetween(x,y-9,x,y+9);
      document.body.dataset.footX=x.toFixed(2); document.body.dataset.footY=y.toFixed(2);
      document.body.dataset.platformGeometry=JSON.stringify({
        definition:platform.definition,
        first:platform.collision.top[0],
        last:platform.collision.top[platform.collision.top.length-1],
      });
    };
    const updatePlatform: PreviewControls['updatePlatform']=patch=>{
      platform.update({...platform.definition,...patch});fox.player.reconcile();redraw(); return {...platform.definition};
    };
    redraw();
    this.onReady({
      animation:fox.controls,
      platform:{...platform.definition},
      setDebug:enabled=>{ debug.setVisible(enabled); document.body.dataset.collisions=String(enabled); },
      setLayerVisible:(id,visible)=>{ stack.setVisible(id,visible); document.body.dataset[`layer${id}`]=String(visible); },
      setTerrainPartVisible:(part,visible)=>{ for(const module of terrain) module[part].setVisible(visible); },
      updatePlatform,
      resetPlatform:()=>updatePlatform(this.map.terrain.find(t=>t.kind==='platform')!),
    });
    document.querySelector<HTMLElement>('#loading')!.hidden = true;
    document.documentElement.dataset.sceneReady = 'true';
    this.drawDebug=redraw;this.debugGraphics=debug;
  }
  update(_time:number,delta:number):void {
    this.fox?.update(delta/1000);
    if(this.debugGraphics?.visible)this.drawDebug?.();
  }
}
