import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerController} from '../src/characters/fox/PlayerController.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {RIG_PARTS} from '../src/characters/fox/CharacterConfig.ts';
import {surfaceY} from '../src/world/terrain/geometry.ts';
const floor={id:'floor',kind:'ground' as const,x:0,y:490,width:1280,height:230};
const platform={id:'rise',kind:'platform' as const,x:843,y:451,width:349.2,height:155.2};
const make=(x=414)=>new PlayerController(x,()=>floor,()=>[platform]);
const tick=(p:PlayerController,axis=0,pressed=false,held=false,hz=120)=>p.step(1/hz,axis,{pressed,held});
const onPlatform=(x=900)=>{const p=make(x);p.y=surfaceY(platform,x)!;p.supportId=platform.id;return p;};

test('short and held jumps have distinct bounded heights, one apex and one stable landing',()=>{
  const heights=[6,60].map(hold=>{
    const p=make(),start=p.y;let min=p.y,peaks=0,oldVy=0;
    for(let i=0;i<180;i++){tick(p,0,i===0,i<hold);min=Math.min(min,p.y);if(oldVy<0&&p.velocityY>=0)peaks++;oldVy=p.velocityY;assert.ok(p.y<=start+1e-6);}
    assert.equal(p.jumpCount,1);assert.equal(p.landCount,1);assert.equal(peaks,1);assert.ok(p.grounded);assert.equal(p.velocityY,0);
    assert.ok(Math.abs(p.y-start)<1e-5);return start-min;
  });
  assert.ok(heights[0]>60&&heights[0]<105);assert.ok(heights[1]>115&&heights[1]<125);assert.ok(heights[1]>heights[0]+15);
});
test('holding jump cannot auto-repeat or jump again in the air',()=>{
  const p=make();
  for(let i=0;i<360;i++)tick(p,0,i===0||i===20,true);
  assert.equal(p.jumpCount,1);assert.equal(p.landCount,1);assert.ok(p.grounded);
});
test('running jump mounts the authored platform, walks its slope and remains on top',()=>{
  const p=make(817);
  for(let i=0;i<115;i++){tick(p,1,i===0,i<65);assert.ok(!p.collides(p.x));}
  assert.ok(p.grounded);assert.equal(p.supportId,platform.id);
  for(let i=0;i<240;i++)tick(p);
  assert.ok(Math.abs(p.y-surfaceY(platform,p.x)!)<1e-6);assert.equal(p.landCount,1);
});
test('walking off either edge falls, never becomes a side-wall landing',()=>{
  for(const [x,axis] of [[865,-1],[1160,1]]) {
    const raised=axis>0?{...platform,x:760}:platform;
    const start=axis>0?1080:x;
    const p=new PlayerController(start,()=>floor,()=>[raised]);p.y=surfaceY(raised,start)!;p.supportId=raised.id;
    let air=false;
    for(let i=0;i<160;i++){tick(p,axis);if(!p.grounded)air=true;assert.ok(!p.collides(p.x));}
    assert.ok(air);assert.ok(p.grounded);assert.equal(p.supportId,floor.id);assert.equal(p.landCount,1);
  }
});
test('coyote jump is accepted shortly after stepping off and rejected after expiry',()=>{
  for(const [delay,expected] of [[5,true],[19,false]] as const) {
    const p=onPlatform(865);while(p.grounded)tick(p,-1);
    for(let i=0;i<delay;i++)tick(p,-1);
    tick(p,-1,true,true);
    assert.equal(p.jumpedThisFrame,expected);assert.equal(p.coyoteJumps,expected?1:0);
    if(expected){assert.ok(p.velocityY<0);assert.equal(p.coyoteTimer,0);tick(p,-1,true,true);assert.equal(p.jumpCount,1);}
  }
});
test('a jump pressed just before landing is consumed once at contact',()=>{
  const p=make();tick(p,0,true,true);
  while(!(p.velocityY>0&&p.clearance<18))tick(p,0,false,true);
  tick(p,0,true,true);assert.ok(p.bufferTimer>0);assert.equal(p.jumpCount,1);
  for(let i=0;i<15;i++)tick(p,0,false,true);
  assert.equal(p.jumpCount,2);assert.equal(p.bufferJumps,1);assert.equal(p.lastJumpKind,'buffer');assert.ok(p.velocityY<0);
});
test('buffer expires, a platform underside stops ascent without setting grounded',()=>{
  const p=make();tick(p,0,true,true);tick(p,0,true,true);
  for(let i=0;i<150;i++)tick(p,0,false,true);
  assert.equal(p.jumpCount,1);
  const raised={...platform,y:270,height:100};const q=new PlayerController(950,()=>floor,()=>[raised]);
  let hit=false;
  for(let i=0;i<120;i++){tick(q,0,i===0,true);if(q.velocityY===0&&!q.grounded){hit=true;assert.equal(q.supportId,null);}assert.ok(!q.collides(q.x));}
  assert.ok(hit);assert.ok(q.grounded);assert.equal(q.supportId,floor.id);
});
test('terminal speed, mixed frame rates and repeated direction changes do not tunnel',()=>{
  for(const hz of [20,30,60,120]) {
    const p=make(817);let ceiling=0;
    for(let i=0;i<hz*10;i++) {
      tick(p,i<hz?1:Math.sin(i/hz*8)>0?1:-1,i%Math.round(hz*.7)===0,true,hz);
      ceiling=Math.max(ceiling,p.velocityY);assert.ok(!p.collides(p.x));assert.ok(Number.isFinite(p.y));
      assert.ok(p.x>=116&&p.x<=1164);assert.ok(p.y<=surfaceY(floor,p.x)!+1e-5);
    }
    assert.ok(ceiling<=p.physics.maxFallSpeed);
  }
});
test('jump/fall/land poses remain finite, do not cycle running legs in air, and preserve binding',()=>{
  const p=make(),a=new FoxAnimationController();const states=new Set<string>();let airPhase:number|undefined;
  for(let i=0;i<150;i++) {
    const distance=p.step(1/120,0,{pressed:i===0,held:i<60});
    a.update(1/120,distance,p.velocity,p.x,p.y,p.facing,x=>p.supportY(x),false,{grounded:p.grounded,velocityY:p.velocityY,landTimer:p.landTimer,landDuration:p.physics.landDuration,clearance:p.clearance,impact:p.impact});
    states.add(a.state);
    if(!p.grounded){airPhase??=a.phase;assert.equal(a.phase,airPhase);}
    for(const part of RIG_PARTS){const q=a.map(part.id,{x:(part.bounds[0]+part.bounds[2])/2,y:(part.bounds[1]+part.bounds[3])/2});assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y));}
    if(p.grounded&&p.landTimer>0){const sole=a.map('near-leg',{x:124,y:210});assert.ok(Math.abs(sole.y-210)<1e-6);}
  }
  for(const state of ['JUMP','FALL','LAND','IDLE'])assert.ok(states.has(state));
  a.bindPose=true;assert.deepEqual(a.map('head',{x:120,y:80}),{x:120,y:80});
});

