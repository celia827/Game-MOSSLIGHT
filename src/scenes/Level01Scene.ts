import {InteractionInput} from '../interactions/InteractionInput';
import {applyLevel01Mode,level01DeveloperMode} from '../levels/level01/Level01Mode';
import {LevelCompletionController} from '../completion/LevelCompletionController';
import {level01Exit} from '../completion/Level01Exit';
import {routeInteraction} from '../completion/LevelCompletionModel';
import {CheckpointSystem} from '../checkpoints/CheckpointSystem';
import {preloadCheckpoints} from '../checkpoints/CheckpointView';
import {AdventureSystem} from '../adventure/AdventureSystem';
import {ForestCollectibleSystem} from '../collectibles/ForestCollectibleSystem';
import {preloadCollectibles} from '../collectibles/CollectibleView';
import {level01Collectibles} from '../collectibles/Level01Collectibles';
import {MovingPlatformWorld} from '../mechanisms/MovingPlatformWorld';
import {level01MovingPlatform} from '../mechanisms/Level01MovingPlatform';
import {MovingPlatformView} from '../mechanisms/MovingPlatformView';
import {ForestInteractionSystem,preloadInteractions} from '../interactions/ForestInteractionSystem';
import {level01Interactions} from '../interactions/Level01Interactions';
import {ForestEnvironment} from '../environment/ForestEnvironment';
import {CameraDebugOverlay} from '../levels/shared/CameraDebugOverlay';
import Phaser from 'phaser';
import {surfaceY} from '../world/terrain/geometry';
import {FoxCharacter} from '../characters/fox/FoxCharacter';
import {LayerStack} from '../world/render/LayerStack';
import {Level01MapData as map} from '../levels/level01/Level01MapData';
import {mapCollision,validateLevel,jumpEnvelope,levelBounds} from '../levels/shared/MapCollision';
import {TerrainBuilder} from '../levels/shared/TerrainBuilder';
import {CameraController} from '../levels/shared/CameraController';
import {LevelDebugOverlay} from '../levels/shared/LevelDebugOverlay';
import {LevelRouteRecorder} from '../levels/shared/LevelRouteRecorder';
import {RoutePilot,type TestRoute} from '../levels/level01/Level01Routes';

