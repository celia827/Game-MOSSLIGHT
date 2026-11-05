import {preE2Source} from './helpers/accepted-source.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AdventureModel,DEW_IDS,SONG,safeRest,parseSave,songFlowers} from '../src/adventure/AdventureModel.ts';
import {Level01MapData as map} from '../src/levels/level01/Level01MapData.ts';
import before from '../docs/adventure-v1/protected-before.json' with {type:'json'};

test('Adventure V1 changes only the scene adapter and collectible restore among existing product sources/assets',()=>{
  const allowed=new Set(['src/scenes/Level01Scene.ts','src/collectibles/ForestCollectibleSystem.ts']);
  for(const[file,hash]of Object.entries(before))if(!allowed.has(file))assert.equal(createHash('sha256').update(preE2Source(file)).digest('hex'),hash,file);
});
test('Main route ends a journey without forcing either optional collectible or puzzle',()=>{
  const m=new AdventureModel();assert.equal(m.arrive(),true);assert.equal(m.arrived,true);assert.equal(m.complete,false);assert.equal(m.arrive(),false);assert.equal(m.song,false);assert.match(m.hint,/树冠/);
});
test('Dew rewards are unique; both collection orders and post-arrival exploration unlock full bloom',()=>{
  for(const order of [[...DEW_IDS],[...DEW_IDS].reverse()]){
    const m=new AdventureModel();m.arrive();assert.equal(m.collect('unknown'),false);
    for(const id of order){assert.equal(m.collect(id),true);assert.equal(m.collect(id),false);}
    assert.equal(m.complete,true);assert.equal(m.dew.size,2);
  }
  const m=new AdventureModel();DEW_IDS.forEach(id=>m.collect(id));assert.equal(m.complete,false);m.arrive();assert.equal(m.complete,true);
});
test('Listening garden teaches the same sequence visually; held/waiting answers cannot skip notes',()=>{
  const m=new AdventureModel();assert.equal(m.answer(2),'listen');assert.equal(m.singing,0);assert.equal(m.answer(0),'wait');m.update(.9);assert.equal(m.singing,2);m.update(.9);assert.equal(m.singing,1);m.update(1.4);assert.equal(m.listening,false);
  for(const [i,n]of SONG.entries())assert.equal(m.answer(n),i===2?'solved':'correct');assert.equal(m.song,true);assert.equal(m.answer(0),'done');
});
test('Wrong notes are recoverable without losing exploration and replay has no time limit',()=>{
  const m=new AdventureModel();m.collect(DEW_IDS[0]);m.answer(0);m.update(4);m.answer(0);assert.equal(m.answer(1),'wrong');assert.equal(m.step,0);assert.equal(m.dew.size,1);m.update(4);m.update(10000);assert.equal(m.answer(0),'correct');m.replay();assert.equal(m.step,0);m.update(4);SONG.forEach(n=>m.answer(n));assert.ok(m.song);
});
test('Map/journal pause freezes puzzle clock and replay progress',()=>{
  const m=new AdventureModel();m.answer(0);m.update(100,true);assert.equal(m.listenTime,0);assert.equal(m.clock,0);m.update(NaN);assert.equal(m.clock,0);m.update(-1);assert.equal(m.clock,0);
});
test('Flower positions are within the real resting platform; no new collision or impossible jump',()=>{
  const flowers=songFlowers(map);assert.deepEqual(flowers.map(f=>[f.x,f.y]),[[1990,400],[2090,400],[2190,400]]);assert.equal(map.modules.length,35);assert.ok(flowers.every((f,i)=>i===0||f.x-flowers[i-1].x>74));
});
test('Save roundtrip restores rewards and finished journey, but not a half-played melody',()=>{
  const m=new AdventureModel();m.arrive();DEW_IDS.forEach(id=>m.collect(id));m.answer(0);m.update(4);m.answer(0);
  const s=parseSave(JSON.stringify(m.save({x:1810,moduleId:'crown-secret-perch'})),map)!;
  const restored=new AdventureModel(s);assert.ok(restored.complete);assert.equal(restored.step,0);assert.equal(restored.listening,false);assert.deepEqual(safeRest(map,s.rest),{x:1810,y:320,supportId:'crown-secret-perch'});
});
test('Invalid/old/corrupt saves cannot place the player outside a known static safe surface',()=>{
  for(const raw of ['broken','null','{}','{"version":2,"dew":[]}'])assert.equal(parseSave(raw,map),null);
  for(const r of [null,{x:0,moduleId:'entry'},{x:99999,moduleId:'entry'},{x:160,moduleId:'mossleaf-lift'},{x:NaN,moduleId:'entry'},{x:160,moduleId:'root-wall'}])assert.equal(safeRest(map,r),null);
  const s=parseSave(JSON.stringify({version:1,dew:[DEW_IDS[0],DEW_IDS[0],'bad',5],arrived:true,song:false,rest:{x:0,moduleId:'missing'}}),map)!;assert.deepEqual(s.dew,[DEW_IDS[0]]);assert.equal(s.rest,null);
});
test('New journey clears all rewards, completion, melody state and counters',()=>{
  const m=new AdventureModel();DEW_IDS.forEach(id=>m.collect(id));m.arrive();m.answer(0);m.update(4);SONG.forEach(n=>m.answer(n));m.reset();assert.equal(m.arrived,false);assert.equal(m.complete,false);assert.equal(m.song,false);assert.equal(m.dew.size,0);assert.equal(m.step,0);assert.equal(m.introduced,false);assert.equal(m.clock,0);
});
