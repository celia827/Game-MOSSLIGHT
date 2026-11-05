export interface InteractionDefinition {
  id:string;x:number;y:number;radius:number;verticalRange:number;enabled:boolean;
  prompt:string;activeSeconds:number;cooldownSeconds:number;visual:string;
  guides:ReadonlyArray<{x:number;y:number}>;
}
export type InteractionPhase='ready'|'active'|'cooldown';
interface State {definition:InteractionDefinition;phase:InteractionPhase;until:number;activations:number;started:number}
/** Pure state machine: no collision, input listeners, timers or display objects. */
export class InteractionModel {
  readonly states:State[];private time=0;private onTrigger:(d:InteractionDefinition)=>void;
  constructor(definitions:InteractionDefinition[],onTrigger:(d:InteractionDefinition)=>void=()=>{}) {
    if(new Set(definitions.map(d=>d.id)).size!==definitions.length)throw new Error('Duplicate interaction ID');
    for(const d of definitions)if(d.radius<=0||d.verticalRange<=0||d.activeSeconds<=0||d.cooldownSeconds<0)throw new Error(`Invalid interaction: ${d.id}`);
    this.states=definitions.map(definition=>({definition,phase:'ready',until:0,activations:0,started:0}));this.onTrigger=onTrigger;
  }
  inRange(d:InteractionDefinition,p:{x:number;y:number}):boolean{return d.enabled&&Math.abs(p.y-d.y)<=d.verticalRange&&(p.x-d.x)**2+(p.y-d.y)**2<=d.radius**2;}
  update(dt:number,p:{x:number;y:number},pressed:boolean,paused=false):void {
    if(paused)return;this.time+=Math.max(0,dt);
    for(const s of this.states){if(s.phase==='active'&&this.time>=s.until){s.phase='cooldown';s.until+=s.definition.cooldownSeconds;}if(s.phase==='cooldown'&&this.time>=s.until)s.phase='ready';}
    if(!pressed)return;
    const target=this.states.filter(s=>s.phase==='ready'&&this.inRange(s.definition,p)).sort((a,b)=>(a.definition.x-p.x)**2+(a.definition.y-p.y)**2-((b.definition.x-p.x)**2+(b.definition.y-p.y)**2))[0];
    if(target){target.phase='active';target.started=this.time;target.until=this.time+target.definition.activeSeconds;target.activations++;this.onTrigger(target.definition);}
  }
  elapsed(s:State):number{return this.time-s.started;}
  remaining(s:State):number{return s.phase==='ready'?0:Math.max(0,s.until-this.time);}
  reset():void {this.time=0;for(const s of this.states){s.phase='ready';s.until=0;s.started=0;s.activations=0;}}
}
