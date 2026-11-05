import Phaser from 'phaser';
import {FoxCharacter} from '../../characters/fox/FoxCharacter';
import {LayerStack} from '../../world/render/LayerStack';
import {mapCollision,validateLevel,levelBounds,jumpEnvelope} from '../shared/MapCollision';
import {CameraController} from '../shared/CameraController';
import {CameraDebugOverlay} from '../shared/CameraDebugOverlay';
import {LevelDebugOverlay} from '../shared/LevelDebugOverlay';
import {V2RouteRecorder} from './V2RouteRecorder';
import {ForestEnvironment} from '../../environment/ForestEnvironment';
import {MovingPlatformWorld} from '../../mechanisms/MovingPlatformWorld';
import {MovingPlatformView} from '../../mechanisms/MovingPlatformView';
import {InteractionInput} from '../../interactions/InteractionInput';
import {ForestInteractionSystem,preloadInteractions} from '../../interactions/ForestInteractionSystem';
import {ForestCollectibleSystem} from '../../collectibles/ForestCollectibleSystem';
import {preloadCollectibles} from '../../collectibles/CollectibleView';
import {preloadCheckpoints} from '../../checkpoints/CheckpointView';
import {CheckpointSystem} from '../../checkpoints/CheckpointSystem';
import {AdventureSystem} from '../../adventure/AdventureSystem';
import {LevelCompletionController} from '../../completion/LevelCompletionController';
import {level01Exit} from '../../completion/Level01Exit';
import {routeInteraction} from '../../completion/LevelCompletionModel';
import {createV2Map,bridgeMode,v2MovingPlatforms,v2Interactions,v2Collectibles,v2Checkpoints,V2_DESIGN} from './V2Config';
import {V2Terrain} from './V2Terrain';
import {V2Rescue} from './V2Rescue';
import {V2RoutePilot,V2_ROUTES} from './V2RoutePilot';

