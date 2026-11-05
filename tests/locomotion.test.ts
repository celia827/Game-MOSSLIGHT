import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerController} from '../src/characters/fox/PlayerController.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {walkPose,runPose} from '../src/characters/fox/FoxPoseLibrary.ts';
import {CHARACTER_CONFIG as C} from '../src/characters/fox/CharacterConfig.ts';
import {FoxLocomotion} from '../src/characters/fox/FoxLocomotion.ts';
const floor={id:'floor',kind:'ground' as const,x:0,y:490,width:1280,height:230};
function setup(hz=120) {
  const player=new PlayerController(300,()=>floor,()=>[]),animation=new FoxAnimationController();
  const states=new Set<string>();let maxError=0,maxSlide=0,last:{x:number;stance:boolean}[]=[];
  return {player,animation,states,get maxError(){return maxError;},get maxSlide(){return maxSlide;},
    step(axis:number,walking=false,pressed=false,held=false) {
      const d=player.step(1/hz,axis,{pressed,held},walking);
      animation.update(1/hz,d,player.velocity,player.x,player.y,player.facing,x=>player.supportY(x),false,{
        grounded:player.grounded,velocityY:player.velocityY,clearance:player.clearance,landTimer:player.landTimer,
        landDuration:player.physics.landDuration,impact:player.impact,jumpId:player.jumpCount,
        jumped:player.jumpedThisFrame,landed:player.landedThisFrame,intent:{axis,walking},
      });
      states.add(animation.state);
      const feet=animation.feet.map(f=>{
        maxError=Math.max(maxError,Math.hypot(f.point.x-f.goal.x,f.point.y-f.goal.y));
        return {x:player.x+(f.point.x-124)*player.facing*C.scale,stance:f.stance};
      });
      feet.forEach((f,i)=>{if(f.stance&&last[i]?.stance)maxSlide=Math.max(maxSlide,Math.abs(f.x-last[i].x));});last=feet;
    }};
}
test('walk uses a distinct authored gait, longer support, lower lift and full arm/knee chains',()=>{
  const walk=walkPose(.17),run=runPose(.17);
  assert.ok(Math.abs(walk.bones.nearShoulder!.angle!)<Math.abs(run.bones.nearShoulder!.angle!));
  assert.ok(Math.abs(walk.bones.nearElbow!.angle!)<Math.abs(run.bones.nearElbow!.angle!)*.6);
  const s=setup();let doubleSupport=0,lift=0,kneeMin=Infinity,kneeMax=-Infinity;
  for(let i=0;i<480;i++){
    s.step(1,true);
    if(i<120)continue;
    if(s.animation.feet.every(f=>f.stance))doubleSupport++;
    const sole=s.animation.feet[0].point;const floor=210+(s.player.supportY(s.player.x+(sole.x-124)*C.scale)-s.player.y)/C.scale;
    lift=Math.max(lift,floor-sole.y);
    const k=s.animation.bones.angle('nearKnee');kneeMin=Math.min(kneeMin,k);kneeMax=Math.max(kneeMax,k);
  }
  assert.equal(s.animation.state,'WALK');assert.equal(s.player.velocity,C.walkSpeed);
  assert.ok(doubleSupport>40);assert.ok(lift>5&&lift<8);assert.ok(kneeMax-kneeMin>.2);
  assert.ok(s.maxError<1e-5);assert.ok(s.maxSlide<.05,`walking support slip ${s.maxSlide}`);
});
test('idle/start/walk/run/walk/stop/idle share phase and stable contacts through speed changes',()=>{
  const s=setup();
  for(let i=0;i<40;i++)s.step(0);
  for(let i=0;i<180;i++)s.step(1,true);
  const before=s.animation.phase;
  s.step(1,false);assert.ok(Math.abs(s.animation.phase-before)<.03,'gait clock must not restart');
  for(let i=0;i<180;i++)s.step(1);
  for(let i=0;i<180;i++)s.step(1,true);
  for(let i=0;i<100;i++)s.step(0);
  for(const state of ['IDLE','START','WALK','RUN','STOP'])assert.ok(s.states.has(state),state);
  assert.equal(s.animation.state,'IDLE');assert.equal(s.player.velocity,0);
  assert.ok(s.maxError<1e-5);assert.ok(s.maxSlide<.12,`transition support slip ${s.maxSlide}`);
});
test('turn is intent-driven, bounded in time and preserves tail root and ear connections',()=>{
  const s=setup();for(let i=0;i<90;i++)s.step(1);
  for(let j=0;j<12;j++)for(let i=0;i<22;i++) {
    s.step(j%2?1:-1);
    for(const part of ['tail','coat-side'] as const){const p=s.animation.map(part,{x:108,y:170});assert.ok(Number.isFinite(p.x+p.y));}
    const a=s.animation.map('tail',{x:108,y:170}),b=s.animation.map('coat-side',{x:108,y:170});
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-6);
  }
  assert.ok(s.states.has('TURN'));
  for(let i=0;i<120;i++)s.step(0);assert.equal(s.animation.state,'IDLE');
});
test('run jump land and immediate buffered jump retain unified motion without resetting springs',()=>{
  const s=setup();for(let i=0;i<50;i++)s.step(1);
  s.step(1,false,true,true);
  let buffered=false;
  for(let i=0;i<160;i++){
    const request=!buffered&&!s.player.grounded&&s.player.velocityY>0&&s.player.clearance<35;
    if(request)buffered=true;
    s.step(1,false,request,true);
  }
  for(const state of ['START','RUN','JUMP','FALL','LAND'])assert.ok(s.states.has(state),state);
  assert.equal(s.player.jumpCount,2);assert.equal(s.player.bufferJumps,1);assert.ok(s.maxError<1e-4);
});
test('ground locomotion and Shift speed are stable across 30/60/120 Hz',()=>{
  const ends=[30,60,120].map(hz=>{
    const s=setup(hz);for(let i=0;i<hz;i++)s.step(1,true);
    for(let i=0;i<hz;i++)s.step(1,false);
    for(let i=0;i<hz;i++)s.step(0);
    return {x:s.player.x,state:s.animation.state,head:s.animation.bones.worldAngle('head'),phase:s.animation.phase};
  });
  for(const e of ends){assert.equal(e.state,'IDLE');assert.ok(Math.abs(e.x-ends[0].x)<.04);assert.ok(Math.abs(e.phase-ends[0].phase)<.006);assert.ok(Math.abs(e.head-ends[0].head)<.003);}
});
test('inspection restores locomotion transition timers rather than adopting the preview state',()=>{
  const a=new FoxAnimationController();a.locomotion.step(.02,12,1,true,{axis:1,walking:true});
  const before=a.locomotion.snapshot();a.beginInspection();
  for(let i=0;i<200;i++)a.locomotion.step(.01,128,1,true,{axis:1,walking:false});
  a.endInspection();assert.deepEqual(a.locomotion.snapshot(),before);
});
test('blocked motion cannot animate an endless walk or run cycle',()=>{
  const l=new FoxLocomotion();for(let i=0;i<120;i++)l.step(1/120,0,1,true,{axis:1,walking:false});
  assert.equal(l.state,'IDLE');
});
test('a brief key-up gap during reversal retains TURN instead of erasing turn intent',()=>{
  const l=new FoxLocomotion();for(let i=0;i<60;i++)l.step(1/120,128,1,true,{axis:1,walking:false});
  l.step(1/120,120,1,true,{axis:0,walking:false});
  l.step(1/120,112,1,true,{axis:-1,walking:false});assert.equal(l.state,'TURN');
  l.step(1/120,104,1,true,{axis:-1,walking:false});assert.ok(l.age>0,'turn cannot restart on every frame');
});
test('walk/run/start/stop/turn all use the same secondary toggle and keep their primary pose',()=>{
  const s=setup();s.animation.tune({enabled:false});
  for(const [axis,walk,frames] of [[1,true,100],[1,false,100],[-1,false,100],[0,false,100]] as const) {
    for(let i=0;i<frames;i++)s.step(axis,walk);
    assert.ok(Object.values(s.animation.secondaryOffsets).every(v=>Math.abs(v!)<1e-5));
    assert.equal(s.animation.bones.snapshot().length,35);
  }
  assert.ok(s.states.has('WALK')&&s.states.has('RUN')&&s.states.has('TURN')&&s.states.has('STOP'));
});
