export interface JumpInput {pressed:boolean;held:boolean;cancelled?:boolean}
const movement=['KeyA','KeyD','ArrowLeft','ArrowRight'];
const jumping=['Space','KeyW','ArrowUp'];
const modifiers=['ShiftLeft','ShiftRight'];
/** Key edges are consumed once per simulation frame; OS repeat never queues jumps. */
export class PlayerInput {
  private keys=new Set<string>();
  private pending=false;
  private cancelled=false;
  private abort?:AbortController;
  attach():void {
    this.abort=new AbortController();const {signal}=this.abort;
    window.addEventListener('keydown',event=>{
      if(![...movement,...jumping,...modifiers].includes(event.code))return;
      if((event.target as HTMLElement)?.closest('input,select,textarea,[contenteditable="true"]'))return;
      event.preventDefault();
      if(jumping.includes(event.code)&&!event.repeat&&!this.keys.has(event.code))this.pending=true;
      this.keys.add(event.code);
    },{signal});
    window.addEventListener('keyup',e=>this.keys.delete(e.code),{signal});
    window.addEventListener('blur',()=>this.release(),{signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.release();},{signal});
    document.querySelector('#game')?.addEventListener('pointerdown',()=>document.querySelector<HTMLElement>('#game')?.focus(),{signal});
  }
  get axis():number {return Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'));}
  get walking():boolean {return modifiers.some(key=>this.keys.has(key));}
  consumeJump():JumpInput {
    const result={pressed:this.pending,held:jumping.some(key=>this.keys.has(key)),cancelled:this.cancelled};
    this.pending=false;this.cancelled=false;return result;
  }
  release():void {this.keys.clear();this.pending=false;this.cancelled=true;}
  destroy():void {this.release();this.abort?.abort();}
}
