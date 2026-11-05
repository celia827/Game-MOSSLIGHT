/** Bounded rolling diagnostics: no per-frame history growth or SVG/texture work. */
export class AnimationPerformance {
  private frames=new Float64Array(600);private costs=new Float64Array(600);private index=0;private count=0;
  record(frameMs:number,costMs:number):void {if(!Number.isFinite(frameMs)||frameMs<=0||!Number.isFinite(costMs)||costMs<0)return;this.frames[this.index]=frameMs;this.costs[this.index]=costMs;this.index=(this.index+1)%600;this.count=Math.min(600,this.count+1);}
  snapshot(){const frames=Array.from(this.frames.subarray(0,this.count)).sort((a,b)=>a-b),costs=Array.from(this.costs.subarray(0,this.count)).sort((a,b)=>a-b);const mean=(a:number[])=>a.reduce((n,x)=>n+x,0)/Math.max(1,a.length),p95=(a:number[])=>a[Math.min(a.length-1,Math.floor(a.length*.95))]??0;
    const heap=(performance as Performance&{memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize;
    return {samples:this.count,fps:this.count?1000/Math.max(.001,mean(frames)):0,frameP95Ms:p95(frames),characterMeanMs:mean(costs),characterP95Ms:p95(costs),heapBytes:heap??null};}
}
