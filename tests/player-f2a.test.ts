import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {level01DeveloperMode} from '../src/levels/level01/Level01Mode.ts';
import before from '../docs/player-f2a/protected-before.json' with {type:'json'};
import {preP1LayoutSource} from './helpers/accepted-source.ts';

test('F2-A changes only six presentation/entry adapters; current map/fox/physics/camera/art/interaction/E1/E2/E3 bytes stay intact',()=>{
 const allowed=new Set(['src/scenes/Level01Scene.ts','src/adventure/AdventureSystem.ts','src/adventure/AdventureUI.ts','level01/index.html','src/art/b1/gallery.ts','art-lab/index.html']);
 for(const[f,h]of Object.entries(before))if(!allowed.has(f))assert.equal(createHash('sha256').update(preP1LayoutSource(f)).digest('hex'),h,f);
});
for(const [search,expected]of [['',false],['?dev=1',true],['?dev=0',false],['?dev=true',false],['?dev',false],['?camera=before',false],['?artSample=cave',false],['?foo=1&dev=1',true]] as const)test(`mode opt-in ${search||'default'}`,()=>assert.equal(level01DeveloperMode(search),expected));
