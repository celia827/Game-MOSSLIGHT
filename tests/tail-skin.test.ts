import test from 'node:test';
import assert from 'node:assert/strict';
import {FoxBones} from '../src/characters/fox/FoxBones.ts';
import {FOX_POSES,POSE_NAMES} from '../src/characters/fox/FoxPoseLibrary.ts';
import {skinTail,tailInfluences,TAIL_CHAIN} from '../src/characters/fox/FoxTailSkin.ts';
import {TAIL_OUTLINE,insidePolygon} from '../src/characters/fox/FoxTailContact.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} / ${b}`);

test('continuous tail weights are normalized and recover every original painted coordinate in bind',()=>{
  const bones=new FoxBones();
  for(let x=0;x<=110;x+=2)for(let y=90;y<=192;y+=2) {
    const p={x,y},weights=tailInfluences(p);close(weights.reduce((n,w)=>n+w.weight,0),1);
    assert.ok(weights.every(w=>w.weight>0&&w.weight<=1));assert.ok(weights.length<=3);
    const q=skinTail(bones,p);close(q.x,x);close(q.y,y);
  }
});
test('the full tail closure is welded to the pelvis through all authored poses and flex angles',()=>{
  const bones=new FoxBones();
  for(const name of POSE_NAMES)for(const angle of [-.2,0,.2]) {
    bones.setPose(FOX_POSES[name].bones);
    for(const id of TAIL_CHAIN)bones.setAngle(id,angle);
    for(let y=160;y<=177;y++)for(const x of [108,109]) {
      const p={x,y},tail=skinTail(bones,p),body=bones.skin('pelvis',p);close(tail.x,body.x);close(tail.y,body.y);
    }
  }
});
test('each of five tail joints deforms its painted section rather than rotating a single rigid image',()=>{
  const bones=new FoxBones(),points=[{x:94,y:174},{x:61,y:180},{x:40,y:162},{x:20,y:132},{x:6,y:94}];
  TAIL_CHAIN.forEach((id,i)=>{
    bones.setPose();const p=points[i],before=skinTail(bones,p);
    bones.setAngle(id,.12);const after=skinTail(bones,p);
    assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>.025,id);
    const root=skinTail(bones,{x:108,y:170});close(root.x,108);close(root.y,170);
  });
});
test('skin remains continuous and retains positive local area through natural five-joint bends',()=>{
  const bones=new FoxBones();
  for(const sign of [-1,1]) {
    bones.setPose(FOX_POSES.LandNormalPose.bones);
    TAIL_CHAIN.forEach((id,i)=>bones.setAngle(id,sign*(.16-i*.018)));
    for(let x=3;x<106;x+=3)for(let y=94;y<190;y+=3) {
      const p={x,y};if(!insidePolygon(p,TAIL_OUTLINE))continue;
      const a=skinTail(bones,p),b=skinTail(bones,{x:x+.1,y}),c=skinTail(bones,{x,y:y+.1});
      const area=((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))/.01;
      assert.ok(area>.3&&area<1.8,`tail fold or volume loss at ${x},${y}: ${area}`);
    }
  }
});
