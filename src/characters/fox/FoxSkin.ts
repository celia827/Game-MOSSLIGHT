import type {Vec,RigPartId} from './CharacterConfig.ts';
import {FoxBones,LEG_BIND} from './FoxBones.ts';
import {smooth,blendPoint,clamp} from './poseMath.ts';
import {skinTail} from './FoxTailSkin.ts';

/** Source-space inverse-bind weights for the original continuous SVG skins. */
function leg(bones:FoxBones,p:Vec,i:number):Vec {
    const ids=LEG_BIND[i],k=bones.rest(ids.knee),a=bones.rest(ids.ankle);
    const skin=blendPoint(bones.skin(ids.hip,p),bones.skin(ids.knee,p),smooth((p.y-k.y+3)/6));
    const boot=blendPoint(skin,bones.skin(ids.ankle,p),smooth((p.y-a.y+3)/6));
    return blendPoint(boot,bones.skin(ids.foot,p),smooth((p.y-bones.rest(ids.foot).y+6)/6));
  }
function arm(bones:FoxBones,p:Vec,near:boolean):Vec {
    const shoulder=near?'nearShoulder':'farShoulder',elbow=near?'nearElbow':'farElbow',wrist=near?'nearWrist':'farWrist';
    const e=bones.rest(elbow),w=bones.rest(wrist);
    const sleeve=blendPoint(bones.skin(shoulder,p),bones.skin(elbow,p),smooth((p.y-e.y+4)/8));
    const cuff=blendPoint(sleeve,bones.skin(wrist,p),smooth((p.y-w.y+2)/5));
    const hand=near?'nearHand':'farHand';
    return blendPoint(cuff,bones.skin(hand,p),smooth((p.y-bones.rest(hand).y+1)/4));
  }

export function skinFoxPart(bones:FoxBones,id:RigPartId,p:Vec,blink:number,_runWeight:number,_runPhase:number):Vec {
    switch(id) {
      case 'near-leg':return leg(bones,p,0);case 'far-leg':return leg(bones,p,1);
      case 'near-arm':return arm(bones,p,true);case 'far-arm':return arm(bones,p,false);
      case 'coat-side': {
        // Three separate cross-sections form a bending garment, rather than a
        // single chest plate. The original closed SVG remains one continuous skin.
        const upper=blendPoint(bones.skin('chest',p),bones.skin('lowerSpine',p),smooth((p.y-136)/20));
        const q=blendPoint(upper,bones.skin('pelvis',p),smooth((p.y-156)/14));
        // The front hem bunches as the thighs fold. The rear/tail attachment is
        // deliberately outside this continuous fold field and stays connected.
        const fold=6*clamp(bones.angle('lowerSpine')/.55)*smooth((p.y-154)/19)*smooth((p.x-112)/23);
        const a=bones.worldAngle('pelvis');
        const cloth=bones.skin('coatHem',p),base=bones.skin('pelvis',p),hem=smooth((p.y-157)/20)*smooth((p.x-110)/20);
        return {x:q.x+Math.sin(a)*fold+(cloth.x-base.x)*hem,y:q.y-Math.cos(a)*fold+(cloth.y-base.y)*hem};
      }
      case 'tail':return skinTail(bones,p);
      case 'pack':return bones.skin('backpack',p);
      case 'near-ear':case 'far-ear': {
        const root=id==='near-ear'?'nearEar':'farEar',middle=id==='near-ear'?'nearEarMiddle':'farEarMiddle',tip=id==='near-ear'?'nearEarTip':'farEarTip';
        const m=bones.rest(middle),t=bones.rest(tip);
        const base=blendPoint(bones.skin(root,p),bones.skin(middle,p),smooth((m.y+9-p.y)/18));
        return blendPoint(base,bones.skin(tip,p),smooth((t.y+8-p.y)/15));
      }
      case 'scarf-side':return bones.skin('neck',{x:p.x+Math.max(0,p.y-125)*bones.angle('coatHem')*.7,y:p.y});
      case 'eyes':return bones.skin('head',{x:p.x,y:83+(p.y-83)*(1-blink*.97)});
      default:return bones.skin('head',p);
    }
}
