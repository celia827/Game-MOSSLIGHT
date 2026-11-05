import {FUSION_DURATION} from './FusionTimeline';
import {mountMotionParameters} from '../ui/motionTuning';
import {DEMO_DURATION} from './GroundDemo';
import {GROUND_DURATION} from './GroundTimeline';
import type {GroundAction} from './GroundTimeline';
import Phaser from 'phaser';
import {LabScene} from './LabScene';
import type {LabView} from './LabScene';
import {KEY_POSES,poseById,JOINT_LABELS} from './poses';
import type {LabPoseId} from './poses';
import type {FoxAnimationController} from '../characters/fox/FoxAnimationController';
import {JUMP_DURATION} from './JumpTimeline';
import './style.css';
const view:LabView={region:'whole',mode:'overview',selected:'ANTICIPATION',showBones:false,compare:true,comparison:'primary',tuning:{},version:'refined',zoom:2.4,joint:'lowerSpine',time:0,rate:1,paused:true,secondary:true,ears:true,tail:true,travel:true,headMotion:true,headNeck:false,headPivot:false,waistBend:1,groundAction:'WALK',groundSpeed:60};
let scene:LabScene|undefined,game:Phaser.Game|undefined;
mountMotionParameters(document.querySelector('#flex-parameters')!,patch=>{Object.assign(view.tuning,patch);render();},new AbortController().signal,'lab-motion-');
const select=document.querySelector<HTMLSelectElement>('#pose-select')!,gallery=document.querySelector<HTMLElement>('#gallery-labels')!,stage=document.querySelector<HTMLElement>('#lab-stage')!;
const timeline=document.querySelector<HTMLInputElement>('#jump-timeline')!;
function fitStage(){const r=stage.getBoundingClientRect();if(r.width&&r.height)game?.scale.setParentSize(r.width,r.height);}
KEY_POSES.forEach((pose,i)=>{select.add(new Option(`${pose.name} / ${pose.id}`,pose.id));const card=document.createElement('article');card.className='pose-label';card.innerHTML=`<header><span class="pose-number">0${i+1}</span><div><h2>${pose.name}</h2><p>${pose.id}</p></div></header><footer><span>${pose.intent}</span><button type="button" aria-label="放大${pose.name}">放大查看 ↗</button></footer>`;card.querySelector('button')!.addEventListener('click',()=>{view.selected=pose.id;enter('focus');});gallery.append(card);});
function enter(mode:LabView['mode']){if((mode==='cycle'||mode==='ground'||mode==='fusion')&&view.mode!==mode){view.zoom=mode==='ground'?2.2:1.5;view.time=0;view.paused=false;}else if(mode==='focus'&&view.mode!=='focus')view.zoom=2.4;view.mode=mode;render();}
function readouts(){
  if(!scene)return;
  const fusion=view.mode==='fusion',ground=view.mode==='ground',cycle=view.mode==='cycle'||ground||fusion,pose=poseById(view.selected),selected=cycle?(fusion?scene.fusionTimeline.refined:ground?scene.groundTimeline.refined:scene.timeline.refined):scene.actors.find(a=>a.model.id===view.selected)!.model,bones=selected.bones.snapshot();
  const phase=(fusion?scene.fusionTimeline.refined:ground?scene.groundTimeline.refined:scene.timeline.refined).animationPhase;
  document.querySelector('#focus-name')!.textContent=cycle?`精修版本 / ${phase}`:`精修 · ${pose.name}`;
  document.querySelector('#inspector-name')!.textContent=cycle?`${fusion?'融合':ground?'地面':'跳跃'} / ${phase}`:pose.name;
  document.querySelector('#inspector-intent')!.textContent=cycle?'与森林场景使用相同动画控制器':pose.intent;
  document.querySelector('#pose-metrics')!.innerHTML=`<div><dt>骨盆下沉</dt><dd>${(bones.find(b=>b.id==='pelvis')!.y-170).toFixed(1)} px</dd></div><div><dt>腰部前屈</dt><dd>${(selected.bones.angle('lowerSpine')*180/Math.PI).toFixed(1)}°</dd></div><div><dt>头部俯仰</dt><dd>${(selected.bones.worldAngle('head')*180/Math.PI).toFixed(1)}°</dd></div>`;
  document.querySelector<HTMLInputElement>('#ground-time')!.max=String(Math.max(view.groundAction==='DEMO'?DEMO_DURATION:GROUND_DURATION,Math.ceil(view.time/GROUND_DURATION)*GROUND_DURATION));
  document.querySelector<HTMLInputElement>('#ground-time')!.value=String(view.time);
  document.querySelector('#ground-pause')!.textContent=view.paused?'继续':'暂停';
  const gs=scene.groundTimeline.snapshot();document.querySelector('#ground-metrics')!.textContent=`${gs.demoStage?gs.demoStage+' · ':''}${gs.time.toFixed(2)}s · ${gs.refined.state} · 实际 ${gs.speed.toFixed(1)}px/s · Phase ${gs.refined.phase.toFixed(3)} ${gs.refined.stage} · 支撑 ${gs.refined.feet.map((f,i)=>f.stance?(i?'远脚':'近脚'):'').filter(Boolean).join('+')||'双脚腾空'} · 步频 ${(gs.refined.cadence*2).toFixed(2)}/s`;
  const f=scene.fusionTimeline.snapshot();document.querySelector('#fusion-metrics')!.textContent=`实验室模拟输入 / 正式 PlayerController · ${f.time.toFixed(2)}s · ${f.phase} / ${f.pose} · vx ${f.velocity.toFixed(1)} vy ${f.velocityY.toFixed(1)} · 接地 ${f.grounded?'是':'否'} · 跳 ${f.jumps} / 落 ${f.lands}`;
  document.querySelector<HTMLInputElement>('#fusion-time')!.value=String(view.time);document.querySelector('#fusion-pause')!.textContent=view.paused?'继续':'暂停';document.querySelector('#fusion-events')!.textContent=f.events.slice(-12).map(e=>`${e.time.toFixed(3)}s  ${e.from} → ${e.to}  接地:${e.grounded}`).join('\n');
  document.querySelector('#cycle-phase')!.textContent=phase;timeline.value=String(view.time);document.querySelector('#cycle-time')!.textContent=`${view.time.toFixed(3)} / ${JUMP_DURATION.toFixed(2)} s`;
  document.querySelector('#pause-cycle')!.textContent=view.paused?'继续播放':'暂停播放';
  const table=document.querySelector('#joint-table')!;table.replaceChildren();
  for(const b of bones.filter(b=>JOINT_LABELS[b.id])){const tr=document.createElement('tr');tr.classList.toggle('selected',b.id===view.joint);tr.innerHTML=`<th><button type="button">${JOINT_LABELS[b.id]}</button></th><td>${b.x.toFixed(1)}</td><td>${b.y.toFixed(1)}</td><td>${(b.angle*180/Math.PI).toFixed(1)}°</td>`;tr.querySelector('button')!.addEventListener('click',()=>{view.joint=b.id;view.showBones=true;document.querySelector<HTMLInputElement>('#show-bones')!.checked=true;render();});table.append(tr);}
  const snap=(a:FoxAnimationController)=>({state:a.state,phase:a.animationPhase,pose:a.currentPoseName,bones:a.bones.snapshot(),offsets:a.secondaryOffsets,visualOffsetY:a.visualOffsetY});
  document.body.dataset.labSnapshot=JSON.stringify({view,actors:scene.actors.map(a=>({id:a.model.id,bones:(view.version==='previous'?a.previous:a.model).bones.snapshot(),feet:poseById(a.model.id).feet})),originalVisible:view.mode!=='overview'&&view.compare&&view.comparison==='art',previousVisible:view.mode!=='overview'&&view.compare&&view.comparison!=='art',static:!cycle||view.paused,fusion:fusion?scene.fusionTimeline.snapshot():null,ground:ground?scene.groundTimeline.snapshot():null,cycle:cycle&&!ground&&!fusion?{time:scene.timeline.time,duration:JUMP_DURATION,offsetY:scene.timeline.offsetY,refined:snap(scene.timeline.refined),previous:snap(scene.timeline.previous),primary:snap(scene.timeline.primary)}:null});
}
function render(){
  document.querySelector<HTMLSelectElement>('#fusion-rate')!.value=String(view.rate);document.body.dataset.mode=view.mode;document.querySelector<HTMLSelectElement>('#ground-rate')!.value=String(view.rate);document.querySelector<HTMLSelectElement>('#cycle-rate')!.value=String(view.rate);select.value=view.selected;
  for(const id of ['overview','focus','cycle','ground','fusion']){document.querySelector('#'+id)!.classList.toggle('active',view.mode===id);document.querySelector('#'+id)!.setAttribute('aria-pressed',String(view.mode===id));}
  gallery.hidden=view.mode!=='overview';
  document.querySelectorAll<HTMLElement>('.detail-only').forEach(e=>e.hidden=view.mode==='overview');document.querySelectorAll<HTMLElement>('.overview-only').forEach(e=>e.hidden=view.mode!=='overview');
  document.querySelector<HTMLElement>('#timeline-panel')!.hidden=view.mode!=='cycle';document.querySelector<HTMLElement>('#ground-panel')!.hidden=view.mode!=='ground';document.querySelector<HTMLElement>('#joint-inspector')!.hidden=view.mode==='overview';
  document.querySelector<HTMLElement>('#fusion-panel')!.hidden=view.mode!=='fusion';
  const labels=document.querySelector<HTMLElement>('#focus-labels')!;labels.hidden=view.mode==='overview';labels.dataset.compare=String(view.compare);
  document.querySelector('#comparison-label')!.innerHTML=view.mode==='fusion'||view.comparison==='primary'?'仅主动作<small>次级关闭 / 同一轨迹</small>':view.comparison==='previous'?'历史基线<small>D 阶段前 / 同一轨迹</small>':'原始 SVG<small>未绑定插画 / 相同比例</small>';
  const zoom=document.querySelector<HTMLInputElement>('#zoom')!;zoom.min=['cycle','ground','fusion'].includes(view.mode)?'1':'1.8';zoom.max=view.mode==='ground'?'2.5':(view.mode==='cycle'||view.mode==='fusion')?'1.6':'3';zoom.value=String(view.zoom);document.querySelector('#zoom-value')!.textContent=`${view.zoom.toFixed(1)}×`;
  document.querySelector('#stage-note')!.textContent=view.mode==='overview'?`${view.version==='refined'?'精修版本':'上一版姿态'} · 六个动作使用相同比例`:'暂停后可定位关节；拖动时间轴会保留柔性运动历史';
  fitStage();scene?.renderView(view);readouts();
}
document.querySelector('#flex-ab')!.addEventListener('click',()=>{view.compare=true;view.comparison='primary';view.secondary=true;document.querySelector<HTMLInputElement>('#compare')!.checked=true;document.querySelector<HTMLInputElement>('#secondary')!.checked=true;document.querySelector<HTMLSelectElement>('#comparison-source')!.value='primary';enter('ground');});
document.querySelector<HTMLSelectElement>('#flex-region')!.addEventListener('change',e=>{view.region=(e.target as HTMLSelectElement).value as LabView['region'];if(!['cycle','ground','fusion'].includes(view.mode))enter('ground');else render();});
for(const mode of ['overview','focus','cycle','ground','fusion'] as const)document.querySelector('#'+mode)!.addEventListener('click',()=>enter(mode));
select.addEventListener('change',()=>{view.selected=select.value as LabPoseId;enter('focus');});
for(const [id,key] of [['show-bones','showBones'],['head-motion','headMotion'],['head-neck','headNeck'],['head-pivot','headPivot'],['compare','compare'],['secondary','secondary'],['ears','ears'],['tail','tail'],['travel','travel']] as const)document.querySelector<HTMLInputElement>('#'+id)!.addEventListener('change',e=>{view[key]=(e.target as HTMLInputElement).checked;render();});
document.querySelector<HTMLSelectElement>('#comparison-source')!.addEventListener('change',e=>{view.comparison=(e.target as HTMLSelectElement).value as LabView['comparison'];render();});
document.querySelector<HTMLSelectElement>('#pose-version')!.addEventListener('change',e=>{view.version=(e.target as HTMLSelectElement).value as LabView['version'];render();});
document.querySelector<HTMLInputElement>('#zoom')!.addEventListener('input',e=>{view.zoom=Number((e.target as HTMLInputElement).value);render();});
document.querySelector<HTMLInputElement>('#waist-bend')!.addEventListener('input',e=>{view.waistBend=Number((e.target as HTMLInputElement).value);document.querySelector('#waist-value')!.textContent=view.waistBend.toFixed(2)+'×';render();});
document.querySelector('#pause-cycle')!.addEventListener('click',()=>{view.paused=!view.paused;render();});
for(const [id,time] of [['before-contact',.98],['impact-peak',1.07]] as const)document.querySelector('#'+id)!.addEventListener('click',()=>{view.time=time;view.paused=true;render();});
document.querySelector('#restart-cycle')!.addEventListener('click',()=>{view.time=0;view.paused=false;render();});
document.querySelector<HTMLSelectElement>('#cycle-rate')!.addEventListener('change',e=>{view.rate=Number((e.target as HTMLSelectElement).value);render();});
timeline.addEventListener('input',()=>{view.paused=true;view.time=Number(timeline.value);render();});
document.querySelector<HTMLSelectElement>('#ground-action')!.addEventListener('change',e=>{view.groundAction=(e.target as HTMLSelectElement).value as GroundAction;view.time=0;view.paused=false;render();});
document.querySelector<HTMLInputElement>('#ground-speed')!.addEventListener('input',e=>{view.groundSpeed=Number((e.target as HTMLInputElement).value);view.groundAction='SPEED';document.querySelector<HTMLSelectElement>('#ground-action')!.value='SPEED';document.querySelector('#ground-speed-value')!.textContent=view.groundSpeed+' px/s';view.paused=false;render();});
document.querySelector('#ground-demo')!.addEventListener('click',()=>{view.groundAction='DEMO';view.time=0;view.paused=false;document.querySelector<HTMLSelectElement>('#ground-action')!.value='DEMO';render();});
document.querySelector('#ground-pause')!.addEventListener('click',()=>{view.paused=!view.paused;render();});
document.querySelector('#ground-restart')!.addEventListener('click',()=>{view.time=0;view.paused=false;render();});
document.querySelector<HTMLSelectElement>('#ground-rate')!.addEventListener('change',e=>{view.rate=Number((e.target as HTMLSelectElement).value);render();});
document.querySelector<HTMLInputElement>('#ground-time')!.addEventListener('input',e=>{view.time=Number((e.target as HTMLInputElement).value);view.paused=true;render();});

document.querySelector('#fusion-pause')!.addEventListener('click',()=>{view.paused=!view.paused;render();});
document.querySelector('#fusion-restart')!.addEventListener('click',()=>{view.time=0;view.paused=false;render();});
document.querySelector<HTMLSelectElement>('#fusion-rate')!.addEventListener('change',e=>{view.rate=Number((e.target as HTMLSelectElement).value);render();});
document.querySelector<HTMLInputElement>('#fusion-time')!.addEventListener('input',e=>{view.time=Number((e.target as HTMLInputElement).value);view.paused=true;render();});
render();
game=new Phaser.Game({type:Phaser.WEBGL,parent:'lab-stage',width:1440,height:920,backgroundColor:'#e9eee3',antialias:true,roundPixels:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[new LabScene(ready=>{scene=ready;scene.onFrame=readouts;render();document.documentElement.dataset.labReady='true';})],banner:false,audio:{noAudio:true},input:{keyboard:false,mouse:false,touch:false,gamepad:false},fps:{target:60}});
const resize=new ResizeObserver(fitStage);resize.observe(stage);
if(import.meta.hot)import.meta.hot.dispose(()=>{resize.disconnect();game?.destroy(true);});
