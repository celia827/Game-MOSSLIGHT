/** Independent E edge input; held presses are never queued across pauses or blur. */
export class InteractionInput {
  private held=false;private pending=false;private abort=new AbortController();
  constructor(target:Window=window) {
    const signal=this.abort.signal;
    target.addEventListener('keydown',e=>{
      if(e.code!=='KeyE'||e.repeat||this.held||e.ctrlKey||e.metaKey||e.altKey)return;
      if((e.target as HTMLElement)?.closest?.('input,select,textarea,button,a,summary,[contenteditable="true"]'))return;
      this.held=true;this.pending=true;e.preventDefault();
    },{signal});
    target.addEventListener('keyup',e=>{if(e.code==='KeyE')this.held=false;},{signal});
    target.addEventListener('blur',()=>this.clear(),{signal});
    target.document?.addEventListener('visibilitychange',()=>{if(target.document.hidden)this.clear();},{signal});
  }
  consume():boolean {const p=this.pending;this.pending=false;return p;}
  clear():void {this.held=false;this.pending=false;}
  destroy():void {this.abort.abort();this.clear();}
}
