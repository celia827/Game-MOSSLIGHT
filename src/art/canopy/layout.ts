import type {MapModule} from '../../levels/shared/MapModule.ts';
export function canopyPlan(m:MapModule){
 if(m.region!=='C')return undefined;
 const windowReturn=m.id.startsWith('crown-return-');
 const frame=m.id==='crown-rest'?'branch-rest':m.id==='crown-lookout'?'branch-joint':m.id==='crown-secret-perch'?'branch-end':m.width<=150?'branch-short':'branch-medium';
 const support=['crown-up-1','crown-up-3','crown-up-6','crown-rest','crown-lookout','crown-down-3'].includes(m.id);
 return {frame,x:m.x,y:m.y-64,width:m.width,tread:m.y,windowReturn,support,ends:['rounded-left','rounded-right'],flip:m.id.startsWith('crown-down-')||windowReturn};
}
