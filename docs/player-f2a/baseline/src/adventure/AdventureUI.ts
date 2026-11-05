import type {AdventureModel} from './AdventureModel';

export class AdventureUI {
  readonly root:HTMLElement;private mission:HTMLElement;private detail:HTMLElement;private toast:HTMLElement;
  private journal:HTMLElement;private sound:HTMLButtonElement;private abort=new AbortController();
  private last='';private toastTime=0;private returnFocus:HTMLElement|null=null;
  constructor(actions:{sound:()=>void;replay:()=>void}) {
    this.root=document.createElement('div');this.root.className='adventure-ui';
    this.root.innerHTML=`<div class="journey-objective"><span class="journey-eyebrow">晨光林地 · 一次森林的苏醒</span><strong data-mission></strong><span data-detail></span></div>
      <div class="journey-actions"><button type="button" data-sound aria-pressed="true">声音 开</button><button type="button" data-journal-toggle aria-expanded="false" aria-controls="journey-journal">旅途手记 J</button></div>
      <div class="journey-toast" role="status" aria-live="polite" hidden></div>
      <section id="journey-journal" class="journey-journal" role="dialog" aria-modal="true" aria-labelledby="journal-title" hidden>
        <div class="journal-paper"><span class="journey-eyebrow">THE FOREST REMEMBERS</span><h2 id="journal-title">晨光里的足迹</h2><p class="journal-intro">沿着自己的小径走，让森林慢慢醒来。</p>
        <ul><li data-memory="arrival"></li><li data-memory="canopy"></li><li data-memory="roots"></li><li data-memory="song"></li></ul>
        <p class="journal-note" data-save-note>旅途自动保存，下次从最近的安全落脚点继续。<br>R 重新探索会清空本次旅途。</p>
        <div class="journal-buttons"><button type="button" data-replay>再听一次花的旋律 Q</button><button type="button" data-close>继续探索 Esc</button></div></div>
      </section>`;
    document.querySelector('.scene-frame')!.append(this.root);
    this.mission=this.root.querySelector('[data-mission]')!;this.detail=this.root.querySelector('[data-detail]')!;
    this.toast=this.root.querySelector('.journey-toast')!;this.journal=this.root.querySelector('.journey-journal')!;this.sound=this.root.querySelector('[data-sound]')!;
    const signal=this.abort.signal;
    this.sound.addEventListener('click',actions.sound,{signal});
    this.root.querySelector('[data-journal-toggle]')!.addEventListener('click',()=>this.toggle(),{signal});
    this.root.querySelector('[data-close]')!.addEventListener('click',()=>this.toggle(false),{signal});
    this.root.querySelector('[data-replay]')!.addEventListener('click',()=>{this.toggle(false);actions.replay();},{signal});
    this.journal.addEventListener('keydown',e=>{
      if(e.code!=='Tab')return;const buttons=[...this.journal.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];const first=buttons[0],last=buttons.at(-1)!;
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    },{signal});
    this.journal.addEventListener('click',e=>{if(e.target===this.journal)this.toggle(false);},{signal});
  }
  get open():boolean {return!this.journal.hidden;}
  toggle(open=!this.open):void {
    if(open===this.open)return;
    this.journal.hidden=!open;this.root.querySelector('[data-journal-toggle]')!.setAttribute('aria-expanded',String(open));
    if(open){this.returnFocus=document.activeElement as HTMLElement;this.journal.querySelector<HTMLButtonElement>('[data-close]')!.focus();}
    else if(this.returnFocus?.isConnected)this.returnFocus.focus();
  }
  audio(enabled:boolean):void {this.sound.textContent=`声音 ${enabled?'开':'关'}`;this.sound.setAttribute('aria-pressed',String(enabled));}
  notice(text:string):void {this.toast.textContent=text;this.toast.hidden=false;this.toastTime=6.5;}
  storageAvailable(available:boolean):void {this.root.querySelector('[data-save-note]')!.textContent=available?'旅途自动保存，下次从最近的安全落脚点继续。R 重新探索会清空本次旅途。':'本次旅途可正常游玩；浏览器未允许保存，离开后进度不会保留。';}
  update(model:AdventureModel,dt:number,mapOpen:boolean,nearGarden:boolean):void {
    this.root.classList.toggle('map-is-open',mapOpen);
    this.toastTime=Math.max(0,this.toastTime-dt);this.toast.hidden=this.toastTime<=0||mapOpen||this.open;
    const stamp=[model.title,model.hint,model.dew.size,model.song,model.arrived,nearGarden].join('|');if(stamp===this.last)return;this.last=stamp;
    this.mission.textContent=model.title;this.detail.textContent=model.hint;
    const rows:[string,boolean,string,string][]=[['arrival',model.arrived,'晨光门庭 · 已抵达','晨光门庭 · 沿小径向东'],['canopy',model.dew.has('dew-canopy-lookout'),'林冠晨露 · 古树的一朵花','林冠晨露 · 在最高的枝头寻找'],['roots',model.dew.has('dew-hidden-roots'),'根室微光 · 古树的另一朵花','根室微光 · 留意藤帘后的暖光'],['song',model.song,'听风花 · 森林记住了你的歌','听风花 · 树冠东侧，聆听并回应']];
    for(const [key,done,yes,no] of rows){const row=this.root.querySelector<HTMLElement>(`[data-memory="${key}"]`)!;row.textContent=(done?'✦  ':'○  ')+(done?yes:no);row.dataset.found=String(done);}
    (this.root.querySelector('[data-replay]') as HTMLButtonElement).disabled=!nearGarden||model.song;
  }
  reset():void {this.toggle(false);this.last='';this.toastTime=0;this.toast.hidden=true;}
  destroy():void {this.abort.abort();this.root.remove();}
}
