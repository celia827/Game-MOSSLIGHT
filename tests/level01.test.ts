import test from 'node:test';
import assert from 'node:assert/strict';
import {Level01MapData as map} from '../src/levels/level01/Level01MapData.ts';
import {createLevelMotor,jumpEnvelope,validateLevel} from '../src/levels/shared/MapCollision.ts';
import {RoutePilot,testRoutes,type TestRoute} from '../src/levels/level01/Level01Routes.ts';
import {surfaceY} from '../src/world/terrain/geometry.ts';
import {CameraController} from '../src/levels/shared/CameraController.ts';
import {PHYSICS_CONFIG} from '../src/characters/fox/PhysicsConfig.ts';

test('level structure has valid IDs, profiles, connections and conservative jumps',()=>{
  assert.deepEqual(validateLevel(map),[]);
  assert.equal(jumpEnvelope.height,120);assert.equal(jumpEnvelope.runDistance,102.4);
  for(let i=1;i<=6;i++) {
    const m=map.modules.find(m=>m.id===`crown-up-${i}`)!;
    const from=i===1?900:map.modules.find(m=>m.id===`crown-up-${i-1}`)!.y;
    assert.ok(from-m.y<=jumpEnvelope.height*2/3);
    assert.ok(m.width>=jumpEnvelope.bodyWidth*3.5);
  }
  assert.ok(60<jumpEnvelope.runDistance*.65);
  const mutated={...map,modules:[...map.modules,map.modules[0]]};assert.ok(validateLevel(mutated).some(e=>e.includes('Duplicate')));
});

test('authored profiles are continuous at floating endpoints and reject malformed geometry',()=>{
  const m=map.modules.find(m=>m.id==='sunlit-bridge')!;
  assert.equal(surfaceY(m,m.x+m.width+1e-8),900);
  assert.equal(surfaceY(m,m.x+m.width+1),undefined);
  assert.equal(surfaceY(m,NaN),undefined);
  assert.throws(()=>surfaceY({...m,profile:[{x:0,y:0},{x:0,y:10}]},m.x),/Invalid terrain profile/);
});

for(const hz of [20,30,60,120])for(const route of Object.keys(testRoutes) as TestRoute[]) {
  test(`level ${route} completes via unchanged motor at ${hz}Hz, with safe contacts and world bounds`,()=>{
    const p=createLevelMotor(map),pilot=new RoutePilot(route);
    if(route.startsWith('reverse')){p.x=map.finish.x;p.y=map.finish.y;p.supportId='clearing';}
    const before={...p.physics};
    const camera={scrollX:0,scrollY:0,roundPixels:false,setBounds(){},setScroll(x:number,y:number){this.scrollX=x;this.scrollY=y;}};
    const rig=new CameraController(camera as never,map.width,map.height);rig.reset(p.x,p.y);
    for(let i=0;i<hz*111&&!pilot.done&&!pilot.failed;i++) {
      const q=pilot.next(p,1/hz);p.step(1/hz,q.axis,q.jump,q.walking);
      rig.update(1/hz,p.x,p.y);
      assert.ok(p.y-camera.scrollY>=164&&p.y-camera.scrollY<690,`camera loses fox at ${p.x},${p.y}`);
      assert.ok(camera.scrollY>=0&&camera.scrollY<=1120);
      assert.ok(!p.collides(p.x),`body/solid overlap at (${p.x},${p.y})`);
      assert.ok(p.x>=p.bounds.minX&&p.x<=p.bounds.maxX);assert.ok(p.y<=1680);
      if(p.grounded)assert.ok(Math.abs(p.y-p.world.surface(p.x,p.supportId!)!)<1e-4);
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    }
    assert.ok(pilot.done,`stuck at waypoint ${pilot.index}: ${p.x},${p.y} / ${p.supportId}`);
    assert.ok(pilot.elapsed<90);assert.deepEqual(p.physics,before);assert.deepEqual(p.physics,PHYSICS_CONFIG);
    const reverse=route.startsWith('reverse')||route==='west-return'||route==='hidden-return';
    assert.ok(Math.abs(p.x-(reverse?map.spawn.x:map.finish.x))<3);
    assert.equal(p.supportId,reverse?'entry':'clearing');
    if(route==='canopy'||route==='reverse-canopy'||route==='lookout')assert.ok(pilot.visited.has('canopy'));
    if(route==='reverse-canopy'){for(let i=1;i<=6;i++)assert.ok(pilot.supports.has(`crown-up-${i}`));assert.ok(pilot.supports.has('crown-rest'));assert.ok(pilot.supports.has('crown-lookout'));}
    if(route==='canopy-return')for(let i=1;i<=4;i++)assert.ok(pilot.supports.has(`crown-return-${i}`));
    if(route==='lookout')assert.ok(pilot.supports.has('crown-secret-perch'));
    if(route==='hidden'||route==='hidden-return')assert.ok(pilot.visited.has('hidden'));
    if(route==='cave'||route==='hidden'||route==='reverse-cave'){assert.ok(pilot.visited.has('cave'));assert.ok(pilot.supports.has('cave-return'));}
  });
}

