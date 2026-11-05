import type {PlayerController} from '../characters/fox/PlayerController.ts';
import type {LevelMap} from '../levels/shared/MapModule.ts';
import {surfaceY} from '../world/terrain/geometry.ts';
import {defaultRespawn} from './Level01Checkpoints.ts';
import type {CheckpointModel,CheckpointPosition} from './CheckpointModel.ts';
export interface RespawnResult {
  ok:boolean;requestId:string;reason:string;cycle:number;checkpointId:string|null;fallback:boolean;
  target:(CheckpointPosition&{surfaceId:string})|null;error?:string;
  motion?:{velocity:number;velocityY:number;supportId:string|null;grounded:boolean;coyote:number;buffer:number;landing:number;impact:number;jumped:boolean;landed:boolean};
}
/** Production request queue. One pending request, deduplicated IDs, one execution per cycle. */
export class RespawnController {
  private pending:{id:string;reason:string}|null=null;private sequence=0;private lastCycle=-1;private processing=false;
  private seen=new Set<string>();lastResult:RespawnResult|null=null;
  private player:PlayerController;private map:LevelMap;private checkpoints:CheckpointModel;
  private hooks:{before:()=>void;restoreAnimation:()=>void;resetCamera:(x:number,y:number)=>void;detachPlatform:()=>void};
  constructor(player:PlayerController,map:LevelMap,checkpoints:CheckpointModel,
    hooks:{before:()=>void;restoreAnimation:()=>void;resetCamera:(x:number,y:number)=>void;detachPlatform:()=>void}) {this.player=player;this.map=map;this.checkpoints=checkpoints;this.hooks=hooks;}
  requestRespawn(reason:string,requestId=`respawn-${++this.sequence}`):boolean {
    if(!reason.trim()||this.pending||this.processing||this.seen.has(requestId))return false;
    this.pending={id:requestId,reason};this.seen.add(requestId);if(this.seen.size>64)this.seen.delete(this.seen.values().next().value!);return true;
  }
  get target() {const d=this.checkpoints.effective;return d?{...d.respawnPosition,surfaceId:d.surfaceId}:defaultRespawn(this.map);}
  private safe(t:CheckpointPosition&{surfaceId:string}):boolean {
    const m=this.map.modules.find(m=>m.id===t.surfaceId);
    return !!m&&Number.isFinite(t.x)&&Number.isFinite(t.y)&&t.x>=Math.max(m.x+24,this.player.bounds.minX)&&t.x<=Math.min(m.x+m.width-24,this.player.bounds.maxX)&&surfaceY(m,t.x)===t.y&&!this.player.collides(t.x,t.y);
  }
  flush(cycle:number,paused=false):RespawnResult|null {
    if(paused||!this.pending||cycle===this.lastCycle||this.processing)return null;
    const request=this.pending;this.pending=null;this.lastCycle=cycle;this.processing=true;
    try {
      let target=this.target,fallback=false;const checkpointId=this.checkpoints.effective?.checkpointId??null;
      if(!this.safe(target)){target=defaultRespawn(this.map);fallback=true;}
      if(!this.safe(target))return this.lastResult={ok:false,requestId:request.id,reason:request.reason,cycle,checkpointId,fallback,target:null,error:'没有安全的固定地形复活位置'};
      this.hooks.before();
      if(!this.player.respawnAt(target))return this.lastResult={ok:false,requestId:request.id,reason:request.reason,cycle,checkpointId,fallback,target,error:'角色空间验证失败'};
      this.hooks.detachPlatform();this.hooks.restoreAnimation();this.hooks.resetCamera(target.x,target.y);
      const p=this.player;
      return this.lastResult={ok:true,requestId:request.id,reason:request.reason,cycle,checkpointId,fallback,target,motion:{velocity:p.velocity,velocityY:p.velocityY,supportId:p.supportId,grounded:p.grounded,coyote:p.coyoteTimer,buffer:p.bufferTimer,landing:p.landTimer,impact:p.impact,jumped:p.jumpedThisFrame,landed:p.landedThisFrame}};
    }finally{this.processing=false;}
  }
  reset():void {this.pending=null;this.lastResult=null;this.lastCycle=-1;this.seen.clear();}
}
