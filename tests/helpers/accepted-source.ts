import {readFileSync} from 'node:fs';
/** Historical checks use accepted originals; D2 checks current protection and exact static-motor parity. */
export function acceptedSource(file:string){if(['src/characters/fox/PlayerController.ts','src/world/terrain/GroundCollision.ts'].includes(file))return readFileSync('docs/moving-d2/baseline/'+file);return ['src/levels/shared/CameraController.ts','src/scenes/Level01Scene.ts'].includes(file)?readFileSync('docs/versions/level01-art-v1.0/snapshot/'+file):preF2Source(file);}

/** D2 supersedes only these three integration files; every other CURRENT byte is still checked. */
export function preD2Source(file:string){return ['src/characters/fox/PlayerController.ts','src/world/terrain/GroundCollision.ts','src/scenes/Level01Scene.ts'].includes(file)?readFileSync('docs/moving-d2/baseline/'+file):preF2Source(file);}

/** D3 adds optional latch state and a visual adapter; physics/current geometry checks remain strict. */
export function preD3Source(file:string,fallback:(file:string)=>Buffer=readFileSync){return readFileSyncIfD3(file)??(fallback===readFileSync?preE3Source(file):fallback(file));}
function readFileSyncIfD3(file:string){return ['src/interactions/InteractionModel.ts','src/interactions/ForestInteractionSystem.ts','src/interactions/Level01Interactions.ts'].includes(file)?readFileSync('docs/curtain-d3/baseline/'+file):undefined;}

/** Only the E1 scene lifecycle hooks supersede D3; current protected systems are checked by E1. */
export function preE1Source(file:string){return file==='src/scenes/Level01Scene.ts'?readFileSync('docs/dewdrop-e1/baseline/'+file):preE2Source(file);}

/** Adventure V1 supersedes scene integration and adds restore to the collection adapter. */
export function preAdventureSource(file:string):Buffer {
  return ['src/scenes/Level01Scene.ts','src/collectibles/ForestCollectibleSystem.ts'].includes(file)?readFileSync('docs/adventure-v1/baseline/'+file):preE2Source(file);
}

/** E2 supersedes only the scene lifecycle adapter and a small player respawn API. */
export function preE2Source(file:string):Buffer {
  return ['src/scenes/Level01Scene.ts','src/characters/fox/PlayerController.ts'].includes(file)?readFileSync('docs/checkpoint-e2/baseline/'+file):preE3Source(file);
}

/** E3 only supersedes endpoint/integration and shared interaction input adapters. */
function isE3Changed(file:string){return ['src/scenes/Level01Scene.ts','src/interactions/ForestInteractionSystem.ts','src/adventure/AdventureSystem.ts'].includes(file);}
export function preE3Source(file:string):Buffer{return isE3Changed(file)?readFileSync('docs/completion-e3/baseline/'+file):preF2Source(file);}

/** F2-A changes presentation/mode adapters only; a new current-byte test protects all other files. */
export function preF2Source(file:string):Buffer {
  return ['src/scenes/Level01Scene.ts','src/adventure/AdventureSystem.ts','src/adventure/AdventureUI.ts','level01/index.html','src/art/b1/gallery.ts','art-lab/index.html'].includes(file)?readFileSync('docs/player-f2a/baseline/'+file):preP1LayoutSource(file);
}

/** Strip ONLY the approved optional layout injection. Original hash stays authoritative.
 * Any change to E2 rules, hooks, queue, reset or disposal still fails historical guards. */
export function preP1LayoutSource(file:string):Buffer {
  let text=readFileSync(file);
  if(file==='src/checkpoints/CheckpointSystem.ts')text=Buffer.from(text.toString()
    .replace("import type {CheckpointDefinition} from './CheckpointModel';\n",'')
    .replace(',definitions?:CheckpointDefinition[]','')
    .replace('definitions??level01Checkpoints(map)','level01Checkpoints(map)'));
  return text;
}
