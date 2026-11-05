import './completion.css';
import Phaser from 'phaser';
import {LevelCompletionModel,type CompletionData,type CompletionPlayer} from './LevelCompletionModel';
import type {LevelExit} from './Level01Exit';
import {CompletionView} from './CompletionView';
import {CompletionUI} from './CompletionUI';
let telemetryOwner:LevelCompletionController|undefined;
/** Owns presentation only; the scene supplies existing freeze/resume/reset operations. */
export class LevelCompletionController {
  readonly model:LevelCompletionModel;private view:CompletionView;private ui:CompletionUI;private destroyed=false;
  constructor(private scene:Phaser.Scene,exit:LevelExit,private hooks:{freeze:()=>void;resume:()=>void;restart:()=>void;completed:(data:Readonly<CompletionData>)=>void}) {
    this.model=new LevelCompletionModel(exit);this.view=new CompletionView(scene,exit);
    this.ui=new CompletionUI({explore:()=>this.explore(),restart:()=>this.hooks.restart()});
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);scene.events.once(Phaser.Scenes.Events.DESTROY,this.destroy,this);this.publish();
  }
  get locked():boolean{return this.model.locked;}
  canActivate(player:CompletionPlayer):boolean{return!this.destroyed&&this.model.canActivate(player);}
  activate(player:CompletionPlayer,data:CompletionData):boolean {
    if(this.destroyed||!this.model.activate(player,data))return false;
    this.hooks.freeze();this.ui.setLocked(true);this.publish();return true;
  }
  update(dt:number,player:CompletionPlayer,paused:boolean):void {
    if(this.destroyed)return;
    if(this.model.update(dt,paused)){this.hooks.completed(this.model.data!);this.ui.show(this.model.data!);}
    this.view.update(this.model,!paused&&this.model.canActivate(player));this.publish();
  }
  explore():void {if(this.destroyed||!this.model.continueExploring())return;this.ui.hide();this.hooks.resume();this.publish();}
  reset():void {if(this.destroyed)return;const locked=this.locked;this.model.reset();this.ui.hide(false);if(locked)this.hooks.resume();this.publish();}
  private publish():void {telemetryOwner=this;document.body.dataset.completionState=JSON.stringify({state:this.model.state,locked:this.locked,activations:this.model.activations,elapsed:this.model.elapsed,progress:this.model.progress,data:this.model.data,exit:this.model.exit});}
  destroy():void {if(this.destroyed)return;this.destroyed=true;this.ui.destroy();this.view.destroy();this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);this.scene.events.off(Phaser.Scenes.Events.DESTROY,this.destroy,this);if(telemetryOwner===this){delete document.body.dataset.completionState;telemetryOwner=undefined;}}
}
