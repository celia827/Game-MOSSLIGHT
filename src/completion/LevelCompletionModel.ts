import type {LevelExit} from './Level01Exit.ts';
export type CompletionState='PLAYING'|'ACTIVATING'|'COMPLETED'|'EXPLORING';
export interface CompletionPlayer {x:number;y:number;grounded:boolean;supportId:string|null}
export interface CompletionData {levelId:string;collectedCount:number;totalCollectibles:number;explorationSummary:readonly string[];elapsed:number}
export const ACTIVATION_SECONDS=2.1;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t)};
export function gateEnvelope(elapsed:number) {
  return{gather:smooth(elapsed/.65),wake:smooth((elapsed-.55)/1),outline:smooth((elapsed-.7)/.9),settle:smooth((elapsed-1.5)/.6)};
}
/** Exactly one receiver per E edge; normal forest rules stay in their existing model. */
export function routeInteraction(pressed:boolean,paused:boolean,exit:boolean,garden:boolean):'exit'|'garden'|'forest'|null {
  return !pressed||paused?null:exit?'exit':garden?'garden':'forest';
}
/** Session-only completion. No storage, renderer, listeners or world mutation. */
export class LevelCompletionModel {
  state:CompletionState='PLAYING';elapsed=0;activations=0;data:Readonly<CompletionData>|null=null;
  readonly exit:LevelExit;
  constructor(exit:LevelExit){this.exit=exit;}
  get locked():boolean{return this.state==='ACTIVATING'||this.state==='COMPLETED';}
  get progress():number{return this.state==='PLAYING'?0:this.state==='ACTIVATING'?clamp(this.elapsed/ACTIVATION_SECONDS):1;}
  inRange(p:CompletionPlayer):boolean {const d=this.exit;return p.grounded&&p.supportId===d.surfaceId&&Math.abs(p.y-d.y)<=d.heightTolerance&&Math.hypot(p.x-d.x,p.y-d.y)<=d.radius;}
  canActivate(p:CompletionPlayer):boolean{return this.state==='PLAYING'&&this.inRange(p);}
  activate(p:CompletionPlayer,data:CompletionData):boolean {
    if(!this.canActivate(p))return false;
    if(data.levelId!==this.exit.levelId||!Number.isInteger(data.totalCollectibles)||data.totalCollectibles<0||!Number.isInteger(data.collectedCount)||data.collectedCount<0||data.collectedCount>data.totalCollectibles)throw Error('Invalid completion snapshot');
    this.data=Object.freeze({...data,explorationSummary:Object.freeze([...data.explorationSummary])});this.state='ACTIVATING';this.elapsed=0;this.activations++;return true;
  }
  update(dt:number,paused=false):boolean {
    if(paused||this.state!=='ACTIVATING')return false;
    this.elapsed=Math.min(ACTIVATION_SECONDS,this.elapsed+(Number.isFinite(dt)?Math.max(0,dt):0));
    if(this.elapsed+1e-8<ACTIVATION_SECONDS)return false;
    this.elapsed=ACTIVATION_SECONDS;this.state='COMPLETED';return true;
  }
  continueExploring():boolean {if(this.state!=='COMPLETED')return false;this.state='EXPLORING';return true;}
  reset():void {this.state='PLAYING';this.elapsed=0;this.activations=0;this.data=null;}
}
