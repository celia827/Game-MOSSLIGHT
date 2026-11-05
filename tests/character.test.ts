import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerController} from '../src/characters/fox/PlayerController.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {CHARACTER_CONFIG as C,RIG_PARTS} from '../src/characters/fox/CharacterConfig.ts';
import {surfaceY} from '../src/world/terrain/geometry.ts';
import type {TerrainDefinition} from '../src/world/terrain/types.ts';

const ground:TerrainDefinition={id:'floor',kind:'ground',x:0,y:490,width:1280,height:230};
const platform:TerrainDefinition={id:'rise',kind:'platform',x:843,y:451,width:349.2,height:155.2};
const motor=(x=414.2)=>new PlayerController(x,()=>ground,()=>[platform]);
const run=(p:PlayerController,seconds:number,axis:number,hz=120)=>{for(let i=0;i<seconds*hz;i++)p.step(1/hz,axis);};
const close=(a:number,b:number,epsilon=1e-5)=>assert.ok(Math.abs(a-b)<epsilon,`${a} / ${b}`);

test('five-second right run stops at the platform, left run follows slopes and faces left',()=>{
  const p=motor();run(p,5,1);
  assert.ok(p.x>830&&p.x<840);assert.equal(p.facing,1);assert.equal(p.velocity,0);assert.ok(!p.collides(p.x));
  run(p,5,-1);assert.ok(p.x<230&&p.x>C.viewportMargin);assert.equal(p.facing,-1);
  close(p.y,surfaceY(ground,p.x)!);
  run(p,5,-1);close(p.x,C.viewportMargin);assert.equal(p.velocity,0);
});
test('acceleration and displacement are consistent at 30, 60, and 120 Hz',()=>{
  const players=[30,60,120].map(hz=>{const p=motor(200);run(p,2,1,hz);return p;});
  for(const p of players){close(p.x,players[0].x,.03);close(p.velocity,C.maxSpeed);}
});
test('release decelerates smoothly instead of immediately snapping to idle',()=>{
  const p=motor(300);run(p,1,1);const x=p.x;
  p.step(1/60,0);assert.ok(p.velocity>0&&p.velocity<C.maxSpeed);
  run(p,.5,0);assert.equal(p.velocity,0);assert.ok(p.x-x>5&&p.x-x<12);
});
test('rapid alternating input and platform edits cannot place the body inside a solid',()=>{
  const p=motor();
  for(let i=0;i<40;i++){run(p,.1,i%2?1:-1);assert.ok(!p.collides(p.x));close(p.y,surfaceY(ground,p.x)!);}
  const altered={...platform,x:300,width:430};
  const moved=new PlayerController(414.2,()=>ground,()=>[altered]);moved.reconcile();assert.ok(!moved.collides(moved.x));
});
test('idle soles stay fixed while breathing, blinking and delayed tail motion continue',()=>{
  const a=new FoxAnimationController();let tailMin=Infinity,tailMax=-Infinity;
  for(let i=0;i<15*120;i++) {
    a.update(1/120,0,0,414,545,1,()=>545);
    const foot=a.map('near-leg',{x:124,y:210});close(foot.x,124);close(foot.y,210);
    const tail=a.map('tail',{x:6,y:95});tailMin=Math.min(tailMin,tail.y);tailMax=Math.max(tailMax,tail.y);
  }
  assert.ok(a.blinkCount>=3);assert.ok(tailMax-tailMin>1);assert.equal(a.state,'IDLE');
});
test('run has lift, alternating supports and continuous skinned soles',()=>{
  const a=new FoxAnimationController();let lift=0,supports=0,maxError=0,maxSlide=0;
  let previous:{x:number;y:number;stance:boolean}[]=[];
  for(let i=0;i<480;i++) {
    const x=200+(i+1)*C.maxSpeed/60;
    a.update(1/60,C.maxSpeed/60,C.maxSpeed,x,545,1,()=>545);
    const feet=a.feet;
    lift=Math.max(lift,210-feet[0].goal.y);
    feet.forEach((f,j)=>{
      maxError=Math.max(maxError,Math.hypot(f.point.x-f.goal.x,f.point.y-f.goal.y));
      if(f.stance)supports++;
      const world={x:x+(f.point.x-124)*.8,y:545+(f.point.y-210)*.8,stance:f.stance};
      if(i>90&&world.stance&&previous[j]?.stance)maxSlide=Math.max(maxSlide,Math.hypot(world.x-previous[j].x,world.y-previous[j].y));
      previous[j]=world;
    });
    for(const part of RIG_PARTS) {
      const p=a.map(part.id,{x:(part.bounds[0]+part.bounds[2])/2,y:(part.bounds[1]+part.bounds[3])/2});
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    }
  }
  assert.ok(lift>10);assert.ok(supports>300);assert.ok(maxError<1e-6);assert.ok(maxSlide<.3,`support slide ${maxSlide}`);
});
test('the binding pose maps every original part without changing proportions',()=>{
  const a=new FoxAnimationController();a.bindPose=true;
  for(const part of RIG_PARTS)for(const point of [{x:part.bounds[0],y:part.bounds[1]},{x:part.bounds[2],y:part.bounds[3]}])assert.deepEqual(a.map(part.id,point),point);
});
test('returning from a long in-place preview does not reuse stale world foot pins',()=>{
  const a=new FoxAnimationController();
  for(let i=0;i<600;i++)a.update(1/60,C.maxSpeed/60,C.maxSpeed,414,545,1,()=>545,true);
  const before=a.feet.map(f=>f.point);
  a.update(1/60,0,0,414,545,1,()=>545,false);
  const after=a.feet.map(f=>f.point);
  after.forEach((p,i)=>assert.ok(Math.hypot(p.x-before[i].x,p.y-before[i].y)<8));
  a.resetMotion();assert.equal(a.phase,.25);assert.equal(a.weight,0);
});
test('animation clock and visible poses remain consistent at 30, 60 and 120 Hz',()=>{
  const poses=[30,60,120].map(hz=>{
    const a=new FoxAnimationController();
    for(let i=0;i<4*hz;i++)a.update(1/hz,C.maxSpeed/hz,C.maxSpeed,300+(i+1)*C.maxSpeed/hz,545,1,()=>545);
    return {phase:a.phase,head:a.map('head',{x:175,y:92}),foot:a.feet[0].point,tail:a.map('tail',{x:6,y:95})};
  });
  for(const p of poses){close(p.phase,poses[0].phase);close(p.head.x,poses[0].head.x,.02);close(p.foot.y,poses[0].foot.y,.02);close(p.tail.y,poses[0].tail.y,1.5);}
});
test('tail deformation changes internal curvature instead of rotating a rigid rod',()=>{
  const a=new FoxAnimationController();let min=Infinity,max=-Infinity;
  for(let i=0;i<720;i++) {
    a.update(1/60,0,0,414,545,1,()=>545);
    const base=a.map('tail',{x:50,y:150}),tip=a.map('tail',{x:6,y:95});
    const length=Math.hypot(base.x-tip.x,base.y-tip.y);min=Math.min(min,length);max=Math.max(max,length);
  }
  assert.ok(max-min>.3);
});
