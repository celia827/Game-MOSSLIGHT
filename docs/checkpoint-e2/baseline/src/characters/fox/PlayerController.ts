import {CHARACTER_CONFIG as C} from './CharacterConfig.ts';
import {PHYSICS_CONFIG} from './PhysicsConfig.ts';
import type {PhysicsConfig} from './PhysicsConfig.ts';
import {PlayerInput} from './PlayerInput.ts';
import type {JumpInput} from './PlayerInput.ts';
import {GroundCollision} from '../../world/terrain/GroundCollision.ts';
import {surfaceY} from '../../world/terrain/geometry.ts';
import type {TerrainDefinition} from '../../world/terrain/types.ts';
const towards=(v:number,target:number,amount:number)=>v<target?Math.min(target,v+amount):Math.max(target,v-amount);

/** Kinematic swept/substepped platform motor. Art and animation never own contacts. */
export class PlayerController {
  x:number;y:number;velocity=0;velocityY=0;facing:1|-1=1;blocked=false;
  grounded=true;supportId:string|null=null;coyoteTimer=0;bufferTimer=0;landTimer=0;
  jumpedThisFrame=false;landedThisFrame=false;impact=0;
  jumpCount=0;landCount=0;coyoteJumps=0;bufferJumps=0;
  lastJumpKind:'ground'|'coyote'|'buffer'='ground';
  readonly physics:PhysicsConfig={...PHYSICS_CONFIG};
  readonly world:GroundCollision;
  /** Default preserves the original 1280px study; levels supply world limits. */
  bounds={minX:C.viewportMargin as number,maxX:1280-C.viewportMargin};
  private input=new PlayerInput();
  private bufferFromAir=false;
  private floor:()=>TerrainDefinition;
  constructor(x:number,ground:()=>TerrainDefinition,obstacles:()=>readonly TerrainDefinition[]) {
    this.floor=ground;this.world=new GroundCollision(ground,obstacles);
    this.x=x;this.y=surfaceY(ground(),x)!;this.supportId=ground().id;
  }
  attachInput():void {this.input.attach();}
  release():void {this.input.release();this.bufferTimer=0;}
  get axis():number {return this.input.axis;}
  get walking():boolean {return this.input.walking;}
  get body() {return this.world.body(this.x,this.y,C.bodyHalfWidth,C.bodyHeight,this.physics.footBevel);}
  collides(x:number,y=this.y):boolean {return this.world.overlaps(this.world.body(x,y,C.bodyHalfWidth,C.bodyHeight,this.physics.footBevel));}
  supportY(x:number):number {return this.grounded&&this.supportId?this.world.surface(x,this.supportId)??this.y:this.y;}
  get clearance():number {return Math.max(0,(this.world.below(this.x,this.y)?.y??this.y)-this.y);}
  private jump():void {
    this.lastJumpKind=this.grounded&&this.bufferFromAir?'buffer':this.grounded?'ground':'coyote';
    if(this.lastJumpKind==='buffer')this.bufferJumps++;
    if(this.lastJumpKind==='coyote')this.coyoteJumps++;
    this.velocityY=-this.physics.jumpSpeed;this.grounded=false;this.supportId=null;
    this.coyoteTimer=0;this.bufferTimer=0;this.landTimer=0;
    this.jumpedThisFrame=true;this.jumpCount++;
  }
  step(dt:number,axis=this.axis,jump:JumpInput=this.input.consumeJump(),walking=this.walking):number {
    const start=this.x,p=this.physics;
    this.blocked=false;this.jumpedThisFrame=false;this.landedThisFrame=false;
    if(jump.cancelled)this.bufferTimer=0;
    if(jump.pressed){this.bufferTimer=p.jumpBufferTime;this.bufferFromAir=!this.grounded&&this.coyoteTimer<=0;}
    for(let remaining=dt;remaining>1e-8;) {
      const h=Math.min(remaining,1/120);remaining-=h;
      this.landTimer=Math.max(0,this.landTimer-h);
      if(this.grounded)this.coyoteTimer=p.coyoteTime;
      if(this.bufferTimer>0&&(this.grounded||this.coyoteTimer>0))this.jump();
      this.world.advanceDynamics(h,this);
      if(!jump.held&&this.velocityY<-p.jumpSpeed*p.jumpReleaseRatio)this.velocityY=-p.jumpSpeed*p.jumpReleaseRatio;
      const oldX=this.x,old=this.velocity,target=axis*(walking?C.walkSpeed:C.maxSpeed);
      const acceleration=(axis===0||old*axis<0?p.groundDeceleration:p.groundAcceleration)*(this.grounded?1:p.airControl);
      this.velocity=towards(old,target,acceleration*h);
      const nextX=Math.max(this.bounds.minX,Math.min(this.bounds.maxX,this.x+(old+this.velocity)*.5*h));
      const floorSupport=this.grounded?this.world.near(nextX,this.y,p.groundSnap):undefined;
      const nextFoot=floorSupport?.y??this.y;
      if(this.collides(nextX,nextFoot)) {
        let lo=0,hi=1;
        for(let i=0;i<16;i++) {
          const t=(lo+hi)/2,x=this.x+(nextX-this.x)*t;
          const y=this.grounded?this.world.near(x,this.y,p.groundSnap)?.y??this.y:this.y;
          if(this.collides(x,y))hi=t;else lo=t;
        }
        this.x+=(nextX-this.x)*lo;this.velocity=0;this.blocked=true;
      } else {if(nextX===this.x)this.velocity=0;this.x=nextX;}
      if(Math.abs(this.velocity)>6)this.facing=this.velocity>0?1:-1;
      const support=this.grounded?this.world.near(this.x,this.y,p.groundSnap):undefined;
      if(support) {this.y=support.y;this.supportId=support.id;this.velocityY=0;}
      else {
        this.grounded=false;this.supportId=null;
        const oldY=this.y,oldV=this.velocityY;
        this.velocityY=Math.min(p.maxFallSpeed,oldV+p.gravity*h);
        const nextY=oldY+(oldV+this.velocityY)*.5*h;
        const landing=this.world.landing(this.x,oldY,nextY,oldX,this.velocityY>=0,this);
        if(landing) {
          this.y=landing.y;this.impact=this.velocityY;this.velocityY=0;this.grounded=true;this.supportId=landing.id;
          this.landTimer=p.landDuration;this.landedThisFrame=true;this.landCount++;this.coyoteTimer=p.coyoteTime;
        } else if(this.collides(this.x,nextY)) {
          if(this.velocityY<0) {
            let lo=0,hi=1;
            for(let i=0;i<18;i++){const t=(lo+hi)/2;if(this.collides(this.x,oldY+(nextY-oldY)*t))hi=t;else lo=t;}
            this.y=oldY+(nextY-oldY)*lo;this.velocityY=0;
          } else {
            // A side contact is never a landing. Slide the bevel out of the wall.
            let found=false;
            for(let d=.25;d<=C.bodyHalfWidth*2&&!found;d+=.25)for(const sign of [-1,1]) {
              const x=this.x+d*sign;
              if(x>=this.bounds.minX&&x<=this.bounds.maxX&&!this.collides(x,nextY)){this.x=x;this.y=nextY;found=true;break;}
            }
            if(!found){this.y=oldY;this.velocityY=0;}
          }
        } else this.y=nextY;
      }
      if(!this.grounded)this.coyoteTimer=Math.max(0,this.coyoteTimer-h);
      this.bufferTimer=Math.max(0,this.bufferTimer-h);
    }
    return this.x-start;
  }
  reset(x=this.x):void {
    this.x=x;this.y=surfaceY(this.floor(),x)!;this.grounded=true;this.supportId=this.floor().id;
    this.velocity=0;this.velocityY=0;this.landTimer=0;this.coyoteTimer=0;this.release();this.reconcile();
  }
  reconcile():void {
    this.velocity=0;this.release();
    if(this.collides(this.x,this.y)) {
      const top=this.world.surfaces(this.x).find(s=>s.definition.kind==='platform');
      if(top){this.y=top.y;this.grounded=true;this.supportId=top.id;this.velocityY=0;}
    }
    if(this.grounded) {
      const support=this.world.near(this.x,this.y,this.physics.groundSnap);
      if(support){this.y=support.y;this.supportId=support.id;}
      else {this.grounded=false;this.supportId=null;this.coyoteTimer=0;}
    }
  }
  destroy():void {this.input.destroy();}
}
