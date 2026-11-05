import type {LevelMap,MapModule} from '../../levels/shared/MapModule.ts';
import {surfaceY} from '../../world/terrain/geometry.ts';
export const solidCave=(m:MapModule)=>m.region==='D'&&!m.oneWay&&!['bedrock','root-wall'].includes(m.id);
export function artJoins(map:LevelMap){return map.modules.filter(solidCave).flatMap(a=>map.modules.filter(b=>solidCave(b)&&b.x===a.x+a.width&&surfaceY(a,b.x)===surfaceY(b,b.x)).map(b=>({a,b,x:b.x,bottom:Math.min(a.y+a.height,b.y+b.height),width:Math.min(64,a.width/3,b.width/3,a.profile![a.profile!.length-1].x-a.profile![a.profile!.length-2].x,b.profile![1].x-b.profile![0].x)})));}
export function undercuts(map:LevelMap){const bedrock=map.modules.find(m=>m.id==='bedrock')!;return map.modules.filter(m=>solidCave(m)&&m.y+m.height<bedrock.y).map(m=>({x:m.x,y:m.y+m.height,width:m.width,height:bedrock.y-m.y-m.height}));}
