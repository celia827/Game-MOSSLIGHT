import type {LevelMap} from './MapModule.ts';
import {PlayerController} from '../../characters/fox/PlayerController.ts';
import {CHARACTER_CONFIG as C} from '../../characters/fox/CharacterConfig.ts';
import {PHYSICS_CONFIG as P} from '../../characters/fox/PhysicsConfig.ts';

export const jumpEnvelope={height:P.jumpSpeed**2/(2*P.gravity),flight:2*P.jumpSpeed/P.gravity,
  runDistance:C.maxSpeed*2*P.jumpSpeed/P.gravity,walkDistance:C.walkSpeed*2*P.jumpSpeed/P.gravity,
  bodyWidth:C.bodyHalfWidth*2,bodyHeight:C.bodyHeight,airAcceleration:P.groundAcceleration*P.airControl};
export const levelBounds=(map:LevelMap)=>({minX:C.viewportMargin,maxX:map.width-C.viewportMargin});
export function mapCollision(map:LevelMap) {
  const floor=map.modules.find(m=>m.id==='bedrock')!;
  return {floor,obstacles:map.modules.filter(m=>m!==floor)};
}
export function createLevelMotor(map:LevelMap) {
  const {floor,obstacles}=mapCollision(map);
  const player=new PlayerController(map.spawn.x,()=>floor,()=>obstacles);
  player.bounds=levelBounds(map);
  player.y=map.spawn.y;player.supportId='entry';player.grounded=true;
  return player;
}
export function validateLevel(map:LevelMap):string[] {
  const errors:string[]=[],ids=new Set<string>();
  for(const m of map.modules) {
    if(ids.has(m.id))errors.push(`Duplicate module: ${m.id}`);ids.add(m.id);
    if(m.x<0||m.x+m.width>map.width||m.y<0||m.y+m.height>map.height)errors.push(`Out of bounds: ${m.id}`);
    if(!m.profile||m.profile.length<2||m.profile.some((p,i,a)=>i>0&&p.x<=a[i-1].x))errors.push(`Invalid profile: ${m.id}`);
    if(m.oneWay!==(m.collision==='one-way'))errors.push(`Collision mismatch: ${m.id}`);
    for(const id of m.connections??[])if(!map.connections.some(c=>c.id===id))errors.push(`Missing connection: ${id}`);
  }
  for(const route of map.routes)if(route.points.some(p=>p.x<0||p.x>map.width||p.y<0||p.y>map.height))errors.push(`Invalid route: ${route.id}`);
  return errors;
}
