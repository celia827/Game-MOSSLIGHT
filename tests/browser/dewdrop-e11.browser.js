async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5174/docs/dewdrop-e1/lifecycle-fixture.html');
 const result=await page.evaluate(async()=>{
  const Phaser=(await import('/node_modules/.vite/deps/phaser.js')).default;
  const {ForestCollectibleSystem}=await import('/src/collectibles/ForestCollectibleSystem.ts');
  const {preloadCollectibles}=await import('/src/collectibles/CollectibleView.ts');
  const {level01Collectibles}=await import('/src/collectibles/Level01Collectibles.ts');
  const {Level01MapData}=await import('/src/levels/level01/Level01MapData.ts');
  const defs=level01Collectibles(Level01MapData),cycles=[],restarts=[];let game,system,created=0,destroyed=0;
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
  const wait=async(fn)=>{for(let i=0;i<300;i++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('fixture timeout')};
  const nodes=()=>document.querySelectorAll('#dewdrop-status').length;
  const sentinel=document.createElement('span');sentinel.id='other-system-sentinel';document.querySelector('#game').append(sentinel);
  class Fixture extends Phaser.Scene{constructor(){super('Life')}preload(){preloadCollectibles(this)}create(){system=new ForestCollectibleSystem(this,defs);created++;this.events.once(Phaser.Scenes.Events.DESTROY,()=>destroyed++)}update(t,dt){system.update(Math.min(.05,dt/1000),{x:0,y:0})}}
  for(let cycle=0;cycle<5;cycle++){
   const n=created;game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,scene:[Fixture],audio:{noAudio:true},banner:false,input:{keyboard:false,mouse:false,touch:false,gamepad:false}});await wait(()=>created>n&&document.body.dataset.collectibleState);
   assert(nodes()===1,'A: initialization duplicate nodes');assert(system.model.count===0,'A: initial counter');
   if(cycle===0){
    for(let r=0;r<3;r++){
     system.update(0,{x:1810,y:320});for(let i=0;i<6000;i++)system.update(1/60,{x:1810,y:320});assert(system.model.count===1,'I: duplicate pickup');
     system.update(0,{x:1860,y:1590});assert(system.model.count===2,'G: both pickups');
     system.reset();assert(system.model.count===0&&game.scene.getScene('Life').children.list.filter(o=>o.name?.endsWith(':dew-pearl')&&o.visible).length===2,'H: reset did not restore both visuals');
     const old=system,events=game.scene.getScene('Life').events;game.scene.stop('Life');assert(nodes()===0&&!document.body.dataset.collectibleState,'G: shutdown residue');
     old.destroy();old.destroy();old.reset();old.update(1,{x:1810,y:320});assert(nodes()===0,'F: non-idempotent');
     assert(!events.listeners(Phaser.Scenes.Events.SHUTDOWN).includes(old.shutdown)&&!events.listeners(Phaser.Scenes.Events.DESTROY).includes(old.shutdown),'listeners retained');
     const c=created;game.scene.start('Life');await wait(()=>created>c);assert(nodes()===1&&system.model.count===0,'G: restart failed');restarts.push({nodes:nodes(),count:system.model.count,objects:game.scene.getScene('Life').children.length});
    }
    // Two live owners: retirement must preserve newer diagnostics and its DOM.
    const scene=game.scene.getScene('Life'),newer=new ForestCollectibleSystem(scene,defs);newer.update(0,{x:1810,y:320});const snapshot=document.body.dataset.collectibleState;
    system.destroy();assert(nodes()===1&&document.body.dataset.collectibleState===snapshot,'deleted another owner');newer.destroy();assert(nodes()===0&&!document.body.dataset.collectibleState,'owner cleanup failed');system=new ForestCollectibleSystem(scene,defs);system.update(0,{x:0,y:0});
   }
   const active=system,events=game.scene.getScene('Life').events,d=destroyed;game.destroy(true);await wait(()=>destroyed>d&&document.querySelectorAll('canvas').length===0);
   assert(nodes()===0,'C/E: Game.destroy DOM residue');assert(!document.body.dataset.collectibleState,'D: stale telemetry');assert(sentinel.isConnected,'deleted foreign DOM');
   active.destroy();active.destroy();assert(!events.listeners(Phaser.Scenes.Events.SHUTDOWN).includes(active.shutdown)&&!events.listeners(Phaser.Scenes.Events.DESTROY).includes(active.shutdown),'B: lifecycle listeners retained');
   cycles.push({cycle:cycle+1,nodes:nodes(),telemetry:document.body.dataset.collectibleState??null,canvas:document.querySelectorAll('canvas').length,foreignDOM:sentinel.isConnected});
  }
  return{cycles,restarts,simulatedContactSeconds:100,ownership:true,idempotent:true};
 });return{...result,errors};
}
