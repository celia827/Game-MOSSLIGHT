import type {TerrainDefinition} from '../world/terrain/types.ts';
export interface MovingPlatformDefinition {
  id:string;width:number;height:number;from:{x:number;y:number};to:{x:number;y:number};
  travelSeconds:number;pauseSeconds:number;
}
export interface Rider {
  x:number;y:number;grounded:boolean;supportId:string|null;
  bounds:{minX:number;maxX:number};collides:(x:number,y:number)=>boolean;
}
export type PlatformPhase='low-pause'|'ascending'|'high-pause'|'descending';
export function platformPose(d:MovingPlatformDefinition,time:number) {
  const leg=d.pauseSeconds+d.travelSeconds,cycle=leg*2,t=((time%cycle)+cycle)%cycle;
  let u=0,phase:PlatformPhase='low-pause';
  if(t<d.pauseSeconds)u=0;
  else if(t<leg){u=(t-d.pauseSeconds)/d.travelSeconds;phase='ascending';}
  else if(t<leg+d.pauseSeconds){u=1;phase='high-pause';}
  else {u=1-(t-leg-d.pauseSeconds)/d.travelSeconds;phase='descending';}
  const eased=u*u*(3-2*u);
  return{x:d.from.x+(d.to.x-d.from.x)*eased,y:d.from.y+(d.to.y-d.from.y)*eased,phase};
}
/** Independent kinematic clock. The motor advances it once per collision substep. */
export class MovingPlatformWorld {
  readonly definitions:MovingPlatformDefinition[];readonly surfaces:TerrainDefinition[];
  readonly previous:{x:number;y:number}[];private clocks:number[];
  blockedSteps=0;carriedX=0;carriedY=0;boardings=0;departures=0;maxContactError=0;
  private attached:string|null=null;private transitions:{id:string;event:'board'|'leave'}[]=[];
  constructor(definitions:MovingPlatformDefinition[]) {
    if(new Set(definitions.map(d=>d.id)).size!==definitions.length)throw new Error('Duplicate moving platform ID');
    for(const d of definitions)if(![d.width,d.height,d.travelSeconds].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(d.pauseSeconds)||d.pauseSeconds<0||![d.from.x,d.from.y,d.to.x,d.to.y].every(Number.isFinite))throw new Error(`Invalid moving platform: ${d.id}`);
    this.definitions=definitions;this.clocks=definitions.map(()=>0);this.previous=definitions.map(d=>({...d.from}));
    this.surfaces=definitions.map(d=>({id:d.id,kind:'platform',oneWay:true,x:d.from.x,y:d.from.y,width:d.width,height:d.height,profile:[{x:0,y:0},{x:d.width,y:0}]}));
  }
  step(dt:number,rider:Rider):void {
    for(let i=0;i<this.surfaces.length;i++) {
      const s=this.surfaces[i],next=platformPose(this.definitions[i],this.clocks[i]+dt),dx=next.x-s.x,dy=next.y-s.y;
      this.previous[i].x=s.x;this.previous[i].y=s.y;
      const carrying=rider.grounded&&rider.supportId===s.id;
      if(carrying) {
        let safe=true;const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/2));
        for(let j=1;j<=steps;j++){const x=rider.x+dx*j/steps,y=rider.y+dy*j/steps;if(x<rider.bounds.minX||x>rider.bounds.maxX||rider.collides(x,y)){safe=false;break;}}
        // Freeze platform and its clock at the last safe pose; never crush or eject the rider.
        if(!safe){this.blockedSteps++;continue;}
        rider.x+=dx;rider.y+=dy;this.carriedX+=dx;this.carriedY+=dy;
      }
      this.clocks[i]+=dt;s.x=next.x;s.y=next.y;
    }
  }
  landing(x:number,oldY:number,newY:number,oldX=x) {
    let result:{id:string;y:number;definition:TerrainDefinition;t:number}|undefined;
    for(let i=0;i<this.surfaces.length;i++) {
      const s=this.surfaces[i],old=this.previous[i],a=oldY-old.y,b=newY-s.y;
      if(a>1e-6||b< -1e-6||b<a-1e-6)continue;
      const t=Math.abs(b-a)<1e-8?0:Math.max(0,Math.min(1,-a/(b-a)));
      const atX=oldX+(x-oldX)*t,left=old.x+(s.x-old.x)*t;
      if(atX<left-1e-6||atX>left+s.width+1e-6||x<s.x-1e-6||x>s.x+s.width+1e-6)continue;
      if(!result||t<result.t)result={id:s.id,y:s.y,definition:s,t};
    }
    return result;
  }
  observe(rider:Pick<Rider,'x'|'y'|'grounded'|'supportId'>):void {
    const current=rider.grounded&&this.surfaces.some(s=>s.id===rider.supportId)?rider.supportId:null;
    if(current!==this.attached){if(this.attached){this.departures++;this.transitions.push({id:this.attached,event:'leave'});}if(current){this.boardings++;this.transitions.push({id:current,event:'board'});}this.transitions=this.transitions.slice(-12);this.attached=current;}
    if(current)this.maxContactError=Math.max(this.maxContactError,Math.abs(rider.y-this.surfaces.find(s=>s.id===current)!.y));
  }
  snapshot(rider:Pick<Rider,'x'|'y'|'grounded'|'supportId'>) {
    return{platforms:this.surfaces.map((s,i)=>({id:s.id,x:s.x,y:s.y,width:s.width,phase:platformPose(this.definitions[i],this.clocks[i]).phase,time:this.clocks[i]})),contact:this.attached?'riding':'separated',support:rider.supportId,boardings:this.boardings,departures:this.departures,maxContactError:this.maxContactError,blockedSteps:this.blockedSteps,carriedX:this.carriedX,carriedY:this.carriedY,transitions:this.transitions};
  }
  reset():void {this.clocks.fill(0);this.surfaces.forEach((s,i)=>{Object.assign(s,this.definitions[i].from);Object.assign(this.previous[i],this.definitions[i].from);});this.blockedSteps=0;this.carriedX=0;this.carriedY=0;this.boardings=0;this.departures=0;this.maxContactError=0;this.attached=null;this.transitions=[];}
}
