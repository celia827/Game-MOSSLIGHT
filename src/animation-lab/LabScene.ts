import {FusionTimeline,FUSION_DURATION} from './FusionTimeline';
import type {MotionTuning} from '../characters/fox/FoxMotionConfig';
import {GroundTimeline} from './GroundTimeline';
import type {GroundAction} from './GroundTimeline';
import Phaser from 'phaser';
import {RIG_PARTS} from '../characters/fox/CharacterConfig';
import {FoxRig} from '../characters/fox/FoxRig';
import {FoxAnimationController} from '../characters/fox/FoxAnimationController';
import type {BoneId} from '../characters/fox/FoxBones';
import {LabPoseModel} from './LabPoseModel';
import {KEY_POSES,LAB_GAME_POSE} from './poses';
import type {LabPoseId} from './poses';
import {JumpTimeline,JUMP_DURATION} from './JumpTimeline';
export interface LabView {
  region:'whole'|'ears'|'tail';mode:'overview'|'focus'|'cycle'|'ground'|'fusion';selected:LabPoseId;showBones:boolean;compare:boolean;comparison:'previous'|'primary'|'art';
  tuning:Partial<MotionTuning>;version:'refined'|'previous';zoom:number;joint:BoneId;time:number;rate:number;paused:boolean;secondary:boolean;ears:boolean;tail:boolean;travel:boolean;headMotion:boolean;headNeck:boolean;headPivot:boolean;waistBend:number;groundAction:GroundAction;groundSpeed:number;
}
export class LabScene extends Phaser.Scene {
  readonly actors:{model:LabPoseModel;previous:FoxAnimationController;rig:FoxRig}[]=[];
  readonly fusionTimeline=new FusionTimeline();
  readonly timeline=new JumpTimeline();
  readonly groundTimeline=new GroundTimeline();
  onFrame=()=>{};
  private paper!:Phaser.GameObjects.Graphics;
  private original!:Phaser.GameObjects.Image;
  private previousRig!:FoxRig;private cycleRig!:FoxRig;
  private view?:LabView;private report=0;
  constructor(private ready:(scene:LabScene)=>void){super('AnimationLab');}
  preload():void {
    const scale=Math.min(window.devicePixelRatio||1,2);
    for(const part of RIG_PARTS)this.load.svg(`fox-rig-${part.id}`,`/assets/characters/rig/${part.id}.svg`,{scale});
    this.load.svg('lab-original','/assets/characters/nori-fox-idle.svg',{scale});
    this.load.on('loaderror',(file:Phaser.Loader.File)=>{document.querySelector('#loading')!.textContent=`素材加载失败：${file.key}`;console.error('Animation lab asset failed',file.key);});
  }
  create():void {
    this.paper=this.add.graphics();
    for(const pose of KEY_POSES){const previous=new FoxAnimationController('previous');previous.setPosePreview(LAB_GAME_POSE[pose.id]);previous.paused=true;this.actors.push({model:new LabPoseModel(pose.id),previous,rig:new FoxRig(this)});}
    this.previousRig=new FoxRig(this);this.cycleRig=new FoxRig(this);
    this.original=this.add.image(0,0,'lab-original').setOrigin(0,0).setDisplaySize(200,220).setVisible(false);
    document.querySelector<HTMLElement>('#loading')!.hidden=true;this.ready(this);
  }
  renderView(view:LabView):void {
    this.view=view;
    for(const {model} of this.actors){model.headMotion=view.headMotion;model.waistBend=view.waistBend;model.set(model.id);}
    this.previousRig.inspectionRegion='whole';this.cycleRig.inspectionRegion='whole';
    const g=this.paper;g.clear();this.original.setVisible(false);this.previousRig.root.setVisible(false);this.cycleRig.root.setVisible(false);
    for(const {rig} of this.actors)rig.root.setVisible(false);
    const board=(x:number,y:number,w:number,h:number)=>{g.fillStyle(0x51684e,.055).fillRoundedRect(x+2,y+5,w,h,20);g.fillStyle(0xf9f9ed,1).fillRoundedRect(x,y,w,h,20);g.lineStyle(1,0xb9c8ad,.6).strokeRoundedRect(x,y,w,h,20);};
    const floor=(x:number,y:number,width:number)=>{g.lineStyle(1,0xaabb9e,.5).lineBetween(x-width*.5,y,x+width*.5,y);g.fillStyle(0x466149,.08).fillEllipse(x,y+2,90,16);};
    if(view.mode==='overview')this.actors.forEach(({model,previous,rig},i)=>{
      const x=i%3*480,y=Math.floor(i/3)*460;board(x+12,y+12,456,436);floor(x+265,y+391,340);
      rig.root.setPosition(x+265,y+390).setVisible(true);rig.visual.setPosition(0,0);rig.headNeckVisible=view.headNeck;rig.headPivotVisible=view.headPivot;rig.jointsVisible=view.showBones;rig.selectedBone=view.joint;rig.pose(view.version==='previous'?previous:model,1,1.4);
    });else {
      board(12,12,1416,896);floor(view.compare?1040:770,762,440);
      if(view.compare){floor(380,762,440);g.lineStyle(1,0xc4d1b9,.55).lineBetween(710,140,710,825);}
      if(view.mode==='cycle')this.drawCycle(view);
      else if(view.mode==='ground')this.drawGround(view);
      else if(view.mode==='fusion')this.drawFusion(view);
      else {
        const selected=this.actors.find(a=>a.model.id===view.selected)!;
        selected.rig.root.setPosition(view.compare?1040:770,760).setVisible(true);selected.rig.visual.setPosition(0,0);selected.rig.headNeckVisible=view.headNeck;selected.rig.headPivotVisible=view.headPivot;selected.rig.jointsVisible=view.showBones;selected.rig.selectedBone=view.joint;selected.rig.pose(selected.model,1,view.zoom);
        if(view.compare&&view.comparison!=='art'){this.previousRig.root.setPosition(380,760).setVisible(true);this.previousRig.visual.setPosition(0,0);this.previousRig.headNeckVisible=view.headNeck;this.previousRig.headPivotVisible=view.headPivot;this.previousRig.jointsVisible=view.showBones;this.previousRig.selectedBone=view.joint;this.previousRig.pose(view.comparison==='primary'?selected.model:selected.previous,1,view.zoom);}
      }
      if(view.compare&&view.comparison==='art')this.original.setPosition(380-124*view.zoom,760-210*view.zoom).setDisplaySize(200*view.zoom,220*view.zoom).setVisible(true);
    }
  }
  private drawCycle(view:LabView):void {
    this.timeline.seek(view.time,view.secondary,view.travel,view.headMotion,view.waistBend,view.ears,view.tail,view.tuning);
    for(const [rig,animation,x] of [[this.cycleRig,this.timeline.refined,view.compare?1040:770],[this.previousRig,view.comparison==='primary'?this.timeline.primary:this.timeline.previous,380]] as const){
      rig.root.setVisible(rig===this.cycleRig||view.compare&&view.comparison!=='art').setPosition(x,760);
      rig.visual.setPosition(0,(this.timeline.offsetY+animation.visualOffsetY)*view.zoom/.8);rig.headNeckVisible=view.headNeck;rig.headPivotVisible=view.headPivot;rig.jointsVisible=view.showBones;rig.selectedBone=view.joint;this.poseRegion(rig,animation,this.timeline.primary,view,x,1);
    }
  }
  private drawGround(view:LabView):void {
    const t=this.groundTimeline;t.seek(view.time,view.groundAction,view.groundSpeed,view.secondary,view.headMotion,view.ears,view.tail,view.tuning);
    for(const [rig,a,x] of [[this.cycleRig,t.refined,view.compare?1040:770],[this.previousRig,view.comparison==='primary'?t.primary:t.previous,380]] as const){
      rig.root.setVisible(rig===this.cycleRig||view.compare&&view.comparison!=='art').setPosition(x,760);
      rig.visual.setPosition(0,0);rig.jointsVisible=view.showBones;rig.headNeckVisible=view.headNeck;rig.headPivotVisible=view.headPivot;rig.selectedBone=view.joint;this.poseRegion(rig,a,t.primary,view,x,t.facingDirection);
    }
  }
  private drawFusion(view:LabView):void {
    const t=this.fusionTimeline;t.seek(view.time,view.secondary,{...view.tuning,headMotion:view.headMotion,ears:view.ears,tail:view.tail,waistBend:view.waistBend});
    for(const [rig,a,x]of [[this.cycleRig,t.refined,view.compare?1040:770],[this.previousRig,t.primary,380]] as const){
      rig.root.setVisible(rig===this.cycleRig||view.compare).setPosition(x,760);
      rig.visual.setPosition(0,(t.player.y-545+a.visualOffsetY)*view.zoom/.8);rig.jointsVisible=view.showBones;rig.headNeckVisible=view.headNeck;rig.headPivotVisible=view.headPivot;
      this.poseRegion(rig,a,t.primary,view,x,t.player.facing);
    }
  }
  private poseRegion(rig:FoxRig,a:FoxAnimationController,primary:FoxAnimationController,v:LabView,x:number,facing:number):void {
    rig.inspectionRegion=v.region;
    let scale=v.zoom;
    if(v.region!=='whole'){
      scale=v.region==='ears'?7:4.8;
      const p=v.region==='ears'?primary.bones.skin('head',{x:110,y:35}):primary.bones.skin('pelvis',{x:52,y:145});
      rig.root.setPosition(x-(p.x-124)*facing*scale,460-(p.y-210)*scale);rig.visual.setPosition(0,0);
    }
    rig.pose(a,facing,scale);
  }
  update(_t:number,delta:number):void {
    const v=this.view;if(!v||!['cycle','ground','fusion'].includes(v.mode)||v.paused)return;
    if(v.mode==='fusion'){v.time=Math.min(FUSION_DURATION,v.time+Math.min(.05,delta/1000)*v.rate);this.drawFusion(v);if(v.time>=FUSION_DURATION){v.paused=true;this.report=0;this.onFrame();return;}this.report+=delta;if(this.report>=80){this.report=0;this.onFrame();}return;}
    v.time=v.mode==='ground'?v.time+Math.min(.05,delta/1000)*v.rate:(v.time+Math.min(.05,delta/1000)*v.rate)%JUMP_DURATION;if(v.mode==='ground')this.drawGround(v);else this.drawCycle(v);
    this.report+=delta;if(this.report>=80){this.report=0;this.onFrame();}
  }
}
