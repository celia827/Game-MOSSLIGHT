import type {LevelMap} from '../levels/shared/MapModule.ts';
import {surfaceY} from '../world/terrain/geometry.ts';

export const DEW_IDS=['dew-canopy-lookout','dew-hidden-roots'] as const;
export const SONG=[0,2,1] as const;
export interface RestPoint {x:number;moduleId:string}
export interface JourneySave {version:1;dew:string[];arrived:boolean;song:boolean;rest:RestPoint|null}
export interface Flower {x:number;y:number;note:number;label:string}
/** Geometry comes from the accepted platform; these flowers never register collision. */
export function songFlowers(map:LevelMap):Flower[] {
  const m=map.modules.find(m=>m.id==='crown-lookout');
  if(!m)throw Error('Missing listening garden');
  return [0,1,2].map(i=>{const x=m.x+30+i*100;return{x,y:surfaceY(m,x)!,note:[523.25,659.25,783.99][i],label:['低音','中音','高音'][i]};});
}
export function safeRest(map:LevelMap,rest:unknown):{x:number;y:number;supportId:string}|null {
  if(!rest||typeof rest!=='object')return null;
  const r=rest as RestPoint,m=map.modules.find(m=>m.id===r.moduleId);
  if(!m||!Number.isFinite(r.x)||r.x<m.x+24||r.x>m.x+m.width-24||m.id==='bedrock'||m.id==='root-wall')return null;
  const y=surfaceY(m,r.x);return y===undefined?null:{x:r.x,y,supportId:m.id};
}
export function parseSave(raw:string|null,map:LevelMap):JourneySave|null {
  try {
    const s=JSON.parse(raw??'null');
    if(!s||s.version!==1||!Array.isArray(s.dew)||typeof s.arrived!=='boolean'||typeof s.song!=='boolean')return null;
    const dew=[...new Set<string>(s.dew.filter((id:unknown)=>typeof id==='string'&&(DEW_IDS as readonly string[]).includes(id)))];
    return{version:1,dew,arrived:s.arrived,song:s.song,rest:safeRest(map,s.rest)?{x:s.rest.x,moduleId:s.rest.moduleId}:null};
  }catch{return null;}
}
export class AdventureModel {
  dew=new Set<string>();arrived=false;song=false;
  /** A free, untimed spatial memory puzzle: listen, then walk to each responding flower. */
  listening=false;listenTime=0;introduced=false;step=0;mistakes=0;clock=0;
  constructor(save:JourneySave|null=null){if(save){this.dew=new Set(save.dew);this.arrived=save.arrived;this.song=save.song;}}
  collect(id:string):boolean {if(!(DEW_IDS as readonly string[]).includes(id)||this.dew.has(id))return false;this.dew.add(id);return true;}
  arrive():boolean {if(this.arrived)return false;this.arrived=true;return true;}
  get complete():boolean {return this.arrived&&this.dew.size===2;}
  get title():string {return this.complete?'晨光已醒':this.arrived?'把晨光带回古树':'前往晨光古树';}
  get hint():string {
    if(this.complete)return this.song?'风也记住了你的歌。旅途手记 J':'树冠深处，还有一段风的旋律。';
    if(!this.arrived)return '沿林间小径向东 · 露珠藏在高处与根下';
    return !this.dew.has(DEW_IDS[0])?'树冠的最高处，留着一滴晨光。':'根洞深处，藤帘后仍有微光。';
  }
  update(dt:number,paused=false):void {if(paused)return;const d=Number.isFinite(dt)?Math.max(0,dt):0;this.clock+=d;if(this.listening){this.listenTime+=d;if(this.listenTime>=3.2)this.listening=false;}}
  answer(index:number):'listen'|'wait'|'correct'|'wrong'|'solved'|'done' {
    if(this.song)return'done';if(this.listening)return'wait';
    if(!this.introduced){this.introduced=true;this.listening=true;this.listenTime=0;this.step=0;return'listen';}
    if(index!==SONG[this.step]){this.step=0;this.mistakes++;this.listening=true;this.listenTime=0;return'wrong';}
    this.step++;if(this.step===SONG.length){this.song=true;return'solved';}return'correct';
  }
  replay():void {if(this.song)return;this.introduced=true;this.step=0;this.listening=true;this.listenTime=0;}
  get singing():number {if(!this.listening)return -1;const n=Math.floor(this.listenTime/.9);return n<SONG.length&&this.listenTime% .9<.65?SONG[n]:-1;}
  save(rest:RestPoint|null):JourneySave {return{version:1,dew:[...this.dew],arrived:this.arrived,song:this.song,rest};}
  reset():void {this.dew.clear();this.arrived=false;this.song=false;this.listening=false;this.listenTime=0;this.introduced=false;this.step=0;this.mistakes=0;this.clock=0;}
}
