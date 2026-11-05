import type Phaser from 'phaser';import type {MapModule} from '../../levels/shared/MapModule';
import frames from './frames.json';import {assets} from '../manifest';import {surfaceY} from '../../world/terrain/geometry';
import {bodyBands,surfaceStrips,isSurfaceTarget,isPortal,exposedEnds} from './layout';import type {CoverageProof} from './coverage';
export const SURFACE_TEXTURE='forest-surface';
export function addSurfaceSkin(scene:Phaser.Scene,m:MapModule,all:MapModule[],proofs?:Map<string,CoverageProof>):boolean {
 if(!isSurfaceTarget(m)||new URLSearchParams(location.search).has('artSample')||new URLSearchParams(location.search).get('surface')==='before')return false;
 if(!scene.textures.exists(SURFACE_TEXTURE))return false;
 const positions:number[]=[],uvs:number[]=[],indices:number[]=[],colors:number[]=[],alphas:number[]=[];let area=0,patches=0,boundedUV=true;const layers=new Set<string>();
 const quad=(x0:number,x1:number,t0:number,t1:number,b0:number,b1:number,u0:number,u1:number,v0:number,v1:number,vb0:number,vb1:number,key:keyof typeof frames,fringe=false)=>{
  if(b0<=t0&&b1<=t1)return;const f=frames[key],start=positions.length/2;positions.push(x0,-t0,x1,-t1,x0,-b0,x1,-b1);
  const U=(u:number)=>(f.x+.5+u/256*255)/780,V=(v:number)=>(f.y+.5+Math.min(v,f.height-1))/1292;
  boundedUV&&=Math.min(v0,v1,vb0,vb1)>=0&&Math.max(v0,v1,vb0,vb1)<=f.height;
  uvs.push(U(u0),V(v0),U(u1),V(v1),U(u0),V(vb0),U(u1),V(vb1));indices.push(start,start+2,start+1,start+2,start+3,start+1);
  for(const y of [t0,t1,b0,b1]){const depth=Math.max(0,Math.min(1,(m.y+y-940)/460));colors.push(isPortal(m)?((Math.round(255-depth*28)<<16)|(Math.round(247-depth*9)<<8)|Math.round(220+depth*27)):0xffffff);alphas.push(fringe&&isPortal(m)?Math.max(.18,1-depth):1);}
  if(!fringe){area+=(x1-x0)*((b0-t0)+(b1-t1))/2;patches++;layers.add(key.startsWith('surface-deep')?'深层重复岩土':isPortal(m)?'洞口岩土表层':'草皮/浅层土壤');}
 };
 for(const s of surfaceStrips(m)){
  const kind=isPortal(m)?'rock':'earth',key=`surface-${kind}-${s.variant}` as keyof typeof frames;
  quad(s.x0,s.x1,s.y0-20,s.y1-20,s.y0,s.y1,s.u0,s.u1,44,44,64,64,key,true);
  for(const b of bodyBands(s)){const shallow=b.depth===0,offset=shallow?64:0,bodyKey=shallow?key:`surface-deep-${(s.variant+Math.floor(b.depth/256))%3}` as keyof typeof frames;quad(s.x0,s.x1,b.t0,b.t1,b.b0,b.b1,s.u0,s.u1,offset,offset,offset+b.b0-b.t0,offset+b.b1-b.t1,bodyKey);}

 }
 const mesh=scene.add.mesh(m.x,m.y,SURFACE_TEXTURE,undefined,positions,uvs,indices,false,undefined,colors,alphas).setDepth(40).setName(`surface:${m.id}`);mesh.hideCCW=false;mesh.setOrtho(mesh.width,mesh.height);
 const ends=exposedEnds(m,all),edge=scene.add.graphics().setDepth(41).setName(`surface-edge:${m.id}`);
 for(const [i,show] of ends.entries())if(show){const x=m.x+(i?m.width:0),y=m.y+m.profile![i?m.profile!.length-1:0].y;edge.lineStyle(1,0x355c48,.3).lineBetween(x,y+3,x,m.y+m.height);edge.lineStyle(3,0x8fb864,.6).lineBetween(x+(i?-2:2),y+1,x+(i?-2:2),Math.min(y+19,m.y+m.height));}
 if(m.region==='A'||m.region==='E')for(const fraction of (m.region==='A'?[.81]:[.16,.83])){const key=m.region==='A'?'fern':'blooms',scale=m.region==='A'?.27:.3,[,w,h]=assets[key],x=m.x+m.width*fraction,y=surfaceY(m,x)!;scene.add.image(x,y,key).setOrigin(.5,1).setDisplaySize(w*scale,h*scale).setDepth(42).setAlpha(.85);}
 proofs?.set(m.id,{area,layers:[...layers],patches,boundedUV});return true;
}
/** Depth wash behind EMPTY passage space, replacing the former 15px background bands. */
export function addCaveShade(scene:Phaser.Scene,width:number,height:number):void {
 const vertices=[0,-920,width,-920,0,-1140,width,-1140,0,-height,width,-height],uv=[0,0,1,0,0,1,1,1,0,1,1,1],indices=[0,2,1,2,3,1,2,4,3,4,5,3];const mesh=scene.add.mesh(0,0,'__WHITE',undefined,vertices,uv,indices,false,undefined,0x223e3d,[0,0,.97,.97,.97,.97]).setDepth(34).setName('portal-air-shade');mesh.hideCCW=false;mesh.setOrtho(mesh.width,mesh.height);
}
