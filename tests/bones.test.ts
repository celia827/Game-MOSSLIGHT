import test from 'node:test';
import assert from 'node:assert/strict';
import {FoxBones,FOX_BONES} from '../src/characters/fox/FoxBones.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {FOX_POSES,POSE_NAMES,landingPose} from '../src/characters/fox/FoxPoseLibrary.ts';
import {FoxAnimationDebug} from '../src/characters/fox/FoxAnimationDebug.ts';
import {PlayerController} from '../src/characters/fox/PlayerController.ts';
import {rotate} from '../src/characters/fox/poseMath.ts';
const near=(a:number,b:number,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} / ${b}`);
const floor={id:'floor',kind:'ground' as const,x:0,y:490,width:1280,height:230};
const platform={id:'rise',kind:'platform' as const,x:843,y:451,width:349.2,height:155.2};
const motion=(p:PlayerController)=>({grounded:p.grounded,velocityY:p.velocityY,landTimer:p.landTimer,landDuration:p.physics.landDuration,clearance:p.clearance,impact:p.impact,jumped:p.jumpedThisFrame,landed:p.landedThisFrame,jumpId:p.jumpCount,jumpSpeed:p.physics.jumpSpeed});

test('bind matrices restore original source coordinates for every bone and preserve branch hierarchy',()=>{
  const b=new FoxBones();b.setPose();
  for(const def of FOX_BONES) {
    assert.deepEqual(b.position(def.id),def.rest);
    for(const p of [{x:0,y:0},{x:110,y:160},{x:190,y:210}])assert.deepEqual(b.skin(def.id,p),p);
    if(def.parent)assert.ok(FOX_BONES.findIndex(d=>d.id===def.parent)<FOX_BONES.indexOf(def));
  }
});
test('shoulder rotates elbow/wrist/hand as descendants and an elbow bends independently',()=>{
  const b=new FoxBones(),angle=-.8;b.setPose({nearShoulder:{angle}});
  const expected=rotate(b.rest('nearElbow'),b.rest('nearShoulder'),angle);
  near(b.position('nearElbow').x,expected.x);near(b.position('nearElbow').y,expected.y);
  const shoulder=b.position('nearShoulder'),elbow=b.position('nearElbow'),wrist=b.position('nearWrist');
  b.setAngle('nearElbow',-1);
  assert.deepEqual(b.position('nearShoulder'),shoulder);assert.deepEqual(b.position('nearElbow'),elbow);
  assert.ok(Math.hypot(b.position('nearWrist').x-wrist.x,b.position('nearWrist').y-wrist.y)>8);
  assert.deepEqual(b.position('farShoulder'),b.rest('farShoulder'));
  b.setAngle('nearElbow',100);assert.equal(b.angle('nearElbow'),FOX_BONES.find(d=>d.id==='nearElbow')!.max);
});
test('painted arm pivots coincide across adjacent skinned segments in every key pose',()=>{
  const a=new FoxAnimationController();a.paused=true;
  for(const name of POSE_NAMES) {
    a.setPosePreview(name);
    for(const [part,bone] of [['near-arm','nearShoulder'],['near-arm','nearElbow'],['near-arm','nearWrist'],['far-arm','farElbow']] as const) {
      const p=a.map(part,a.bones.rest(bone)),q=a.bones.position(bone);near(p.x,q.x);near(p.y,q.y);
    }
    const root=a.map('tail',{x:108,y:170}),hipSkin=a.map('coat-side',{x:108,y:170});
    near(root.x,hipSkin.x);near(root.y,hipSkin.y);
    const ear=a.map('near-ear',a.bones.rest('nearEar')),head=a.map('head',a.bones.rest('nearEar'));
    near(ear.x,head.x);near(ear.y,head.y);
  }
});
test('a real jump visits all seven stages and shoulders/elbows/knees change substantially',()=>{
  const p=new PlayerController(414,()=>floor,()=>[platform]),a=new FoxAnimationController();
  const phases=new Set<string>();let shoulderMin=Infinity,shoulderMax=-Infinity,elbowMin=Infinity,elbowMax=-Infinity,kneeMax=0;
  for(let i=0;i<190;i++) {
    const distance=p.step(1/120,0,{pressed:i===0,held:i<60});
    a.update(1/120,distance,p.velocity,p.x,p.y,p.facing,x=>p.supportY(x),false,motion(p));
    phases.add(a.animationPhase);
    shoulderMin=Math.min(shoulderMin,a.bones.angle('nearShoulder'));shoulderMax=Math.max(shoulderMax,a.bones.angle('nearShoulder'));
    elbowMin=Math.min(elbowMin,a.bones.angle('nearElbow'));elbowMax=Math.max(elbowMax,a.bones.angle('nearElbow'));
    kneeMax=Math.max(kneeMax,a.bones.angle('nearKnee'));
    if(p.grounded){near(a.feet[0].point.y,210);near(a.feet[0].point.x,a.feet[0].goal.x);}
    for(const b of a.bones.snapshot()){assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));const def=FOX_BONES.find(d=>d.id===b.id)!;assert.ok(b.angle>=def.min-1e-8&&b.angle<=def.max+1e-8);}
  }
  for(const phase of ['ANTICIPATION','TAKEOFF','ASCEND','APEX','DESCEND','LAND_IMPACT','LAND_RECOVER','IDLE'])assert.ok(phases.has(phase),phase);
  assert.ok(shoulderMax-shoulderMin>1.1);assert.ok(elbowMax-elbowMin>.65);assert.ok(kneeMax>1.5);
});
test('ground contact stays fixed through a crouch and landing strength follows impact speed',()=>{
  const a=new FoxAnimationController();a.paused=true;
  for(const name of ['AnticipationPose','LandNormalPose','LandRecoverPose'] as const){a.setPosePreview(name);near(a.feet[0].point.y,210);near(a.feet[0].point.x,124);assert.ok(a.bones.angle('nearKnee')>.4);}
  const ys=[.28,.65,.83,1].map(strength=>landingPose(.04,strength,FOX_POSES.IdlePose).bones.pelvis!.y!);
  for(let i=1;i<ys.length;i++)assert.ok(ys[i]>ys[i-1]);
});
test('pause and manual edits do not accumulate rotation, and reset returns to bind',()=>{
  const a=new FoxAnimationController();a.setPosePreview('AscendPose');a.paused=true;a.overrides.set('nearElbow',-.9);
  const time=a.time;
  for(let i=0;i<360;i++)a.update(1/60,0,0,414,545,1,()=>545);
  near(a.time,time);near(a.bones.angle('nearElbow'),-.9);
  a.resetMotion();a.bindPose=true;a.update(1/60,0,0,414,545,1,()=>545);
  for(const def of FOX_BONES)assert.deepEqual(a.bones.position(def.id),def.rest);
});
test('virtual jump inspection cycles all phases without advancing or altering the physical actor',()=>{
  const p=new PlayerController(414,()=>floor,()=>[platform]),debug=new FoxAnimationDebug(),a=new FoxAnimationController();
  const before={x:p.x,y:p.y,v:p.velocity,vy:p.velocityY,g:p.grounded,j:p.jumpCount};const phases=new Set<string>();
  for(let i=0;i<180;i++) {
    const m=debug.sample(1/120,'JUMP_CYCLE',600,1500,.16);
    a.update(1/120,0,0,p.x,p.y,1,()=>p.y,false,m);phases.add(a.animationPhase);
    assert.ok(debug.visualOffsetY<=0);
  }
  assert.deepEqual({x:p.x,y:p.y,v:p.velocity,vy:p.velocityY,g:p.grounded,j:p.jumpCount},before);
  for(const phase of ['ANTICIPATION','TAKEOFF','ASCEND','APEX','DESCEND','LAND_IMPACT','LAND_RECOVER'])assert.ok(phases.has(phase));
});
test('anticipation never visually pushes the front sole through the ground at high refresh rates',()=>{
  for(const hz of [30,60,120,240]) {
    const p=new PlayerController(414,()=>floor,()=>[platform]),a=new FoxAnimationController(),groundY=p.y;
    for(let i=0;i<hz*.14;i++) {
      const distance=p.step(1/hz,0,{pressed:i===0,held:true});a.update(1/hz,distance,0,p.x,p.y,1,()=>p.y,false,motion(p));
      const y=p.y+(a.feet[0].point.y-210)*.8;assert.ok(y<=groundY+.5,`sole ${y-groundY} at ${hz} Hz`);
    }
  }
});

test('leaving a mid-air preview cannot manufacture a real landing or restart the gameplay gait',()=>{
  const a=new FoxAnimationController();
  const physical={grounded:true,velocityY:0,landTimer:0,landDuration:.16,clearance:0,impact:0,jumpId:0};
  a.update(1/60,0,0,414,545,1,()=>545,false,physical);
  const phase=a.phase;a.beginInspection();
  const debug=new FoxAnimationDebug();
  for(let i=0;i<30;i++)a.update(1/120,0,0,414,545,1,()=>545,false,debug.sample(1/120,'JUMP_CYCLE',600,1500,.16));
  assert.equal(a.state,'JUMP');a.endInspection();a.setPosePreview(null);
  a.update(1/60,0,0,414,545,1,()=>545,false,physical);
  assert.equal(a.state,'IDLE');assert.equal(a.animationPhase,'IDLE');near(a.phase,phase);
});

test('each editable joint affects its intended painted skin, including wrists, feet and all tail segments',()=>{
  const a=new FoxAnimationController();a.paused=true;
  const samples=[
    ['pelvis','coat-side',{x:108,y:166}],['chest','coat-side',{x:120,y:130}],['neck','head',{x:165,y:90}],['head','head',{x:165,y:90}],
    ['nearShoulder','near-arm',{x:118,y:136}],['nearElbow','near-arm',{x:117,y:153}],['nearWrist','near-arm',{x:117,y:164}],['nearHand','near-arm',{x:116,y:168}],
    ['farShoulder','far-arm',{x:136,y:136}],['farElbow','far-arm',{x:137,y:152}],['farWrist','far-arm',{x:137,y:162}],['farHand','far-arm',{x:138,y:165}],
    ['nearHip','near-leg',{x:115,y:180}],['nearKnee','near-leg',{x:119,y:193}],['nearAnkle','near-leg',{x:120,y:204}],['nearFoot','near-leg',{x:136,y:207}],
    ['farHip','far-leg',{x:126,y:178}],['farKnee','far-leg',{x:129,y:189}],['farAnkle','far-leg',{x:129,y:200}],['farFoot','far-leg',{x:142,y:203}],
    ['tailRoot','tail',{x:100,y:170}],['tailMiddle','tail',{x:55,y:172}],['tailTip','tail',{x:18,y:125}],['tailEnd','tail',{x:6,y:94}],
    ['nearEar','near-ear',{x:90,y:15}],['farEar','far-ear',{x:121,y:20}],['backpack','pack',{x:80,y:146}],
  ] as const;
  for(const [joint,part,p] of samples) {
    a.overrides.clear();a.setPosePreview('IdlePose');const before=a.map(part,p);
    a.overrides.set(joint,.15);a.update(0,0,0,414,545,1,()=>545);const after=a.map(part,p);
    assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>.015,joint);
  }
});

test('buffered consecutive jumps stay responsive and never leave a sole beneath the surface',()=>{
  const p=new PlayerController(414,()=>floor,()=>[platform]),a=new FoxAnimationController();let buffered=false,secondAnticipation=false;
  for(let i=0;i<240;i++) {
    const press=i===0||(!buffered&&p.velocityY>0&&p.clearance<18);
    if(i>0&&press)buffered=true;
    const distance=p.step(1/60,0,{pressed:press,held:true});
    a.update(1/60,distance,0,p.x,p.y,1,x=>p.supportY(x),false,motion(p));
    if(p.jumpCount===2&&a.animationPhase==='ANTICIPATION')secondAnticipation=true;
    const footY=p.y+(a.feet[0].point.y-210)*.8;
    assert.ok(footY<=p.world.below(p.x,p.y)!.y+.5,`sole clips at ${i}: ${footY}`);
  }
  assert.equal(p.jumpCount,2);assert.ok(secondAnticipation);assert.equal(p.landCount,2);
});
