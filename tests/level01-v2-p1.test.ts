import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {createV2Map,V2_DESIGN,V2_GAMEPLAY,v2Checkpoints,v2Collectibles,v2Interactions,v2MovingPlatforms} from '../src/levels/level01v2/V2Config.ts';
import {V2Rescue} from '../src/levels/level01v2/V2Rescue.ts';
import {createLevelMotor,validateLevel} from '../src/levels/shared/MapCollision.ts';
import {CheckpointModel} from '../src/checkpoints/CheckpointModel.ts';
import {RespawnController} from '../src/checkpoints/RespawnController.ts';
import {CollectibleModel} from '../src/collectibles/CollectibleModel.ts';
import {MovingPlatformWorld} from '../src/mechanisms/MovingPlatformWorld.ts';
import {V2RoutePilot} from '../src/levels/level01v2/V2RoutePilot.ts';
import {preP1LayoutSource} from './helpers/accepted-source.ts';
import {Level01MapData as V1} from '../src/levels/level01/Level01MapData.ts';

test('P1 shipped map/gameplay source copies exactly match the approved originals',()=>{
 for(const name of ['level-v2-c11.design.json','gameplay-c11.design.json'])assert.deepEqual(readFileSync(`src/levels/level01v2/design/${name}`),readFileSync(`docs/level-v2-f2c11/${name}`));
 for(const mode of ['OPEN','FOLDED'] as const){const map=createV2Map(mode);assert.deepEqual(validateLevel(map),[]);assert.equal(map.modules.length,mode==='OPEN'?43:42);assert.deepEqual(map.modules,V2_DESIGN.modules.filter(m=>mode==='OPEN'||m.id!=='cave-shortcut-east'));}
 assert.equal(V1.modules.length,35);assert.notEqual(V1.id,createV2Map('OPEN').id);
});
test('V2 optional checkpoint injection preserves every original E2 byte after removing exactly the three injection edits',()=>assert.deepEqual(preP1LayoutSource('src/checkpoints/CheckpointSystem.ts'),readFileSync('docs/level-v2-f2c2-p1/baseline/src/checkpoints/CheckpointSystem.ts')));
test('current protected V1 motor, map, animations, art, camera, environment and rules stay unchanged',()=>{
 const before=JSON.parse(readFileSync('docs/level-v2-f2c2-p1/evidence/before-sha256.json','utf8'));
 const allowed=['src/checkpoints/CheckpointSystem.ts','src/adventure/AdventureSystem.ts','tests/helpers/accepted-source.ts','tests/player-f2a.test.ts','vite.config.ts'];
 const sourceRoots=['src/','public/','tests/','scripts/','level01/','animation-lab/','art-lab/'];
 const configs=['AGENTS.md','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts'];
 for(const [file,hash] of Object.entries(before)){
  // The game-only workspace excludes historical reports/exports and Finder metadata.
  // Keep original hashes intact and protect every game source, asset and config.
  if(file.split('/').at(-1)==='.DS_Store')continue;
  if(!sourceRoots.some(root=>file.startsWith(root))&&!configs.includes(file))continue;
  if(!allowed.includes(file))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),hash,file);
 }
});
test('all V2 existing-system anchors come from its own map data and remain safe in either static bridge mode',()=>{
 assert.deepEqual(v2MovingPlatforms(),V2_DESIGN.movingPlatforms);
 for(const mode of ['OPEN','FOLDED'] as const){const p=createLevelMotor(createV2Map(mode));for(const cp of v2Checkpoints()){assert.ok(!p.collides(cp.respawnPosition.x,cp.respawnPosition.y));assert.equal(p.world.surface(cp.respawnPosition.x,cp.surfaceId),cp.respawnPosition.y);}
 for(const d of v2Collectibles())assert.equal(p.world.surface(d.x,d.anchor.moduleId),d.anchor.surfaceY);
 for(const d of v2Interactions()){const source=V2_DESIGN.interactions.find(x=>x.id===d.id)!;assert.equal(d.x,source.x);assert.equal(d.y,source.y);}
 }
});
test('rescue ignores pause/settlement, deduplicates threshold frames, rearms only after stable safe landing and resets',()=>{
 const rescue=new V2Rescue(),r=V2_GAMEPLAY.rescueBand.rect,p={x:r.x+20,y:r.y,grounded:false};let requests=0;
 rescue.update(p,true,()=>{requests++;return true;});assert.equal(requests,0);
 for(let i=0;i<20;i++)rescue.update(p,false,()=>{requests++;return true;});assert.equal(requests,1);
 rescue.update({...p,y:900},false,()=>true);rescue.update(p,false,()=>{requests++;return true;});assert.equal(requests,1);
 rescue.update({...p,y:900,grounded:true},false,()=>true);rescue.update(p,false,()=>{requests++;return true;});assert.equal(requests,2);
 rescue.reset();assert.equal(rescue.requests,0);assert.equal(rescue.lastRequest,null);
});
for(const index of [-1,0,1])test(`production rescue target ${index<0?'spawn':`CP${index+1}`} preserves dew, clears motion, detaches lift and resets camera`,()=>{
 const map=createV2Map('OPEN'),p=createLevelMotor(map),cp=new CheckpointModel(v2Checkpoints()),dew=new CollectibleModel(v2Collectibles()),moving=new MovingPlatformWorld(v2MovingPlatforms());p.world.setDynamicPlatforms(moving);
 for(const d of dew.states)dew.update(1,{x:d.definition.x,y:d.definition.anchor.surfaceY,halfWidth:18,height:164});assert.equal(dew.count,2);
 if(index>=0){const d=cp.states[index].definition;cp.update(0,{...d.worldPosition,grounded:true,supportId:d.surfaceId});}
 let camera:{x:number;y:number}|null=null,restores=0;const respawn=new RespawnController(p,map,cp,{before:()=>{},restoreAnimation:()=>restores++,resetCamera:(x,y)=>camera={x,y},detachPlatform:()=>moving.observe(p)});
 p.x=750;p.y=1510;p.velocity=128;p.velocityY=700;p.grounded=false;p.supportId='mossleaf-lift';p.bufferTimer=.1;p.coyoteTimer=.1;
 const rescue=new V2Rescue();rescue.update(p,false,(reason,id)=>respawn.requestRespawn(reason,id));assert.equal(respawn.flush(1,true),null);assert.equal(p.y,1510);
 const result=respawn.flush(2)!;assert.ok(result.ok);assert.equal(result.checkpointId,index<0?null:cp.states[index].definition.checkpointId);assert.equal(p.velocity,0);assert.equal(p.velocityY,0);assert.equal(p.bufferTimer,0);assert.equal(p.coyoteTimer,0);assert.equal(restores,1);assert.deepEqual(camera,{x:result.target!.x,y:result.target!.y});assert.equal(dew.count,2);assert.equal(moving.snapshot(p).contact,'separated');assert.equal(respawn.flush(2),null);
});
for(const mode of ['OPEN','FOLDED'] as const)for(const hz of [20,30,60,120])test(`V2 continuous production ${mode} ${hz}Hz main route requires no relocation and fits all collision surfaces`,()=>{
 const p=createLevelMotor(createV2Map(mode)),pilot=new V2RoutePilot('main'),moving=new MovingPlatformWorld(v2MovingPlatforms());p.world.setDynamicPlatforms(moving);let held=false;
 for(let n=0;n<hz*80&&!pilot.done&&!pilot.failed;n++){const k=pilot.next(p,1/hz);p.step(1/hz,k.axis,{pressed:k.jump&&!held,held:k.jump});held=k.jump;assert.ok(!p.collides(p.x,p.y));}
 assert.ok(pilot.done,pilot.error);assert.ok(Math.abs(p.x-V2_DESIGN.finish.x)<3);assert.equal(p.supportId,'clearing');
});
