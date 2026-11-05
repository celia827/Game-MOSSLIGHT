import type Phaser from 'phaser';
import frames from './frames.json';
import type {MapModule} from '../../levels/shared/MapModule';
export const B1_TEXTURE='b1-samples';
export function installSampleFrames(scene:Phaser.Scene,scale:number):void {
 const texture=scene.textures.get(B1_TEXTURE);
 document.body.dataset.b1TextureCount=String(scene.textures.getTextureKeys().length);
 for(const [key,f] of Object.entries(frames))texture.add(key,0,f.x*scale,f.y*scale,f.width*scale,f.height*scale);
}
export function addSampleSkin(scene:Phaser.Scene,module:MapModule):boolean {
 if(new URLSearchParams(location.search).get('skin')==='baseline')return false;
 const match=Object.entries(frames).find(([,f])=>f.moduleId===module.id);
 if(!match||!scene.textures.exists(B1_TEXTURE))return false;
 const [key,f]=match;
 scene.add.image(module.x,module.y-64,B1_TEXTURE,key).setOrigin(0).setDisplaySize(f.width,f.height).setDepth(40).setName(`b1:${module.id}`);
 if(module.id==='crown-rest'||module.id==='crown-up-3'){scene.add.image(module.x+module.width/2-80,module.y+12,B1_TEXTURE,'branch-support').setOrigin(0).setDisplaySize(160,220).setDepth(36).setAlpha(.72);}
 // Wall and ceiling are decorative, outside the traversable cave headroom.
 if(module.id==='cave-east') {
  scene.add.image(module.x-100,module.y-370,B1_TEXTURE,'cave-backdrop').setOrigin(0).setDepth(35).setAlpha(.8);
  scene.add.image(module.x+36,module.y-280,B1_TEXTURE,'roots').setOrigin(0).setDisplaySize(104,65).setDepth(36).setAlpha(.65);
  scene.add.image(module.x,module.y-360,B1_TEXTURE,'cave-ceiling').setOrigin(0).setDisplaySize(f.width,164).setDepth(35).setAlpha(.55);
  scene.add.image(module.x+module.width-34,module.y-260,B1_TEXTURE,'cave-wall').setOrigin(0).setDisplaySize(34,260).setDepth(35).setAlpha(.45);
 }
 if(module.id==='cave-east'){scene.add.image(module.x+30,module.y-86,B1_TEXTURE,'moss-mushrooms').setOrigin(0).setDisplaySize(80,50).setDepth(42);scene.add.image(module.x+160,module.y-280,B1_TEXTURE,'roots').setOrigin(0).setDisplaySize(160,100).setDepth(36);}
 return true;
}
