import Phaser from 'phaser';
import { LayerStack } from '../render/LayerStack';
import { surfaceY, buildCollision } from './geometry.ts';
import type { TerrainCollision, TerrainDefinition } from './types';
import { assets, type AssetKey } from '../../art/manifest';

const PARTS = {
  ground:{side:'groundSide',surface:'groundSurface'},
  platform:{side:'platformSide',surface:'platformSurface'},
} as const;

/** Reuses art parts, owns no physics. Decorations are local to this module. */
export class TerrainModule {
  readonly group: Phaser.GameObjects.Container;
  readonly side: Phaser.GameObjects.Container;
  readonly surface: Phaser.GameObjects.Container;
  readonly decorations: Phaser.GameObjects.Container;
  collision!: TerrainCollision;
  definition!: TerrainDefinition;
  private sideImage: Phaser.GameObjects.Image;
  private surfaceImage: Phaser.GameObjects.Image;

  constructor(private scene: Phaser.Scene,stack: LayerStack,definition: TerrainDefinition) {
    this.group=scene.add.container(0,0).setName(definition.id).setScrollFactor(1);
    stack.get('terrain').add(this.group);
    this.side=scene.add.container().setName(`${definition.id}:side`);
    this.surface=scene.add.container().setName(`${definition.id}:surface`);
    this.decorations=scene.add.container().setName(`${definition.id}:decorations`);
    this.group.add([this.side,this.surface,this.decorations]);
    const parts=PARTS[definition.kind];
    this.sideImage=scene.add.image(0,0,parts.side).setOrigin(0,0);
    this.surfaceImage=scene.add.image(0,0,parts.surface).setOrigin(0,0);
    this.side.add(this.sideImage); this.surface.add(this.surfaceImage);
    this.update(definition);
    this.decorate();
  }

  update(definition: TerrainDefinition): void {
    const collision=buildCollision(definition);
    this.definition={...definition}; this.collision=collision;
    this.group.setPosition(definition.x,definition.y);
    this.sideImage.setDisplaySize(definition.width,definition.height);
    this.surfaceImage.setDisplaySize(definition.width,definition.height);
    const w=definition.kind==='ground'?1280:360;
    const h=definition.kind==='ground'?230:160;
    this.decorations.setScale(definition.width/w,definition.height/h);
  }

  private plant(key: AssetKey,x: number,scale: number,root: {x:number;y:number}): void {
    const def=this.definition;
    const native={...def,x:0,y:0,width:def.kind==='ground'?1280:360,height:def.kind==='ground'?230:160};
    const y=surfaceY(native,x+root.x*scale);
    if(y===undefined) throw new Error(`Decoration is outside terrain: ${key}`);
    this.sprite(key,x,y-root.y*scale+1,scale);
  }

  private sprite(key: AssetKey,x: number,y: number,scale: number): void {
    const [,w,h]=assets[key];
    this.decorations.add(this.scene.add.image(x,y,key).setOrigin(0,0).setDisplaySize(w*scale,h*scale));
  }

  private decorate(): void {
    if(this.definition.kind==='ground') {
      this.sprite('roots',74,36,.8);
      this.plant('stones',518,.55,{x:55,y:73});
      this.plant('stones',1112,.74,{x:55,y:73});
      this.plant('flowers',233,.73,{x:40,y:83});
      this.plant('flowers',586,.55,{x:40,y:83});
      this.plant('flowers',453,.71,{x:40,y:83});
      this.plant('bluebells',643,.62,{x:55,y:110});
      this.plant('mushrooms',154,.73,{x:54,y:94});
      this.plant('fern',13,.8,{x:70,y:141});
      this.plant('fern',1091,.78,{x:70,y:141});
      this.plant('fern',191,.51,{x:70,y:141});
      this.plant('blooms',775,.62,{x:66,y:113});
    } else {
      this.plant('flowers',141,.65,{x:40,y:83});
      this.plant('bluebells',43,.65,{x:55,y:110});
      this.plant('mushrooms',225,.49,{x:54,y:94});
    }
  }
}
