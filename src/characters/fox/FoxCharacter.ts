import {AnimationPerformance} from './AnimationPerformance';
import {buildCollision} from '../../world/terrain/geometry';
import type {Vec} from './CharacterConfig';
import Phaser from 'phaser';
import {CHARACTER_CONFIG as C} from './CharacterConfig';
import type {AnimationMode} from './CharacterConfig';
import type {AnimationControls,AnimationSnapshot} from './types';
import {FoxRig} from './FoxRig';
import {FoxAnimationController} from './FoxAnimationController';
import {PlayerController} from './PlayerController';
import {LayerStack} from '../../world/render/LayerStack';
import type {TerrainDefinition} from '../../world/terrain/types';
import {FoxAnimationDebug} from './FoxAnimationDebug';
import {predictLanding} from './FoxLandingPrediction';
import {FoxMotionPreview} from './FoxMotionPreview';

export class FoxCharacter {
  private lastFrameAt=0;
  readonly performance=new AnimationPerformance();
  readonly player:PlayerController;
  readonly rig:FoxRig;
  readonly animation=new FoxAnimationController();
  mode:AnimationMode='AUTO';rate=1;
  private original:Phaser.GameObjects.Container;
  private shadow:Phaser.GameObjects.Image;
  private core:Phaser.GameObjects.Image;
  private reference=false;
  private maxSlip=0;
  private footError=0;
  private lastFeet:{x:number;y:number;stance:boolean}[]=[];
  private lastFacing=1;
  private terrainKey='';private tailPolygons:Vec[][]=[];
  private playback=new FoxAnimationDebug();
  private review:FoxMotionPreview;
  private characterLayer:Phaser.GameObjects.Layer;
  private frontLayer:Phaser.GameObjects.Layer;
  constructor(scene:Phaser.Scene,stack:LayerStack,private ground:()=>TerrainDefinition,private obstacles:()=>readonly TerrainDefinition[],private startX:number,private scale=C.scale as number) {
    this.player=new PlayerController(startX,ground,obstacles);this.player.attachInput();
    const layer=stack.get('characters');this.characterLayer=layer;
    // Scene foreground order and anatomical order are different concerns: keep
    // the complete rig together above terrain, with tail behind its own coat.
    this.frontLayer=scene.add.layer().setName('fox-character-foreground').setDepth(70);
    this.shadow=scene.add.image(0,0,'shadow').setDisplaySize(66,11).setAlpha(.38);
    this.core=scene.add.image(0,0,'shadow').setDisplaySize(30,4).setAlpha(.5);
    this.rig=new FoxRig(scene);this.frontLayer.add(this.rig.root);
    this.original=scene.add.container(0,0).setVisible(false);
    this.original.add(scene.add.image(-124,-210,'fox').setOrigin(0,0).setDisplaySize(200,220));
    layer.add([this.shadow,this.core,this.original]);
    this.review=new FoxMotionPreview(scene);
    this.update(0);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.player.destroy());
  }
  update(realDt:number):void {
    const started=performance.now(),wallDelta=this.lastFrameAt?started-this.lastFrameAt:0;this.lastFrameAt=started;
    this.frontLayer.setVisible(this.characterLayer.visible&&!this.review.active&&!this.reference);
    if(this.review.active) {
      this.rig.root.setVisible(false);this.original.setVisible(false);this.shadow.setVisible(false);this.core.setVisible(false);
      this.review.update(realDt);return;
    }
    this.shadow.setVisible(true);this.core.setVisible(true);
    const dt=Math.min(.05,realDt)*this.rate;
    const preview=this.mode==='RUN'||this.mode==='WALK';
    const previewSpeed=this.mode==='WALK'?C.walkSpeed:C.maxSpeed;
    const input=this.mode==='AUTO'&&!this.reference&&!this.animation.bindPose?this.player.axis:0;
    const enabled=this.mode==='AUTO'&&!this.reference&&!this.animation.bindPose&&!this.animation.paused;
    const distance=enabled?this.player.step(dt,input):0;
    const speed=preview?previewSpeed:this.mode==='IDLE'?0:this.player.velocity;
    const previewMotion=this.playback.sample(this.animation.paused?0:dt,this.mode,this.player.physics.jumpSpeed,this.player.physics.gravity,this.player.physics.landDuration);
    this.animation.update(dt,preview?previewSpeed*dt:distance,speed,this.player.x,this.player.y+this.playback.visualOffsetY,this.player.facing,
      x=>this.player.supportY(x),preview,this.mode==='AUTO'?{
        ...predictLanding(this.player.x,this.player.y,this.player.velocity,this.player.velocityY,this.player.physics.gravity,(x,y)=>this.player.world.below(x,y)),
        intent:{axis:input,walking:this.player.walking},grounded:this.player.grounded,velocityY:this.player.velocityY,landTimer:this.player.landTimer,
        landDuration:this.player.physics.landDuration,clearance:this.player.clearance,impact:this.player.impact,
        jumped:this.player.jumpedThisFrame,landed:this.player.landedThisFrame,jumpId:this.player.jumpCount,jumpSpeed:this.player.physics.jumpSpeed,
      }:previewMotion??(preview?{grounded:true,velocityY:0,landTimer:0,landDuration:.16,clearance:0,impact:0,intent:{axis:1,walking:this.mode==='WALK'}}:undefined));
    const terrain=[this.ground(),...this.obstacles()],terrainKey=JSON.stringify(terrain);
    if(terrainKey!==this.terrainKey){this.terrainKey=terrainKey;this.tailPolygons=terrain.map(d=>buildCollision(d).polygon);}
    if(this.mode==='AUTO')this.animation.avoidTailTerrain({polygons:this.tailPolygons,x:this.player.x,y:this.player.y+this.animation.visualOffsetY,scale:this.scale,facing:this.player.facing},dt);
    this.rig.root.setPosition(this.player.x,this.player.y).setVisible(!this.reference);
    this.rig.visual.setPosition(0,this.playback.visualOffsetY+this.animation.visualOffsetY);
    this.rig.pose(this.animation,this.player.facing,this.scale);
    this.original.setPosition(this.player.x,this.player.y).setScale(this.player.facing*this.scale,this.scale).setVisible(this.reference);
    const surface=this.player.world.below(this.player.x,this.player.y)?.y??this.player.y;
    const altitude=Math.max(0,surface-this.player.y-this.playback.visualOffsetY-this.animation.visualOffsetY),contact=Math.exp(-altitude/24);
    this.shadow.setPosition(this.player.x,surface+1.8).setAlpha(.38*Math.exp(-altitude/150)).setDisplaySize(66+altitude*.10,11);
    this.core.setPosition(this.player.x,surface+.8).setAlpha(.5*contact);
    const feet=this.animation.feet.map(f=>({
      x:this.player.x+(f.point.x-124)*this.player.facing*this.scale,
      y:this.player.y+this.playback.visualOffsetY+this.animation.visualOffsetY+(f.point.y-210)*this.scale,stance:f.stance,
    }));
    this.footError=0;
    this.animation.feet.forEach(f=>{this.footError=Math.max(this.footError,Math.hypot(f.point.x-f.goal.x,f.point.y-f.goal.y)*this.scale);});
    if(this.mode==='AUTO'&&this.player.grounded&&this.animation.weight>.98&&Math.abs(this.player.velocity)>20&&this.lastFacing===this.player.facing) {
      feet.forEach((f,i)=>{
        const last=this.lastFeet[i];
        if(f.stance&&last?.stance)this.maxSlip=Math.max(this.maxSlip,Math.hypot(f.x-last.x,f.y-last.y));
      });
    }
    this.lastFacing=this.player.facing;this.lastFeet=feet;
    this.performance.record(wallDelta,performance.now()-started);
  }
  get controls():AnimationControls {
    return {
      tune:patch=>{this.animation.tune(patch);this.review.tune(patch);},
      review:{
        open:()=>{this.player.release();this.review.open();},close:()=>{this.player.release();this.review.close();},
        overview:()=>this.review.overview(),playOnce:travel=>this.review.playOnce(travel),
        setRate:rate=>this.review.rate=rate,setPaused:paused=>this.review.paused=paused,
        compare:travel=>this.review.playOnce(travel,true),tune:patch=>this.review.tune(patch),setJoints:show=>this.review.setJoints(show),snapshot:()=>this.review.snapshot(),
      },
      setMode:mode=>{
        if(mode!=='AUTO'&&this.mode==='AUTO')this.animation.beginInspection();
        if(mode==='AUTO')this.animation.endInspection();
        this.mode=mode;this.player.release();this.playback.reset();this.animation.setPosePreview(null);
      },
      setRate:rate=>this.rate=Math.max(.2,Math.min(1.5,rate)),
      setJoints:show=>this.rig.jointsVisible=show,
      setReference:show=>this.reference=show,
      setBindPose:show=>this.animation.bindPose=show,
      setPaused:paused=>this.animation.paused=paused,
      setPose:name=>{if(this.mode==='AUTO')this.animation.beginInspection();this.mode='POSE';this.player.release();this.playback.reset();this.animation.setPosePreview(name);},
      setJoint:(id,degrees)=>this.animation.overrides.set(id,degrees*Math.PI/180),
      selectJoint:id=>this.rig.selectedBone=id,
      clearJoints:()=>this.animation.overrides.clear(),
      setBlend:seconds=>this.animation.blendDuration=Math.max(.02,Math.min(.25,seconds)),
      setPhysics:patch=>{
        if(patch.gravity!==undefined)this.player.physics.gravity=Math.max(800,Math.min(2400,patch.gravity));
        if(patch.jumpSpeed!==undefined)this.player.physics.jumpSpeed=Math.max(450,Math.min(760,patch.jumpSpeed));
      },
      reset:()=>{this.mode='AUTO';this.playback.reset();this.animation.paused=false;this.animation.setPosePreview(null);this.player.reset(this.startX);this.player.facing=1;this.animation.resetMotion();this.maxSlip=0;this.lastFeet=[];},
      snapshot:()=>this.snapshot(),
    };
  }
  snapshot():AnimationSnapshot {
    return {performance:this.performance.snapshot(),state:this.animation.state,mode:this.mode,velocity:this.player.velocity*this.rate,facing:this.player.facing,
      x:this.player.x,y:this.player.y,walking:this.player.walking,gaitRunMix:this.animation.locomotion.runMix,locomotionAge:this.animation.locomotion.age,phase:this.animation.phase,blend:this.animation.weight,
      blinkCount:this.animation.blinkCount,time:this.animation.time,supportSlip:this.maxSlip,footError:this.footError,feet:this.animation.feet,blocked:this.player.blocked,
      grounded:this.player.grounded,velocityY:this.player.velocityY*this.rate,coyoteMs:this.player.coyoteTimer*1000,bufferMs:this.player.bufferTimer*1000,
      supportId:this.player.supportId,jumpCount:this.player.jumpCount,landCount:this.player.landCount,coyoteJumps:this.player.coyoteJumps,bufferJumps:this.player.bufferJumps,
      lastJumpKind:this.player.lastJumpKind,gravity:this.player.physics.gravity,jumpSpeed:this.player.physics.jumpSpeed,
      animationPhase:this.animation.animationPhase,paused:this.animation.paused,previewOffsetY:this.playback.visualOffsetY,
      impactSpeed:this.animation.impactSpeed,landingStrength:this.animation.landingStrength,visualOffsetY:this.animation.visualOffsetY,pose:this.animation.currentPoseName,landingPreparation:this.animation.landingPreparation,
      tailPenetration:this.animation.tailPenetration,tailPrimaryPenetration:this.animation.tailPrimaryPenetration,tailContactWeight:this.animation.tailContactWeight,motionTuning:{...this.animation.motionTuning},motionSignals:{...this.animation.motionSignals},secondaryOffsets:this.animation.secondaryOffsets,
      bones:this.animation.bones.snapshot(),blendDuration:this.animation.blendDuration};
  }
}
