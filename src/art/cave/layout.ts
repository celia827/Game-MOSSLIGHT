import type {MapModule,LevelMap} from '../../levels/shared/MapModule.ts';
import {isPortal,surfaceStrips,bodyBands} from '../surface/layout.ts';
import {surfaceY} from '../../world/terrain/geometry.ts';
export const isCaveTarget=(m:MapModule)=>m.region==='D'&&!isPortal(m);
export const cavePatches=(m:MapModule)=>surfaceStrips(m).flatMap(s=>bodyBands(s).map(b=>({s,b})));
/** Background placements are anchored to real floor modules, never copied terrain coordinates. */
export function caveBackdrops(map:LevelMap){
 const floors=map.modules.filter(m=>isCaveTarget(m)&&!m.oneWay&&!['bedrock','root-wall'].includes(m.id));
 const west=floors.find(m=>m.id==='cave-landing')!,east=floors.find(m=>m.id==='cave-east')!,room=floors.find(m=>m.id==='secret-alcove')!;
 const bridge=map.modules.find(m=>m.id==='sunlit-bridge')!;
 const ceiling=(x:number)=>(surfaceY(bridge,x)??bridge.y)+bridge.height+42;
 return {west,east,room,walls:[west,room,east].map((m,i)=>({id:m.id,x:m.x+m.width/2-300,y:m.y-405,width:600,height:380,frame:`cave-wall-${i%2}`})),roofs:[west.x,room.x-140,east.x].map((x,i)=>({x:x-30,y:ceiling(x),width:(i===0?west.width:440)+60,height:180})),arch:{x:room.x-180,y:room.y-455,width:540,height:400},glow:{x:room.x-205,y:room.y-380,width:590,height:360}};
}
