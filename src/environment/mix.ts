const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Read camera viewport centre, not X-only zones. C.1 already stabilizes normal-jump scroll. */
export function environmentMix(scrollX:number,scrollY:number,root:{x:number;y:number}){
 const x=scrollX+640,y=scrollY+360,canopy=1-smooth(540,820,y),cave=smooth(900,1300,y);
 return {canopy,cave,surface:1-Math.max(canopy,cave),root:(1-smooth(140,420,Math.abs(x-root.x)))*smooth(root.y-390,root.y-140,y)};
}
export const ENVIRONMENT_CONFIG={farWallX:.03,farWallY:.015,wallMaxShiftX:19.2,wallMaxShiftY:12,surfaceBeams:.025,canopyBeams:.07,rootGlow:.35,foregroundAlpha:.24} as const;
