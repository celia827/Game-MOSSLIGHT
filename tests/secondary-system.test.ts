import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundTimeline} from '../src/animation-lab/GroundTimeline.ts';
import {JumpTimeline} from '../src/animation-lab/JumpTimeline.ts';
import {FoxSecondaryMotion} from '../src/characters/fox/FoxSecondaryMotion.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {FoxBones} from '../src/characters/fox/FoxBones.ts';
import {FOX_POSES} from '../src/characters/fox/FoxPoseLibrary.ts';
import {MOTION_DEFAULTS} from '../src/characters/fox/FoxMotionConfig.ts';
import {FoxTailAvoidance,TAIL_OUTLINE,insidePolygon} from '../src/characters/fox/FoxTailContact.ts';
import {skinTail,TAIL_CHAIN} from '../src/characters/fox/FoxTailSkin.ts';
import {buildCollision} from '../src/world/terrain/geometry.ts';
const zero={speed:0,velocityY:0,accelerationX:0,accelerationY:0,headVelocity:0,pelvisVelocity:0,bodyAcceleration:0,torsoVelocity:0};
const near=(a:number,b:number,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} / ${b}`);

test('master off keeps authored gaze and primary FK/IK, and A/B shares the same locomotion history',()=>{
 const t=new JumpTimeline();t.seek(.62,false);for(const v of Object.values(t.refined.secondaryOffsets))near(v!,0);
 assert.deepEqual(t.primary.bones.snapshot(),t.refined.bones.snapshot());
 t.seek(1.07);for(const id of ['pelvis','lowerSpine','chest','nearHip','nearKnee','nearFoot','farFoot'] as const){
  const a=t.refined.bones.position(id),b=t.primary.bones.position(id);near(a.x,b.x);near(a.y,b.y);
 }
 assert.ok(Math.abs(t.refined.bones.worldAngle('head')-t.primary.bones.worldAngle('head'))>.005);
 const g=new GroundTimeline();g.seek(9.5,'DEMO');near(g.primary.phase,g.refined.phase);assert.equal(g.primary.state,g.refined.state);
});

test('component gains independently mute ear, tail and pack offsets and replay tuning changes deterministically',()=>{
 const t=new JumpTimeline(),u=new JumpTimeline(),patch={earStrength:0,tailStrength:0,backpackStrength:0,headInertia:0};
 t.seek(.58,true,true,true,1,true,true,patch);
 for(const v of Object.values(t.refined.secondaryOffsets))if(v!==undefined)assert.ok(Number.isFinite(v));
 for(const [id,v] of Object.entries(t.refined.secondaryOffsets))if(id.includes('Ear')||id.startsWith('tail')||id==='backpack'||id==='head'||id==='neck')near(v!,0);
 t.seek(1.1);t.seek(.58,true,true,true,1,true,true,patch);u.seek(.58,true,true,true,1,true,true,patch);
 assert.deepEqual(t.refined.bones.snapshot(),u.refined.bones.snapshot());
});

test('impact propagates to distal links later and decays without persistent oscillation',()=>{
 const s=new FoxSecondaryMotion(),p=FOX_POSES.IdlePose.bones,peaks=new Map<string,{t:number;v:number}>();
 for(let i=0;i<600;i++){
  s.update(p,1/120,i/120,false,{...zero,accelerationY:i<6?-3500:0},{...MOTION_DEFAULTS},1);
  for(const id of ['nearEar','nearEarTip','tailRoot','tailEnd']){const v=Math.abs(s.offsets[id as keyof typeof s.offsets]??0);if(v>(peaks.get(id)?.v??0))peaks.set(id,{t:i/120,v});}
 }
 assert.ok(peaks.get('nearEarTip')!.t>peaks.get('nearEar')!.t);assert.ok(peaks.get('tailEnd')!.t>peaks.get('tailRoot')!.t);
 for(const v of Object.values(s.offsets))assert.ok(Math.abs(v!)<1e-5);
});

test('high strength jump/run skins retain positive area and tail collar weld',()=>{
 const t=new JumpTimeline();let min=Infinity;
 for(let i=1;i<200;i+=2){
  t.seek(i/120,true,true,true,1,true,true,{strength:1.5,earStrength:1.5,tailStrength:1.5,backpackStrength:1.5});const b=t.refined.bones;
  for(let x=6;x<104;x+=7)for(let y=95;y<190;y+=7){const p={x,y};if(!insidePolygon(p,TAIL_OUTLINE))continue;
   const a=skinTail(b,p),z=skinTail(b,{x:x+.1,y}),c=skinTail(b,{x,y:y+.1});min=Math.min(min,((z.x-a.x)*(c.y-a.y)-(z.y-a.y)*(c.x-a.x))/.01);
  }
  const a=skinTail(b,{x:109,y:171}),z=b.skin('pelvis',{x:109,y:171});near(a.x,z.x);near(a.y,z.y);
 }
 assert.ok(min>.25,`tail area ${min}`);
});

test('safe platform avoidance preserves all bone lengths and reports unresolved contacts honestly',()=>{
 const b=new FoxBones(),c=new FoxTailAvoidance(),pose=FOX_POSES.IdlePose.bones;
 const env={polygons:[buildCollision({id:'rise',kind:'platform' as const,x:843,y:451,width:349.2,height:155.2}).polygon],x:833,y:549,facing:-1,scale:.8};
 for(let i=0;i<120;i++){
  b.setPose(pose);c.fit(b,env,1/120);
  for(let j=1;j<TAIL_CHAIN.length;j++){const id=TAIL_CHAIN[j],parent=TAIL_CHAIN[j-1],p=b.position(id),q=b.position(parent),r=b.rest(id),s=b.rest(parent);near(Math.hypot(p.x-q.x,p.y-q.y),Math.hypot(r.x-s.x,r.y-s.y));}
 }
 assert.ok(c.penetration<=c.primaryPenetration);assert.ok(c.primaryPenetration>0);
 const actual=TAIL_OUTLINE.filter(p=>p.x<99).filter(p=>{const q=skinTail(b,p);return insidePolygon({x:env.x-(q.x-124)*.8,y:env.y+(q.y-210)*.8},env.polygons[0]);}).length;
 assert.equal(c.penetration,actual);near(b.position('tailRoot').x,108);near(b.position('tailRoot').y,170);
 for(let i=0;i<120;i++){b.setPose(pose);c.fit(b,{...env,polygons:[]},1/120);}near(b.angle('tailRoot'),0);
});

test('dt protection, reset and repeated playback cannot accumulate secondary transforms',()=>{
 const a=new FoxAnimationController();for(const dt of [NaN,-1,0,10,1/30,1/240])a.update(dt,0,0,400,545,1,()=>545);
 for(const b of a.bones.snapshot())assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.angle));
 const g=new GroundTimeline();g.seek(14,'DEMO');g.seek(2,'DEMO');const fresh=new GroundTimeline();fresh.seek(2,'DEMO');assert.deepEqual(g.refined.bones.snapshot(),fresh.refined.bones.snapshot());
 a.resetMotion();assert.deepEqual(a.bones.snapshot(),new FoxAnimationController().bones.snapshot());
});