test('vertical integration agrees at 30/60/120 Hz and reaches its configured terminal speed',()=>{
  const snapshots=[30,60,120].map(hz=>{
    const p=make(817);for(let i=0;i<hz*.2;i++)tick(p,1,i===0,true,hz);
    return {x:p.x,y:p.y,v:p.velocityY};
  });
  for(const s of snapshots)for(const k of ['x','y','v'] as const)assert.ok(Math.abs(s[k]-snapshots[0][k])<1e-5);
  const p=make(500);p.y=100;p.grounded=false;p.supportId=null;
  let speed=0;for(let i=0;i<160;i++){tick(p);speed=Math.max(speed,p.velocityY);assert.ok(!p.collides(p.x));}
  assert.equal(speed,p.physics.maxFallSpeed);assert.ok(p.grounded);
});

test('losing keyboard focus cancels a queued jump instead of firing it on later contact',()=>{
  const p=make();tick(p,0,true,true);
  while(!(p.velocityY>0&&p.clearance<18))tick(p,0,false,true);
  tick(p,0,true,true);assert.ok(p.bufferTimer>0);
  p.step(1/120,0,{pressed:false,held:false,cancelled:true});assert.equal(p.bufferTimer,0);
  for(let i=0;i<60;i++)tick(p);
  assert.equal(p.jumpCount,1);assert.ok(p.grounded);
});

test('uphill diagonal landings sweep both horizontal endpoints at slow and normal frame rates',()=>{
 for(const rate of [.25,1])for(const hz of [30,60,120,144]){
  const p=new PlayerController(680,()=>floor,()=>[]);let peak=Infinity;
  for(let i=0;i<hz*1.4/rate;i++){
   p.step(rate/hz,-1,{pressed:i===0,held:true});peak=Math.min(peak,p.y);
   assert.ok(p.y<600,`${rate}x/${hz}Hz must not tunnel under the uphill floor: ${p.y}`);
  }
  assert.equal(p.landCount,1);assert.equal(p.grounded,true);assert.ok(peak<470);
 }
});
