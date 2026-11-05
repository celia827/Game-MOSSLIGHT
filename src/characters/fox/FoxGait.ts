import type {FoxPose} from './FoxPoseLibrary.ts';
import {clamp,mix,smooth} from './poseMath.ts';
export type Curve=readonly (readonly [number,number])[];
/** C1 segment curves: contact/load/pass/push keys have individual timing. */
export function gaitCurve(keys:Curve,t:number):number {
 t=clamp(t);const i=Math.max(0,keys.findIndex((k,j)=>j<keys.length-1&&t<=keys[j+1][0]));
 const a=keys[i],b=keys[Math.min(i+1,keys.length-1)];return mix(a[1],b[1],smooth((t-a[0])/Math.max(.00001,b[0]-a[0])));
}
const cycle=(keys:Curve,t:number)=>gaitCurve(keys,((t%1)+1)%1);
const WALK_LOAD:Curve=[[0,1],[.22,2.4],[.54,.6],[.82,-.35],[1,1]];
const RUN_LOAD:Curve=[[0,2],[.20,4.8],[.60,.5],[.88,-1.6],[1,2]];
const ARM:Curve=[[0,.92],[.13,.70],[.38,-.72],[.50,-1],[.65,-.68],[.88,.78],[1,.92]];
const FLEX:Curve=[[0,0],[.22,.18],[.44,1],[.66,.6],[.88,.12],[1,0]];
export function shapeGait(p:FoxPose,phase:number,run:boolean):FoxPose {
 const half=(phase*2)%1,b=p.bones;
 b.pelvis!.y=cycle(run?RUN_LOAD:WALK_LOAD,half);
 b.pelvis!.angle=cycle([[0,0],[.25,.018],[.5,0],[.75,-.018],[1,0]],phase)*(run?1.45:.65);
 b.pelvis!.x=(run?1.45:1)*cycle([[0,0],[.25,.45],[.5,0],[.75,-.45],[1,0]],phase);
 b.lowerSpine!.angle=(run?.16:.026)+cycle([[0,0],[.22,.028],[.65,-.014],[1,0]],half-.035)*(run?1.55:.35);
 b.chest!.angle=(run?.048:.018)+cycle([[0,0],[.34,-.018],[.78,.012],[1,0]],half-.07)*(run?1.45:.45);
 for(const [side,offset] of [['near',0],['far',.5]] as const){
  const u=(phase+offset)%1;
  b[`${side}Shoulder`]!.angle=cycle(ARM,u)*(run?.87:.30)+(run?.035:0);
  b[`${side}Elbow`]!.angle=-(run?.67:.23)-cycle(FLEX,u-.045)*(run?.51:.15);
  b[`${side}Wrist`]!.angle=cycle([[0,.025],[.32,-.07],[.65,.09],[1,.025]],u-.08)*(run?1.45:.45);
 }
 b.neck!.angle=(run?-.09:-.035)+cycle([[0,0],[.30,-.016],[.72,.012],[1,0]],half-.10)*(run?1:.35);
 const pitch=(run?-.045:-.015)+cycle([[0,0],[.3,.013],[.7,-.011],[1,0]],half-.12);
 b.head!.angle=pitch-(b.pelvis!.angle??0)-(b.lowerSpine!.angle??0)-(b.chest!.angle??0)-(b.neck!.angle??0);
 return p;
}
export function swingFoot(t:number,runMix:number):{x:number;lift:number;roll:number}{
 const walkX=gaitCurve([[0,-1],[.28,-.65],[.66,.55],[1,1]],t);
 const runX=gaitCurve([[0,-1],[.18,-1.06],[.52,.05],[.83,.82],[1,1]],t);
 return {x:mix(walkX,runX,runMix),
  lift:gaitCurve(runMix>.5?[[0,0],[.22,.70],[.52,1],[.83,.32],[1,0]]:[[0,0],[.38,1],[.72,.62],[1,0]],t),
  roll:gaitCurve([[0,.10],[.25,.22],[.65,-.24],[1,0]],t)*mix(.55,1,runMix)};
}
export function gaitStage(phase:number):string {
 const u=(phase*2)%1;return u<.14?'CONTACT':u<.38?'DOWN':u<.72?'PASSING':'UP';
}
