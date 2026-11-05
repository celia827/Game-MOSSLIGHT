import {acceptedSource} from './helpers/accepted-source.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import frames from '../src/art/b1/frames.json' with {type:'json'};
import {Level01MapData as map} from '../src/levels/level01/Level01MapData.ts';
import protectedFiles from '../docs/art-b1/protected-before.json' with {type:'json'};
test('B1 protects accepted map, physics, rig and camera byte for byte',()=>{
 for(const [file,hash] of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(acceptedSource(file)).digest('hex'),hash,file);
});
test('B1.1 five sample frames are anchored on the actual profile with bounded atlas allocation',()=>{
 assert.equal(Object.keys(frames).length,11);
 for(const f of Object.values(frames)){if(!f.moduleId)continue;const m=map.modules.find(m=>m.id===f.moduleId)!;assert.equal(f.width,m.width);assert.equal(f.height,m.height+64);assert.ok(f.x+f.width<=1024&&f.y+f.height<=1024);const svg=readFileSync(`public/assets/terrain/b1/${Object.entries(frames).find(([,x])=>x===f)![0]}.svg`,'utf8');for(const p of m.profile!)assert.ok(svg.includes(`${p.x} ${p.y+64}`));}
});
test('B1 SVG resources have local resolvable IDs and no external image dependency',()=>{
 const files=readdirSync('public/assets/terrain/b1').filter(n=>n.endsWith('.svg'));assert.equal(files.length,28);
 for(const file of files){const s=readFileSync('public/assets/terrain/b1/'+file,'utf8');const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file);for(const m of s.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(m[1]),file);assert.ok(!/<image|<script/.test(s));}
});
test('B1.1 atlas frames never overlap and art rollout stays limited to five modules',()=>{
 const boxes=Object.entries(frames);
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const [an,a]=boxes[i],[bn,b]=boxes[j];
  assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${an} overlaps ${bn}`);
 }
 assert.deepEqual(Object.values(frames).filter(f=>f.moduleId).map(f=>f.moduleId).sort(),['entry','crown-up-2','crown-up-3','crown-rest','cave-east'].sort());
});
