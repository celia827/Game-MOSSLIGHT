import {CAVE_TEXTURE,caveEnabled,installCaveFrames} from '../art/cave/CaveSkin';
import {CANOPY_TEXTURE,canopyEnabled,installCanopyFrames} from '../art/canopy/CanopySkin';
import {SURFACE_TEXTURE} from '../art/surface/SurfaceSkin';
import Phaser from 'phaser';
import { assets } from '../art/manifest';
import { ART_SCALE } from '../config/game';
import {B1_TEXTURE,installSampleFrames} from '../art/b1/SampleSkin';
import { RIG_PARTS } from '../characters/fox/CharacterConfig';

export class BootScene extends Phaser.Scene {
  constructor(private nextScene='ForestPreview') { super('Boot'); }
  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      const message = `美术素材加载失败：${file.key}。请刷新页面重试。`;
      const loading = document.querySelector<HTMLElement>('#loading');
      if (loading) { loading.textContent = message; loading.hidden = false; }
      console.error(message, file.src);
    });
    if(this.nextScene==='Level01'&&!new URLSearchParams(location.search).has('artSample')&&new URLSearchParams(location.search).get('surface')!=='before')this.load.svg(SURFACE_TEXTURE,`${import.meta.env.BASE_URL}assets/terrain/surface/surface-atlas.svg`,{scale:ART_SCALE});
    if(this.nextScene==='Level01'&&canopyEnabled())this.load.svg(CANOPY_TEXTURE,`${import.meta.env.BASE_URL}assets/terrain/canopy/canopy-atlas.svg`,{scale:ART_SCALE});
    if(this.nextScene==='Level01'&&caveEnabled())this.load.svg(CAVE_TEXTURE,`${import.meta.env.BASE_URL}assets/terrain/cave/cave-atlas.svg`,{scale:ART_SCALE});
    if(this.nextScene==='Level01')this.load.svg(B1_TEXTURE,`${import.meta.env.BASE_URL}assets/terrain/b1/samples-atlas.svg`,{scale:ART_SCALE});
    for (const [key, [path]] of Object.entries(assets)) {
      this.load.svg(key, `${import.meta.env.BASE_URL}assets/${path}.svg`, { scale: ART_SCALE });
    }
    for(const part of RIG_PARTS) {
      this.load.svg(`fox-rig-${part.id}`,`${import.meta.env.BASE_URL}assets/characters/rig/${part.id}.svg`,{scale:ART_SCALE});
    }
  }
  create(): void {
    if (Object.keys(assets).some(key => !this.textures.exists(key))) return;
    if(RIG_PARTS.some(p=>!this.textures.exists(`fox-rig-${p.id}`)))return;
    if(this.nextScene==='Level01'){if(!this.textures.exists(B1_TEXTURE))return;installSampleFrames(this,ART_SCALE);installCanopyFrames(this,ART_SCALE);installCaveFrames(this,ART_SCALE);}
    this.scene.start(this.nextScene);
  }
}
