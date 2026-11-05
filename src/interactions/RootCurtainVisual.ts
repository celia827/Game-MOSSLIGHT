import type {InteractionDefinition} from './InteractionModel.ts';
import type {LevelMap} from '../levels/shared/MapModule.ts';
import {surfaceY} from '../world/terrain/geometry.ts';
export interface RootCurtainDefinition extends InteractionDefinition {curtain:{topY:number;glowX:number;glowY:number}}
export function rootCurtainDefinition(map:LevelMap):RootCurtainDefinition {
  const entry=map.connections.find(n=>n.id==='hidden-entry'),ramp=map.modules.find(m=>m.id==='secret-west'),room=map.modules.find(m=>m.id==='secret-alcove');
  if(!entry||!ramp||!room)throw new Error('Missing root-room anchors');
  const y=surfaceY(ramp,entry.x);if(y===undefined)throw new Error('Curtain must reference actual passage');
  return{id:'ancient-root-curtain',x:entry.x,y,radius:108,verticalRange:68,enabled:true,prompt:'E 舒展藤帘',visual:'root-curtain',activeSeconds:4,cooldownSeconds:0,latch:true,guides:[],curtain:{topY:y-250,glowX:room.x+room.width*.5,glowY:room.y-150}};
}
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export function curtainVisual(elapsed:number|null,opened=false) {
  const t=elapsed??0,progress=opened?1:elapsed===null?0:smooth((t-.6)/2.2);
  const stage=opened?'open':elapsed===null?'sleeping':t<.6?'stirring':t<2.8?'parting':'revealing';
  return{stage,progress,shift:60*progress,angle:.22*progress,shake:!opened&&elapsed!==null&&t<.6?Math.sin(t*30)*1.8*Math.sin(Math.PI*t/.6):0,pulse:opened||elapsed===null?0:Math.sin(Math.PI*Math.max(0,Math.min(1,(t-2.6)/1.4))),alpha:.68-.13*progress};
}
