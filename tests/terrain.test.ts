import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCollision,surfaceY} from '../src/world/terrain/geometry.ts';
import type { TerrainDefinition } from '../src/world/terrain/types.ts';

const ground: TerrainDefinition={id:'ground',kind:'ground',x:0,y:490,width:1280,height:230};
const platform: TerrainDefinition={id:'platform',kind:'platform',x:843,y:451,width:349.2,height:155.2};
const close=(a: number,b: number,epsilon=1e-5)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);

test('ground provides continuous support across the full design viewport',()=>{
  for(let x=0;x<=1280;x+=2) {
    const y=surfaceY(ground,x);
    assert.ok(y!==undefined&&Number.isFinite(y));
    if(x>0) assert.ok(Math.abs(y!-surfaceY(ground,x-2)!)<2);
  }
  close(surfaceY(ground,0)!,552); close(surfaceY(ground,1280)!,539);
  assert.equal(surfaceY(ground,-1),undefined);
  assert.equal(surfaceY(ground,1281),undefined);
  assert.equal(surfaceY(ground,NaN),undefined);
});
test('platform position, width and height transform support and solids together',()=>{
  const changed={...platform,x:780,y:430,width:420,height:205};
  for(const f of [.1,.3,.6,.9]) {
    const y=surfaceY(platform,platform.x+platform.width*f)!;
    const next=surfaceY(changed,changed.x+changed.width*f)!;
    close((next-changed.y)/changed.height,(y-platform.y)/platform.height);
  }
  const a=buildCollision(platform),b=buildCollision(changed);
  assert.ok(a.top.length>20&&b.top.length>20);
  for(const p of b.top) close(p.y,surfaceY(changed,p.x)!,1e-4);
  close(b.polygon[b.top.length].x,changed.x+326/360*changed.width);
});
test('collision samples follow both visible tops and remain valid polygons',()=>{
  for(const def of [ground,platform]) {
    const shape=buildCollision(def);
    assert.ok(shape.polygon.length>shape.top.length);
    for(const p of shape.top) close(p.y,surfaceY(def,p.x)!,1e-4);
    for(let i=1;i<shape.top.length;i++) assert.ok(shape.top[i].x>shape.top[i-1].x);
    assert.ok(shape.polygon.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  }
});
test('fox foot anchor has a ground support and raised platform stays above the floor',()=>{
  const footY=surfaceY(ground,414.2)!;
  assert.ok(footY>535&&footY<550);
  const top=surfaceY(platform,980)!;
  assert.ok(surfaceY(ground,980)!-top>50);
});
test('invalid terrain dimensions cannot produce an art/collision mismatch',()=>{
  for(const size of [0,-1,Infinity,NaN]) {
    assert.throws(()=>buildCollision({...platform,width:size}));
    assert.throws(()=>surfaceY({...platform,height:size},980));
  }
});
