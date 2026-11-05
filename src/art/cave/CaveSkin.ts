import type Phaser from 'phaser';import type {MapModule,LevelMap} from '../../levels/shared/MapModule';
import {cavePatches,isCaveTarget,caveBackdrops} from './layout';import {surfaceStrips,seedOf} from '../surface/layout';
import frames from './frames.json';import surfaceFrames from '../surface/frames.json';
import {SURFACE_TEXTURE} from '../surface/SurfaceSkin';import type {CoverageProof} from '../surface/coverage';
export const CAVE_TEXTURE='forest-cave';
export function caveEnabled():boolean {const q=new URLSearchParams(location.search);return !q.has('artSample')&&q.get('cave')!=='before';}
export function installCaveFrames(scene:Phaser.Scene,scale:number):void {if(!scene.textures.exists(CAVE_TEXTURE))return;const t=scene.textures.get(CAVE_TEXTURE);for(const [id,f] of Object.entries(frames))if(!t.has(id))t.add(id,0,f.x*scale,f.y*scale,f.width*scale,f.height*scale);}
/** Only fills the authoritative solid profile polygon. Passages remain background. */
export function addCaveSkin(scene:Phaser.Scene,m:MapModule,proofs:Map<string,CoverageProof>):boolean {
 if(!isCaveTarget(m)||!caveEnabled()||!scene.textures.exists(SURFACE_TEXTURE))return false;
 const pos:number[]=[],uv:number[]=[],idx:number[]=[];let area=0,count=0,boundedUV=true;
 const layers=new Set<string>();
 const quad=(x0:number,x1:number,t0:number,t1:number,b0:number,b1:number,u0:number,u1:number,v0:number,v1:number,vb0:number,vb1:number,key:keyof typeof surfaceFrames,fringe=false)=>{
  if(b0<=t0&&b1<=t1)return;const f=surfaceFrames[key],start=pos.length/2;
  pos.push(x0,-t0,x1,-t1,x0,-b0,x1,-b1);const U=(u:number)=>(f.x+.5+u/256*255)/780,V=(v:number)=>(f.y+.5+Math.min(v,f.height-1))/1292;
  uv.push(U(u0),V(v0),U(u1),V(v1),U(u0),V(vb0),U(u1),V(vb1));idx.push(start,start+2,start+1,start+2,start+3,start+1);
  boundedUV&&=Math.min(v0,v1,vb0,vb1)>=0&&Math.max(v0,v1,vb0,vb1)<=f.height;
  if(!fringe){area+=(x1-x0)*((b0-t0)+(b1-t1))/2;count++;layers.add(key.startsWith('surface-deep')?'低对比深层岩土':'苔藓/岩面/完整侧壁');}
 };
 const cap=!['root-wall','bedrock'].includes(m.id);
 for(const s of surfaceStrips(m)){const key=`surface-rock-${s.variant}` as keyof typeof surfaceFrames;if(cap)quad(s.x0,s.x1,s.y0-10,s.y1-10,s.y0,s.y1,s.u0,s.u1,54,54,64,64,key,true);}
 for(const {s,b} of cavePatches(m)){const shallow=b.depth===0,offset=shallow?(m.id==='bedrock'?192:m.id==='root-wall'?128:m.oneWay?83:64):0,key=(shallow?`surface-rock-${s.variant}`:`surface-deep-${s.variant}`) as keyof typeof surfaceFrames;quad(s.x0,s.x1,b.t0,b.t1,b.b0,b.b1,s.u0,s.u1,offset,offset,offset+(b.b0-b.t0)*(m.id==='root-wall'?.75:1),offset+(b.b1-b.t1)*(m.id==='root-wall'?.75:1),key);}
 const mesh=scene.add.mesh(m.x,m.y,SURFACE_TEXTURE,undefined,pos,uv,idx,false,undefined,0xd9e8dc).setDepth(m.id==='bedrock'?40.1:40).setName(`cave:${m.id}`);mesh.hideCCW=false;mesh.setOrtho(mesh.width,mesh.height);
 proofs.set(m.id,{area,layers:[...layers],patches:count,boundedUV});return true;
}
export function addCaveDecor(scene:Phaser.Scene,map:LevelMap):void {
 if(!caveEnabled()||!scene.textures.exists(CAVE_TEXTURE))return;
 const image=(key:string,x:number,y:number,w:number,h:number,depth:number,alpha=1)=>scene.add.image(x,y,CAVE_TEXTURE,key).setOrigin(0).setDisplaySize(w,h).setDepth(depth).setAlpha(alpha).setName(`cave-decor:${key}`);
 const p=caveBackdrops(map);
 for(const w of p.walls)image(w.frame,w.x,w.y,w.width,w.height,35,.85);
 for(const r of p.roofs)image('cave-roof',r.x,r.y,r.width,r.height,35,.9);
 image('root-arch',p.arch.x,p.arch.y,p.arch.width,p.arch.height,36,.85);
 image('root-glow',p.glow.x,p.glow.y,p.glow.width,p.glow.height,37);
 for(const m of [p.west,p.east]){image('root-tendrils',m.x+m.width*.2,m.y-360,130,115,36,.6);image('moss-fungi',m.x+m.width*.69,m.y-44,66,44,42,.85);}
 image('moss-fungi',p.room.x+25,p.room.y-48,68,48,42);
 image('moss-fungi',p.room.x+p.room.width-28,p.room.y-33,45,33,42,.72);
}
