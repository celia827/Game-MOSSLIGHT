import type Phaser from 'phaser';
/** Read-only diagnostics after scene creation and reset; no per-frame allocations. */
export function publishSurfaceMetrics(scene:Phaser.Scene):void {
 const publish=()=>{
  const textures=scene.textures.getTextureKeys().map(key=>{const t=scene.textures.get(key);return {key,width:t.source[0].width,height:t.source[0].height};});
  const count=(objects:Phaser.GameObjects.GameObject[]):number=>objects.reduce((n,o)=>n+1+(o.type==='Container'?count((o as Phaser.GameObjects.Container).list):0),0);
  document.body.dataset.surfaceMetrics=JSON.stringify({textures:textures.length,rgbaBytes:textures.reduce((s,t)=>s+t.width*t.height*4,0),objects:scene.children.length,renderObjects:count(scene.children.list),meshFaces:scene.children.list.filter(x=>x.type==='Mesh').reduce((n,x)=>n+(x as Phaser.GameObjects.Mesh).faces.length,0),sources:textures});
 };
 scene.events.once('postupdate',publish);
 const button=document.querySelector('#level-reset'),reset=()=>scene.events.once('postupdate',publish);
 button?.addEventListener('click',reset);scene.events.once('shutdown',()=>button?.removeEventListener('click',reset));
}
