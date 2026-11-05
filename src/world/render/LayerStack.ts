import Phaser from 'phaser';
import { LAYER_DEFINITIONS, type LayerId } from '../layers';
import { assets } from '../../art/manifest';
import type { ArtPlacement } from '../../art/composition';

export class LayerStack {
  readonly layers = new Map<LayerId,Phaser.GameObjects.Layer>();
  constructor(private scene: Phaser.Scene) {
    for (const def of LAYER_DEFINITIONS) {
      this.layers.set(def.id,scene.add.layer().setName(def.id).setDepth(def.depth));
    }
  }
  get(id: LayerId): Phaser.GameObjects.Layer { return this.layers.get(id)!; }
  addArt(layer: LayerId,item: ArtPlacement): Phaser.GameObjects.Image {
    const [,w,h]=assets[item.key];
    const factor=LAYER_DEFINITIONS.find(d=>d.id===layer)!.scrollFactor;
    const image=this.scene.add.image(item.x,item.y,item.key).setOrigin(0,0)
      .setDisplaySize(w*(item.scale??1),h*(item.scale??1))
      .setAlpha(item.alpha??1).setFlipX(item.flipX??false).setScrollFactor(factor);
    this.get(layer).add(image);
    return image;
  }
  setVisible(id: LayerId,visible: boolean): void { this.get(id).setVisible(visible); }
}
