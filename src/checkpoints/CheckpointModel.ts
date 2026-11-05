export interface CheckpointPosition {x:number;y:number}
export interface CheckpointDefinition {
  checkpointId:string;name:string;worldPosition:CheckpointPosition;surfaceId:string;
  activationRange:number;heightTolerance:number;progressionOrder:number;
  respawnPosition:CheckpointPosition;visualResourceId:'mosslight-rest';
}
export interface CheckpointState {definition:CheckpointDefinition;activationState:'dormant'|'recorded'|'current';activatedAt:number|null}
export interface CheckpointPlayer extends CheckpointPosition {grounded:boolean;supportId:string|null}
/** Session state only. Backtracking never lowers the effective checkpoint. */
export class CheckpointModel {
  readonly states:CheckpointState[];clock=0;private current:string|null=null;
  private onActivate:(state:CheckpointState)=>void;
  constructor(definitions:CheckpointDefinition[],onActivate:(state:CheckpointState)=>void=()=>{}) {
    this.onActivate=onActivate;
    if(new Set(definitions.map(d=>d.checkpointId)).size!==definitions.length||new Set(definitions.map(d=>d.progressionOrder)).size!==definitions.length)throw Error('Duplicate checkpoint identity/order');
    for(const d of definitions)if(!d.checkpointId||!d.surfaceId||![d.worldPosition.x,d.worldPosition.y,d.respawnPosition.x,d.respawnPosition.y,d.progressionOrder,d.activationRange,d.heightTolerance].every(Number.isFinite)||d.activationRange<=0||d.heightTolerance<0)throw Error('Invalid checkpoint');
    this.states=definitions.map(d=>({definition:d,activationState:'dormant',activatedAt:null}));
  }
  get effective():CheckpointDefinition|null {return this.states.find(s=>s.definition.checkpointId===this.current)?.definition??null;}
  update(dt:number,player:CheckpointPlayer,paused=false):void {
    if(paused)return;this.clock+=Number.isFinite(dt)?Math.max(0,dt):0;
    if(!player.grounded)return;
    for(const s of this.states){const d=s.definition;
      if(s.activationState!=='dormant'||player.supportId!==d.surfaceId||Math.abs(player.y-d.worldPosition.y)>d.heightTolerance||Math.hypot(player.x-d.worldPosition.x,player.y-d.worldPosition.y)>d.activationRange)continue;
      s.activatedAt=this.clock;s.activationState='recorded';
      if(!this.effective||d.progressionOrder>this.effective.progressionOrder){for(const old of this.states)if(old.activationState==='current')old.activationState='recorded';this.current=d.checkpointId;s.activationState='current';}
      this.onActivate(s);
    }
  }
  reset():void {this.current=null;this.clock=0;for(const s of this.states){s.activationState='dormant';s.activatedAt=null;}}
}
