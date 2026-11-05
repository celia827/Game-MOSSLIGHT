import test from 'node:test';
import assert from 'node:assert/strict';
import {JumpTimeline,JUMP_DURATION} from '../src/animation-lab/JumpTimeline.ts';
import {FoxBones} from '../src/characters/fox/FoxBones.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {FOX_POSES,ANIMATION_CONFIG} from '../src/characters/fox/FoxPoseLibrary.ts';
import {KEY_POSES,LAB_GAME_POSE} from '../src/animation-lab/poses.ts';
const near=(a:number,b:number,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} / ${b}`);

test('tucked rear shin crosses the atan2 seam without reversing or translating its joint',()=>{
  const b=new FoxBones();b.setPose(FOX_POSES.JumpForwardPose.bones);b.solveLeg(1,{x:122,y:185},-.3,0);
  assert.ok(b.angle('farKnee')>1.2&&b.angle('farKnee')<2.7);
  for(const [parent,child] of [['farHip','farKnee'],['farKnee','farAnkle']] as const){const p=b.skin(parent,b.rest(child)),q=b.position(child);near(p.x,q.x);near(p.y,q.y);}
  near(b.position('farFoot').x,122);near(b.position('farFoot').y,185);
});
test('six poses expose different torso/leg/arm intentions, previous data remains available for comparison',()=>{
  assert.deepEqual(KEY_POSES.map(p=>p.id),['IDLE','RUN','ANTICIPATION','AIRBORNE','FALL_PREPARE','LAND_IMPACT']);
  const old=new FoxAnimationController('previous'),fresh=new FoxAnimationController();
  old.setPosePreview('JumpForwardPose');fresh.setPosePreview('JumpForwardPose');
  near(fresh.bones.worldAngle('head'),old.bones.worldAngle('head')); // Ground upgrade preserves jump targets.
  near(fresh.bones.worldAngle('chest'),old.bones.worldAngle('chest'));
  assert.ok(fresh.bones.angle('farKnee')>1.2);
  assert.ok(FOX_POSES.FallPreparePose.bones.lowerSpine!.angle!<FOX_POSES.JumpForwardPose.bones.lowerSpine!.angle!-.08);
  for(const key of KEY_POSES){fresh.setPosePreview(LAB_GAME_POSE[key.id]);assert.equal(fresh.bones.snapshot().length,35);}
  assert.ok(ANIMATION_CONFIG.anticipation>=.05&&ANIMATION_CONFIG.anticipation<=.08);
  assert.ok(ANIMATION_CONFIG.takeoff>=.06&&ANIMATION_CONFIG.takeoff<=.1);
});
test('timeline rewind and mixed-rate scrubbing reconstruct the SAME spring history',()=>{
  const a=new JumpTimeline(),b=new JumpTimeline();a.seek(.5);a.seek(1.25);a.seek(.72);
  b.seek(.72);assert.deepEqual(a.refined.bones.snapshot(),b.refined.bones.snapshot());
  for(const hz of [30,60,144]){const t=new JumpTimeline();for(let i=0;i<Math.ceil(.72*hz);i++)t.seek(Math.min(.72,(i+1)/hz));assert.deepEqual(t.refined.bones.snapshot(),b.refined.bones.snapshot());}
});
test('secondary off removes additive offsets while primary crouch, knees and elbows remain posed',()=>{
  const t=new JumpTimeline();t.seek(1.065,false,true);
  for(const a of [t.previous,t.refined])for(const value of Object.values(a.secondaryOffsets))near(value!,0);
  assert.ok(t.refined.bones.angle('lowerSpine')>.5);assert.ok(t.refined.bones.angle('nearElbow')<-.8);
  t.seek(1.065,true,true);assert.ok(Object.values(t.refined.secondaryOffsets).some(v=>Math.abs(v!)>.003));
});
test('full jump reaches each phase then settles to idle, with stable tail attachment and intact cloth',()=>{
  for(const travel of [false,true]){
    const t=new JumpTimeline(),phases=new Set<string>();let last=0,maxChange=0;
    for(let i=0;i<=Math.round(JUMP_DURATION*120);i++){
      t.seek(i/120,true,travel);const a=t.refined;phases.add(a.animationPhase);
      const angle=a.bones.angle('lowerSpine');if(i>2)maxChange=Math.max(maxChange,Math.abs(angle-last));last=angle;
      const tail=a.map('tail',{x:108,y:170}),body=a.map('coat-side',{x:108,y:170});near(tail.x,body.x);near(tail.y,body.y);
      for(const p of [{x:120,y:156},{x:134,y:161}]){const q=a.map('coat-side',p),r=a.map('coat-side',{x:p.x+.1,y:p.y}),s=a.map('coat-side',{x:p.x,y:p.y+.1});assert.ok((r.x-q.x)*(s.y-q.y)-(r.y-q.y)*(s.x-q.x)>0,'no inverted clothing patch');}
    }
    for(const phase of ['ANTICIPATION','TAKEOFF','ASCEND','APEX','DESCEND','LAND_IMPACT','LAND_RECOVER','IDLE'])assert.ok(phases.has(phase),phase);
    assert.equal(t.refined.state,'IDLE');assert.ok(maxChange<.22,`single-step pose jump ${maxChange}`);
  }
});
