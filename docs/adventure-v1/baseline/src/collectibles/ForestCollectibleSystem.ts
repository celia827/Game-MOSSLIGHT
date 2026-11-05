import Phaser from 'phaser';
import {CHARACTER_CONFIG as C} from '../characters/fox/CharacterConfig';
import {CollectibleModel,PICKUP_SECONDS,type CollectibleDefinition} from './CollectibleModel';
import {CollectibleView} from './CollectibleView';
// A retiring scene must never erase a newer scene's diagnostic snapshot.
let telemetryOwner:ForestCollectibleSystem|undefined;
/** Single integration boundary. Decorative objects never register colliders or alter the player. */
export class ForestCollectibleSystem {
  readonly model:CollectibleModel;
  private views:CollectibleView[];private hud:Phaser.GameObjects.Text;private notice:Phaser.GameObjects.Text;
  private clock=0;private noticeRemaining=0;private destroyed=false;private a11y:HTMLElement;private shutdown:()=>void;
  constructor(private readonly scene:Phaser.Scene,definitions:readonly CollectibleDefinition[]) {
    this.hud=scene.add.text(640,23,'',{fontFamily:'system-ui,sans-serif',fontSize:'15px',color:'#eaf5d7',backgroundColor:'#234b46df',padding:{x:12,y:7}}).setOrigin(.5,0).setScrollFactor(0).setDepth(90).setName('dewdrop:counter');
    this.notice=scene.add.text(640,65,'',{fontFamily:'system-ui,sans-serif',fontSize:'16px',color:'#fff1bd',backgroundColor:'#234b46dc',padding:{x:14,y:8}}).setOrigin(.5,0).setScrollFactor(0).setDepth(90).setVisible(false).setName('dewdrop:discovery');
    this.a11y=document.createElement('span');this.a11y.setAttribute('role','status');this.a11y.setAttribute('aria-live','polite');
    this.a11y.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;';
    this.a11y.id='dewdrop-status';document.querySelector('#game')?.append(this.a11y);
    this.model=new CollectibleModel(definitions,(d,count)=>{
      this.hud.setText(`苔光露珠 ${count}/${this.model.total}`);
      this.notice.setText(`发现 · ${d.label}`).setVisible(true).setAlpha(1);this.noticeRemaining=2.8;
      this.a11y.textContent=`发现${d.label}，苔光露珠 ${count}/${this.model.total}`;
      scene.events.emit('collectible:collected',{id:d.id,type:d.type,count,total:this.model.total});
    });
    this.views=definitions.map(d=>new CollectibleView(scene,d));
    this.shutdown=()=>this.destroy();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.shutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY,this.shutdown);
    this.reset();
  }
  update(dt:number,player:{x:number;y:number},paused=false):void {
    if(this.destroyed)return;
    if(!paused){this.clock+=dt;this.noticeRemaining=Math.max(0,this.noticeRemaining-dt);}
    this.model.update(dt,{x:player.x,y:player.y,halfWidth:C.bodyHalfWidth,height:C.bodyHeight},paused);
    this.model.states.forEach((s,i)=>this.views[i].update(this.clock,s));
    this.hud.setVisible(!paused);this.notice.setVisible(!paused&&this.noticeRemaining>0).setAlpha(Math.min(1,this.noticeRemaining/.5));
    telemetryOwner=this;
    document.body.dataset.collectibleState=JSON.stringify({count:this.model.count,total:this.model.total,hud:this.hud.text,notice:this.noticeRemaining>0?this.notice.text:null,states:this.model.states.map(s=>({id:s.definition.id,x:s.definition.x,y:s.definition.y,collected:s.collected,phase:!s.collected?'idle':s.elapsed<PICKUP_SECONDS?'collecting':'collected'}))});
  }
  reset():void {
    if(this.destroyed)return;
    this.model.reset();this.clock=0;this.noticeRemaining=0;this.hud.setText(`苔光露珠 0/${this.model.total}`);this.notice.setVisible(false);this.a11y.textContent=this.hud.text;
    this.model.states.forEach((s,i)=>this.views[i].update(0,s));
  }
  destroy():void {
    if(this.destroyed)return;this.destroyed=true;
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.shutdown);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY,this.shutdown);
    this.views.forEach(v=>v.destroy());this.views=[];
    this.hud.destroy();this.notice.destroy();this.a11y.remove();
    if(telemetryOwner===this){delete document.body.dataset.collectibleState;telemetryOwner=undefined;}
  }
}
