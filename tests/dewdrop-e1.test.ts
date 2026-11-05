import {preE2Source} from './helpers/accepted-source.ts';
import {preAdventureSource} from './helpers/accepted-source.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {CollectibleModel,PICKUP_SECONDS,type Collector} from '../src/collectibles/CollectibleModel.ts';
import {collectibleVisual} from '../src/collectibles/CollectibleVisual.ts';
import {level01Collectibles} from '../src/collectibles/Level01Collectibles.ts';
import {Level01MapData as map} from '../src/levels/level01/Level01MapData.ts';
import {createLevelMotor} from '../src/levels/shared/MapCollision.ts';
import {RoutePilot,type TestRoute} from '../src/levels/level01/Level01Routes.ts';
import before from '../docs/dewdrop-e1/protected-before.json' with {type:'json'};
import frames from '../src/collectibles/frames.json' with {type:'json'};
const defs=level01Collectibles(map),probe=(x:number,y:number):Collector=>({x,y,halfWidth:18,height:164});
test('E1 historical scene hooks and all current prior map/Fox/physics/camera/environment/art/D1/D2/D3 bytes survive Adventure V1',()=>{
  for(const[f,h]of Object.entries(before))if(f!=='src/scenes/Level01Scene.ts')assert.equal(createHash('sha256').update(preE2Source(f)).digest('hex'),h,f);
  const scene=preAdventureSource('src/scenes/Level01Scene.ts').toString().replace(/^import.*from '..\/collectibles\/.*';\n/gm,'').replace('  private collectibles?:ForestCollectibleSystem;\n','').replace('preloadInteractions(this);preloadCollectibles(this);','preloadInteractions(this);').replace('    this.collectibles=new ForestCollectibleSystem(this,level01Collectibles(map));\n','').replace('this.interactions?.reset();this.collectibles?.reset();','this.interactions?.reset();').replace('    this.collectibles?.update(dt,p,open);\n','');
  assert.equal(scene,readFileSync('docs/dewdrop-e1/baseline/src/scenes/Level01Scene.ts','utf8'));
});
test('E1 derives exact positions from TWO original safe landmarks, with distinct collectible IDs',()=>{
  assert.deepEqual(defs.map(d=>({id:d.id,x:d.x,y:d.y,anchor:d.anchor})),[
    {id:'dew-canopy-lookout',x:1810,y:278,anchor:{moduleId:'crown-secret-perch',surfaceY:320}},
    {id:'dew-hidden-roots',x:1860,y:1548,anchor:{moduleId:'secret-alcove',surfaceY:1590}},
  ]);
  assert.ok(defs.every(d=>!map.landmarks!.some(n=>n.id===d.id)));assert.equal(map.modules.length,35);
});
test('E1 collects once per session, callback count matches, and R-model reset restores both',()=>{
  const events:number[]=[];const m=new CollectibleModel(defs,(_,count)=>events.push(count));
  for(const d of defs)for(let i=0;i<1000;i++)m.update(1/60,probe(d.x,d.anchor.surfaceY));
  assert.deepEqual(events,[1,2]);assert.equal(m.count,2);assert.ok(m.states.every(s=>s.collected&&s.elapsed===PICKUP_SECONDS));
  m.reset();assert.equal(m.count,0);assert.ok(m.states.every(s=>!s.collected&&s.elapsed===0));
  m.update(0,probe(defs[0].x,320));assert.deepEqual(events,[1,2,1]);
});
test('E1 prevents pickups across the lower resting branch and upper cave shortcut',()=>{
  const m=new CollectibleModel(defs);m.update(1,probe(1810,420));m.update(1,probe(1860,1480));assert.equal(m.count,0);
  m.update(0,probe(1767,320));assert.equal(m.count,1);m.update(0,probe(1815,1590));assert.equal(m.count,1);
  m.update(0,probe(1817,1590));assert.equal(m.count,2);
});
test('E1 pause stops collection AND the response timer; disabled/out-of-range pickups are ignored',()=>{
  const m=new CollectibleModel(defs);m.update(1,probe(1810,320),true);assert.equal(m.count,0);
  m.update(0,probe(1810,320));m.update(1,probe(0,0),true);assert.equal(m.states[0].elapsed,0);
  const disabled=new CollectibleModel([{...defs[0],enabled:false}]);disabled.update(1,probe(1810,320));assert.equal(disabled.count,0);
});
test('E1 rejects duplicate/invalid definitions and snapshots immutable anchor data',()=>{
  assert.throws(()=>new CollectibleModel([defs[0],defs[0]]),/Duplicate/);
  assert.throws(()=>new CollectibleModel([{...defs[0],radius:0}]),/Invalid/);
  assert.throws(()=>new CollectibleModel([{...defs[0],x:NaN}]),/Invalid/);
  const d={...defs[0],anchor:{...defs[0].anchor}},m=new CollectibleModel([d]);d.anchor.surfaceY=0;assert.equal(m.states[0].definition.anchor.surfaceY,320);
});
test('E1 response is finite, local, continuous and ends invisible; no randomization or new objects',()=>{
  const a=collectibleVisual(0,false,0);assert.equal(a.alpha,1);assert.equal(a.visible,true);
  let previous=a.scale;for(let t=0;t<=.801;t+=.001){const f=collectibleVisual(0,true,t);assert.ok(Number.isFinite(f.scale)&&f.scale>=0);assert.ok(Math.abs(f.scale-previous)<.012);previous=f.scale;}
  const end=collectibleVisual(0,true,.8);assert.equal(end.visible,false);assert.equal(end.alpha,0);assert.equal(end.scale,0);
});
for(const [route,count]of [['main',0],['lookout',1],['hidden',1],['hidden-return',1],['canopy-return',0]] as [TestRoute,number][])for(const fps of [30,60,120])test(`E1 actual unchanged motor ${route} at ${fps}Hz: reward ${count}, safe original return`,()=>{
  const p=createLevelMotor(map),pilot=new RoutePilot(route),m=new CollectibleModel(defs);let overlaps=0;
  for(let i=0;i<fps*110&&!pilot.done&&!pilot.failed;i++){const q=pilot.next(p,1/fps);p.step(1/fps,q.axis,q.jump,q.walking);m.update(1/fps,probe(p.x,p.y));if(p.collides(p.x,p.y))overlaps++;}
  assert.equal(pilot.done,true);assert.equal(m.count,count);assert.equal(overlaps,0);assert.equal(p.supportId,route==='hidden-return'?'entry':'clearing');
});
test('E1 three-frame shared atlas is small, nonoverlapping and uses unique locally-resolved SVG IDs',()=>{
  const svg=readFileSync('public/assets/collectibles/dewdrop-atlas.svg','utf8'),ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);assert.ok(!/<image|<script/.test(svg));
  for(const match of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(match[1]));
  const f=Object.values(frames);assert.equal(f.length,3);for(let i=0;i<f.length;i++){const a=f[i];assert.ok(a.x>=2&&a.y>=2&&a.x+a.width<=200&&a.y+a.height<=100);for(let j=i+1;j<f.length;j++){const b=f[j];assert.ok(a.x+a.width<b.x||b.x+b.width<a.x||a.y+a.height<b.y||b.y+b.height<a.y);}}
});
