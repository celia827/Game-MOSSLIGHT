import test from 'node:test';
import assert from 'node:assert/strict';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {FOX_BONES,FoxBones} from '../src/characters/fox/FoxBones.ts';
import {FOX_POSES,POSE_NAMES,landingPose,impactPose,ANIMATION_CONFIG as A} from '../src/characters/fox/FoxPoseLibrary.ts';
import {FoxHeadMotion} from '../src/characters/fox/FoxHeadMotion.ts';
import {FoxAnimationDebug} from '../src/characters/fox/FoxAnimationDebug.ts';
import {predictLanding} from '../src/characters/fox/FoxLandingPrediction.ts';
import {PlayerController} from '../src/characters/fox/PlayerController.ts';
const floor={id:'floor',kind:'ground' as const,x:0,y:490,width:1280,height:230};
const motion=(p:PlayerController)=>({grounded:p.grounded,velocityY:p.velocityY,landTimer:p.landTimer,landDuration:p.physics.landDuration,clearance:p.clearance,impact:p.impact,jumped:p.jumpedThisFrame,landed:p.landedThisFrame,jumpId:p.jumpCount});
const near=(a:number,b:number,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);

test('all authored poses cover the whole chain; the waist and chest bend independently',()=>{
  for(const name of POSE_NAMES)for(const def of FOX_BONES)assert.ok(FOX_POSES[name].bones[def.id],`${name}: ${def.id}`);
  const b=new FoxBones();b.setPose(FOX_POSES.AnticipationPose.bones);
  assert.equal(FOX_BONES.find(d=>d.id==='chest')!.parent,'lowerSpine');
  const hip=b.position('pelvis'),waist=b.position('lowerSpine'),chest=b.position('chest');
  const cross=(waist.x-hip.x)*(chest.y-waist.y)-(waist.y-hip.y)*(chest.x-waist.x);
  assert.ok(Math.abs(cross)>100,'the centerline must bend, not rotate rigidly');
  assert.ok(b.worldAngle('chest')-b.worldAngle('pelvis')>.6);
  const a=new FoxAnimationController();a.setPosePreview('AnticipationPose');
  const lower=a.map('coat-side',{x:132,y:169}),upper=a.map('coat-side',{x:132,y:128});
  assert.ok(Math.hypot(lower.x-upper.x,lower.y-upper.y)<41,'continuous coat compresses on the folding side');
});

test('real anticipation plants soles and visibly lowers the pelvis while collision responds immediately',()=>{
  for(const hz of [30,60,120,240]) {
    const p=new PlayerController(414,()=>floor,()=>[]),a=new FoxAnimationController(),ground=p.y;
    a.update(1/hz,0,0,p.x,p.y,1,()=>ground,false,motion(p));
    let depth=0;
    for(let i=0;i<Math.ceil(.06*hz);i++) {
      p.step(1/hz,0,{pressed:i===0,held:true});a.update(1/hz,0,0,p.x,p.y,1,()=>ground,false,motion(p));
      if(a.animationPhase!=='ANTICIPATION')continue;
      assert.ok(p.y<ground,'physical input must have no anticipation delay');
      const sole=p.y+a.visualOffsetY+(a.feet[0].point.y-210)*.8;near(sole,ground,.1);
      depth=Math.max(depth,p.y+a.visualOffsetY+(a.bones.position('pelvis').y-210)*.8-(ground-40*.8));
    }
    assert.ok(depth>7,`${hz} Hz: visible crouch ${depth}`);
  }
});

test('running anticipation is shorter and smaller, and ascent selects a forward silhouette by speed',()=>{
  const sample=(speed:number)=>{
    const a=new FoxAnimationController();
    for(let i=0;i<30;i++)a.update(1/120,speed/120,speed,414+i*speed/120,545,1,()=>545,false,{grounded:true,velocityY:0,landTimer:0,landDuration:.16,clearance:0,impact:0,jumpId:0});
    a.update(.04,0,speed,450,522,1,()=>545,false,{grounded:false,velocityY:-540,landTimer:0,landDuration:.16,clearance:23,impact:0,jumped:true,jumpId:1});
    const crouch=a.bones.position('pelvis').y,anticipation=a.anticipationDuration;
    a.update(.18,0,speed,450,450,1,()=>545,false,{grounded:false,velocityY:-300,landTimer:0,landDuration:.16,clearance:95,impact:0,jumpId:1});
    return {a,crouch,anticipation};
  };
  const stand=sample(0),run=sample(128);
  assert.ok(run.crouch<stand.crouch-3);assert.ok(run.anticipation<stand.anticipation);
  assert.equal(stand.a.currentPoseName,'AscendPose');assert.equal(run.a.currentPoseName,'JumpForwardPose');
  assert.ok(run.a.bones.worldAngle('chest')>stand.a.bones.worldAngle('chest')+.15);
});

test('contact prediction changes fall preparation but can never manufacture LAND',()=>{
  const p=predictLanding(400,500,128,400,1500,()=>({y:545}));assert.ok(p.landingReliable);assert.ok(p.timeToLand!<.12);
  assert.equal(predictLanding(400,500,128,400,1500,()=>undefined).landingReliable,false);
  assert.equal(predictLanding(400,500,128,-100,1500,()=>({y:545})).landingReliable,false);
  const a=new FoxAnimationController();
  for(let i=0;i<30;i++)a.update(1/120,0,0,414,530,1,()=>545,false,{grounded:false,velocityY:450,landTimer:0,landDuration:.16,clearance:15,impact:600,landingReliable:true,timeToLand:.025});
  assert.equal(a.state,'FALL');assert.ok(a.landingPreparation>.9);assert.equal(a.currentPoseName,'FallPreparePose');
});

