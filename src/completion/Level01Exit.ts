import type {LevelMap} from '../levels/shared/MapModule.ts';
import {surfaceY} from '../world/terrain/geometry.ts';
export interface LevelExit {levelId:string;x:number;y:number;surfaceId:string;radius:number;heightTolerance:number;gate:{halfWidth:number;height:number}}
/** Position/support come from map.finish; contour sizes match TerrainBuilder's accepted arch. */
export function level01Exit(map:LevelMap):LevelExit {
  const {x,y}=map.finish;const surface=map.modules.find(m=>m.region==='E'&&surfaceY(m,x)===y);
  if(!surface||x-surface.x<90||surface.x+surface.width-x<90)throw Error('Exit needs a safe fixed clearing');
  return{levelId:map.id,x,y,surfaceId:surface.id,radius:86,heightTolerance:12,gate:{halfWidth:60,height:205}};
}
