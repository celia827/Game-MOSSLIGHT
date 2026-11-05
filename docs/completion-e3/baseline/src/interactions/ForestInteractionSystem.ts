import {RootCurtainView,preloadRootCurtain} from './RootCurtainView';
import type {RootCurtainDefinition} from './RootCurtainVisual';
import Phaser from 'phaser';
import frames from './frames.json';
import {ART_SCALE} from '../config/game';
import {InteractionModel} from './InteractionModel';
import type {FlowerInteractionDefinition} from './GuideFlowerVisual';
import {GuideFlowerView} from './GuideFlowerView';
import {InteractionInput} from './InteractionInput';
export const INTERACTION_TEXTURE='forest-interactions';
export function preloadInteractions(scene:Phaser.Scene):void {
  preloadRootCurtain(scene);
  if(!scene.textures.exists(INTERACTION_TEXTURE))scene.load.svg(INTERACTION_TEXTURE,`${import.meta.env.BASE_URL}assets/interactions/interaction-atlas.svg`,{scale:ART_SCALE});
}
export class ForestInteractionSystem {
  readonly model:InteractionModel;private input:InteractionInput;private destroyed=false;
  private views:{prompt:Phaser.GameObjects.Text;stage:string;litGuides:number;objectCount:number;update:(dt:number,t:number|null,prompt:boolean,opened?:boolean)=>void;destroy:()=>void}[];
  constructor(scene:Phaser.Scene,definitions:(FlowerInteractionDefinition|RootCurtainDefinition)[]) {
    if(!scene.textures.exists(INTERACTION_TEXTURE))throw new Error('森林引路花资源未加载');
    const texture=scene.textures.get(INTERACTION_TEXTURE);
    for(const [name,f] of Object.entries(frames))if(!texture.has(name))texture.add(name,0,f.x*ART_SCALE,f.y*ART_SCALE,f.width*ART_SCALE,f.height*ART_SCALE);
    this.input=new InteractionInput();
    this.model=new InteractionModel(definitions,d=>scene.events.emit('interaction:activated',{id:d.id}));
    this.views=definitions.map(d=>'curtain' in d?new RootCurtainView(scene,d):new GuideFlowerView(scene,d));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.destroy());
  }
  update(dt:number,player:{x:number;y:number},paused=false):void {
    if(this.destroyed)return;
    this.model.update(dt,player,this.input.consume(),paused);
    this.model.states.forEach((s,i)=>this.views[i].update(paused?0:dt,s.phase==='active'?this.model.elapsed(s):null,!paused&&s.phase==='ready'&&this.model.inRange(s.definition,player),s.phase==='open'));
    document.body.dataset.interactionState=JSON.stringify(this.model.states.map((s,i)=>({id:s.definition.id,phase:s.phase,activations:s.activations,inRange:this.model.inRange(s.definition,player),prompt:this.views[i].prompt.visible,guides:this.views[i].litGuides,visualStage:this.views[i].stage,remaining:+this.model.remaining(s).toFixed(2),objects:this.views[i].objectCount})));
  }
  reset():void {this.model.reset();this.input.clear();}
  destroy():void {
    if(this.destroyed)return;this.destroyed=true;this.input.destroy();
    for(const v of this.views)v.destroy();
    delete document.body.dataset.interactionState;
  }
}
