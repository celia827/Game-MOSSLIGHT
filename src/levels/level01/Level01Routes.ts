import type {PlayerController} from '../../characters/fox/PlayerController.ts';
import type {JumpInput} from '../../characters/fox/PlayerInput.ts';
export type TestRoute='main'|'canopy'|'lookout'|'canopy-return'|'cave'|'hidden'|'west-return'|'reverse-canopy'|'reverse-main'|'reverse-cave'|'hidden-return';
interface Waypoint {x:number;jump?:1|-1;support?:string;walking?:boolean}
const up:Waypoint[]=[560,740,880,1100,1250,1420,1600].map(x=>({x,jump:1}));
const mainEnd:Waypoint[]=[{x:3124,jump:1},{x:3630,support:'clearing'}];
const mainStart:Waypoint[]=[{x:384,jump:1},{x:1024,jump:1}];
export const testRoutes:Record<TestRoute,Waypoint[]>={
  main:[...mainStart,...mainEnd],
  canopy:[{x:384,jump:1},...up,{x:1904,jump:1},{x:3630,support:'clearing'}],
  lookout:[{x:384,jump:1},...up,{x:1700,jump:1},{x:1810,support:'crown-secret-perch'},{x:1904,jump:1},{x:3630,support:'clearing'}],
  'canopy-return':[{x:384,jump:1},...up,{x:2010,support:'crown-return-1'},{x:2400,support:'crown-return-4'},{x:2500,support:'sunlit-bridge'},...mainEnd],
  cave:[{x:1140,support:'cave-landing'},{x:1704,jump:1},{x:3630,support:'clearing'}],
  hidden:[{x:1140,support:'cave-landing'},{x:1850,support:'secret-alcove'},{x:3630,support:'clearing'}],
  'west-return':[{x:1140,support:'cave-landing'},{x:160,support:'entry',walking:true}],
  'hidden-return':[{x:1140,support:'cave-landing'},{x:1850,support:'secret-alcove'},{x:160,support:'entry'}],
  'reverse-canopy':[{x:3240,jump:-1},...[3110,2940,2800,2580,2440].map(x=>({x,jump:-1 as const})),{x:2260,jump:-1},{x:1976,jump:-1},{x:466,jump:-1},{x:160,support:'entry'}],
  'reverse-main':[{x:3216,jump:-1},{x:1116,jump:-1},{x:466,jump:-1},{x:160,support:'entry'}],
  'reverse-cave':[{x:3170,support:'cave-return'},{x:1816,jump:-1},{x:160,support:'entry'}],
};
/** Deterministic input pilot. Never writes position, velocity, support, or physics. */
export class RoutePilot {
  index=0;elapsed=0;done=false;failed=false;private hold=0;
  readonly visited=new Set<string>();readonly supports=new Set<string>();
  readonly route:TestRoute;
  constructor(route:TestRoute) {this.route=route;}
  next(player:PlayerController,dt:number):{axis:number;jump:JumpInput;walking:boolean} {
    this.elapsed+=dt;this.hold=Math.max(0,this.hold-dt);
    if(player.supportId)this.supports.add(player.supportId);
    if(player.y<500)this.visited.add('canopy');
    if(player.y>1200&&player.x>1030)this.visited.add('cave');
    if(player.y>1550&&player.x>1780&&player.x<1960)this.visited.add('hidden');
    if(this.elapsed>110)this.failed=true;
    const point=testRoutes[this.route][this.index];let axis=0,pressed=false;
    if(point&&!this.failed) {
      const distance=point.x-player.x;
      // Stop before issuing the next jump, so validation does not depend on a
      // perfect running takeoff or on coyote time / buffered key presses.
      const brake=player.velocity**2/(2*player.physics.groundDeceleration)+Math.abs(player.velocity)*dt*.5;
      axis=Math.abs(distance)>Math.max(1.5,brake)?Math.sign(distance):0;
      if(Math.abs(distance)<3&&Math.abs(player.velocity)<5&&player.grounded&&(!point.support||point.support===player.supportId)) {
        this.index++;
        if(point.jump){axis=point.jump;pressed=true;this.hold=.85;}
        if(this.index>=testRoutes[this.route].length)this.done=true;
      }
    }
    return {axis:this.done||this.failed?0:axis,jump:{pressed,held:this.hold>0},walking:point?.walking??false};
  }
}
