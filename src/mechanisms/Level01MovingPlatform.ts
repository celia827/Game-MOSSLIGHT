import type {LevelMap} from '../levels/shared/MapModule.ts';
import {surfaceY} from '../world/terrain/geometry.ts';
import type {MovingPlatformDefinition} from './MovingPlatformWorld.ts';
export function level01MovingPlatform(map:LevelMap):MovingPlatformDefinition[] {
  const rest=map.modules.find(m=>m.id==='crown-rest'),main=map.modules.find(m=>m.id==='sunlit-bridge');
  if(!rest||!main)throw new Error('Missing lift anchors');
  const width=156,x=rest.x+60,ground=surfaceY(main,x+width/2);if(ground===undefined)throw new Error('Lift must have safe ground below');
  return[{id:'mossleaf-lift',width,height:30,from:{x,y:ground-78},to:{x,y:rest.y+80},travelSeconds:8,pauseSeconds:1.2}];
}
