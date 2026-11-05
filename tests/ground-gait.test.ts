import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundTimeline} from '../src/animation-lab/GroundTimeline.ts';
import {FoxLocomotion,LOCOMOTION_CONFIG as L} from '../src/characters/fox/FoxLocomotion.ts';
import {FOX_POSES} from '../src/characters/fox/FoxPoseLibrary.ts';
import {FOX_POSES as BEFORE} from '../src/animation-lab/baseline/PreviousPoses.ts';
import {gaitCurve} from '../src/characters/fox/FoxGait.ts';
test('five seconds of walk/run have different support, clearance and arm ranges without support slip',()=>{
 const results=[];
 for(const action of ['WALK','RUN'] as const){const t=new GroundTimeline();let double=0,flight=0,clearance=0,slip=0,error=0,last:{x:number;stance:boolean}[]=[];let armLo=9,armHi=-9;
 for(let i=0;i<=600;i++){
  t.seek(i/120,action);const s=t.snapshot();if(i<120)continue;
  const feet=s.refined.feet;if(feet.every(f=>f.stance))double++;if(feet.every(f=>!f.stance))flight++;
  feet.forEach((f,j)=>{const x=s.x+(f.point.x-124)*s.facing*.8;if(last[j]?.stance&&f.stance)slip=Math.max(slip,Math.abs(x-last[j].x));last[j]={x,stance:f.stance};error=Math.max(error,Math.hypot(f.point.x-f.goal.x,f.point.y-f.goal.y));});
  clearance=Math.max(clearance,210-feet[0].point.y);const arm=t.refined.bones.angle('nearShoulder');armLo=Math.min(armLo,arm);armHi=Math.max(armHi,arm);
 }
 assert.ok(error<1e-5&&slip<1e-5,`${action}: ${error}/${slip}`);results.push({double,flight,clearance,arm:armHi-armLo});
 }
 assert.ok(results[0].double>80&&results[0].flight===0);assert.ok(results[1].flight>35&&results[1].double===0);
 assert.ok(results[1].clearance>results[0].clearance+8);assert.ok(results[1].arm>results[0].arm*1.7);
});
test('ground presets expose start, stop and turn, with deterministic rewind and settled stop',()=>{
 for(const action of ['START','STOP','TURN'] as const){const t=new GroundTimeline(),states=new Set<string>();for(let i=0;i<480;i++){t.seek(i/120,action);states.add(t.refined.state);}assert.ok(states.has(action),action);if(action==='STOP')assert.equal(t.refined.state,'IDLE');
 t.seek(1.4,action);const expected=t.refined.bones.snapshot();t.seek(3,action);t.seek(1.4,action);assert.deepEqual(t.refined.bones.snapshot(),expected);}
});
test('speed hysteresis resists threshold noise and jump key targets remain unchanged',()=>{
 const l=new FoxLocomotion();for(let i=0;i<120;i++)l.step(1/120,100,1,true,{axis:1,walking:false});assert.equal(l.state,'RUN');
 for(let i=0;i<120;i++){l.step(1/120,L.runEnter+(i%2?-.5:.5),1,true,{axis:1,walking:false});assert.equal(l.state,'RUN');}
 for(const name of ['AnticipationPose','TakeoffPose','JumpForwardPose','FallPreparePose','LandHeavyPose'] as const)assert.deepEqual(FOX_POSES[name],BEFORE[name]);
 assert.equal(gaitCurve([[0,0],[.4,1],[1,0]],.4),1);
});
test('manual speed changes preserve the live pose and recorded speed history on rewind',()=>{
 const t=new GroundTimeline();t.seek(1,'WALK');const before=t.refined.bones.snapshot();t.seek(1,'SPEED',128);assert.deepEqual(t.refined.bones.snapshot(),before);
 t.seek(1.4,'SPEED',128);const result=t.refined.bones.snapshot();t.seek(.8,'SPEED',128);t.seek(1.4,'SPEED',128);assert.deepEqual(t.refined.bones.snapshot(),result);
});
test('long ground playback continues beyond the initial six-second ruler without restarting',()=>{
 const t=new GroundTimeline();t.seek(5.99,'RUN');const phase=t.refined.phase;t.seek(6.01,'RUN');assert.equal(t.refined.state,'RUN');assert.ok(t.refined.phase!==phase);t.seek(8,'RUN');assert.equal(t.time,8);assert.equal(t.refined.state,'RUN');
});
