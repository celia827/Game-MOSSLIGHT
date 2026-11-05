async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/docs/adventure-v1/lifecycle-fixture.html');
 const result=await page.evaluate(async()=>{
  const Phaser=(await import('/node_modules/.vite/deps/phaser.js')).default;
  const {ForestCollectibleSystem}=await import('/src/collectibles/ForestCollectibleSystem.ts');const {preloadCollectibles}=await import('/src/collectibles/CollectibleView.ts');const {level01Collectibles}=await import('/src/collectibles/Level01Collectibles.ts');
  const {AdventureSystem}=await import('/src/adventure/AdventureSystem.ts');const {Level01MapData:map}=await import('/src/levels/level01/Level01MapData.ts');const {createLevelMotor}=await import('/src/levels/shared/MapCollision.ts');
  const assert=(ok,msg)=>{if(!ok)throw Error(msg)},wait=async fn=>{for(let i=0;i<400;i++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('Lifecycle fixture timeout')};
  let system,collectibles,created=0,game,player;const cycles=[],restarts=[];const key='mosslight:morning-glade:v1';
  class Fixture extends Phaser.Scene{
   constructor(){super('AdventureLife')}preload(){preloadCollectibles(this)}
   create(){collectibles=new ForestCollectibleSystem(this,level01Collectibles(map));system=new AdventureSystem(this,map,collectibles);player=createLevelMotor(map);created++;}
   update(t,dt){collectibles.update(Math.min(.05,dt/1000),player);system.update(Math.min(.05,dt/1000),player,false)}
  }
  for(let cycle=0;cycle<3;cycle++){
   localStorage.removeItem(key);const before=created;game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,scene:[Fixture],audio:{noAudio:true},banner:false,input:{keyboard:false,mouse:false,touch:false,gamepad:false}});await wait(()=>created>before);
   assert(document.querySelectorAll('.adventure-ui').length===1,'duplicate initial HUD');
   // Component probes verify collection restore/events; these are not route-play evidence.
   let events=0;const scene=game.scene.getScene('AdventureLife');scene.events.on('collectible:collected',()=>events++);
   collectibles.update(0,{x:1810,y:320});assert(system.model.dew.size===1,'reward event not connected');assert(events===1,'pickup event count');collectibles.restore(['dew-canopy-lookout','unknown']);assert(events===1,'restore manufactured pickup events');
   if(cycle===0)for(let i=0;i<3;i++){
    const old=system,c=created;game.scene.stop('AdventureLife');assert(document.querySelectorAll('.adventure-ui').length===0,'shutdown left UI');assert(!document.body.dataset.adventureState,'shutdown left diagnostics');old.destroy();old.reset();
    game.scene.start('AdventureLife');await wait(()=>created>c);assert(system.model.dew.size===1&&collectibles.model.count===1,'restart lost reward');assert(document.querySelectorAll('.adventure-ui').length===1,'restart duplicated HUD');restarts.push({count:collectibles.model.count,huds:document.querySelectorAll('.adventure-ui').length});
   }
   // An old owner must never erase a newer HUD/diagnostic owner.
   const owner=system,newer=new AdventureSystem(scene,map,collectibles),diagnostic=document.body.dataset.adventureState;owner.model.reset();owner.destroy();assert(JSON.parse(localStorage.getItem(key)).dew.length===1,'old owner overwrote newer save');assert(document.querySelectorAll('.adventure-ui').length===1,'old owner removed newer HUD');assert(document.body.dataset.adventureState===diagnostic,'old owner deleted newer diagnostics');newer.destroy();
   system=new AdventureSystem(scene,map,collectibles);game.destroy(true);await wait(()=>document.querySelectorAll('canvas').length===0);
   assert(document.querySelectorAll('.adventure-ui').length===0,'Game.destroy left UI');assert(!document.body.dataset.adventureState,'Game.destroy left diagnostics');assert(document.querySelectorAll('#dewdrop-status').length===0,'Game.destroy left collectible announcer');
   cycles.push({cycle:cycle+1,huds:0,canvas:0,diagnostics:false});
  }
  localStorage.removeItem(key);return{cycles,restarts,ownership:true,restoreDoesNotAward:true};
 });return{...result,errors};
}
