import {clamp} from './poseMath.ts';
/** Closed-form mass-one damped oscillator. No accumulating tweens or Euler instability. */
export class DampedSpring {
  value=0;velocity=0;
  step(target:number,dt:number,stiffness:number,damping:number,limit:number):number {
    const w=Math.sqrt(stiffness),z=damping,x=this.value-target,v=this.velocity;
    if(z<.999) {
      const a=z*w,b=w*Math.sqrt(1-z*z),e=Math.exp(-a*dt),c=Math.cos(b*dt),s=Math.sin(b*dt),q=(v+a*x)/b;
      this.value=target+e*(x*c+q*s);this.velocity=e*(v*c-(a*v+w*w*x)/b*s);
    } else if(z>1.001) {
      const s=Math.sqrt(z*z-1),r1=-w*(z-s),r2=-w*(z+s),c1=(v-r2*x)/(r1-r2),c2=x-c1;
      this.value=target+c1*Math.exp(r1*dt)+c2*Math.exp(r2*dt);this.velocity=c1*r1*Math.exp(r1*dt)+c2*r2*Math.exp(r2*dt);
    } else {
      const q=v+w*x,e=Math.exp(-w*dt);this.value=target+(x+q*dt)*e;this.velocity=(v-w*q*dt)*e;
    }
    const bounded=clamp(this.value,-limit,limit);
    if(bounded!==this.value){this.value=bounded;if(this.velocity*this.value>0)this.velocity=0;}
    return this.value;
  }
  reset(value=0):void {this.value=value;this.velocity=0;}
}
