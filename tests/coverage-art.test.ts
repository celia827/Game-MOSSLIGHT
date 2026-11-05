import test from 'node:test';import assert from 'node:assert/strict';import {Level01MapData as map} from '../src/levels/level01/Level01MapData.ts';
import {surfaceStrips,bodyBands,isSurfaceTarget} from '../src/art/surface/layout.ts';import {polygonArea,coverageRows,type CoverageProof} from '../src/art/surface/coverage.ts';
const targets=map.modules.filter(isSurfaceTarget);
test('surface scope includes two main-view D portals but no deep cave or additional canopy',()=>{assert.equal(map.modules.length,35);assert.equal(targets.length,7);assert.deepEqual(targets.filter(m=>m.region==='D').map(m=>m.id),['cave-west-return','cave-return']);});
test('all shallow/deep bands cover the full solid polygon once without filling any passage',()=>{
 for(const m of targets){let area=0;const strips=surfaceStrips(m);for(const s of strips){let end0=s.y0,end1=s.y1;for(const b of bodyBands(s)){
  assert.equal(b.t0,end0);assert.equal(b.t1,end1);assert.ok(b.b0>=b.t0&&b.b1>=b.t1&&b.b0<=m.height&&b.b1<=m.height);assert.ok(b.b0-b.t0<=(b.depth?256:448));assert.ok(b.b1-b.t1<=(b.depth?256:448));area+=(s.x1-s.x0)*((b.b0-b.t0)+(b.b1-b.t1))/2;end0=b.b0;end1=b.b1;
 }assert.equal(end0,m.height);assert.equal(end1,m.height);}assert.ok(Math.abs(area-polygonArea(m))<1e-6,m.id);}
});
test('coverage audit rejects a missing mesh, stale legacy overdraw and top-only artwork',()=>{
 const proofs=new Map<string,CoverageProof>(targets.map(m=>[m.id,{area:polygonArea(m),layers:['test'],patches:1,boundedUV:true}]));const names=new Set(targets.map(m=>`surface:${m.id}`));
 assert.equal(coverageRows(map,proofs,names).filter(r=>r.target&&r.full).length,7);
 names.delete('surface:cave-return');assert.equal(coverageRows(map,proofs,names).find(r=>r.id==='cave-return')!.full,false);
 names.add('surface:cave-return');names.add('cave-return');assert.equal(coverageRows(map,proofs,names).find(r=>r.id==='cave-return')!.legacyFill,true);assert.equal(coverageRows(map,proofs,names).find(r=>r.id==='cave-return')!.full,false);names.delete('cave-return');
 proofs.get('entry')!.area=100;assert.equal(coverageRows(map,proofs,names).find(r=>r.id==='entry')!.onlyTop,true);
});
