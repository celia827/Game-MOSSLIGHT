import type {TerrainDefinition,Point} from '../../world/terrain/types.ts';
import type {AssetKey} from '../../art/manifest.ts';

export type RouteId='main'|'canopy'|'cave'|'hidden';
export interface MapModule extends TerrainDefinition {
  type:'ground'|'platform'|'step'|'ramp'|'cave'|'bridge';
  region:'A'|'B'|'C'|'D'|'E';
  collision:'solid'|'one-way';
  art:{material:'moss'|'earth'|'rock'|'wood';accent?:AssetKey};
  connections?:string[];
}
export interface MapConnection extends Point {
  id:string;label:string;routes:RouteId[];kind:'branch'|'merge'|'hidden';
}
export interface LevelMap {
  id:string;title:string;width:number;height:number;
  spawn:Point;finish:Point;modules:MapModule[];
  guides?:{label:string;color:string;points:Point[]}[];
  landmarks?:{id:string;label:string;x:number;y:number;moduleId:string}[];
  regions:{id:string;name:string;x:number;y:number;width:number;height:number}[];
  connections:MapConnection[];
  routes:{id:RouteId;label:string;color:string;points:Point[]}[];
}
