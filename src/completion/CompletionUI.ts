import type {CompletionData} from './LevelCompletionModel';

export class CompletionUI {
  readonly root:HTMLElement;private count:HTMLOutputElement;private abort=new AbortController();
  private actions:{explore:()=>void;restart:()=>void};
  private frame:HTMLElement;private locked=false;private inertNodes:{node:HTMLElement;inert:boolean}[]=[];
  constructor(actions:{explore:()=>void;restart:()=>void}) {
    this.actions=actions;this.frame=document.querySelector('.scene-frame')!;this.root=document.createElement('section');
    this.root.className='completion-screen';this.root.hidden=true;this.root.tabIndex=-1;this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-labelledby','chapter-complete-title');
    this.root.innerHTML=`<div class="completion-content">
      <svg class="completion-sigil" viewBox="0 0 160 120" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M47 97V42Q80 9 113 42V97M55 97V46Q80 21 105 46V97M38 98H122"/><path d="M36 84Q22 58 33 36M124 84Q138 58 127 36M30 60Q17 57 15 46Q28 46 30 60ZM32 45Q20 38 24 27Q37 31 32 45ZM130 60Q143 57 145 46Q132 46 130 60ZM128 45Q140 38 136 27Q123 31 128 45Z"/><path d="M80 45Q66 63 80 73Q94 63 80 45Z"/><circle cx="80" cy="62" r="3"/></g></svg>
      <p class="completion-chapter">第 一 章</p><h2 id="chapter-complete-title">晨光林地</h2><p class="completion-label">章 节 完 成</p>
      <p class="completion-dew"><span>苔光露珠</span><output aria-label="本局苔光露珠"></output></p>
      <div class="completion-actions"><button type="button" data-completion-explore>继续探索 <span aria-hidden="true">→</span></button><button type="button" data-completion-restart>重新开始</button></div>
      <p class="completion-whisper">晨光抵达的地方，旅途仍可继续。</p></div>`;
    this.count=this.root.querySelector('output')!;
  }
  private bindActions():void {
    this.abort=new AbortController();const signal=this.abort.signal,actions=this.actions;
    this.root.querySelector('[data-completion-explore]')!.addEventListener('click',actions.explore,{signal});
    this.root.querySelector('[data-completion-restart]')!.addEventListener('click',()=>{actions.restart();document.querySelector<HTMLElement>('#game')?.focus({preventScroll:true});},{signal});
    this.root.addEventListener('pointerdown',e=>{if(!(e.target as Element).closest('button')){e.preventDefault();this.root.querySelector<HTMLButtonElement>('button')!.focus();}},{signal});
    this.root.addEventListener('keydown',e=>{
      const buttons=[...this.root.querySelectorAll<HTMLButtonElement>('button')],index=buttons.indexOf(document.activeElement as HTMLButtonElement);
      if(e.code==='Escape'){e.preventDefault();e.stopPropagation();actions.explore();}
      else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab'].includes(e.code)){
        e.preventDefault();e.stopPropagation();const backwards=e.shiftKey||e.code==='ArrowLeft'||e.code==='ArrowUp';buttons[(index+(backwards?-1:1)+buttons.length)%buttons.length].focus();
      }
    },{signal});
  }
  setLocked(locked:boolean):void {
    if(this.locked===locked)return;this.locked=locked;this.frame.classList.toggle('completion-active',locked);
    if(locked){this.inertNodes=[...document.querySelectorAll<HTMLElement>('#game,.level-tools,.adventure-ui,#level-map,.level-dev,.masthead,.colophon')].map(node=>({node,inert:node.inert}));for(const {node}of this.inertNodes)node.inert=true;}
    else {for(const {node,inert}of this.inertNodes)node.inert=inert;this.inertNodes=[];}
  }
  show(data:Readonly<CompletionData>):void {
    this.count.textContent=`${data.collectedCount} / ${data.totalCollectibles}`;
    if(!this.root.hidden)return;this.bindActions();this.frame.append(this.root);this.root.hidden=false;this.root.querySelector<HTMLButtonElement>('button')!.focus({preventScroll:true});
  }
  hide(focus=true):void {this.abort.abort();this.root.hidden=true;this.root.remove();this.setLocked(false);if(focus)document.querySelector<HTMLElement>('#game')?.focus({preventScroll:true});}
  destroy():void {this.abort.abort();this.hide(false);this.root.remove();}
}
