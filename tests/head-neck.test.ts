import test from 'node:test';
import assert from 'node:assert/strict';
import {FoxBones,FOX_BONES} from '../src/characters/fox/FoxBones.ts';
import {FoxBodySkin} from '../src/characters/fox/FoxBodySkin.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
import {KEY_POSES} from '../src/animation-lab/poses.ts';
import {LabPoseModel} from '../src/animation-lab/LabPoseModel.ts';
import {JumpTimeline,JUMP_DURATION} from '../src/animation-lab/JumpTimeline.ts';
const near=(a:number,b:number,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} / ${b}`);

test('head pitches about cervical pivot while the face stays rigid and ears stay attached',()=>{
  const b=new FoxBones();
  near(b.rest('head').x,b.rest('neck').x);near(b.rest('head').y,b.rest('neck').y);
  for(const pitch of [-.26,0,.22,.38]){
    b.setPose({head:{angle:pitch}});
    const fixed=b.skin('head',b.rest('neck'));near(fixed.x,122);near(fixed.y,112);
    const a=b.skin('head',{x:139,y:83}),z=b.skin('head',{x:177,y:91});near(Math.hypot(z.x-a.x,z.y-a.y),Math.hypot(38,8));
    for(const id of ['nearEar','farEar'] as const){const root=b.skin('head',b.rest(id)),ear=b.position(id);near(root.x,ear.x);near(root.y,ear.y);}
  }
});
test('six silhouettes use different gaze pitches and visibly separate fall preparation from impact',()=>{
  const a=KEY_POSES.map(p=>new LabPoseModel(p.id)),angles=a.map(m=>m.bones.worldAngle('head'));
  assert.equal(new Set(angles.map(v=>v.toFixed(2))).size,6);
  assert.ok(angles[2]>.15&&angles[3]<-.10&&angles[5]>angles[4]+.15);
  const fall=a[4].bones,land=a[5].bones;
  assert.ok(land.position('pelvis').y-fall.position('pelvis').y>12);
  assert.ok(land.angle('nearKnee')-fall.angle('nearKnee')>.8);
});
test('cervical skin follows jaw above, garment below and stays continuous with positive area',()=>{
  for(const pose of KEY_POSES){
    const m=new LabPoseModel(pose.id),skin=new FoxBodySkin(m.bones);
    for(const x of [108,120,134]){
      const top={x,y:109},bottom={x,y:134};
      const a=skin.neck(top),b=m.bones.skin('head',top);near(a.x,b.x);near(a.y,b.y);
      const c=skin.neck(bottom),d=skin.torso(bottom);near(c.x,d.x);near(c.y,d.y);
    }
    for(let x=108;x<136;x+=2)for(let y=106;y<133;y+=1){
      const a=skin.neck({x,y}),b=skin.neck({x:x+.05,y}),c=skin.neck({x,y:y+.05});
      assert.ok((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0,`${pose.id}: ${x},${y}`);
    }
  }
});
test('jump pitch changes continuously, reaches upward gaze then delayed landing nod and settles',()=>{
  for(const travel of [false,true]){
    const t=new JumpTimeline();let last=0,maxDelta=0,up=0,impact=0,crouch=0;const samples:{time:number;pitch:number;torso:number}[]=[];
    for(let i=0;i<=JUMP_DURATION*120;i++){
      t.seek(i/120,true,travel);const b=t.refined.bones,pitch=b.worldAngle('head');
      if(i)maxDelta=Math.max(maxDelta,Math.abs(pitch-last));last=pitch;
      if(t.refined.animationPhase==='ANTICIPATION')crouch=Math.max(crouch,pitch);
      if(t.refined.animationPhase==='ASCEND')up=Math.min(up,pitch);
      if(t.refined.animationPhase.startsWith('LAND'))impact=Math.max(impact,pitch);
      samples.push({time:t.time,pitch,torso:b.worldAngle('chest')});
      for(const {id,min,max} of FOX_BONES)assert.ok(b.angle(id)>=min-1e-6&&b.angle(id)<=max+1e-6);
    }
    assert.ok(crouch>.08,`brief anticipation must visibly nod: ${crouch}`);
    assert.ok(up<-.06,`up ${up}`);assert.ok(impact>.14,`nod ${impact}`);assert.ok(maxDelta<.05,`pitch step ${maxDelta}`);
    assert.ok(Math.abs(last)<.025,`settle ${last}`);
    const land=samples.filter(s=>s.time>=1&&s.time<1.3),peak=(key:'pitch'|'torso')=>land.reduce((a,b)=>b[key]>a[key]?b:a).time;
    assert.ok(peak('pitch')>=peak('torso'),`head should follow torso: ${peak('pitch')}, ${peak('torso')}`);
  }
});
test('head and ear/tail switches are independent and scrubbing reconstructs their history',()=>{
  const a=new JumpTimeline(),b=new JumpTimeline();a.seek(.72,true,true,false);near(a.refined.secondaryOffsets.head!,0);near(a.refined.secondaryOffsets.neck!,0);assert.ok(a.refined.bones.worldAngle('head')>.02,'off preserves the authored descending gaze');
  assert.ok(Object.values(a.refined.secondaryOffsets).some(v=>Math.abs(v!)>.003));
  a.seek(.48,false,true,true);assert.ok(a.refined.bones.worldAngle('head')<-.06);
  for(const v of Object.values(a.refined.secondaryOffsets))near(v!,0);
  a.seek(1.2,true,true,true,.85);a.seek(.72,true,true,true,.85);b.seek(.72,true,true,true,.85);
  assert.deepEqual(a.refined.bones.snapshot(),b.refined.bones.snapshot());
});
test('refinement reference retains preceding cervical pivot and crouch silhouette',()=>{
  const old=new FoxAnimationController('previous'),fresh=new FoxAnimationController();
  old.setPosePreview('AnticipationPose');fresh.setPosePreview('AnticipationPose');
  near(old.bones.rest('head').y,112);near(fresh.bones.rest('head').y,112);
  near(old.bones.position('pelvis').y,fresh.bones.position('pelvis').y);
  assert.equal(old.alpha('neck-bridge'),1);
});

test('moving landings suppress swing lift under a compressed pelvis without changing physical contacts',async()=>{
  const {PlayerController}=await import('../src/characters/fox/PlayerController.ts');
  const floor={id:'floor',kind:'ground' as const,x:0,y:490,width:1280,height:230};
  // Replay mixed frame times, reversals and repeated jumps that exposed a lifted
  // trailing boot exceeding ankle range while the pelvis was absorbing impact.
  let seed=412;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
  const p=new PlayerController(400+random()*300,()=>floor,()=>[]),a=new FoxAnimationController();a.phase=random();
  let time=0,axis=0,next=0,held=false,maxError=0,landFrames=0;
  for(let i=0;i<400;i++){
    const dt=1/(30+random()*90);time+=dt;let pressed=false;
    if(time>next){axis=Math.round(random()*2)-1;pressed=random()>.4;held=pressed;next=time+.1+random()*.8;}
    const distance=p.step(dt,axis,{pressed,held});
    a.update(dt,distance,p.velocity,p.x,p.y,p.facing,x=>p.supportY(x),false,{
      grounded:p.grounded,velocityY:p.velocityY,landTimer:p.landTimer,landDuration:p.physics.landDuration,
      clearance:p.clearance,impact:p.impact,jumped:p.jumpedThisFrame,landed:p.landedThisFrame,jumpId:p.jumpCount,intent:{axis,walking:false},
    });
    if(a.state==='LAND')landFrames++;
    for(const f of a.feet)maxError=Math.max(maxError,Math.hypot(f.point.x-f.goal.x,f.point.y-f.goal.y));
  }
  assert.ok(landFrames>20);assert.ok(maxError<.1,`sole target error ${maxError}`);
});
