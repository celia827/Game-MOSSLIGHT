import type {MotionReviewControls} from '../characters/fox/MotionReviewTypes';
import {POSE_LABELS} from '../characters/fox/FoxPoseLibrary';

export function createMotionReview() {
  const panel=document.querySelector<HTMLElement>('#motion-review')!;
  const animationPanel=document.querySelector<HTMLElement>('#animation-panel')!;
  const layout=document.querySelector<HTMLElement>('#review-cards')!;
  const coords=document.querySelector<HTMLElement>('#review-coordinates')!;
  const pause=document.querySelector<HTMLButtonElement>('#review-pause')!;
  const rate=document.querySelector<HTMLSelectElement>('#review-rate')!;
  const joints=document.querySelector<HTMLInputElement>('#review-joints')!;
  let api:MotionReviewControls|undefined;
  const abort=new AbortController(),{signal}=abort;
  document.querySelector('#open-motion-review')!.addEventListener('click',()=>{
    api?.open();api?.setRate(Number(rate.value));api?.setJoints(joints.checked);
    panel.hidden=false;animationPanel.hidden=true;
  },{signal});
  document.querySelector('#close-motion-review')!.addEventListener('click',()=>{api?.close();panel.hidden=true;animationPanel.hidden=false;},{signal});
  document.querySelector('#review-overview')!.addEventListener('click',()=>api?.overview(),{signal});
  document.querySelector('#review-play')!.addEventListener('click',()=>api?.playOnce(document.querySelector<HTMLSelectElement>('#review-travel')!.value==='forward'),{signal});
  document.querySelector('#review-compare')!.addEventListener('click',()=>api?.compare(document.querySelector<HTMLSelectElement>('#review-travel')!.value==='forward'),{signal});
  document.querySelector<HTMLInputElement>('#review-secondary')!.addEventListener('change',e=>api?.tune({enabled:(e.target as HTMLInputElement).checked}),{signal});
  pause.addEventListener('click',()=>{if(api)api.setPaused(!api.snapshot().paused);},{signal});
  rate.addEventListener('change',()=>api?.setRate(Number(rate.value)),{signal});
  joints.addEventListener('change',()=>api?.setJoints(joints.checked),{signal});
  const timer=setInterval(()=>{
    if(!api||panel.hidden)return;
    const s=api.snapshot();document.body.dataset.motionReviewSnapshot=JSON.stringify(s);panel.dataset.layout=s.layout;
    const secondary=document.querySelector<HTMLInputElement>('#review-secondary')!;secondary.disabled=s.layout==='compare';secondary.checked=s.layout==='compare'||s.tuning.enabled;
    pause.disabled=s.layout==='overview';pause.textContent=s.paused?'继续':'暂停';
    document.querySelector('#review-phase')!.textContent=s.layout==='overview'?'四姿势并排比较':`${s.actors[0].phase} · ${s.time.toFixed(2)} s${!s.playing?' · 完成':''}`;
    layout.replaceChildren();coords.replaceChildren();
    for(const actor of s.actors) {
      const heading=document.createElement('div');heading.textContent=s.layout==='compare'?`${actor.enabled?'主动作 + 柔性跟随':'仅主动作'} · ${POSE_LABELS[actor.pose]}`:POSE_LABELS[actor.pose];layout.append(heading);
      const cell=document.createElement('div');
      for(const [id,label] of [['lowerSpine','腰'],['chest','胸'],['neck','颈'],['nearShoulder','肩'],['nearKnee','膝']]) {
        const b=actor.bones.find(b=>b.id===id)!;const line=document.createElement('span');line.textContent=`${label} (${b.x.toFixed(1)}, ${b.y.toFixed(1)}) ${(b.worldAngle*180/Math.PI).toFixed(1)}°`;cell.append(line);
      }
      coords.append(cell);
    }
  },100);
  return {connect(controls:MotionReviewControls){api=controls;},destroy(){abort.abort();clearInterval(timer);}};
}
