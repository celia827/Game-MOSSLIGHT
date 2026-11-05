import type Phaser from 'phaser';import type {LevelMap} from '../../levels/shared/MapModule';
import {artJoins,undercuts} from './layout';import {surfaceY} from '../../world/terrain/geometry';import frames from '../surface/frames.json';
/** One-time art-only finishing pass. No simulation hooks, new textures or collision writes. */
export function integrateLevelArt(scene:Phaser.Scene,map:LevelMap):void {
 if(new URLSearchParams(location.search).has('artSample')||new URLSearchParams(location.search).has('artBefore'))return;
 for(const m of map.modules){const mesh=scene.children.getByName(`cave:${m.id}`) as Phaser.GameObjects.Mesh|undefined;if(mesh)for(const v of mesh.vertices)v.color=0xe3eef7;}
 const pos:number[]=[],uv:number[]=[],ix:number[]=[],alpha:number[]=[];
 const f=frames['surface-rock-0'];
 const quad=(x0:number,x1:number,y0:number,y1:number,bottom:number,u0:number,u1:number,a0:number,a1:number)=>{if(Math.max(y0,y1)>=bottom)return;const n=pos.length/2;pos.push(x0,-y0,x1,-y1,x0,-bottom,x1,-bottom);const U=(u:number)=>(f.x+.5+u/256*255)/780,V=(v:number)=>(f.y+.5+Math.min(511,v))/1292;uv.push(U(u0),V(64),U(u1),V(64),U(u0),V(64+bottom-y0),U(u1),V(64+bottom-y1));ix.push(n,n+2,n+1,n+2,n+3,n+1);alpha.push(a0,a1,a0,a1);};
 for(const j of artJoins(map)){const x0=j.x-j.width,x1=j.x+j.width,mid=surfaceY(j.a,j.x)!;quad(x0,j.x,surfaceY(j.a,x0)!,mid,j.bottom,96,128,0,.85);quad(j.x,x1,mid,surfaceY(j.b,x1)!,j.bottom,128,160,.85,0);}
 const mesh=scene.add.mesh(0,0,'forest-surface',undefined,pos,uv,ix,false,undefined,0xe3eef7,alpha).setDepth(40.2).setName('b3:rock-joins');mesh.hideCCW=false;mesh.setOrtho(mesh.width,mesh.height);
 // The 20px void is REAL. Only its BACKGROUND receives a transparent depth wash.
 const p:number[]=[],a:number[]=[],ids:number[]=[],uvs:number[]=[];for(const g of undercuts(map)){const n=p.length/2;p.push(g.x,-g.y,g.x+g.width,-g.y,g.x,-g.y-g.height,g.x+g.width,-g.y-g.height);ids.push(n,n+2,n+1,n+2,n+3,n+1);uvs.push(0,0,1,0,0,1,1,1);a.push(.55,.55,.1,.1);}
 const back=scene.add.mesh(0,0,'__WHITE',undefined,p,uvs,ids,false,undefined,0x7b9786,a).setDepth(35.5).setName('b3:undercut-background');back.hideCCW=false;back.setOrtho(back.width,back.height);
 const roofs=scene.children.list.filter(o=>o.name==='cave-decor:cave-roof') as Phaser.GameObjects.Image[];roofs.forEach((o,i)=>{o.setFlipX(i%2===1);o.setAlpha([.84,.76,.88][i%3]);});
 const roots=scene.children.list.filter(o=>o.name==='cave-decor:root-tendrils') as Phaser.GameObjects.Image[];roots.forEach((o,i)=>o.setFlipX(i%2===1));
 for(const id of ['crown-up-4','crown-down-2','crown-return-3']){const branch=scene.children.getByName(`canopy:${id}`) as Phaser.GameObjects.Image|undefined;branch?.setFlipX(!branch.flipX);}
}
