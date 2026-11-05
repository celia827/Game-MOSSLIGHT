export interface CollectibleDefinition {
  readonly id:string;
  readonly type:'mosslight-dew';
  readonly label:string;
  readonly x:number;
  readonly y:number;
  readonly radius:number;
  readonly enabled:boolean;
  readonly visual:'mosslight-dewdrop';
  readonly anchor:{readonly moduleId:string;readonly surfaceY:number};
  /** Reject pickups through another floor while still allowing a natural jumping pickup. */
  readonly footTolerance:number;
}
export interface Collector {x:number;y:number;halfWidth:number;height:number}
export interface CollectibleState {readonly definition:CollectibleDefinition;collected:boolean;elapsed:number}
export const PICKUP_SECONDS=.8;
/** Session-only state. No keyboard, storage, collision writes, timers or renderer ownership. */
export class CollectibleModel {
  readonly states:CollectibleState[];
  private readonly onCollect:(d:CollectibleDefinition,count:number)=>void;
  constructor(definitions:readonly CollectibleDefinition[],onCollect:(d:CollectibleDefinition,count:number)=>void=()=>{}) {
    if(new Set(definitions.map(d=>d.id)).size!==definitions.length)throw new Error('Duplicate collectible ID');
    for(const d of definitions)if(!d.id||![d.x,d.y,d.radius,d.footTolerance,d.anchor.surfaceY].every(Number.isFinite)||d.radius<=0||d.footTolerance<0)throw new Error(`Invalid collectible: ${d.id}`);
    this.states=definitions.map(d=>({definition:Object.freeze({...d,anchor:Object.freeze({...d.anchor})}),collected:false,elapsed:0}));
    this.onCollect=onCollect;
  }
  get count():number{return this.states.filter(s=>s.collected).length;}
  get total():number{return this.states.length;}
  inRange(d:CollectibleDefinition,p:Collector):boolean {
    if(!d.enabled||Math.abs(p.y-d.anchor.surfaceY)>d.footTolerance)return false;
    const dx=Math.max(0,Math.abs(p.x-d.x)-p.halfWidth);
    const dy=Math.max(p.y-p.height-d.y,d.y-p.y,0);
    return dx*dx+dy*dy<=d.radius*d.radius;
  }
  update(dt:number,p:Collector,paused=false):void {
    if(paused)return;
    const delta=Number.isFinite(dt)?Math.max(0,dt):0;
    for(const s of this.states) {
      if(s.collected){s.elapsed=Math.min(PICKUP_SECONDS,s.elapsed+delta);continue;}
      if(this.inRange(s.definition,p)) {
        // Mark before notifying: repeated frames/reentrant callbacks cannot award it twice.
        s.collected=true;s.elapsed=0;this.onCollect(s.definition,this.count);
      }
    }
  }
  reset():void {for(const s of this.states){s.collected=false;s.elapsed=0;}}
}
