import type {FoxBones,BoneId} from './FoxBones.ts';
import type {RigPartId,Vec} from './CharacterConfig.ts';
import {skinFoxPart} from './FoxSkin.ts';
import {clamp,smooth,blendPoint,rotate} from './poseMath.ts';

const SPINE:BoneId[]=['pelvis','lowerSpine','chest','neck'];
const hermite=(a:Vec,b:Vec,ta:Vec,tb:Vec,t:number):Vec=>{
  const h0=2*t**3-3*t*t+1,h1=t**3-2*t*t+t,h2=-2*t**3+3*t*t,h3=t**3-t*t;
  return {x:a.x*h0+ta.x*h1+b.x*h2+tb.x*h3,y:a.y*h0+ta.y*h1+b.y*h2+tb.y*h3};
};
const derivative=(a:Vec,b:Vec,ta:Vec,tb:Vec,t:number):Vec=>{
  const h0=6*t*t-6*t,h1=3*t*t-4*t+1,h2=-h0,h3=3*t*t-2*t;
  return {x:a.x*h0+ta.x*h1+b.x*h2+tb.x*h3,y:a.y*h0+ta.y*h1+b.y*h2+tb.y*h3};
};
/** Continuous curved garment and rigid boots shared by game and laboratory. */
export class FoxBodySkin {
  private bones:FoxBones;
  constructor(bones:FoxBones){this.bones=bones;}
  torso(p:Vec):Vec {
    const b=this.bones;
    if(p.y>=170)return b.skin('pelvis',p);
    if(p.y<=112)return b.skin('neck',p);
    const j=p.y>156?0:p.y>136?1:2,lo=SPINE[j],hi=SPINE[j+1];
    const a=b.rest(lo),z=b.rest(hi),length=a.y-z.y,t=clamp((a.y-p.y)/length);
    const aa=b.worldAngle(lo),za=b.worldAngle(hi);
    const ta={x:Math.sin(aa)*length,y:-Math.cos(aa)*length},tz={x:Math.sin(za)*length,y:-Math.cos(za)*length};
    const center=hermite(b.position(lo),b.position(hi),ta,tz,t);
    const bind=hermite(a,z,{x:0,y:-length},{x:0,y:-length},t);
    const angle=aa+(za-aa)*smooth(t),dx=p.x-bind.x,dy=p.y-bind.y,c=Math.cos(angle),s=Math.sin(angle);
    const velocity=derivative(b.position(lo),b.position(hi),ta,tz,t);
    const along=Math.max(.2,(-c*velocity.y+s*velocity.x)/length),turn=-(za-aa)*6*t*(1-t)/length;
    // A wide inner cloth cross-section can cross itself at a deep bend. Gather
    // its width toward the centerline before that happens, with positive area.
    const transverse=dx*turn<0?dx/(1+Math.abs(turn/along)*Math.abs(dx)):dx;
    return {x:center.x+transverse*c-dy*s,y:center.y+transverse*s+dy*c};
  }
  /** The under-chin overlap and scarf share the same continuous cervical field.
   * Upper edge follows the rigid jaw; lower edge follows the chest/garment.
   * No independently rotating collar plate or static white connector. */
  neck(p:Vec):Vec {
    return blendPoint(this.bones.skin('head',p),this.torso(p),smooth((p.y-110)/23));
  }
  /** Collar wraps the cervical volume; its hanging end is attached at the knot,
   * rather than projected onto the chest like a painted badge. Existing hem
   * inertia supplies restrained cloth drag, with zero displacement at the knot. */
  scarf(p:Vec):Vec {
    const b=this.bones;
    const wrap=(q:Vec)=>blendPoint(b.skin('head',q),this.torso(q),.25+.65*smooth((q.y-108)/24));
    const collar=wrap(p),anchor={x:106,y:123},length=Math.max(0,p.y-anchor.y);
    const free=smooth(length/14);
    if(free===0)return collar;
    const a=wrap(anchor);
    const pitch=.55*b.worldAngle('head')+.45*b.worldAngle('neck');
    const drag=clamp(b.angle('coatHem')*1.4+(b.worldAngle('chest')-b.worldAngle('head'))*.16,-.16,.16);
    const q=rotate(p,anchor,pitch+drag*smooth(length/18));
    return blendPoint(collar,{x:a.x+q.x-anchor.x,y:a.y+q.y-anchor.y},free);
  }
  attach():void {
    // Shoulder sockets and strap mount follow the actual curved garment surface,
    // not the old rigid chest plate. All arm/pack descendants remain in the rig.
    for(const id of ['nearShoulder','farShoulder','backpack'] as const) {
      const angle=this.bones.worldAngle(id),position=this.torso(this.bones.rest(id));
      if(id==='backpack'){
        const base=this.bones.skin('chest',this.bones.rest(id)),offset=this.bones.position(id);
        position.x+=clamp(offset.x-base.x,-.65,.65);position.y+=clamp(offset.y-base.y,-.65,.65);
      }
      this.bones.poseWorld(id,position,angle);
    }
  }
  map(id:RigPartId,p:Vec,blink=0):Vec {
    if(id==='near-leg'||id==='far-leg') {
      const near=id==='near-leg',hip=near?'nearHip':'farHip',knee=near?'nearKnee':'farKnee',ankle=near?'nearAnkle':'farAnkle',foot=near?'nearFoot':'farFoot';
      const upper=blendPoint(this.bones.skin(hip,p),this.bones.skin(knee,p),smooth((p.y-this.bones.rest(knee).y+4)/8));
      // Keep the painted boot rigid below its cuff; only the fur above it bends.
      // Previously the boot toe also blended with the rotating shin and pinched.
      return blendPoint(upper,this.bones.skin(foot,p),smooth((p.y-this.bones.rest(ankle).y+11)/8));
    }
    if(id==='coat-side') {
      // The long coat gathers above the forward knee in a crouch. Keep the rear
      // tail attachment untouched; reshape only the lower/front fabric strip.
      const fold=10*clamp(this.bones.angle('lowerSpine')/.6)*smooth((p.y-148)/26)*smooth((p.x-110)/22);
      return this.torso({x:p.x,y:p.y-fold});
    }
    if(id==='neck-bridge')return this.neck(p);
    if(id==='scarf-side')return this.scarf(p);
    return skinFoxPart(this.bones,id,p,blink,0,0);
  }
}
