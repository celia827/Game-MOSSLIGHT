import test from 'node:test';
import assert from 'node:assert/strict';
import {FoxBones} from '../src/characters/fox/FoxBones.ts';
import {FoxBodySkin} from '../src/characters/fox/FoxBodySkin.ts';
import {KEY_POSES} from '../src/animation-lab/poses.ts';
test('scarf preserves original artwork in bind and cloth inertia leaves the collar anchored',()=>{
 const b=new FoxBones(),skin=new FoxBodySkin(b);
 for(let y=110;y<=142;y+=2)for(let x=96;x<=139;x+=2){const p={x,y},q=skin.scarf(p);assert.ok(Math.hypot(q.x-x,q.y-y)<1e-6);}
 b.setPose({coatHem:{angle:.08}});const knot=skin.scarf({x:106,y:123}),end=skin.scarf({x:100,y:140});
 assert.ok(Math.hypot(knot.x-106,knot.y-123)<1e-6);assert.ok(Math.abs(end.x-100)>1);
});
test('scarf wrap and free end remain continuous and never flip across authored poses',()=>{
 for(const pose of KEY_POSES){const b=new FoxBones();b.setPose(pose.bones);const skin=new FoxBodySkin(b);
 for(let y=110;y<143;y+=1)for(let x=96;x<140;x+=1){const a=skin.scarf({x,y}),z=skin.scarf({x:x+.02,y}),v=skin.scarf({x,y:y+.02});assert.ok((z.x-a.x)*(v.y-a.y)-(z.y-a.y)*(v.x-a.x)>0,`${pose.id}: ${x},${y}`);}
 }
});
