import design from './design/level-v2-c11.design.json' with {type:'json'};
import gameplay from './design/gameplay-c11.design.json' with {type:'json'};
import type {LevelMap,MapModule,RouteId} from '../shared/MapModule.ts';
import type {CheckpointDefinition} from '../../checkpoints/CheckpointModel.ts';
import type {FlowerInteractionDefinition} from '../../interactions/GuideFlowerVisual.ts';
import {flowerDuration} from '../../interactions/GuideFlowerVisual.ts';
import type {RootCurtainDefinition} from '../../interactions/RootCurtainVisual.ts';
import type {CollectibleDefinition} from '../../collectibles/CollectibleModel.ts';
import {surfaceY} from '../../world/terrain/geometry.ts';

export {design as V2_DESIGN,gameplay as V2_GAMEPLAY};
export type BridgeMode='OPEN'|'FOLDED';
export const bridgeMode=(search:string):BridgeMode=>new URLSearchParams(search).get('bridge')==='FOLDED'?'FOLDED':'OPEN';
export function createV2Map(mode:BridgeMode):LevelMap {
  const chain=(ids:string[])=>ids.map(id=>{const m=design.modules.find(m=>m.id===id)!;const x=m.x+m.width/2;return{x,y:surfaceY(m as MapModule,x)!};});
  const routes=([['main','主路','#edc87a'],['canopy','树冠','#b8d59b'],['cave','洞内上路（OPEN）','#85cbdf'],['hidden','根室下路（两模式）','#c5aad9']] as const).map(([id,label,color])=>({id:id as RouteId,label,color,points:chain(design.chains[id])}));
  if(mode==='FOLDED')routes.splice(2,1);
  return {id:design.id,title:`晨光林地 V2 · P1 灰盒 · ${mode}`,width:design.width,height:design.height,
    spawn:{...design.spawn},finish:{...design.finish},
    modules:design.modules.filter(m=>mode==='OPEN'||m.id!==gameplay.puzzle.surfaceId).map(m=>structuredClone(m) as MapModule),
    regions:structuredClone(design.regions),connections:design.connections.map(n=>({...n,routes:[],kind:'branch' as const})),routes,
    guides:[{label:'地下西返 · 三级80',color:'#e0d099',points:chain(design.chains.caveWestReturn)},{label:'溪谷恢复',color:'#e0d099',points:chain(design.chains.valleyRecoveryEast)}],
    landmarks:design.landmarks.map(n=>({...n,label:n.id==='canopy-view'?'高枝晨露':'藤帘根室'}))};
}
export const v2Checkpoints=():CheckpointDefinition[]=>design.checkpoints.map(d=>({...structuredClone(d),visualResourceId:'mosslight-rest',name:d.progressionOrder===1?'古树岔口栖息点':'溪谷栖息点'}));
export const v2Collectibles=():CollectibleDefinition[]=>design.collectibles.map(d=>({id:d.id,type:'mosslight-dew',label:d.landmark==='canopy-view'?'高枝晨露':'根室微光',x:d.x,y:d.y,radius:26,footTolerance:48,enabled:true,visual:'mosslight-dewdrop',anchor:{moduleId:d.moduleId,surfaceY:d.surfaceY}}));
export const v2MovingPlatforms=()=>structuredClone(design.movingPlatforms);
/** Only layout changes: timing, latching and response rules are the existing systems. */
export function v2Interactions():(FlowerInteractionDefinition|RootCurtainDefinition)[] {
  const f=design.interactions[0],r=design.interactions[1],ups=[1,2,3].map(i=>design.modules.find(m=>m.id===`crown-up-${i}`)!);
  return [{id:f.id,x:f.x,y:f.y,radius:f.radius,verticalRange:f.verticalRange,enabled:true,prompt:'E 引路花',activeSeconds:flowerDuration(),cooldownSeconds:1,visual:'guide-flower',
    guides:ups.map(m=>({x:m.x+m.width*.5,y:m.y-32})),response:{platforms:ups.map(m=>({x:m.x+m.width/2,y:m.y,width:m.width})),plants:[{x:f.x-27,y:f.y},{x:f.x+62,y:f.y}]}},
    {id:r.id,x:r.x,y:r.y,radius:r.radius,verticalRange:r.verticalRange,enabled:true,prompt:'E 舒展藤帘',visual:'root-curtain',activeSeconds:4,cooldownSeconds:0,latch:true,guides:[],curtain:{topY:r.topY!,glowX:r.glow!.x,glowY:r.glow!.y}}];
}
