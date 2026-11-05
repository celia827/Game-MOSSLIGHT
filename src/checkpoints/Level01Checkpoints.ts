import type {LevelMap} from '../levels/shared/MapModule.ts';
import {surfaceY} from '../world/terrain/geometry.ts';
import type {CheckpointDefinition,CheckpointPosition} from './CheckpointModel.ts';

export function level01Checkpoints(map:LevelMap):CheckpointDefinition[] {
  const bridge=map.modules.find(m=>m.id==='sunlit-bridge'),clearing=map.modules.find(m=>m.id==='clearing');
  if(!bridge?.profile||!clearing)throw Error('Missing checkpoint surfaces');
  const specs=[{id:'rest-forest-fork',name:'森林分岔栖息点',m:bridge,x:bridge.x+bridge.profile[1].x/2,offset:62},
    {id:'rest-morning-confluence',name:'晨光汇流栖息点',m:clearing,x:clearing.x+clearing.width*.35,offset:-62}];
  return specs.map((s,i)=>{
    const x=s.x,y=surfaceY(s.m,x),rx=x+s.offset,ry=surfaceY(s.m,rx);
    if(y===undefined||ry===undefined||rx<s.m.x+40||rx>s.m.x+s.m.width-40)throw Error('Unsafe checkpoint anchor');
    return{checkpointId:s.id,name:s.name,worldPosition:{x,y},surfaceId:s.m.id,activationRange:78,heightTolerance:12,progressionOrder:i+1,respawnPosition:{x:rx,y:ry},visualResourceId:'mosslight-rest'};
  });
}
export function defaultRespawn(map:LevelMap):CheckpointPosition&{surfaceId:string} {
  const surface=map.modules.find(m=>surfaceY(m,map.spawn.x)===map.spawn.y&&m.id!=='bedrock');
  if(!surface)throw Error('Spawn has no static support');return{...map.spawn,surfaceId:surface.id};
}
