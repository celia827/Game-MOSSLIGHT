import {mountMotionTuning} from './motionTuning';
import {createMotionReview} from './motionReview';
import type {AnimationControls} from '../characters/fox/types';
import type {AnimationMode} from '../characters/fox/CharacterConfig';
import {FOX_BONES} from '../characters/fox/FoxBones';
import type {BoneId} from '../characters/fox/FoxBones';
import {POSE_NAMES,POSE_LABELS,ANIMATION_CONFIG} from '../characters/fox/FoxPoseLibrary';
import type {PoseName} from '../characters/fox/FoxPoseLibrary';

export function createAnimationPanel() {
  const review=createMotionReview();
  const panel=document.querySelector<HTMLElement>('#animation-panel')!;
  const toggle=document.querySelector<HTMLButtonElement>('#animation-toggle')!;
  const mode=document.querySelector<HTMLSelectElement>('#animation-mode')!;
  const rate=document.querySelector<HTMLInputElement>('#animation-rate')!;
  const pose=document.querySelector<HTMLSelectElement>('#pose-preview')!;
  const bone=document.querySelector<HTMLSelectElement>('#bone-select')!;
  const angle=document.querySelector<HTMLInputElement>('#joint-angle')!;
  const paused=document.querySelector<HTMLInputElement>('#animation-paused')!;
  const blend=document.querySelector<HTMLInputElement>('#blend-time')!;
  const abort=new AbortController(),{signal}=abort;
  let api:AnimationControls|undefined;
  mountMotionTuning(document.querySelector<HTMLElement>('#motion-tuning')!,patch=>api?.tune(patch),signal);
  POSE_NAMES.forEach(name=>pose.add(new Option(POSE_LABELS[name],name)));
  const labels:Record<string,string>={visual:'视觉原点',pelvis:'骨盆',lowerSpine:'腰部',chest:'胸腔',neck:'颈部',head:'头部',nearEar:'近耳根',farEar:'远耳根',nearEarMiddle:'近耳中段',nearEarTip:'近耳尖',farEarMiddle:'远耳中段',farEarTip:'远耳尖',coatHem:'衣摆',tailFlex:'尾巴第二中段',backpack:'背包',tailRoot:'尾根',tailMiddle:'尾巴中段',tailTip:'尾尖',tailEnd:'尾端'};
  for(const b of FOX_BONES) {
    const label=labels[b.id]??b.id.replace('near','近侧 ').replace('far','远侧 ').replace('Shoulder','肩 / 上臂').replace('Elbow','肘 / 前臂').replace('Wrist','腕').replace('Hand','手掌').replace('Hip','髋 / 大腿').replace('Knee','膝 / 小腿').replace('Ankle','踝').replace('Foot','脚掌');
    bone.add(new Option(label,b.id));
  }
  bone.value='nearElbow';
  function syncJoint() {
    const def=FOX_BONES.find(b=>b.id===bone.value)!;
    angle.min=String(Math.ceil(def.min*180/Math.PI));angle.max=String(Math.floor(def.max*180/Math.PI));
    angle.value=String((api?.snapshot().bones.find(b=>b.id===def.id)?.angle??0)*180/Math.PI);
    api?.selectJoint(def.id);
  }
  function close() {
    panel.hidden=true;toggle.setAttribute('aria-pressed','false');
    mode.value='AUTO';rate.value='1';document.querySelector<HTMLSelectElement>('#motion-speed-preset')!.value='1';api?.setMode('AUTO');api?.setRate(1);
    for(const id of ['rig-joints','rig-reference','rig-bind'])document.querySelector<HTMLInputElement>('#'+id)!.checked=false;
    api?.setJoints(false);api?.setReference(false);api?.setBindPose(false);
    paused.checked=false;api?.setPaused(false);api?.clearJoints();blend.value=String(ANIMATION_CONFIG.blendDuration);api?.setBlend(ANIMATION_CONFIG.blendDuration);
  }
  toggle.addEventListener('click',()=>{
    if(!panel.hidden)close();else {panel.hidden=false;toggle.setAttribute('aria-pressed','true');}
  },{signal});
  document.querySelector('#close-animation')!.addEventListener('click',close,{signal});
  mode.addEventListener('change',()=>{if(mode.value==='POSE')api?.setPose(pose.value as PoseName);else api?.setMode(mode.value as AnimationMode);},{signal});
  pose.addEventListener('change',()=>{mode.value='POSE';api?.setPose(pose.value as PoseName);},{signal});
  bone.addEventListener('change',syncJoint,{signal});
  angle.addEventListener('input',()=>api?.setJoint(bone.value as BoneId,Number(angle.value)),{signal});
  paused.addEventListener('change',()=>api?.setPaused(paused.checked),{signal});
  blend.addEventListener('input',()=>api?.setBlend(Number(blend.value)),{signal});
  document.querySelector('#clear-joints')!.addEventListener('click',()=>{api?.clearJoints();syncJoint();},{signal});
  rate.addEventListener('input',()=>api?.setRate(Number(rate.value)),{signal});
  const preset=document.querySelector<HTMLSelectElement>('#motion-speed-preset')!;
  preset.addEventListener('change',()=>{rate.value=preset.value;api?.setRate(Number(preset.value));},{signal});
  for(const [id,method] of [['rig-joints','setJoints'],['rig-reference','setReference'],['rig-bind','setBindPose']] as const) {
    const input=document.querySelector<HTMLInputElement>('#'+id)!;
    input.addEventListener('change',()=>api?.[method](input.checked),{signal});
  }
  for(const [id,key] of [['physics-gravity','gravity'],['physics-jump','jumpSpeed']] as const) {
    const input=document.querySelector<HTMLInputElement>('#'+id)!;
    input.addEventListener('input',()=>{if(input.value!==''&&input.checkValidity())api?.setPhysics({[key]:Number(input.value)});},{signal});
  }
  document.querySelector('#reset-character')!.addEventListener('click',()=>{close();api?.reset();},{signal});
  const timer=window.setInterval(()=>{
    if(!api)return;
    const s=api.snapshot();
    document.body.dataset.foxSnapshot=JSON.stringify(s);
    const perf=s.performance;
    document.querySelector('#animation-fps')!.textContent=perf?`${perf.fps.toFixed(1)} /s`:'—';
    document.querySelector('#animation-cost')!.textContent=perf?`${perf.characterMeanMs.toFixed(2)} / ${perf.characterP95Ms.toFixed(2)} ms`:'—';
    document.querySelector('#animation-heap')!.textContent=perf?.heapBytes!=null?`${(perf.heapBytes/1048576).toFixed(1)} MiB`:'浏览器未提供';
    document.querySelector('#animation-state')!.textContent=s.state;
    document.querySelector('#animation-phase')!.textContent=s.animationPhase;
    document.querySelector('#playback-source')!.textContent=s.mode==='AUTO'?'实际物理':'独立可视预览';
    document.querySelector('#landing-impact')!.textContent=s.mode==='POSE'?'静态关键帧':`${s.impactSpeed.toFixed(0)} px/s · ${(s.landingStrength*100).toFixed(0)}%`;
    const joint=s.bones.find(b=>b.id===bone.value)!;
    document.querySelector('#joint-angle-value')!.textContent=`${(joint.angle*180/Math.PI).toFixed(1)}°`;
    document.querySelector('#joint-position')!.textContent=`${joint.x.toFixed(1)}, ${joint.y.toFixed(1)}`;
    document.querySelector('#blend-time-value')!.textContent=`${(s.blendDuration*1000).toFixed(0)} ms`;
    document.querySelector('#movement-speed')!.textContent=`${s.velocity.toFixed(1)} px/s`;
    document.querySelector('#character-position')!.textContent=`${s.x.toFixed(1)}, ${s.y.toFixed(1)}`;
    document.querySelector('#contact-error')!.textContent=`${s.supportSlip.toFixed(2)} px`;
    document.querySelector('#grounded-state')!.textContent=s.grounded?'是':'否';
    document.querySelector('#vertical-speed')!.textContent=`${s.velocityY.toFixed(1)} px/s`;
    document.querySelector('#coyote-state')!.textContent=s.grounded?'就绪':s.coyoteMs>0?`有效 ${s.coyoteMs.toFixed(0)} ms`:'—';
    document.querySelector('#buffer-state')!.textContent=s.bufferMs>0?`${s.bufferMs.toFixed(0)} ms`:'—';
    document.querySelector('#jump-assists')!.textContent=`土狼 ${s.coyoteJumps} / 缓冲 ${s.bufferJumps}`;
    document.querySelector('#jump-height')!.textContent=(s.jumpSpeed*s.jumpSpeed/(2*s.gravity)).toFixed(0);
    document.querySelector('#animation-rate-value')!.textContent=`${Number(rate.value).toFixed(2)}×`;
  },100);
  return {connect(controls:AnimationControls){api=controls;review.connect(controls.review);toggle.disabled=false;syncJoint();},destroy(){abort.abort();clearInterval(timer);review.destroy();}};
}
