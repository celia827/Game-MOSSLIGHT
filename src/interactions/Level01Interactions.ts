import {rootCurtainDefinition,type RootCurtainDefinition} from './RootCurtainVisual.ts';
import type {LevelMap} from '../levels/shared/MapModule.ts';
import {surfaceY} from '../world/terrain/geometry.ts';
import {flowerDuration,type FlowerInteractionDefinition} from './GuideFlowerVisual.ts';
/** Anchors follow accepted connection/module data; never provide terrain geometry. */
export function level01Interactions(map:LevelMap):(FlowerInteractionDefinition|RootCurtainDefinition)[] {
  const fork=map.connections.find(n=>n.id==='crown-fork');
  const deck=map.modules.find(m=>m.id==='west-deck');
  const ups=[1,2,3].map(i=>map.modules.find(m=>m.id===`crown-up-${i}`));
  if(!fork||!deck||ups.some(m=>!m))throw new Error('Missing canopy interaction anchor');
  const x=fork.x-68,y=surfaceY(deck,x);if(y===undefined||y===null)throw new Error('Flower must sit on accepted surface');
  const [a,b,c]=ups as NonNullable<typeof ups[number]>[];
  return [{id:'forest-guide-flower',x,y,radius:92,verticalRange:48,enabled:true,prompt:'E 互动',activeSeconds:flowerDuration(),cooldownSeconds:1,visual:'guide-flower',guides:[
    {x:fork.x-12,y:a.y-38},{x:a.x+a.width*.6,y:a.y-32},{x:a.x+a.width*.92,y:a.y-52},{x:b.x+b.width*.5,y:b.y-24},{x:c.x+c.width*.45,y:c.y-24},
  ],response:{platforms:[a,b,c].map(m=>({x:m.x+m.width/2,y:m.y,width:m.width})),plants:[{x:x-27,y},{x:x+62,y},{x:a.x+a.width*.72,y:a.y}]}},rootCurtainDefinition(map)];
}
