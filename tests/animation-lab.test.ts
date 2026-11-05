import test from 'node:test';
import assert from 'node:assert/strict';
import {KEY_POSES} from '../src/animation-lab/poses.ts';
import {LabPoseModel} from '../src/animation-lab/LabPoseModel.ts';
import {LabSkin} from '../src/animation-lab/LabSkin.ts';
import {FoxBones,FOX_BONES,LEG_BIND} from '../src/characters/fox/FoxBones.ts';
import {RIG_PARTS} from '../src/characters/fox/CharacterConfig.ts';
const close=(a:number,b:number,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} / ${b}`);
const length=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);

test('six complete independent poses share all 35 existing bone definitions',()=>{
  assert.deepEqual(KEY_POSES.map(p=>p.id),['IDLE','RUN','ANTICIPATION','AIRBORNE','FALL_PREPARE','LAND_IMPACT']);
  for(const p of KEY_POSES)for(const def of FOX_BONES){const b=p.bones[def.id];assert.ok(b&&Number.isFinite(b.angle+b.x+b.y));assert.ok(b.angle>=def.min&&b.angle<=def.max,`${p.id}/${def.id}`);}
  assert.notEqual(KEY_POSES[0].bones.pelvis,KEY_POSES[1].bones.pelvis);
});
test('all posed legs retain their source bone lengths and exact foot goals without a simulation',()=>{
  for(const pose of KEY_POSES){
    const model=new LabPoseModel(pose.id),bones=model.bones;
    LEG_BIND.forEach((ids,i)=>{
      close(length(bones.position(ids.hip),bones.position(ids.knee)),length(bones.rest(ids.hip),bones.rest(ids.knee)));
      close(length(bones.position(ids.knee),bones.position(ids.ankle)),length(bones.rest(ids.knee),bones.rest(ids.ankle)));
      // Matching lengths alone is insufficient: clamping a hip after IK can
      // translate the next joint away from its painted parent attachment.
      for(const [parent,child] of [[ids.hip,ids.knee],[ids.knee,ids.ankle]] as const){const a=bones.skin(parent,bones.rest(child)),z=bones.position(child);close(a.x,z.x);close(a.y,z.y);}
      const sole=model.map(i?'far-leg':'near-leg',bones.rest(ids.foot));close(sole.x,pose.feet[i].sole.x);close(sole.y,pose.feet[i].sole.y);
    });
    assert.ok(bones.angle('nearKnee')>-.00001&&bones.angle('farKnee')>-.05,pose.id);
  }
});
test('crouch and impact use bent spines, deep knees and independently compensated heads',()=>{
  const idle=new LabPoseModel('IDLE'),crouch=new LabPoseModel('ANTICIPATION'),land=new LabPoseModel('LAND_IMPACT');
  for(const m of [crouch,land]){
    assert.ok(m.bones.position('pelvis').y-idle.bones.position('pelvis').y>12);
    assert.ok(m.bones.angle('lowerSpine')>.5&&m.bones.angle('chest')>.1);
    assert.ok(m.bones.angle('nearKnee')>1.8&&m.bones.angle('farKnee')>1.7);
    assert.ok(m.bones.worldAngle('chest')-m.bones.worldAngle('head')>.3);
    const a=m.bones.position('pelvis'),b=m.bones.position('lowerSpine'),c=m.bones.position('chest');
    assert.ok(Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))>100);
  }
  assert.ok(land.bones.position('pelvis').y>=crouch.bones.position('pelvis').y+3);
  assert.ok(crouch.bones.position('nearHand').x<crouch.bones.position('chest').x);
  assert.ok(land.bones.position('nearHand').x>land.bones.position('chest').x);
});
test('walk, run and airborne have deliberate and different leg/arm silhouettes',()=>{
  const walk=new LabPoseModel('WALK'),run=new LabPoseModel('RUN'),air=new LabPoseModel('AIRBORNE');
  assert.ok(walk.bones.position('nearFoot').x-walk.bones.position('farFoot').x>17);
  assert.ok(run.bones.position('nearFoot').y<walk.bones.position('nearFoot').y-15);
  assert.ok(Math.abs(run.bones.angle('nearElbow'))>.9&&Math.abs(run.bones.angle('farElbow'))>.8);
  assert.ok(run.bones.angle('lowerSpine')>walk.bones.angle('lowerSpine')+.1);
  assert.ok(air.bones.position('nearFoot').y<200&&air.bones.position('farFoot').y<200);
  assert.ok(air.bones.position('nearHand').x>air.bones.position('nearShoulder').x+15);
});
test('curved garment keeps shoulder sockets and backpack mounts attached, boots and face stay rigid',()=>{
  for(const pose of KEY_POSES){
    const m=new LabPoseModel(pose.id),b=m.bones,skin=new LabSkin(b);
    for(const id of ['nearShoulder','farShoulder','backpack'] as const){const p=skin.torso(b.rest(id)),q=b.position(id);close(p.x,q.x);close(p.y,q.y);}
    for(const [part,a,z] of [['near-leg',{x:110,y:209},{x:143,y:206}],['far-leg',{x:121,y:204},{x:148,y:202}],['head',{x:145,y:85},{x:174,y:99}]] as const)close(length(m.map(part,a),m.map(part,z)),length(a,z));
    const tail=m.map('tail',{x:108,y:170}),coat=m.map('coat-side',{x:108,y:170});close(tail.x,coat.x);close(tail.y,coat.y);
    for(const part of RIG_PARTS)for(const p of [{x:part.bounds[0],y:part.bounds[1]},{x:part.bounds[2],y:part.bounds[3]}]){const q=m.map(part.id,p);assert.ok(Number.isFinite(q.x+q.y));}
  }
});
test('new laboratory skin returns original coordinates in bind and remains continuous at waist/chest seams',()=>{
  const b=new FoxBones(),skin=new LabSkin(b);
  for(const part of RIG_PARTS)for(let j=0;j<20;j++){
    const p={x:part.bounds[0]+(part.bounds[2]-part.bounds[0])*j/20,y:part.bounds[1]+(part.bounds[3]-part.bounds[1])*j/20},q=skin.map(part.id,p);close(q.x,p.x);close(q.y,p.y);
  }
  b.setPose(KEY_POSES.find(p=>p.id==='LAND_IMPACT')!.bones);
  for(const y of [112,136,156,170])for(const x of [105,120,136]){const a=skin.torso({x,y:y-.001}),z=skin.torso({x,y:y+.001});assert.ok(length(a,z)<.01);}
});
test('deep garment bending and hem gathering never invert a cloth patch',()=>{
  for(const pose of KEY_POSES){
    const m=new LabPoseModel(pose.id);
    for(let x=104;x<138;x+=2)for(let y=116;y<174;y+=2){
      const a=m.map('coat-side',{x,y}),b=m.map('coat-side',{x:x+.1,y}),c=m.map('coat-side',{x,y:y+.1});
      const area=((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))/.01;
      assert.ok(area>.02,`${pose.id} cloth fold at ${x},${y}: ${area}`);
    }
  }
});
