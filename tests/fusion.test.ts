import test from 'node:test';
import assert from 'node:assert/strict';
import {FusionTimeline} from '../src/animation-lab/FusionTimeline.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {FOX_BONES} from '../src/characters/fox/FoxBones.ts';
import {PlayerController} from '../src/characters/fox/PlayerController.ts';
const floor={id:'floor',kind:'ground' as const,x:0,y:490,width:1280,height:230};

test('whole fusion timeline covers each phase, physical landing, recover interrupt and deterministic scrubbing',()=>{
 const t=new FusionTimeline();let previous=t.refined.secondaryOffsets,maxOffsetStep=0;
 for(let i=1;i<=1680;i++){
  t.seek(i/120);const a=t.refined;
  for(const b of a.bones.snapshot()){const d=FOX_BONES.find(d=>d.id===b.id)!;assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y)&&b.angle>=d.min-1e-7&&b.angle<=d.max+1e-7);}
  for(const [k,v]of Object.entries(a.secondaryOffsets)){if(k.startsWith('tail')||k.includes('Ear'))maxOffsetStep=Math.max(maxOffsetStep,Math.abs(v!-(previous[k as keyof typeof previous]??0)));}
  previous=a.secondaryOffsets;
 }
 const states=new Set(t.events.map(e=>e.to));for(const p of ['START','WALK','RUN','STOP','TURN','ANTICIPATION','TAKEOFF','ASCEND','APEX','DESCEND','DESCEND/FALL_PREPARE','LAND_IMPACT','LAND_RECOVER','IDLE'])assert.ok(states.has(p),p);
 assert.ok(t.events.some(e=>e.from==='RUN'&&e.to==='ANTICIPATION'));assert.ok(t.events.some(e=>e.from==='LAND_RECOVER'&&e.to==='ANTICIPATION'));
 for(const e of t.events)if(e.to==='LAND_IMPACT')assert.equal(e.grounded,true);
 assert.equal(t.player.jumpCount,2);assert.equal(t.player.landCount,2);assert.equal(t.refined.state,'IDLE');assert.ok(maxOffsetStep<.035,`spring discontinuity ${maxOffsetStep}`);
 t.seek(8.9);const u=new FusionTimeline();u.seek(8.9);assert.deepEqual(t.refined.bones.snapshot(),u.refined.bones.snapshot());assert.deepEqual(t.events,u.events);
 for(const hz of [30,60,144]){const v=new FusionTimeline();for(let i=1;i<=hz*14;i++)v.seek(i/hz);assert.deepEqual(v.refined.bones.snapshot(),newAtEnd());}
 function newAtEnd(){const v=new FusionTimeline();v.seek(14);return v.refined.bones.snapshot();}
});

test('a repeated integration landed flag cannot restart impact while continuously grounded',()=>{
 const a=new FoxAnimationController();const motion={grounded:true,velocityY:0,landTimer:0,landDuration:.16,clearance:0,impact:600,landed:true};
 let impacts=0,last='';for(let i=0;i<240;i++){a.update(1/120,0,0,400,545,1,()=>545,false,motion);if(a.animationPhase==='LAND_IMPACT'&&last!=='LAND_IMPACT')impacts++;last=a.animationPhase;}
 assert.equal(impacts,1);assert.equal(a.state,'IDLE');
});

test('real controller buffers five consecutive jumps, retains spring history, and movement resumes after landing',()=>{
 for(const hz of [30,60,120]){
  const p=new PlayerController(600,()=>floor,()=>[]),a=new FoxAnimationController();let pressedFor=0,sawLandRun=false;const transitions=new Set<string>();let last=a.state;
  for(let i=0;i<hz*8;i++){
   const press=i===0||p.jumpCount<5&&p.jumpCount!==pressedFor&&p.velocityY>0&&p.clearance<22;if(press)pressedFor=p.jumpCount;
   const axis=i<hz*5?1:0,d=p.step(1/hz,axis,{pressed:press,held:true});
   a.update(1/hz,d,p.velocity,p.x,p.y,p.facing,x=>p.supportY(x),false,{grounded:p.grounded,velocityY:p.velocityY,landTimer:p.landTimer,landDuration:p.physics.landDuration,clearance:p.clearance,impact:p.impact,jumped:p.jumpedThisFrame,landed:p.landedThisFrame,jumpId:p.jumpCount,intent:{axis,walking:false}});
   if(last!==a.state)transitions.add(last+'>'+a.state);if(p.grounded&&p.landCount>=5&&a.state==='RUN')sawLandRun=true;last=a.state;
  }
  assert.equal(p.jumpCount,5);assert.equal(p.landCount,5);assert.ok(p.bufferJumps>=3);assert.ok(sawLandRun);assert.equal(a.state,'IDLE');
 }
});

test('performance history stays bounded during long runs and rejects invalid frame intervals',async()=>{
 const {AnimationPerformance}=await import('../src/characters/fox/AnimationPerformance.ts');const p=new AnimationPerformance();
 for(let i=0;i<20000;i++)p.record(1000/60,3);
 p.record(NaN,0);p.record(0,0);p.record(16,Infinity);p.record(16,-1);const s=p.snapshot();assert.equal(s.samples,600);assert.ok(Math.abs(s.fps-60)<1e-8);assert.equal(s.characterP95Ms,3);
});
