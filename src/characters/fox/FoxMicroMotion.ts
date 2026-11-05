import {smooth} from './poseMath.ts';
const pulse=(t:number,duration:number)=>t<0||t>duration?0:smooth(Math.min(t/(duration*.25),1))*(1-smooth(Math.max(0,(t-duration*.3)/(duration*.7))));
/** Sparse, deterministic gestures; there is no perpetual per-limb sine oscillator. */
export class FoxMicroMotion {
  private nextEar=4.7;private earStart=-10;private near=true;private nextTail=7.3;private tailStart=-10;
  sample(time:number,idle:boolean) {
    if(time>=this.nextEar){this.earStart=idle?time:-10;this.near=!this.near;this.nextEar=time+5.2+2.3*(.5+.5*Math.sin(time*1.73));}
    if(time>=this.nextTail){this.tailStart=idle?time:-10;this.nextTail=time+7.8+2*(.5+.5*Math.cos(time*1.31));}
    const e=.045*pulse(time-this.earStart,.46),other=.016*pulse(time-this.earStart-.13,.5);
    return {near:this.near?e:other,far:this.near?other:e,tail:.024*pulse(time-this.tailStart,1.3),breath:idle?.25*Math.sin(time*Math.PI*2/3.6):0};
  }
  reset():void {this.nextEar=4.7;this.earStart=-10;this.near=true;this.nextTail=7.3;this.tailStart=-10;}
}
