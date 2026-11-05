import {isCaveTarget} from '../cave/layout.ts';
import type {CanopyProof} from '../canopy/CanopySkin';
import type {LevelMap,MapModule} from '../../levels/shared/MapModule.ts';
import {isSurfaceTarget} from './layout.ts';
export interface CoverageProof {area:number;layers:string[];patches:number;boundedUV:boolean}
export function polygonArea(m:MapModule):number{return m.profile!.slice(1).reduce((area,p,i)=>{const a=m.profile![i];return area+(p.x-a.x)*(m.height-(p.y+a.y)/2);},0);}
export function coverageRows(map:LevelMap,proofs:Map<string,CoverageProof>,names:Set<string>,canopy=new Map<string,CanopyProof>()){return map.modules.map(m=>{
 const proof=proofs.get(m.id),target=isSurfaceTarget(m)||m.region==='C'||isCaveTarget(m),legacy=names.has(m.id),cave=names.has(`cave:${m.id}`),formal=names.has(`surface:${m.id}`)||cave,area=polygonArea(m),surfaceFull=!!proof&&formal&&!legacy&&proof.boundedUV&&Math.abs(proof.area-area)<.01;
 const c=canopy.get(m.id),branch=names.has(`canopy:${m.id}`),branchFull=!!c&&branch&&!legacy&&c.x===m.x&&c.width===m.width&&c.tread===m.y&&c.moss&&c.bark&&c.ends;const full=m.region==='C'?branchFull:surfaceFull;
 return {id:m.id,region:m.region,x:m.x,y:m.y,width:m.width,height:m.height,profile:m.profile,collision:m.collision,target,canopy:c,material:branch?'正式苔藓/树皮/圆润端部':formal?(m.region==='D'?(cave?'正式洞内岩土/完整侧壁':'正式洞口岩土/深层材质'):'正式草土/分层材质'):names.has(`b1:${m.id}`)?'B1.1样板':'原型Graphics',onlyTop:m.region==='C'?!!c&&(!c.bark||!c.ends):target&&!!proof&&proof.area<area-.01,legacyFill:legacy,untreatedSides:legacy||(target&&!full),gap:target&&!full,expectedArea:area,renderedArea:proof?.area??0,patches:proof?.patches??0,layers:m.region==='C'&&c?['苔藓踩踏面','木质主体','圆润双端',...(c.support?['背景枝干支撑']:[])]:proof?.layers??[],full,reason:m.region==='C'?'B.2-B本轮树冠':isSurfaceTarget(m)?'B.2-A.1保留':'B.2-C地下内部'};
 });}
