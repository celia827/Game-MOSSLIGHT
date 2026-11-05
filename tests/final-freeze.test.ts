import test from 'node:test';
import assert from 'node:assert/strict';
import {JumpTimeline} from '../src/animation-lab/JumpTimeline.ts';
import {LabPoseModel} from '../src/animation-lab/LabPoseModel.ts';
import {FOX_POSES} from '../src/characters/fox/FoxPoseLibrary.ts';
import {FoxBones} from '../src/characters/fox/FoxBones.ts';
test('ear and tail switches isolate their offsets and reproduce after seeking backwards',()=>{
 const t=new JumpTimeline();t.seek(.48,true,true,true,1,false,true);
 for(const [id,v] of Object.entries(t.refined.secondaryOffsets))if(id.includes('Ear'))assert.ok(v===0);
 assert.ok(Math.abs(t.refined.secondaryOffsets.tailRoot!)>.001);
 t.seek(.48,true,true,true,1,true,false);
 for(const [id,v] of Object.entries(t.refined.secondaryOffsets))if(id.startsWith('tail'))assert.ok(v===0);
 assert.ok(Math.abs(t.refined.secondaryOffsets.nearEar!)>.001);
 const expected=t.refined.bones.snapshot();t.seek(1.2);t.seek(.48,true,true,true,1,true,false);assert.deepEqual(t.refined.bones.snapshot(),expected);
});
test('compression, push extension, air tuck and pre-contact reach are distinct without global scaling',()=>{
 const crouch=new LabPoseModel('ANTICIPATION').bones,take=new FoxBones(),air=new LabPoseModel('AIRBORNE').bones,fall=new LabPoseModel('FALL_PREPARE').bones,land=new LabPoseModel('LAND_IMPACT').bones;
 take.setPose(FOX_POSES.TakeoffPose.bones);
 assert.ok(crouch.position('pelvis').y-take.position('pelvis').y>20);
 assert.ok(crouch.angle('nearKnee')-take.angle('nearKnee')>1.5);
 assert.ok(take.worldAngle('chest')<0&&crouch.worldAngle('chest')>.6);
 assert.ok(fall.position('nearFoot').y-air.position('nearFoot').y>20);
 assert.ok(land.position('pelvis').y-fall.position('pelvis').y>15);
 assert.ok(land.angle('nearKnee')-fall.angle('nearKnee')>1);
});