test('landing depths scale with force, pelvis leads the waist and head, and recovery finishes',()=>{
  const depths=[.25,.65,1].map(s=>impactPose(s).bones.pelvis!.y!);assert.ok(depths[0]<depths[1]&&depths[1]<depths[2]);
  const p=landingPose(.018,1,FOX_POSES.IdlePose);
  assert.ok(p.bones.pelvis!.y!>4);assert.ok(p.bones.lowerSpine!.angle!>0);near(p.bones.head!.angle!,0);
  const impact=new FoxBones();impact.setPose(landingPose(.075,1,FOX_POSES.IdlePose).bones);assert.ok(impact.worldAngle('head')>.3);
  near(landingPose(A.landImpact+A.landRecover,1,FOX_POSES.IdlePose).bones.lowerSpine!.angle!,0);
});

test('head carries angular inertia, nods after the torso, and preserves the rigid face',()=>{
  const h=new FoxHeadMotion(),b=new FoxBones();
  const context={phase:'LAND_IMPACT' as const,time:0,gait:0,speed:0,velocityY:0,preparation:0,landAge:.08,strength:1,scaleRatio:1};
  h.update(FOX_POSES.IdlePose.bones,1/120,{...context,phase:'IDLE'});
  const target=FOX_POSES.LandHeavyPose.bones;
  let first=0,last=0;
  for(let i=0;i<24;i++) {
    b.setPose(h.update(target,1/120,context));b.constrainWorldAngle('head',A.headUpLimit,A.headDownLimit);
    const angle=b.worldAngle('head');if(i===0)first=angle;last=angle;
    assert.ok(angle>=A.headUpLimit-1e-6&&angle<=A.headDownLimit+1e-6);
    const p=b.skin('head',{x:145,y:85}),q=b.skin('head',{x:174,y:99});near(Math.hypot(p.x-q.x,p.y-q.y),Math.hypot(29,14));
  }
  assert.ok(first<.05&&last>.3,'head must lag instead of rigidly adopting the chest pitch');
  const recovery=h.update(FOX_POSES.IdlePose.bones,1/120,{...context,phase:'LAND_RECOVER'});b.setPose(recovery);
  assert.ok(b.worldAngle('head')>.25,'head lifts after the torso');
});

test('single playback includes each stage once, stops, and is rate invariant',()=>{
  for(const rate of [.25,.5,1]) {
    const d=new FoxAnimationDebug(),a=new FoxAnimationController(),phases=new Set<string>();let jumps=0,lands=0;
    for(let i=0;i<Math.ceil(2*120/rate);i++) {
      const m=d.sample(rate/120,'JUMP_ONCE',600,1500,.16)!;
      if(m.jumped)jumps++;if(m.landed)lands++;
      a.update(rate/120,0,0,414,545+d.visualOffsetY,1,()=>545,false,m);phases.add(a.animationPhase);
    }
    assert.equal(jumps,1);assert.equal(lands,1);assert.ok(d.finished);near(d.clock,1.66);
    for(const stage of ['ANTICIPATION','TAKEOFF','ASCEND','APEX','DESCEND','LAND_IMPACT','LAND_RECOVER','IDLE'])assert.ok(phases.has(stage),stage);
    near(d.visualOffsetY,0);
  }
});

test('scaled preview keeps both grounded soles aligned and tail attached during every impact pose',()=>{
  const a=new FoxAnimationController();
  for(const scale of [.8,1.05,1.15])for(const name of ['LandLightPose','LandNormalPose','LandHeavyPose'] as const) {
    a.setPosePreview(name);a.update(.1,0,0,640,580,1,()=>580,false,{grounded:true,velocityY:0,landTimer:0,landDuration:.16,clearance:0,impact:0,visualScale:scale});
    near(a.feet[0].point.y,210);near(a.feet[0].point.x,124);
    const tail=a.map('tail',{x:108,y:170}),coat=a.map('coat-side',{x:108,y:170});near(tail.x,coat.x);near(tail.y,coat.y);
  }
});

test('coyote anticipation uses the departed ledge, not the distant floor below it',()=>{
  const a=new FoxAnimationController();
  a.update(1/120,0,0,850,475,1,()=>475,false,{grounded:true,velocityY:0,landTimer:0,landDuration:.16,clearance:0,impact:0,jumpId:0});
  a.update(1/120,-1,-128,849,475.2,-1,()=>550,false,{grounded:false,velocityY:12,landTimer:0,landDuration:.16,clearance:74.8,impact:0,jumpId:0});
  a.update(1/120,-1,-128,848,470.2,-1,()=>550,false,{grounded:false,velocityY:-588,landTimer:0,landDuration:.16,clearance:79.8,impact:0,jumped:true,jumpId:1});
  assert.ok(a.visualOffsetY<6,'must not move the drawing down to the lower floor');
  near(470.2+a.visualOffsetY,475.2,.01);
});
