import './adventure.css';
import Phaser from 'phaser';
import type {PlayerController} from '../characters/fox/PlayerController';
import type {LevelMap} from '../levels/shared/MapModule';
import type {ForestCollectibleSystem} from '../collectibles/ForestCollectibleSystem';
import {InteractionInput} from '../interactions/InteractionInput';
import {AdventureModel,parseSave,safeRest,songFlowers,type RestPoint} from './AdventureModel';
import {AdventureView} from './AdventureView';
import {AdventureUI} from './AdventureUI';
import {ForestAudio} from './ForestAudio';

const SAVE_KEY='mosslight:morning-glade:v1';
let telemetryOwner:AdventureSystem|undefined;
let saveOwner:AdventureSystem|undefined;
/** Single adapter for the journey, UI, optional puzzle, sound, persistence and disposal. */
export class AdventureSystem {
  readonly model:AdventureModel;
  private view:AdventureView;private ui:AdventureUI;private audio:ForestAudio;private input:InteractionInput;private ownsInput:boolean;private externalPaused=false;
  private abort=new AbortController();private rest:RestPoint|null=null;private saveTime=0;private lastSave='';private canSave=true;
  private preview=false;private destroyed=false;private near=-1;private heard=-1;private lastLand=0;private mapOpen=false;private gardenSeen=false;
  private collect:(d:{id:string})=>void;private finish:()=>void;private interact:(d:{id:string})=>void;
  constructor(private scene:Phaser.Scene,private map:LevelMap,private collectibles:ForestCollectibleSystem,input?:InteractionInput) {
    this.input=input??new InteractionInput();this.ownsInput=!input;
    let raw:string|null=null;try{raw=localStorage.getItem(SAVE_KEY);}catch{this.canSave=false;}
    const debug=new URLSearchParams(location.search).has('artSample');this.preview=debug;saveOwner=this;
    const save=debug?null:parseSave(raw,map);this.model=new AdventureModel(save);this.rest=save?.rest??null;
    this.ui=new AdventureUI({sound:()=>this.audio.toggle(),replay:()=>this.replay()});
    this.audio=new ForestAudio(enabled=>this.ui.audio(enabled));this.ui.storageAvailable(this.canSave);
    this.view=new AdventureView(scene,songFlowers(map),map.finish);
    if(save){collectibles.restore(save.dew);this.ui.notice('欢迎回来。森林记得你的足迹。');}
    else this.ui.notice('去晨光门庭看看吧。高处与根下，藏着让古树开花的露珠。');
    this.collect=d=>{
      if(!this.model.collect(d.id))return;
      this.audio.chime(this.model.complete?'bloom':'dew');
      this.ui.notice(this.model.complete?'两滴晨光相遇，古树完全绽放。回门庭看看，或继续聆听森林。':d.id==='dew-canopy-lookout'?'林冠晨露点亮了古树的一朵花。':'根室微光点亮了古树的另一朵花。');
      this.persist();
    };
    this.finish=()=>{if(this.model.arrive()){
      this.audio.chime(this.model.complete?'bloom':'arrival');
      this.ui.notice(this.model.complete?'晨光已醒。谢谢你，把两束微光带回森林。J 查看旅途。':'你已抵达晨光门庭。古树醒了，找到露珠还能让它开花。J 查看旅途。');this.persist();
    }};
    this.interact=d=>this.audio.chime(d.id==='forest-guide-flower'?'flower':'curtain');
    scene.events.on('collectible:collected',this.collect);scene.events.on('level:finish',this.finish);scene.events.on('interaction:activated',this.interact);
    const signal=this.abort.signal;
    window.addEventListener('keydown',e=>{
      if(this.externalPaused||e.repeat||e.ctrlKey||e.metaKey||e.altKey||(e.target as HTMLElement)?.closest('input,select,textarea,[contenteditable="true"]'))return;
      if(e.code==='KeyJ'&&!this.mapOpen){e.preventDefault();this.ui.toggle();this.input.clear();}
      if(e.code==='Escape'&&this.ui.open){e.preventDefault();this.ui.toggle(false);}
      if(e.code==='KeyQ'&&!this.paused){e.preventDefault();this.replay();}
    },{signal});
    window.addEventListener('pagehide',()=>this.persist(),{signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.persist();},{signal});
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);scene.events.once(Phaser.Scenes.Events.DESTROY,this.destroy,this);
    this.publish();
  }
  get paused():boolean{return this.ui.open;}
  /** Resume only on a validated static surface with clear body space. */
  resume(player:PlayerController):void {
    const p=safeRest(this.map,this.rest);if(!p||player.collides(p.x,p.y))return;
    player.x=p.x;player.y=p.y;player.supportId=p.supportId;player.grounded=true;
  }
  private replay():void {if(this.near<0||this.model.song||this.mapOpen)return;this.model.replay();this.heard=-1;this.ui.notice('看花朵亮起的先后顺序，再走近它们按 E 回应。没有时间限制。');}
  canInteract(player:{x:number;y:number}):boolean {return !this.model.song&&this.view.flowers.some(f=>Math.abs(player.y-f.y)<45&&Math.abs(player.x-f.x)<37);}
  update(dt:number,player:PlayerController,mapOpen:boolean,pressedOverride?:boolean,externalPaused=false):void {
    if(this.destroyed)return;this.mapOpen=mapOpen;this.externalPaused=externalPaused;
    const paused=mapOpen||this.paused||externalPaused;this.audio.setPaused(paused);this.model.update(dt,paused);
    this.near=this.view.flowers.findIndex(f=>Math.abs(player.y-f.y)<45&&Math.abs(player.x-f.x)<37);
    const inGarden=Math.abs(player.y-this.view.flowers[1].y)<65&&Math.abs(player.x-this.view.flowers[1].x)<165;
    if(!paused&&inGarden&&!this.gardenSeen&&!this.model.song){this.gardenSeen=true;this.ui.notice('听风花 · 走近花朵按 E，记住光点亮起的顺序，再逐一回应。');}
    const pressed=pressedOverride??this.input.consume();
    if(!paused&&pressed&&this.near>=0){
      const result=this.model.answer(this.near);
      if(result==='correct'||result==='solved'){this.view.feedback(this.near,this.model.clock);this.audio.tone(this.view.flowers[this.near].note);}
      if(result==='listen'||result==='wrong'){this.heard=-1;this.ui.notice(result==='listen'?'先听一遍。看光点亮起的顺序，再走到花前按 E 回应。':'花朵轻轻摇头，再唱了一遍。放心，没有惩罚。');}
      if(result==='solved'){this.audio.chime('song');this.ui.notice('旋律接上了。萤火随风升起，也会在晨光门庭等你。');this.persist();}
    }
    if(!paused&&this.model.singing!==this.heard){this.heard=this.model.singing;if(this.heard>=0)this.audio.tone(this.view.flowers[this.heard].note,.6);}
    if(!paused){
      this.audio.walk(dt,player.grounded&&Math.abs(player.velocity)>15,player.y>1200,player.walking,player.landCount>this.lastLand);this.lastLand=player.landCount;
      this.saveTime+=dt;
      if(this.saveTime>=2){this.saveTime=0;
        if(player.grounded&&player.supportId){const rest={x:Math.round(player.x*100)/100,moduleId:player.supportId};if(safeRest(this.map,rest))this.rest=rest;}
        this.persist();
      }
    }
    this.view.update(this.model,this.near,paused);this.ui.update(this.model,paused?0:dt,mapOpen,inGarden);this.publish();
  }
  private publish():void {telemetryOwner=this;document.body.dataset.adventureState=JSON.stringify({arrived:this.model.arrived,complete:this.model.complete,dew:[...this.model.dew],song:this.model.song,step:this.model.step,listening:this.model.listening,singing:this.model.singing,near:this.near,paused:this.paused,saved:this.canSave,rest:this.rest});}
  private persist():void {
    if(!this.canSave||this.preview||saveOwner!==this)return;const data=JSON.stringify(this.model.save(this.rest));if(data===this.lastSave)return;
    try{localStorage.setItem(SAVE_KEY,data);this.lastSave=data;}catch{this.canSave=false;this.ui.storageAvailable(false);}
  }
  reset():void {if(this.destroyed)return;this.model.reset();this.rest=null;this.lastLand=0;this.heard=-1;this.gardenSeen=false;this.input.clear();this.ui.reset();this.persist();this.publish();}
  destroy():void {
    if(this.destroyed)return;this.destroyed=true;this.persist();if(saveOwner===this)saveOwner=undefined;this.abort.abort();if(this.ownsInput)this.input.destroy();
    this.scene.events.off('collectible:collected',this.collect);this.scene.events.off('level:finish',this.finish);this.scene.events.off('interaction:activated',this.interact);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);this.scene.events.off(Phaser.Scenes.Events.DESTROY,this.destroy,this);
    this.audio.destroy();this.view.destroy();this.ui.destroy();if(telemetryOwner===this){delete document.body.dataset.adventureState;telemetryOwner=undefined;}
  }
}
