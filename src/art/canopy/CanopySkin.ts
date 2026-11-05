import type Phaser from 'phaser';
import type {MapModule} from '../../levels/shared/MapModule';
import frames from './frames.json';
import {canopyPlan} from './layout';
export const CANOPY_TEXTURE='forest-canopy';
export interface CanopyProof {frame:string;x:number;tread:number;width:number;moss:boolean;bark:boolean;ends:boolean;support:boolean;windowReturn:boolean}
export function canopyEnabled():boolean {const q=new URLSearchParams(location.search);return !q.has('artSample')&&q.get('canopy')!=='prototype';}
export function installCanopyFrames(scene:Phaser.Scene,scale:number):void {
 if(!scene.textures.exists(CANOPY_TEXTURE))return;
 const t=scene.textures.get(CANOPY_TEXTURE);for(const [key,f] of Object.entries(frames))if(!t.has(key))t.add(key,0,f.x*scale,f.y*scale,f.width*scale,f.height*scale);
}
/** Art-only adapter: exact tread x/y/width; undergrowth is never a collision source. */
export function addCanopySkin(scene:Phaser.Scene,m:MapModule,proofs:Map<string,CanopyProof>):boolean {
 const p=canopyPlan(m);if(!p||!canopyEnabled()||!scene.textures.exists(CANOPY_TEXTURE))return false;
 const f=frames[p.frame as keyof typeof frames];
 scene.add.image(p.x,p.y,CANOPY_TEXTURE,p.frame).setOrigin(0).setDisplaySize(p.width,f.height).setFlipX(p.flip).setDepth(40).setName(`canopy:${m.id}`);
 if(p.support){const wide=m.id==='crown-rest',w=wide?166:120,h=wide?288:m.id==='crown-up-1'?170:218;
  scene.add.image(m.x+m.width*.54-w/2,m.y+13,CANOPY_TEXTURE,'branch-support').setOrigin(0).setDisplaySize(w,h).setFlipX(p.flip).setDepth(36).setAlpha(.64).setName(`canopy-support:${m.id}`);
 }
 // Three soft crowns sit below tread level, behind EVERY landing. No foreground wall.
 if(['crown-up-3','crown-rest','crown-down-3'].includes(m.id))scene.add.image(m.x+m.width*.5,m.y+91,'shrub').setDisplaySize(m.id==='crown-rest'?240:180,78).setDepth(37).setAlpha(.42).setName(`canopy-leaves:${m.id}`);
 if(m.id==='crown-secret-perch')scene.add.image(m.x+24,m.y+3,'bluebells').setOrigin(.5,1).setDisplaySize(26,27).setDepth(42).setName('canopy-perch-flowers');
 proofs.set(m.id,{frame:p.frame,x:m.x,tread:m.y,width:m.width,moss:true,bark:true,ends:true,support:p.support,windowReturn:p.windowReturn});
 return true;
}
