import Phaser from 'phaser';
import {CheckpointModel} from './CheckpointModel';
import {level01Checkpoints} from './Level01Checkpoints';
import {CheckpointView} from './CheckpointView';
import {RespawnController} from './RespawnController';
import type {LevelMap} from '../levels/shared/MapModule';
import type {PlayerController} from '../characters/fox/PlayerController';

let telemetryOwner:CheckpointSystem|undefined;
export class CheckpointSystem {
  readonly model:CheckpointModel;readonly respawn:RespawnController;
  private views:CheckpointView[];private feedback:HTMLElement;private panel:HTMLElement;
  private button:HTMLButtonElement;private output:HTMLOutputElement;private abort=new AbortController();
  private noticeTime=0;private cycle=0;private destroyed=false;
  constructor(private scene:Phaser.Scene,map:LevelMap,private player:PlayerController,hooks:ConstructorParameters<typeof RespawnController>[3]) {
    this.model=new CheckpointModel(level01Checkpoints(map),()=>{this.noticeTime=2.8;this.feedback.hidden=false;this.feedback.textContent='苔光已记录';});
    this.respawn=new RespawnController(player,map,this.model,hooks);
    this.views=this.model.states.map(s=>new CheckpointView(scene,s));
    this.feedback=document.createElement('div');this.feedback.dataset.checkpointFeedback='';this.feedback.hidden=true;this.feedback.setAttribute('role','status');this.feedback.setAttribute('aria-live','polite');
    this.feedback.style.cssText='position:absolute;right:22px;bottom:22px;padding:9px 15px;background:#284e3ee8;border:1px solid #c6d59b70;border-radius:7px;color:#f5e6b3;font:12px system-ui,sans-serif;letter-spacing:1px;pointer-events:none;z-index:4';
    document.querySelector('.scene-frame')!.append(this.feedback);
    this.panel=document.createElement('section');this.panel.className='checkpoint-dev';this.panel.innerHTML='<p>苔光栖息点 · 普通复活保留本局进度；R 完整重置。</p><button type="button" id="test-respawn">测试复活：返回有效检查点</button><output id="checkpoint-telemetry" aria-label="检查点与复活状态"></output>';
    document.querySelector('.level-dev')!.append(this.panel);this.button=this.panel.querySelector('button')!;this.output=this.panel.querySelector('output')!;
    this.button.addEventListener('click',()=>this.requestRespawn('developer-test'),{signal:this.abort.signal});
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);scene.events.once(Phaser.Scenes.Events.DESTROY,this.destroy,this);
    this.publish();
  }
  requestRespawn(reason:string,requestId?:string):boolean {return !this.destroyed&&this.respawn.requestRespawn(reason,requestId);}
  update(dt:number,paused:boolean):void {
    if(this.destroyed)return;this.cycle++;this.button.disabled=paused;
    this.respawn.flush(this.cycle,paused);this.model.update(dt,this.player,paused);
    if(!paused)this.noticeTime=Math.max(0,this.noticeTime-dt);
    this.feedback.hidden=paused||this.noticeTime<=0;this.feedback.style.opacity=String(Math.min(1,this.noticeTime/.5));
    for(const view of this.views)view.update(this.model.clock);this.publish();
  }
  private publish():void {
    const state=JSON.stringify({currentId:this.model.effective?.checkpointId??null,states:this.model.states.map(s=>({id:s.definition.checkpointId,state:s.activationState,position:s.definition.worldPosition,surfaceId:s.definition.surfaceId,respawn:s.definition.respawnPosition})),target:this.respawn.target,lastRespawn:this.respawn.lastResult});
    this.output.textContent=state;telemetryOwner=this;document.body.dataset.checkpointState=state;
  }
  reset():void {if(this.destroyed)return;this.model.reset();this.respawn.reset();this.noticeTime=0;this.feedback.hidden=true;for(const v of this.views)v.update(0);this.publish();}
  destroy():void {if(this.destroyed)return;this.destroyed=true;this.abort.abort();this.respawn.reset();this.views.forEach(v=>v.destroy());this.views=[];this.feedback.remove();this.panel.remove();this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);this.scene.events.off(Phaser.Scenes.Events.DESTROY,this.destroy,this);if(telemetryOwner===this){delete document.body.dataset.checkpointState;telemetryOwner=undefined;}}
}
