import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundTimeline} from '../src/animation-lab/GroundTimeline.ts';
import {groundDemoCue,DEMO_DURATION} from '../src/animation-lab/GroundDemo.ts';
import {FOX_POSES} from '../src/characters/fox/FoxPoseLibrary.ts';
import {FOX_POSES as BEFORE} from '../src/animation-lab/baseline/PreviousPoses.ts';
test('repeatable acceptance demo uses idle/walk/run/stop/turn/left-run/idle with stable soles',()=>{
 const t=new GroundTimeline(),states=new Set<string>();let error=0,slip=0,last:{x:number;stance:boolean;facing:number}[]=[];
 for(let i=0;i<=DEMO_DURATION*240;i++){
  t.seek(i/120,'DEMO');const s=t.snapshot();states.add(s.refined.state);
  s.refined.feet.forEach((f,j)=>{const x=s.x+(f.point.x-124)*s.facing*.8;
   if(last[j]?.stance&&f.stance&&last[j].facing===s.facing)slip=Math.max(slip,Math.abs(x-last[j].x));
   last[j]={x,stance:f.stance,facing:s.facing};error=Math.max(error,Math.hypot(f.point.x-f.goal.x,f.point.y-f.goal.y));
  });
 }
 for(const s of ['IDLE','START','WALK','RUN','STOP','TURN'])assert.ok(states.has(s),s);
 assert.ok(error<.01,`foot goal ${error}`);assert.ok(slip<.2,`sole displacement ${slip}`);assert.equal(t.refined.state,'IDLE');
 const expected=new GroundTimeline();expected.seek(9,'DEMO');t.seek(9,'DEMO');assert.deepEqual(t.refined.bones.snapshot(),expected.refined.bones.snapshot());
 for(const [time,speed] of [[1,0],[3,60],[6,128],[8.2,0],[8.6,-60],[10,-128],[13,0]] as const)assert.equal(groundDemoCue(time).speed,speed);
});
test('final ground cleanup keeps authored jump poses unchanged',()=>{
 for(const name of ['AnticipationPose','TakeoffPose','AscendPose','ApexPose','JumpForwardPose','FallPreparePose','LandHeavyPose'] as const)assert.deepEqual(FOX_POSES[name],BEFORE[name]);
});