/** Independent P1 composition root. Shared production rules are injected with V2 layout. */
export class Level01V2Scene extends Phaser.Scene {
  private map=createV2Map(bridgeMode(location.search));private fox!:FoxCharacter;
  private terrain!:V2Terrain;private cameraRig!:CameraController;private cameraDebug!:CameraDebugOverlay;
  private environment!:ForestEnvironment;private overlay!:LevelDebugOverlay;
  private moving!:MovingPlatformWorld;private movingView!:MovingPlatformView;
  private interactions!:ForestInteractionSystem;private interactionInput!:InteractionInput;
  private collectibles!:ForestCollectibleSystem;private adventure!:AdventureSystem;
  private checkpoints!:CheckpointSystem;private completion!:LevelCompletionController;
  private rescue=new V2Rescue();private pilot?:V2RoutePilot;private recorder=new V2RouteRecorder();
  private abort?:AbortController;private cleaned=false;private ownedNodes:Element[]=[];
  private keys=new Set<string>();private previousPause=false;private elapsed=0;private area='A';private visits=new Set<string>();private completed=false;
  private penetrationFrames=0;private boundsErrors=0;private landings:object[]=[];private jumps:object[]=[];
  private frameTimes:number[]=[];private lastFrame=0;private updateTimes:number[]=[];
  private resumeMode:FoxCharacter['mode']='AUTO';
  constructor(){super('Level01');}
  preload():void{preloadInteractions(this);preloadCollectibles(this);preloadCheckpoints(this);}
  create():void {
    this.cleaned=false;this.recorder=new V2RouteRecorder();this.abort=new AbortController();const before=new Set(document.querySelector('.level-dev')!.children);
    const errors=validateLevel(this.map);if(errors.length)throw Error(errors.join('\n'));
    const {floor,obstacles}=mapCollision(this.map),stack=new LayerStack(this);
    this.terrain=new V2Terrain(this,this.map,bridgeMode(location.search));this.terrain.build();
    this.fox=new FoxCharacter(this,stack,()=>floor,()=>obstacles,this.map.spawn.x);
    this.fox.player.bounds=levelBounds(this.map);
    this.moving=new MovingPlatformWorld(v2MovingPlatforms());this.fox.player.world.setDynamicPlatforms(this.moving);this.movingView=new MovingPlatformView(this,this.moving);
    this.cameraRig=new CameraController(this.cameras.main,this.map.width,this.map.height,'stable');this.cameraDebug=new CameraDebugOverlay(this,this.cameraRig);
    this.overlay=new LevelDebugOverlay(this,this.map);this.environment=new ForestEnvironment(this,this.map);
    for(const title of document.querySelectorAll('#map-svg svg > text'))if(title.textContent?.includes('晨光林地 A.1'))title.textContent=`${this.map.title} · ${this.map.width} × ${this.map.height} · 碰撞与路线总览`;
    this.interactionInput=new InteractionInput();this.interactions=new ForestInteractionSystem(this,v2Interactions(),this.interactionInput);
    this.collectibles=new ForestCollectibleSystem(this,v2Collectibles());
    this.adventure=new AdventureSystem(this,this.map,this.collectibles,this.interactionInput,{saveKey:'mosslight:morning-glade:v2-c11',sessionOnly:true});
    this.checkpoints=new CheckpointSystem(this,this.map,this.fox.player,{
      before:()=>{this.stopPilot();},restoreAnimation:()=>{this.fox.animation.resetMotion();this.fox.update(0);},
      resetCamera:(x,y)=>this.cameraRig.reset(x,y),detachPlatform:()=>this.moving.observe(this.fox.player),
    },v2Checkpoints());
    this.completion=new LevelCompletionController(this,level01Exit(this.map),{
      freeze:()=>{this.stopPilot();this.resumeMode=this.fox.mode;this.fox.player.velocity=0;this.fox.player.velocityY=0;this.fox.player.landTimer=0;this.fox.animation.resetMotion();this.fox.mode='IDLE';this.fox.update(0);},
      resume:()=>{this.interactionInput.clear();this.fox.player.release();this.fox.mode=this.resumeMode;},restart:()=>this.restart(),
      completed:data=>{this.completed=true;this.events.emit('level:finish',{levelId:data.levelId,elapsed:data.elapsed,visited:[...data.explorationSummary]});this.events.emit('level:completed',data);},
    });
    this.reset();
    const select=document.querySelector<HTMLSelectElement>('#test-route')!;select.replaceChildren(...Object.entries(V2_ROUTES).map(([id,r])=>new Option(r.label,id)));
    document.querySelector<HTMLButtonElement>('#test-start')!.onclick=()=>{this.restart();this.pilot=new V2RoutePilot(select.value);this.overlay.toggle(false);document.querySelector<HTMLElement>('#game')!.focus();if(document.querySelector<HTMLInputElement>('#record-route')!.checked)this.recorder.start(select.value);};
    document.querySelector<HTMLButtonElement>('#test-stop')!.onclick=()=>this.stopPilot();
    document.querySelector<HTMLButtonElement>('#level-reset')!.onclick=()=>this.restart();
    window.addEventListener('keydown',e=>{if(e.repeat||(e.target as HTMLElement)?.closest('input,select,textarea'))return;
      if(e.code==='KeyM'&&!this.adventure.paused&&!this.completion.locked){e.preventDefault();this.overlay.toggle();}
      if(e.code==='Escape'&&!this.completion.locked)this.overlay.toggle(false);
      if(e.code==='KeyR'&&!this.adventure.paused)this.restart();
    },{signal:this.abort.signal});
    this.ownedNodes=[...document.querySelector('.level-dev')!.children].filter(n=>!before.has(n));
    document.querySelector('#physics-summary')!.textContent=`原物理：跑128 / 走60 · 单跳高${jumpEnvelope.height}px · 同高跑跳${jumpEnvelope.runDistance.toFixed(1)}px · 36×164`;
    document.querySelector('#loading')!.setAttribute('hidden','');document.documentElement.dataset.sceneReady='true';document.body.dataset.levelMode='v2-preview';
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.cleanup,this);this.events.once(Phaser.Scenes.Events.DESTROY,this.cleanup,this);
  }
  private reset():void {
    this.completion?.reset();this.interactionInput?.clear();this.moving?.reset();
    const p=this.fox.player;if(!p.respawnAt({...this.map.spawn,surfaceId:'entry'}))throw Error('V2 spawn is unsafe');
    p.jumpCount=0;p.landCount=0;p.coyoteJumps=0;p.bufferJumps=0;this.fox.animation.resetMotion();this.fox.mode='AUTO';this.fox.update(0);
    this.interactions?.reset();this.collectibles?.reset();this.adventure?.reset();this.checkpoints?.reset();this.rescue.reset();
    this.elapsed=0;this.area='A';this.visits.clear();this.completed=false;this.penetrationFrames=0;this.boundsErrors=0;this.landings=[];this.jumps=[];
    this.cameraRig.reset(p.x,p.y);this.lastFrame=0;this.frameTimes=[];this.updateTimes=[];this.previousPause=false;
  }
  private restart():void{this.stopPilot();this.reset();document.querySelector('#test-result')!.textContent='V2已完整重置 · 静态根桥模式不变';}
  private stopPilot():void{this.recorder.stop();this.pilot=undefined;this.sendKeys(0,false);this.fox?.player.release();this.interactionInput?.clear();}
  private sendKeys(axis:number,jump:boolean,interact=false):void {
    const wanted=new Set([...(axis<0?['KeyA']:axis>0?['KeyD']:[]),...(jump?['Space']:[]),...(interact?['KeyE']:[])]),host=document.querySelector('#game')!;
    for(const code of this.keys)if(!wanted.has(code))host.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
    for(const code of wanted)host.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,repeat:this.keys.has(code)}));this.keys=wanted;
  }
  update(_time:number,delta:number):void {
    if(!this.fox||!this.completion)return;const started=performance.now(),dt=Math.min(.05,delta/1000),p=this.fox.player;
    const external=this.overlay.open||this.adventure.paused||document.hidden;
    const receiver=routeInteraction(this.interactionInput.consume(),external||this.completion.locked,this.completion.canActivate(p),this.adventure.canInteract(p));
    if(receiver==='exit')this.completion.activate(p,{levelId:this.map.id,collectedCount:this.collectibles.model.count,totalCollectibles:this.collectibles.model.total,explorationSummary:[...this.visits],elapsed:this.elapsed});
    const paused=external||this.completion.locked;
    if(paused!==this.previousPause){p.release();this.sendKeys(0,false);this.previousPause=paused;}
    this.rescue.update(p,paused,(reason,id)=>this.checkpoints.requestRespawn(reason,id));this.checkpoints.update(dt,paused);
    if(!paused){
      this.elapsed+=dt;
      if(this.pilot&&!this.pilot.done&&!this.pilot.failed){const v=this.pilot.next(p,dt);this.sendKeys(v.axis,v.jump,v.interact);
        if(this.pilot.done||this.pilot.failed){this.sendKeys(0,false);document.querySelector('#test-result')!.textContent=`${this.pilot.route} · ${this.pilot.done?'完成':'失败'} · ${this.pilot.elapsed.toFixed(1)}s ${this.pilot.error}`;}}
      this.fox.update(dt);this.moving.observe(p);this.movingView.update();this.cameraRig.update(dt,p.x,p.y,p);
      if(p.collides(p.x,p.y))this.penetrationFrames++;
      if(p.grounded){const m=V2_DESIGN.modules.find(m=>m.id===p.supportId);if(m)this.area=m.area;this.visits.add(this.area);}
      if(p.jumpedThisFrame)this.jumps.push({time:this.elapsed,x:p.x,y:p.y,velocity:p.velocity,kind:p.lastJumpKind});
      if(p.landedThisFrame){const m=this.map.modules.find(m=>m.id===p.supportId);this.landings.push({time:this.elapsed,x:p.x,y:p.y,support:p.supportId,margin:m?Math.min(p.x-m.x,m.x+m.width-p.x):null,velocity:p.velocity});}
      // Keep developer history bounded during long free exploration. Lifetime totals stay on the motor.
      if(this.jumps.length>128)this.jumps.shift();if(this.landings.length>128)this.landings.shift();
      if(this.lastFrame)this.frameTimes.push(started-this.lastFrame);this.lastFrame=started;
    }else this.lastFrame=0;
    if(this.completion.model.state==='ACTIVATING'&&!external)this.fox.update(dt);
    this.completion.update(dt,p,external);this.interactions.update(dt,p,paused,receiver==='forest');this.collectibles.update(dt,p,paused);
    this.adventure.update(dt,p,this.overlay.open,receiver==='garden',this.completion.locked||document.hidden);
    this.cameraDebug.update(p.x,p.y);this.terrain.update(this.cameras.main);this.environment.update(this.cameras.main);this.overlay.update(p.x,p.y,p.body);
    const c=this.cameras.main;if(c.scrollX<-.01||c.scrollX>this.map.width-1280+.01||c.scrollY<-.01||c.scrollY>this.map.height-720+.01)this.boundsErrors++;
    document.querySelector('#level-status')!.textContent=`V2 P1 · ${V2_DESIGN.regions.find(r=>r.id===this.area)?.name} · 根桥${bridgeMode(location.search)} · ${this.collectibles.model.count}/2露珠${this.completed?' · 已到达门庭':''}${this.rescue.requests?` · 已自动救援${this.rescue.requests}次`:''}`;
    this.updateTimes.push(performance.now()-started);if(this.frameTimes.length>3600)this.frameTimes.shift();if(this.updateTimes.length>3600)this.updateTimes.shift();
    document.querySelector('#level-telemetry')!.textContent=JSON.stringify({x:p.x,y:p.y,velocity:p.velocity,velocityY:p.velocityY,grounded:p.grounded,support:p.supportId,state:this.fox.animation.state,area:this.area,visited:[...this.visits],elapsed:this.elapsed,
      jumps:p.jumpCount,landings:p.landCount,jumpSamples:this.jumps,landingSamples:this.landings,penetrationFrames:this.penetrationFrames,boundsErrors:this.boundsErrors,camera:{x:c.scrollX,y:c.scrollY},cameraFollow:this.cameraRig.snapshot(p.x,p.y),
      moving:this.moving.snapshot(p),rescue:{requests:this.rescue.requests,lastRequest:this.rescue.lastRequest},completed:this.completed,paused,
      pilot:this.pilot?{route:this.pilot.route,index:this.pilot.index,done:this.pilot.done,failed:this.pilot.failed,error:this.pilot.error,elapsed:this.pilot.elapsed,supports:[...this.pilot.supports]}:null,
      resources:this.resources(),performance:this.performanceSummary()});
  }
  private resources(){let total=0;const visit=(list:Phaser.GameObjects.GameObject[])=>{for(const o of list){total++;const sub=(o as Phaser.GameObjects.Container).list;if(Array.isArray(sub))visit(sub);}};visit(this.children.list);return{textures:this.textures.getTextureKeys().length,topObjects:this.children.length,totalObjects:total,dom:document.querySelectorAll('body *').length};}
  private performanceSummary(){const a=[...this.frameTimes].sort((a,b)=>a-b),b=[...this.updateTimes].sort((a,b)=>a-b);return{frames:a.length,fps:a.length?1000/(a.reduce((x,y)=>x+y,0)/a.length):0,p95FrameMs:a[Math.floor(a.length*.95)]??0,p95UpdateMs:b[Math.floor(b.length*.95)]??0,animation:this.fox.performance.snapshot()};}
  private cleanup():void {
    if(this.cleaned)return;this.cleaned=true;this.stopPilot();this.recorder.destroy();this.abort?.abort();this.fox?.player.destroy();this.interactions?.destroy();this.interactionInput?.destroy();this.collectibles?.destroy();this.adventure?.destroy();this.checkpoints?.destroy();this.completion?.destroy();
    this.ownedNodes.forEach(n=>n.remove());this.ownedNodes=[];for(const id of ['test-start','test-stop','level-reset','map-toggle','map-close','terrain-debug']){const n=document.getElementById(id);if(n)n.onclick=null;}
    this.overlay?.toggle(false);for(const k of ['v2Map','environmentState'])delete document.body.dataset[k];
    for(const id of ['map-svg','level-telemetry','physics-summary','level-status'])document.getElementById(id)?.replaceChildren();delete document.documentElement.dataset.sceneReady;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN,this.cleanup,this);this.events.off(Phaser.Scenes.Events.DESTROY,this.cleanup,this);
  }
}