test('cave return is continuous both ways, supports standing headroom and passes under the deck',()=>{
  const p=createLevelMotor(map);p.x=2400;p.y=1480;p.supportId='cave-return';
  for(let i=0;i<800;i++){p.step(1/120,1,{pressed:false,held:false});assert.ok(!p.collides(p.x));}
  assert.ok(p.x>3190);assert.ok(p.y<910);
  const slope=map.modules.find(m=>m.id==='cave-return')!;
  assert.equal(surfaceY(slope,2400),1480);assert.equal(surfaceY(slope,3200),900);
});

test('solid world edges hold in both directions and cave walls have no inescapable floor',()=>{
  for(const sign of [-1,1]) {
    const p=createLevelMotor(map);if(sign===1){p.x=3630;p.y=900;p.supportId='clearing';}
    for(let i=0;i<500;i++)p.step(1/120,sign,{pressed:false,held:false});
    assert.equal(p.x,sign===1?p.bounds.maxX:p.bounds.minX);assert.ok(p.grounded);assert.ok(!p.collides(p.x));
  }
  const p=createLevelMotor(map);p.x=1140;p.y=1480;p.supportId='cave-landing';
  for(let i=0;i<240;i++)p.step(1/120,-1,{pressed:false,held:false});
  assert.ok(p.x>=400);assert.ok(p.grounded);
  for(let i=0;i<250;i++)p.step(1/120,1,{pressed:false,held:false});assert.ok(p.x>1050);
});

test('camera damping is stable across rates, clamped, and stationary after settling',()=>{
  const ends=[];
  for(const hz of [20,60,120]) {
    const camera={scrollX:0,scrollY:0,roundPixels:true,setBounds(){},setScroll(x:number,y:number){this.scrollX=x;this.scrollY=y;}};
    const rig=new CameraController(camera as never,map.width,map.height);rig.reset(160,900);
    for(let i=0;i<hz*3;i++){rig.update(1/hz,5000,3000);assert.ok(camera.scrollX>=0&&camera.scrollX<=2560);assert.ok(camera.scrollY>=0&&camera.scrollY<=1120);}
    ends.push([camera.scrollX,camera.scrollY]);
    rig.reset(160,900);for(let i=0;i<hz;i++)rig.update(1/hz,160,900);assert.equal(camera.scrollX,0);assert.equal(camera.scrollY,420);
  }
  assert.ok(Math.abs(ends[0][0]-ends[2][0])<1e-7);assert.ok(Math.abs(ends[0][1]-ends[2][1])<1e-7);
});

test('camera retains the fox through rapid reversals and repeated real jumps',()=>{
  const p=createLevelMotor(map);
  const c={scrollX:0,scrollY:0,roundPixels:false,setBounds(){},setScroll(x:number,y:number){this.scrollX=x;this.scrollY=y;}};
  const rig=new CameraController(c as never,map.width,map.height);rig.reset(p.x,p.y);
  for(let i=0;i<1200;i++){
    p.step(1/120,Math.floor(i/180)%2?-1:1,{pressed:i%108===0,held:i%108<90});
    rig.update(1/120,p.x,p.y);assert.ok(!p.collides(p.x));
    assert.ok(p.y-c.scrollY>=164&&p.y-c.scrollY<690);
  }
});
