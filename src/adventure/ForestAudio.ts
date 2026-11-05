/** Small original Web Audio instruments. No downloads, music autoplay or shared Phaser sound state. */
export class ForestAudio {
  private context?:AudioContext;private master?:GainNode;private abort=new AbortController();
  private muted=false;private paused=false;private destroyed=false;private nodes=new Set<OscillatorNode>();private stepTime=0;
  constructor(private onChange:(enabled:boolean)=>void) {
    try{this.muted=localStorage.getItem('mosslight:sound')==='off';}catch{}
    const signal=this.abort.signal;
    const unlock=(e:Event)=>{if(e.isTrusted&&!this.muted)void this.unlock();};
    window.addEventListener('keydown',unlock,{signal});window.addEventListener('pointerdown',unlock,{signal});
    window.addEventListener('blur',()=>this.suspend(),{signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.suspend();},{signal});
    onChange(!this.muted);
  }
  private async unlock():Promise<void> {
    if(this.destroyed||this.muted||this.paused||document.hidden)return;
    try{if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.2;this.master.connect(this.context.destination);}if(this.context.state==='suspended')await this.context.resume();}catch{}
  }
  get enabled():boolean {return!this.muted;}
  toggle():void {this.muted=!this.muted;try{localStorage.setItem('mosslight:sound',this.muted?'off':'on');}catch{}if(this.muted)this.suspend();else void this.unlock();this.onChange(!this.muted);}
  suspend():void {if(this.context?.state==='running')void this.context.suspend();}
  setPaused(paused:boolean):void {
    if(paused===this.paused)return;this.paused=paused;
    if(paused){for(const n of this.nodes)try{n.stop();}catch{}this.suspend();}
    else void this.unlock();
  }
  tone(frequency:number,duration=.45,delay=0,volume=.35,type:OscillatorType='sine'):void {
    const c=this.context;if(this.destroyed||this.muted||this.paused||!c||c.state!=='running'||!this.master||this.nodes.size>=24)return;
    const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);
    this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.03);
  }
  chime(kind:'dew'|'arrival'|'bloom'|'flower'|'curtain'|'song'):void {
    const notes={dew:[659,988,1318],arrival:[392,523,659],bloom:[523,659,784,1046],flower:[523,784],curtain:[294,440,587],song:[523,784,659,1046]}[kind];
    notes.forEach((n,i)=>this.tone(n,.65,i*.16,.26));
  }
  walk(dt:number,moving:boolean,cave:boolean,walking:boolean,landed:boolean):void {
    if(landed)this.tone(cave?110:150,.12,0,.11,'triangle');
    if(!moving){this.stepTime=0;return;}this.stepTime+=dt;
    if(this.stepTime>(walking?.48:.3)){this.stepTime=0;this.tone(cave?180:230,.055,0,.045,'triangle');}
  }
  destroy():void {if(this.destroyed)return;this.destroyed=true;this.abort.abort();for(const n of this.nodes){n.onended=null;try{n.stop();}catch{}n.disconnect();}this.nodes.clear();if(this.context)void this.context.close();}
}
