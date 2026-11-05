import Phaser from 'phaser';
import { LayerStack } from './LayerStack';
import { surfaceY } from '../terrain/geometry.ts';
import type { TerrainDefinition } from '../terrain/types';

// Source art stays untouched. The anchor is the near boot's ground contact.
export const FOX_ANCHOR={x:124,y:210,width:200,height:220} as const;

export class FoxPlacement {
  readonly image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private coreShadow: Phaser.GameObjects.Image;
  constructor(scene: Phaser.Scene,stack: LayerStack,scale: number) {
    const layer=stack.get('characters');
    this.shadow=scene.add.image(0,0,'shadow').setDisplaySize(66,11).setAlpha(.38).setScrollFactor(1);
    this.coreShadow=scene.add.image(0,0,'shadow').setDisplaySize(30,4).setAlpha(.50).setScrollFactor(1);
    this.image=scene.add.image(0,0,'fox')
      .setOrigin(FOX_ANCHOR.x/FOX_ANCHOR.width,FOX_ANCHOR.y/FOX_ANCHOR.height)
      .setDisplaySize(FOX_ANCHOR.width*scale,FOX_ANCHOR.height*scale).setScrollFactor(1);
    layer.add([this.shadow,this.coreShadow,this.image]);
  }
  place(terrain: TerrainDefinition,x: number): void {
    const y=surfaceY(terrain,x);
    if(y===undefined) throw new Error('Character anchor is outside terrain');
    this.image.setPosition(x,y);
    this.shadow.setPosition(x,y+1.8); this.coreShadow.setPosition(x,y+.8);
  }
}
