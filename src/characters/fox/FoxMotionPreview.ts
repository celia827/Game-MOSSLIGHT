import Phaser from 'phaser';
import {MOTION_DEFAULTS,tuneMotion} from './FoxMotionConfig';
import type {MotionTuning} from './FoxMotionConfig';
import {FoxRig} from './FoxRig';
import {FoxAnimationController} from './FoxAnimationController';
import {FoxAnimationDebug} from './FoxAnimationDebug';
import type {PoseName} from './FoxPoseLibrary';
import type {MotionReviewSnapshot} from './MotionReviewTypes';

const KEY_POSES:PoseName[]=['AnticipationPose','JumpForwardPose','FallPreparePose','LandNormalPose'];
/** An isolated display stage: no PlayerController, collision body or gameplay input. */
export class FoxMotionPreview {
  readonly root:Phaser.GameObjects.Container;
  active=false;layout:'overview'|'single'|'compare'='overview';rate=1;paused=false;playing=false;travel=false;
  private actors:{animation:FoxAnimationController;rig:FoxRig;shadow:Phaser.GameObjects.Image}[]=[];
  private playback=new FoxAnimationDebug();
  private dirty=true;
  private cards:Phaser.GameObjects.Rectangle[]=[];
  private scale=1.05;
  readonly tuning:MotionTuning={...MOTION_DEFAULTS};
  tune(patch:Partial<MotionTuning>):void {tuneMotion(this.tuning,patch);this.actors.forEach((a,i)=>a.animation.tune({...this.tuning,...(this.layout==='compare'?{enabled:i!==0}:{})}));this.dirty=true;}
  constructor(scene:Phaser.Scene) {
    this.root=scene.add.container(0,0).setDepth(2000).setVisible(false).setName('MotionReview');
    this.root.add(scene.add.rectangle(640,360,1280,720,0x153c34,.98));
    for(let i=0;i<4;i++) {
      const card=scene.add.rectangle(160+i*320,410,300,340,0x244e40,.5).setStrokeStyle(1,0xadc19c,.2);this.cards.push(card);this.root.add(card);
      const rig=new FoxRig(scene),animation=new FoxAnimationController();
      const shadow=scene.add.image(0,0,'shadow').setDisplaySize(76,12).setAlpha(.4);
      this.root.add([shadow,rig.root]);this.actors.push({animation,rig,shadow});
    }
    this.overview();
  }
  open():void {this.active=true;this.root.setVisible(true);this.overview();}
  close():void {this.active=false;this.root.setVisible(false);}
  overview():void {
    this.cards.forEach(c=>c.setVisible(true));this.layout='overview';this.playing=false;this.paused=false;this.playback.reset();
    this.actors.forEach((a,i)=>{a.animation.resetMotion();a.animation.paused=true;a.animation.setPosePreview(KEY_POSES[i]);a.rig.root.setVisible(true).setPosition(180+i*320,520);a.rig.visual.setPosition(0,0);a.shadow.setVisible(true).setPosition(180+i*320,522).setAlpha(.4);});
    this.dirty=true;
  }
  playOnce(travel:boolean,compare=false):void {
    this.cards.forEach(c=>c.setVisible(false));this.layout=compare?'compare':'single';this.travel=travel;this.playing=true;this.paused=false;this.playback.reset();
    this.actors.forEach((a,i)=>{a.rig.root.setVisible(i<(compare?2:1));a.shadow.setVisible(i<(compare?2:1));a.animation.tune({...this.tuning,enabled:compare?i!==0:this.tuning.enabled});a.animation.resetMotion();});this.dirty=true;
  }
  update(realDt:number):void {
    if(!this.active)return;
    if(this.layout!=='overview'&&this.playing&&!this.paused) {
      const dt=Math.min(.05,realDt)*this.rate,ratio=this.scale/.8;
      const m=this.playback.sample(dt,'JUMP_ONCE',600*ratio,1500*ratio,.16)!;
      for(let i=0;i<(this.layout==='compare'?2:1);i++) {
        const a=this.actors[i];
        const x=this.layout==='compare'?(i?930:400):this.travel?560+Math.min(.8,this.playback.clock)*128*ratio:640;
        const y=580+this.playback.visualOffsetY;
        a.animation.update(dt,0,this.travel&&!m.grounded?128*ratio:0,x,y,1,()=>580,false,{...m,visualScale:this.scale});
        a.rig.root.setPosition(x,580);a.rig.visual.setPosition(0,this.playback.visualOffsetY+a.animation.visualOffsetY);
        a.shadow.setPosition(x,582).setAlpha(.4*Math.exp(this.playback.visualOffsetY/180));
      }
      if(this.playback.finished)this.playing=false;
      this.dirty=true;
    }
    if(this.dirty){for(const a of this.actors)a.rig.pose(a.animation,1,this.scale);this.dirty=false;}
  }
  setJoints(show:boolean):void {for(const a of this.actors){a.rig.jointsVisible=show;a.rig.selectedBone='lowerSpine';}this.dirty=true;}
  snapshot():MotionReviewSnapshot {
    const actors=this.layout==='overview'?this.actors:this.layout==='compare'?this.actors.slice(0,2):[this.actors[0]];
    return {active:this.active,layout:this.layout,rate:this.rate,paused:this.paused,playing:this.playing,time:this.playback.clock,travel:this.travel,
      tuning:{...this.tuning},actors:actors.map((a,i)=>({pose:this.layout==='overview'?KEY_POSES[i]:a.animation.currentPoseName,phase:a.animation.animationPhase,enabled:a.animation.motionTuning.enabled,offsets:a.animation.secondaryOffsets,bones:a.animation.bones.snapshot()}))};
  }
}
