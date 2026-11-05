import {MOTION_DEFAULTS} from '../characters/fox/FoxMotionConfig';
import type {MotionTuning} from '../characters/fox/FoxMotionConfig';
export function mountMotionTuning(host:HTMLElement,apply:(patch:Partial<MotionTuning>)=>void,signal:AbortSignal) {
  const check=document.createElement('label');check.innerHTML='<input id="motion-enabled" type="checkbox" checked> 次级运动 / 柔性跟随';host.append(check);
  const enabled=check.querySelector<HTMLInputElement>('input')!;enabled.addEventListener('change',()=>apply({enabled:enabled.checked}),{signal});
  const head=document.createElement('label');head.innerHTML='<input id="motion-head" type="checkbox" checked> 头部惯性补偿';host.append(head);
  const headInput=head.querySelector<HTMLInputElement>('input')!;headInput.addEventListener('change',()=>apply({headMotion:headInput.checked}),{signal});
  for(const [key,label] of [['ears','耳朵柔性'],['tail','尾巴惯性']] as const){const row=document.createElement('label');row.innerHTML=`<input id="motion-${key}" type="checkbox" checked> ${label}`;const input=row.querySelector<HTMLInputElement>('input')!;input.addEventListener('change',()=>apply({[key]:input.checked}),{signal});host.append(row);}
  const details=document.createElement('details');details.id='motion-parameters';details.innerHTML='<summary>柔性与全身协同参数</summary>';host.append(details);
  const controls=mountMotionParameters(details,apply,signal);
  const note=document.createElement('p');note.className='debug-note';note.textContent='弹性为刚度，阻尼为阻尼比。关闭次级运动可直接比较主动作。调整不改变碰撞和跳跃参数。';details.append(note);
  const reset=document.createElement('button');reset.type='button';reset.id='reset-motion-tuning';reset.textContent='恢复柔性默认值';
  reset.addEventListener('click',()=>{enabled.checked=true;headInput.checked=true;for(const key of ['ears','tail'])host.querySelector<HTMLInputElement>('#motion-'+key)!.checked=true;for(const input of controls){const key=input.id.slice(7) as keyof MotionTuning;input.value=String(MOTION_DEFAULTS[key]);input.previousElementSibling!.textContent=input.value;}apply({...MOTION_DEFAULTS});},{signal});details.append(reset);
}

export function mountMotionParameters(host:HTMLElement,apply:(patch:Partial<MotionTuning>)=>void,signal:AbortSignal,prefix='motion-') {
  const controls:HTMLInputElement[]=[];
  for(const [key,label,min,max,step] of [
    ['earStrength','耳朵柔性强度',0,1.5,.05],['tailStrength','尾巴柔性强度',0,1.5,.05],['backpackStrength','背包惯性强度',0,1.5,.05],
    ['headSpring','头颈弹性',500,1800,25],['headDamping','头颈阻尼',.8,1.2,.01],['backpackSpring','背包弹性',120,500,10],['backpackDamping','背包阻尼',.6,1.2,.01],
    ['earLimit','耳尖最大偏转(rad)',.06,.18,.01],['tailLimit','尾段最大偏转(rad)',.06,.19,.01],['headLimit','头颈最大惯性(rad)',.03,.14,.01],['backpackLimit','背包最大偏转(rad)',.03,.12,.01],
    ['earSpring','耳朵弹性',100,700,10],['earDamping','耳朵阻尼',.35,1.2,.01],
    ['tailSpring','尾巴弹性',60,400,5],['tailDamping','尾巴阻尼',.4,1.2,.01],
    ['headInertia','头部惯性',0,1.6,.1],['waistBend','腰部弯曲',.65,1.25,.05],
    ['landingCompression','落地压缩',.65,1.2,.05],['strength','次级运动强度',0,1.5,.1],
  ] as const) {
    const row=document.createElement('label');row.textContent=label;const output=document.createElement('output'),input=document.createElement('input');
    input.type='range';input.id=`${prefix}${key}`;input.setAttribute('aria-label',label);input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(MOTION_DEFAULTS[key]);output.textContent=input.value;
    input.addEventListener('input',()=>{output.textContent=Number(input.value).toFixed(max<3?2:0);apply({[key]:Number(input.value)});},{signal});controls.push(input);row.append(output,input);host.append(row);
  }
  return controls;
}
