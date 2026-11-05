import {V2_GAMEPLAY} from './V2Config.ts';
/** A trigger adapter only. The production queue owns validation, motion cleanup and relocation. */
export class V2Rescue {
  private armed=true;private sequence=0;requests=0;lastRequest:string|null=null;
  update(p:{x:number;y:number;grounded:boolean},blocked:boolean,request:(reason:string,id:string)=>boolean):void {
    if(blocked)return;
    const r=V2_GAMEPLAY.rescueBand.rect;
    if(!this.armed){if(p.grounded&&p.y<r.y-100)this.armed=true;return;}
    if(p.x>=r.x&&p.x<=r.x+r.width&&p.y>=r.y){
      const id=`v2-rescue-${++this.sequence}`;
      if(request('v2-non-damaging-rescue',id)){this.armed=false;this.requests++;this.lastRequest=id;}
    }
  }
  reset():void {this.armed=true;this.sequence=0;this.requests=0;this.lastRequest=null;}
}
