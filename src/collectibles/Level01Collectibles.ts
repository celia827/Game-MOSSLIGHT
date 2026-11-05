import type {LevelMap} from '../levels/shared/MapModule.ts';
import {surfaceY} from '../world/terrain/geometry.ts';
import type {CollectibleDefinition} from './CollectibleModel.ts';
/** Exploration landmarks remain untouched; these are separate, stable collectible identities. */
export function level01Collectibles(map:LevelMap):CollectibleDefinition[] {
  return [
    {landmark:'canopy-view',id:'dew-canopy-lookout',label:'林冠上的苔光'},
    {landmark:'root-memory',id:'dew-hidden-roots',label:'根室中的苔光'},
  ].map(spec=>{
    const landmark=map.landmarks?.find(n=>n.id===spec.landmark);
    const module=map.modules.find(m=>m.id===landmark?.moduleId);
    if(!landmark||!module)throw new Error(`Missing collectible anchor: ${spec.landmark}`);
    const floor=surfaceY(module,landmark.x);
    if(floor===undefined||landmark.x-module.x<48||module.x+module.width-landmark.x<48)throw new Error(`Unsafe collectible anchor: ${spec.landmark}`);
    return{id:spec.id,type:'mosslight-dew' as const,label:spec.label,x:landmark.x,y:floor-42,radius:26,footTolerance:48,enabled:true,visual:'mosslight-dewdrop' as const,anchor:{moduleId:module.id,surfaceY:floor}};
  });
}
