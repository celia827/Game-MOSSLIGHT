import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundTimeline} from '../src/animation-lab/GroundTimeline.ts';
import {FoxAnimationController} from '../src/characters/fox/FoxAnimationController.ts';
const local=(a:FoxAnimationController,part:'tail'|'near-ear',p:{x:number;y:number},root:'tailRoot'|'nearEar')=>{const q=a.map(part,p),r=a.bones.position(root),angle=a.bones.worldAngle(root),x=q.x-r.x,y=q.y-r.y;return {x:x*Math.cos(angle)+y*Math.sin(angle),y:-x*Math.sin(angle)+y*Math.cos(angle)};};
test('visible tail and ear skin changes survive removal of rigid root rotation',()=>{
 const t=new GroundTimeline(),peaks=[0,0,0];
 for(let i=1;i<=600;i++){
  t.seek(i/120,'RUN');
  for(const [j,part,p,root]of [[0,'tail',{x:40,y:162},'tailRoot'],[1,'tail',{x:5,y:94},'tailRoot'],[2,'near-ear',{x:94,y:12},'nearEar']] as const){
   const a=local(t.refined,part,p,root),b=local(t.primary,part,p,root);peaks[j]=Math.max(peaks[j],Math.hypot(a.x-b.x,a.y-b.y));
  }
 }
 assert.ok(peaks[0]>.7,`middle deformation ${peaks[0]}`);assert.ok(peaks[1]>5,`tip deformation ${peaks[1]}`);assert.ok(peaks[2]>1,`ear bend ${peaks[2]}`);
});
test('30/60/120/240 Hz run and braking remain bounded and settle without drift',()=>{
 const ends=[];
 for(const hz of [30,60,120,240]){
  const a=new FoxAnimationController();let x=400;
  for(let i=0;i<hz*7;i++){const v=i<hz*2?128:0;x+=v/hz;a.update(1/hz,v/hz,v,x,545,1,()=>545,false,{grounded:true,velocityY:0,landTimer:0,landDuration:.16,clearance:0,impact:0,intent:{axis:v?1:0,walking:false}});for(const v of Object.values(a.secondaryOffsets))assert.ok(Number.isFinite(v)&&Math.abs(v!)<=.17);}
  ends.push(a.bones.position('tailEnd'));assert.ok(Math.abs(a.secondaryOffsets.tailEnd!)<.001);
 }
 for(const p of ends)assert.ok(Math.hypot(p.x-ends[0].x,p.y-ends[0].y)<.03);
});