export class Level01Scene extends Phaser.Scene {
  private completion?:LevelCompletionController;private interactionInput?:InteractionInput;
  private resumeMode:FoxCharacter['mode']='AUTO';
  private checkpoints?:CheckpointSystem;
  private cleaned=false;private ownedDevNodes:Element[]=[];
  private domBindings:{node:HTMLElement;callback:HTMLElement['onclick']}[]=[];
  private adventure?:AdventureSystem;
  private collectibles?:ForestCollectibleSystem;
  private moving?:MovingPlatformWorld;private movingView?:MovingPlatformView;
  private cameraDebug?:CameraDebugOverlay;
  private developer=false;
  private environment!:ForestEnvironment;
  private interactions?:ForestInteractionSystem;
  private fox!:FoxCharacter;private cameraRig!:CameraController;private terrain!:TerrainBuilder;
  private overlay!:Pick<LevelDebugOverlay,'open'|'toggle'|'update'>;private abort?:AbortController;private pilot?:RoutePilot;
  private recorder=new LevelRouteRecorder();
  private cameraStats={minY:Infinity,maxY:0,minFoot:Infinity,maxFoot:0,boundsErrors:0};
  private automatedKeys=new Set<string>();private completed=false;private elapsed=0;private previousOpen=false;
  private visits=new Set<string>();private penetrationFrames=0;private status!:HTMLElement;
  constructor(){super('Level01');}
  preload():void {preloadInteractions(this);preloadCollectibles(this);preloadCheckpoints(this);}
  create():void {
    this.cleaned=false;this.previousOpen=false;
    this.cameraDebug=undefined;
    this.abort=new AbortController();this.developer=level01DeveloperMode(location.search);applyLevel01Mode(this.developer,this.abort.signal);
    const devBefore=new Set(document.querySelector('.level-dev')!.children);
    const errors=validateLevel(map);if(errors.length)throw new Error(errors.join('\n'));
    const stack=new LayerStack(this),{floor,obstacles}=mapCollision(map);
    this.terrain=new TerrainBuilder(this,stack,map);this.terrain.build();
    this.fox=new FoxCharacter(this,stack,()=>floor,()=>obstacles,map.spawn.x);
    this.moving=new MovingPlatformWorld(level01MovingPlatform(map));this.fox.player.world.setDynamicPlatforms(this.moving);this.movingView=new MovingPlatformView(this,this.moving);
    this.reset();this.cameraRig=new CameraController(this.cameras.main,map.width,map.height,this.developer&&new URLSearchParams(location.search).get('camera')==='before'?'baseline':'stable');if(this.developer)this.cameraDebug=new CameraDebugOverlay(this,this.cameraRig);this.cameraRig.reset(map.spawn.x,map.spawn.y);
    const artSample=this.developer?new URLSearchParams(location.search).get('artSample'):null;
    const artId=({ground:'entry',branch:'crown-rest',cave:'cave-east'} as Record<string,string>)[artSample??''];
    const artModule=map.modules.find(m=>m.id===artId);
    if(artModule){const p=this.fox.player;p.x=artModule.x+artModule.width*.5;p.y=surfaceY(artModule,p.x)!;p.supportId=artModule.id;this.fox.update(0);this.cameraRig.reset(p.x,p.y);}
    this.overlay=this.developer?new LevelDebugOverlay(this,map):{open:false,toggle:()=>{},update:()=>{}};this.environment=new ForestEnvironment(this,map);this.status=document.querySelector('#level-status')!;
    this.interactionInput=new InteractionInput();
    this.interactions=new ForestInteractionSystem(this,level01Interactions(map),this.interactionInput);
    this.collectibles=new ForestCollectibleSystem(this,level01Collectibles(map));
    this.adventure=new AdventureSystem(this,map,this.collectibles,this.interactionInput);
    if(!artModule){this.adventure.resume(this.fox.player);this.fox.update(0);this.cameraRig.reset(this.fox.player.x,this.fox.player.y);}
    this.completed=false;
    this.checkpoints=new CheckpointSystem(this,map,this.fox.player,{
      before:()=>this.stopPilot(),
      restoreAnimation:()=>{this.fox.animation.resetMotion();this.fox.update(0);},
      resetCamera:(x,y)=>this.cameraRig.reset(x,y),
      detachPlatform:()=>this.moving?.observe(this.fox.player),
    });
    this.completion=new LevelCompletionController(this,level01Exit(map),{
      freeze:()=>{this.stopPilot();this.resumeMode=this.fox.mode;this.fox.player.velocity=0;this.fox.player.velocityY=0;this.fox.player.landTimer=0;this.fox.animation.resetMotion();this.fox.mode='IDLE';this.fox.update(0);},
      resume:()=>{this.interactionInput?.clear();this.fox.player.release();this.fox.mode=this.resumeMode;},
      restart:()=>this.restart(),
      completed:data=>{this.completed=true;this.events.emit('level:finish',{levelId:data.levelId,elapsed:data.elapsed,visited:[...data.explorationSummary]});this.events.emit('level:completed',data);},
    });
    const {signal}=this.abort;
    window.addEventListener('keydown',e=>{
      if((e.target as HTMLElement)?.closest('input,select,textarea'))return;
      if(e.repeat)return;
      if(this.developer&&e.code==='KeyM'&&!this.adventure?.paused&&!this.completion?.locked){e.preventDefault();this.overlay.toggle();}
      if(e.code==='Escape'&&!this.completion?.locked)this.overlay.toggle(false);
      if(e.code==='KeyR'&&!this.adventure?.paused)this.restart();
    },{signal});
    document.querySelector<HTMLButtonElement>('#level-reset')!.onclick=()=>this.restart();
    if(this.developer){
    document.querySelector<HTMLButtonElement>('#test-start')!.onclick=()=>{
      const route=(document.querySelector<HTMLSelectElement>('#test-route')!).value as TestRoute;
      this.restart();this.pilot=new RoutePilot(route);
      if(route.startsWith('reverse')) {this.placeAtFinish();}
      this.overlay.toggle(false);
      if(document.querySelector<HTMLInputElement>('#record-route')!.checked)this.recorder.start(route);
    };
    document.querySelector<HTMLButtonElement>('#test-stop')!.onclick=()=>this.stopPilot();
    }
    this.ownedDevNodes=[...document.querySelector('.level-dev')!.children].filter(n=>!devBefore.has(n));
    this.domBindings=[...document.querySelectorAll<HTMLElement>('.level-dev button,#level-reset,#map-toggle,#map-close')].map(node=>({node,callback:node.onclick}));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,this.cleanup,this);this.events.once(Phaser.Scenes.Events.DESTROY,this.cleanup,this);
    document.querySelector<HTMLElement>('#loading')!.hidden=true;document.documentElement.dataset.sceneReady='true';
    document.querySelector('#physics-summary')!.textContent=this.developer?`跑 128 / 走 60 px/s · 跳高 ${jumpEnvelope.height} px · 同高跑跳 ${jumpEnvelope.runDistance.toFixed(1)} px · 体型 36×164 · 空中加速 510 px/s²`:'';
  }
  /** Scene-owned inputs/dev DOM must also retire on direct Game.destroy(). */
  private cleanup():void {
    if(this.cleaned)return;this.cleaned=true;this.stopPilot();this.recorder.destroy();this.abort?.abort();
    this.fox?.player.destroy();this.interactions?.destroy();this.checkpoints?.destroy();this.completion?.destroy();this.interactionInput?.destroy();
    this.ownedDevNodes.forEach(n=>n.remove());this.ownedDevNodes=[];
    for(const {node,callback}of this.domBindings)if(node.onclick===callback)node.onclick=null;this.domBindings=[];
    this.overlay?.toggle(false);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN,this.cleanup,this);this.events.off(Phaser.Scenes.Events.DESTROY,this.cleanup,this);
  }
  private reset():void {
    this.completion?.reset();this.interactionInput?.clear();
    this.moving?.reset();
    const p=this.fox.player;p.bounds=levelBounds(map);p.respawnAt({...map.spawn,surfaceId:'entry'});
    p.jumpCount=0;p.landCount=0;p.coyoteJumps=0;p.bufferJumps=0;
    this.fox.animation.resetMotion();this.completed=false;this.visits.clear();this.elapsed=0;this.penetrationFrames=0;this.cameraStats={minY:Infinity,maxY:0,minFoot:Infinity,maxFoot:0,boundsErrors:0};
    this.fox.update(0);this.interactions?.reset();this.collectibles?.reset();this.adventure?.reset();this.checkpoints?.reset();
  }
  private placeAtFinish():void {
    // Explicit initial fixture for reverse tests, before any route input begins.
    const p=this.fox.player;p.x=map.finish.x;p.y=map.finish.y;p.supportId='clearing';this.fox.update(0);
    this.cameraRig.reset(p.x,p.y);
  }
  private restart():void {this.stopPilot();this.reset();this.cameraRig?.reset(map.spawn.x,map.spawn.y);document.querySelector('#test-result')!.textContent='尚未运行路线回放';}
  private stopPilot():void {this.recorder.stop();this.pilot=undefined;this.sendKeys(0,false);this.fox?.player.release();}
  private sendKeys(axis:number,held:boolean,walking=false):void {
    const wanted=new Set<string>([...(axis<0?['KeyA']:axis>0?['KeyD']:[]),...(held?['Space']:[]),...(walking?['ShiftLeft']:[])]);
    for(const code of this.automatedKeys)if(!wanted.has(code))document.querySelector('#game')!.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
    // Reassert held keys after browser blur; repeat=true restores held state
    // without manufacturing a second jump edge.
    for(const code of wanted)document.querySelector('#game')!.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,repeat:this.automatedKeys.has(code)}));
    this.automatedKeys=wanted;
  }
  update(_time:number,delta:number):void {
    if(!this.fox||!this.overlay)return;
    const dt=Math.min(.05,delta/1000),p=this.fox.player,externalPause=this.overlay.open||!!this.adventure?.paused||document.hidden;
    const receiver=routeInteraction(this.interactionInput?.consume()??false,externalPause||!!this.completion?.locked,this.completion?.canActivate(p)??false,this.adventure?.canInteract(p)??false);
    if(receiver==='exit')this.completion?.activate(p,{levelId:map.id,collectedCount:this.collectibles!.model.count,totalCollectibles:this.collectibles!.model.total,explorationSummary:[...this.visits],elapsed:this.elapsed});
    const open=externalPause||!!this.completion?.locked;
    this.checkpoints?.update(dt,open);
    if(open!==this.previousOpen){p.release();this.sendKeys(0,false);this.previousOpen=open;}
    if(!open) {
      this.elapsed+=dt;
      if(this.pilot&&!this.pilot.done&&!this.pilot.failed) {
        const input=this.pilot.next(p,dt);this.sendKeys(input.axis,input.jump.held,input.walking);
        if(this.pilot.done||this.pilot.failed){
          this.recorder.stop();
          this.sendKeys(0,false);
          document.querySelector('#test-result')!.textContent=`${this.pilot.route} · ${this.pilot.done?'完成':'超时'} · ${this.pilot.elapsed.toFixed(1)} 秒 · ${this.pilot.supports.size} 个接触面 · 碰撞重叠 ${this.penetrationFrames} 帧`;
        }
      }
      this.fox.update(dt);this.moving?.observe(p);this.movingView?.update();this.cameraRig.update(dt,p.x,p.y,p);
      if(p.collides(p.x,p.y))this.penetrationFrames++;
      for(const n of map.landmarks??[])if(p.grounded&&p.supportId===n.moduleId&&Math.abs(p.x-n.x)<75)this.visits.add(n.label);
      if(p.y<500)this.visits.add('树冠');if(p.y>1200&&p.x>1030)this.visits.add('根洞');
      if(p.y>1550&&p.x>1780&&p.x<1960)this.visits.add('隐藏根室');

    }
    if(this.completion?.model.state==='ACTIVATING'&&!externalPause)this.fox.update(dt);
    this.completion?.update(dt,p,externalPause);
    this.interactions?.update(dt,p,open,receiver==='forest');
    this.collectibles?.update(dt,p,open);
    this.adventure?.update(dt,p,this.overlay.open,receiver==='garden',!!this.completion?.locked||document.hidden);
    this.cameraDebug?.update(p.x,p.y);this.terrain.update(this.cameras.main);this.environment.update(this.cameras.main);this.overlay.update(p.x,p.y,p.body);
    const location=p.y>1200?'回声根洞':(p.supportId?.startsWith('crown')||p.y<750)?'树冠高处':p.x>3200?'晨光门庭':p.x<600?'森林入口':'森林主路';
    this.status.textContent=this.completed?'已抵达晨光门庭 · 可继续回头探索':`${location} · ${this.visits.size?`已发现 ${[...this.visits].join(' / ')}`:'沿路牌探索森林'}`;
    const c=this.cameras.main,stats=this.cameraStats,foot=p.y-c.scrollY;
    stats.minY=Math.min(stats.minY,c.scrollY);stats.maxY=Math.max(stats.maxY,c.scrollY);
    stats.minFoot=Math.min(stats.minFoot,foot);stats.maxFoot=Math.max(stats.maxFoot,foot);
    if(c.scrollX<-.01||c.scrollX>map.width-1280+.01||c.scrollY<-.01||c.scrollY>map.height-720+.01)stats.boundsErrors++;
    // Read-only telemetry supports browser QA; no teleport / physics mutation API.
    if(this.developer)document.querySelector<HTMLElement>('#level-telemetry')!.textContent=JSON.stringify({
      x:+p.x.toFixed(2),y:+p.y.toFixed(2),velocity:+p.velocity.toFixed(2),grounded:p.grounded,support:p.supportId,
      walking:p.walking,jumps:p.jumpCount,landings:p.landCount,state:this.fox.animation.state,
      camera:{x:+this.cameras.main.scrollX.toFixed(2),y:+this.cameras.main.scrollY.toFixed(2)},
      cameraFollow:this.cameraRig.snapshot(p.x,p.y),cameraStats:this.cameraStats,performance:this.fox.performance.snapshot(),completed:this.completed,visited:[...this.visits],penetrationFrames:this.penetrationFrames,
      moving:this.moving?.snapshot(p),
      pilot:this.pilot?{route:this.pilot.route,index:this.pilot.index,done:this.pilot.done,failed:this.pilot.failed,elapsed:+this.pilot.elapsed.toFixed(2),supports:[...this.pilot.supports]}:null,
    });
  }
}
