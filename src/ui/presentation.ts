import { LAYER_DEFINITIONS } from '../world/layers';
import type { TerrainDefinition } from '../world/terrain/types';
import type { PreviewControls } from './types';
import { createAnimationPanel } from './animationPanel';

export function createPresentation(resize: () => void) {
  const animationPanel=createAnimationPanel();
  const mode=document.querySelector<HTMLButtonElement>('#view-mode')!;
  const debug=document.querySelector<HTMLButtonElement>('#debug-toggle')!;
  const panel=document.querySelector<HTMLElement>('#debug-panel')!;
  const collisions=document.querySelector<HTMLInputElement>('#show-collisions')!;
  const fields=Array.from(document.querySelectorAll<HTMLInputElement>('[data-platform-field]'));
  const list=document.querySelector<HTMLElement>('#layer-controls')!;
  const abort=new AbortController();
  const signal=abort.signal;
  const params=new URLSearchParams(location.search);
  let view=params.get('mode')==='art'?'art':'game';
  let debugging=false;
  let api: PreviewControls|undefined;

  function setView(next: string) {
    view=next;
    document.body.dataset.view=view;
    mode.textContent=view==='game'?'美术展示':'游戏视口';
    mode.setAttribute('aria-label',view==='game'?'切换为美术展示模式':'切换为游戏模式');
    mode.setAttribute('aria-pressed',String(view==='art'));
    // CSS changes the parent size; Phaser fits the same fixed-resolution scene.
    requestAnimationFrame(resize);
  }
  function setDebug(enabled: boolean) {
    debugging=enabled;
    panel.hidden=!enabled;
    debug.setAttribute('aria-pressed',String(enabled));
    document.body.dataset.debug=String(enabled);
    api?.setDebug(enabled&&collisions.checked);
  }
  function syncFields(def: TerrainDefinition) {
    for(const input of fields) input.value=String(def[input.dataset.platformField as 'x'|'y'|'width'|'height']);
  }
  mode.addEventListener('click',()=>setView(view==='game'?'art':'game'),{signal});
  debug.addEventListener('click',()=>setDebug(!debugging),{signal});
  collisions.addEventListener('change',()=>api?.setDebug(debugging&&collisions.checked),{signal});
  for(const def of LAYER_DEFINITIONS) {
    const label=document.createElement('label');
    const input=document.createElement('input');
    input.type='checkbox'; input.checked=true; input.id=`layer-${def.id}`;
    input.addEventListener('change',()=>api?.setLayerVisible(def.id,input.checked),{signal});
    const text=document.createElement('span'); text.textContent=def.label;
    const coefficient=document.createElement('small'); coefficient.textContent=`×${def.scrollFactor}`;
    label.append(input,text,coefficient); list.append(label);
  }
  for(const input of document.querySelectorAll<HTMLInputElement>('[data-terrain-part]')) {
    input.addEventListener('change',()=>api?.setTerrainPartVisible(input.dataset.terrainPart as 'surface'|'side',input.checked),{signal});
  }
  for(const input of fields) {
    const apply=(commit: boolean)=>{
      if(input.value===''||!input.checkValidity()) {
        if(commit) input.reportValidity();
        return;
      }
      const key=input.dataset.platformField as 'x'|'y'|'width'|'height';
      const next=api?.updatePlatform({[key]:Number(input.value)});
      if(next&&commit) syncFields(next);
    };
    input.addEventListener('input',()=>apply(false),{signal});
    input.addEventListener('change',()=>apply(true),{signal});
  }
  document.querySelector('#reset-platform')!.addEventListener('click',()=>{
    const next=api?.resetPlatform(); if(next) syncFields(next);
  },{signal});
  document.querySelector('#close-debug')!.addEventListener('click',()=>setDebug(false),{signal});
  const frame=document.querySelector<HTMLElement>('.scene-frame')!;
  const fullscreen=document.querySelector<HTMLButtonElement>('#fullscreen')!;
  if(!document.fullscreenEnabled) fullscreen.hidden=true;
  fullscreen.addEventListener('click',async()=>{
    try {
      if(document.fullscreenElement) await document.exitFullscreen(); else await frame.requestFullscreen();
    } catch { fullscreen.title='浏览器暂不支持全屏'; }
  },{signal});
  document.addEventListener('fullscreenchange',()=>{
    fullscreen.setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏欣赏场景');
    resize();
  },{signal});
  const observer=new ResizeObserver(()=>resize()); observer.observe(frame);
  setView(view); setDebug(false);
  return {
    connect(controls: PreviewControls) {
      api=controls; syncFields(api.platform); debug.disabled=false;
      animationPanel.connect(controls.animation);
      if(params.get('debug')==='1') setDebug(true);
    },
    destroy() { abort.abort(); observer.disconnect();animationPanel.destroy(); },
  };
}
