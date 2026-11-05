import test from 'node:test';
import assert from 'node:assert/strict';
import {DampedSpring} from '../src/characters/fox/DampedSpring.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {FoxBones,FOX_BONES} from '../src/characters/fox/FoxBones.ts';
import {FOX_POSES} from '../src/characters/fox/FoxPoseLibrary.ts';
import {FoxMotionDriver} from '../src/characters/fox/FoxMotionDriver.ts';
import {FoxSecondaryMotion} from '../src/characters/fox/FoxSecondaryMotion.ts';
import {MOTION_DEFAULTS,tuneMotion} from '../src/characters/fox/FoxMotionConfig.ts';
import {PlayerController} from '../src/characters/fox/PlayerController.ts';
import {FoxTailContact} from '../src/characters/fox/FoxTailContact.ts';
import {buildCollision} from '../src/world/terrain/geometry.ts';
const near=(a:number,b:number,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} / ${b}`);
const floor={id:'floor',kind:'ground' as const,x:0,y:490,width:1280,height:230};
const motion=(p:PlayerController)=>({grounded:p.grounded,velocityY:p.velocityY,landTimer:p.landTimer,landDuration:p.physics.landDuration,clearance:p.clearance,impact:p.impact,jumped:p.jumpedThisFrame,landed:p.landedThisFrame,jumpId:p.jumpCount});

test('closed-form springs agree at 30/60/120/240 Hz and rebound then settle for all damping regimes',()=>{
  for(const z of [.35,.58,.66,1,1.2]) {
    const samples=[];
    for(const hz of [30,60,120,240]) {
      const s=new DampedSpring();for(let i=0;i<hz/2;i++)s.step(.1,1/hz,300,z,.5);samples.push(s.value);
      for(let i=0;i<hz*4;i++)s.step(0,1/hz,300,z,.5);assert.ok(Math.abs(s.value)<1e-5&&Math.abs(s.velocity)<1e-4);
    }
    for(const x of samples)near(x,samples[0],1e-8);
  }
  const s=new DampedSpring();let overshoot=false;
  for(let i=0;i<120;i++){s.step(.1,1/120,300,.58,.5);if(s.value>.1005)overshoot=true;}assert.ok(overshoot);
});

test('three joints per ear bend the interior continuously while the ear roots stay attached',()=>{
  const a=new FoxAnimationController();a.setPosePreview('IdlePose');a.paused=true;
  for(const [part,root,middle,tip,p] of [['near-ear','nearEar','nearEarMiddle','nearEarTip',{x:94,y:18}],['far-ear','farEar','farEarMiddle','farEarTip',{x:122,y:23}]] as const) {
    const original=a.map(part,p),attachment=a.map(part,a.bones.rest(root));
    a.overrides.set(middle,.12);a.overrides.set(tip,-.1);a.update(0,0,0,414,545,1,()=>545);
    const current=a.map(part,p);assert.ok(Math.hypot(current.x-original.x,current.y-original.y)>.5);
    near(a.map(part,a.bones.rest(root)).x,attachment.x);near(a.map(part,a.bones.rest(root)).y,attachment.y);a.overrides.clear();
  }
  assert.equal(FOX_BONES.filter(b=>b.id.startsWith('tail')).length,5);
});

test('acceleration direction and head velocity drive different ear reactions; mirroring is not a force',()=>{
  const driver=new FoxMotionDriver();const p=FOX_POSES.IdlePose.bones;
  driver.sample(p,1/120,128,0,1,1);
  const turn=driver.sample(p,1/120,128,0,-1,1);near(turn.accelerationX,0);near(turn.accelerationY,0);
  const base={speed:0,velocityY:0,accelerationX:0,accelerationY:0,headVelocity:0,pelvisVelocity:0,bodyAcceleration:0};
  const response=(ay:number,head=0)=>{const s=new FoxSecondaryMotion();let result=p;for(let i=0;i<12;i++)result=s.update(p,1/120,i/120,false,{...base,accelerationY:ay,headVelocity:head},{...MOTION_DEFAULTS},1);return result.nearEar!.angle!;};
  assert.ok(response(1800)>0);assert.ok(response(-1800)<0);assert.ok(response(0,4)<0);
});

test('root-to-tip response is delayed, left/right ears differ, and residual motion decays after impact',()=>{
  const s=new FoxSecondaryMotion(),p=FOX_POSES.IdlePose.bones,base={speed:0,velocityY:0,accelerationX:0,accelerationY:0,headVelocity:0,pelvisVelocity:0,bodyAcceleration:0};
  let earlyRoot=0,earlyTip=0,difference=false;
  for(let i=0;i<300;i++) {
    const force=i<8?-4000:0;
    const result=s.update(p,1/120,i/120,false,{...base,accelerationY:force},{...MOTION_DEFAULTS},1);
    if(i===5){earlyRoot=Math.abs(result.tailRoot!.angle!);earlyTip=Math.abs(result.tailEnd!.angle!);}
    if(Math.abs(result.nearEar!.angle!-result.farEar!.angle!)>.0001)difference=true;
    if(i===299)for(const value of Object.values(s.offsets))assert.ok(Math.abs(value)<.001);
  }
  assert.ok(earlyRoot>earlyTip*3);assert.ok(difference);
});

test('secondary off yields the unchanged primary limbs, ears and tail, while foot pins remain stable',()=>{
  const a=new FoxAnimationController();a.tune({enabled:false});a.resetMotion();
  for(let i=0;i<180;i++)a.update(1/120,0,0,414,545,1,()=>545);
  for(const id of ['nearEar','nearEarMiddle','nearEarTip','farEarTip','tailRoot','tailMiddle','tailFlex','tailTip','tailEnd','coatHem'] as const)near(a.bones.angle(id),0);
  for(const value of Object.values(a.secondaryOffsets))near(value,0);
  near(a.feet[0].point.x,124);near(a.feet[0].point.y,210);
  a.tune({enabled:true});for(let i=0;i<60;i++)a.update(1/120,0,128,414+i,545,1,()=>545);
  assert.ok(Math.abs(a.bones.angle('nearEarMiddle'))>.01);
});

test('continuous run, jump, buffered jump and rapid facing changes preserve limits and connections',()=>{
  const p=new PlayerController(414,()=>floor,()=>[]),a=new FoxAnimationController();let buffered=false;
  for(let i=0;i<420;i++) {
    const axis=i<60?1:i<120?-1:i%20<10?1:-1;
    const press=i===70||(!buffered&&p.velocityY>0&&p.clearance<15);
    if(i>70&&press)buffered=true;
    const d=p.step(1/120,axis,{pressed:press,held:true});a.update(1/120,d,p.velocity,p.x,p.y,p.facing,x=>p.supportY(x),false,motion(p));
    for(const b of a.bones.snapshot()){const def=FOX_BONES.find(d=>d.id===b.id)!;assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y)&&b.angle>=def.min-1e-8&&b.angle<=def.max+1e-8);}
    const tail=a.map('tail',{x:108,y:170}),coat=a.map('coat-side',{x:108,y:170});near(tail.x,coat.x);near(tail.y,coat.y);
    if(p.grounded)near(a.feet[0].point.y,a.feet[0].goal.y,.001);
  }
  assert.equal(p.jumpCount,2);assert.equal(p.bufferJumps,1);
});

test('parameters clamp safely, change ear response, and tuning does not alter physics',()=>{
  const c={...MOTION_DEFAULTS};tuneMotion(c,{earDamping:-10,tailSpring:10000,waistBend:NaN});near(c.earDamping,.35);near(c.tailSpring,400);near(c.waistBend,1);
  const a=new FoxAnimationController(),b=new FoxAnimationController();a.tune({earSpring:100});b.tune({earSpring:700});
  for(let i=0;i<8;i++){a.update(1/120,1,128,414+i,545,1,()=>545);b.update(1/120,1,128,414+i,545,1,()=>545);}
  assert.ok(Math.abs(a.bones.angle('nearEarTip')-b.bones.angle('nearEarTip'))>.001);
  a.paused=true;const before=a.bones.snapshot();a.update(3,300,500,700,300,-1,()=>545);assert.deepEqual(a.bones.snapshot(),before);
});

test('tail contact bounds additive motion without changing its root or concealing painted regions',()=>{
  const primary=FOX_POSES.IdlePose.bones,full=structuredClone(primary);full.tailRoot!.angle=-.13;
  const bones=new FoxBones(),contact=new FoxTailContact();
  const env={polygons:[buildCollision({id:'rise',kind:'platform' as const,x:843,y:451,width:349.2,height:155.2}).polygon],x:790,y:550,facing:-1,scale:.8};
  contact.fit(bones,full,primary,env);
  assert.ok(contact.penetration<=contact.primaryPenetration);near(bones.position('tailRoot').x,108);near(bones.position('tailRoot').y,170);
});

test('near the authored high platform the connected tail retargets behind the body and releases smoothly',()=>{
  const primary=FOX_POSES.IdlePose.bones,pose=structuredClone(primary),bones=new FoxBones(),contact=new FoxTailContact();
  pose.tailRoot!.angle=.025;pose.tailMiddle!.angle=.015;
  const env={polygons:[buildCollision({id:'rise',kind:'platform' as const,x:843,y:451,width:349.2,height:155.2}).polygon],x:833,y:549,facing:-1,scale:.8};
  contact.fit(bones,pose,primary,env);assert.ok(contact.primaryPenetration>0);assert.equal(contact.penetration,0);
  near(bones.position('tailRoot').x,108);near(bones.position('tailRoot').y,170);
  const tip=bones.position('tailEnd'),root=bones.position('tailRoot');assert.ok(tip.x<root.x,'tip remains behind the body, not ahead of the face');
  const raised=bones.position('tailEnd');contact.fit(bones,pose,primary,{...env,polygons:[]});
  const released=bones.position('tailEnd');assert.ok(Math.hypot(released.x-raised.x,released.y-raised.y)<25,'release cannot snap instantly to bind');
  for(let i=0;i<240;i++)contact.fit(bones,pose,primary,{...env,polygons:[]});
  const rest=new FoxBones();rest.setPose(pose);near(bones.position('tailEnd').x,rest.position('tailEnd').x,.001);near(bones.position('tailEnd').y,rest.position('tailEnd').y,.001);
});

test('tail releases from the real platform without adding outline intersections or a tip position snap',async()=>{
  const {TAIL_OUTLINE,insidePolygon}=await import('../src/characters/fox/FoxTailContact.ts');
  const {skinFoxPart}=await import('../src/characters/fox/FoxSkin.ts');
  const primary=FOX_POSES.IdlePose.bones,bones=new FoxBones(),contact=new FoxTailContact();
  const polygon=buildCollision({id:'rise',kind:'platform' as const,x:843,y:451,width:349.2,height:155.2}).polygon;
  let last:{x:number;y:number}|undefined;
  for(let i=0;i<110;i++) {
    const env={polygons:[polygon],x:833-i,y:549,facing:-1,scale:.8};contact.fit(bones,primary,primary,env,1/120);
    if(contact.penetration===0)for(const p of TAIL_OUTLINE.filter(p=>p.x<99)) {
      const q=skinFoxPart(bones,'tail',p,0,0,0);assert.equal(insidePolygon({x:env.x-(q.x-124)*.8,y:env.y+(q.y-210)*.8},polygon),false);
    }
    const tip=bones.position('tailEnd');if(last)assert.ok(Math.hypot(tip.x-last.x,tip.y-last.y)<30);last=tip;
  }
});
