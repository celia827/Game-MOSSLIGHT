import {acceptedSource} from './helpers/accepted-source.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {Level01MapData as map} from '../src/levels/level01/Level01MapData.ts';
import {surfaceStrips,isSurface,exposedEnds} from '../src/art/surface/layout.ts';
import {surfaceY} from '../src/world/terrain/geometry.ts';
import protectedFiles from '../docs/art-b2a/protected-before.json' with {type:'json'};
const targets=map.modules.filter(isSurface);
test('B2A keeps accepted collision, map, controller, animation and camera files byte-identical',()=>{for(const [file,hash] of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(acceptedSource(file)).digest('hex'),hash,file);});
test('B2A covers exactly the five surface modules and preserves all three openings',()=>{
 assert.deepEqual(targets.map(m=>m.id),['entry','west-deck','sunlit-bridge','return-bridge','clearing']);
 assert.deepEqual(targets.slice(1).map((m,i)=>m.x-targets[i].x-targets[i].width),[50,60,0,60]);
 assert.deepEqual(exposedEnds(targets[2],map.modules),[true,false]);assert.deepEqual(exposedEnds(targets[3],map.modules),[false,true]);
});
test('B2A mesh strips exactly follow every profile corner, stay inside module and use bounded reusable UVs',()=>{
 for(const m of targets){const strips=surfaceStrips(m);assert.equal(strips[0].x0,0);assert.equal(strips.at(-1)!.x1,m.width);
  for(const [i,s] of strips.entries()){
   assert.ok(s.x1>s.x0&&s.u0>=0&&s.u1<=256&&s.variant>=0&&s.variant<3);
   for(const x of [s.x0,(s.x0+s.x1)/2,s.x1])assert.ok(Math.abs(m.y+s.y0+(s.y1-s.y0)*(x-s.x0)/(s.x1-s.x0)-surfaceY(m,m.x+x)!)<1e-7);
   assert.ok(64+s.bottom-Math.min(s.y0,s.y1)<512);if(i)assert.equal(strips[i-1].x1,s.x0);
  }
  for(const p of m.profile!)assert.ok(strips.some(s=>s.x0===p.x||s.x1===p.x));assert.deepEqual(surfaceStrips(m),strips);
 }
});
test('B2A material atlas has unique local SVG IDs and three bounded frames',()=>{
 const svg=readFileSync('public/assets/terrain/surface/surface-atlas.svg','utf8');const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);
 for(const m of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(m[1]),m[1]);
 assert.match(svg,/width="780" height="1292"/);assert.ok(!/<image|<script/.test(svg));
 const f=JSON.parse(readFileSync('src/art/surface/frames.json','utf8'));assert.equal(Object.keys(f).length,9);
 for(const b of Object.values(f) as {x:number;y:number;width:number;height:number}[])assert.ok(b.x>=2&&b.y>=2&&b.x+b.width<=778&&b.y+b.height<=1290);
});
