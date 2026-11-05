import type { MapDefinition } from '../types';

export const whisperingWoods: MapDefinition = {
  id:'whispering-woods',title:'晨光林地',
  layers:{
    sky:[{key:'sky',x:0,y:0},{key:'clouds',x:0,y:0}],
    mountains:[{key:'mountains',x:0,y:0}],
    distantForest:[{key:'forest',x:0,y:0},{key:'mist',x:0,y:-14,alpha:.28}],
    midForest:[
      {key:'woodland',x:0,y:0,alpha:.58},
      {key:'path',x:0,y:0},
      {key:'birch',x:545.4,y:26.88,scale:.83,alpha:.92},
      {key:'birch',x:330.4,y:165.88,scale:.58,alpha:.55,flipX:true},
      {key:'shrub',x:478,y:447,scale:.62,alpha:.66},
      {key:'shrub',x:1021,y:432,scale:.85},
      {key:'willow',x:-98,y:-91},
      {key:'oak',x:942,y:-92},
      {key:'shrub',x:-60,y:483,scale:1.03},
      {key:'beams',x:0,y:0,alpha:.42},
      {key:'blooms',x:712,y:422,scale:.68,alpha:.85},
    ],
    terrain:[],
    characters:[],
    foreground:[
      {key:'pollen',x:0,y:0},
      {key:'leaves',x:-38,y:470,scale:1.1},
      {key:'leaves',x:1074,y:495,scale:.99,flipX:true},
      {key:'vines',x:-17,y:-22,scale:.9},
      {key:'vines',x:1099,y:-34,scale:.78,flipX:true},
    ],
  },
  terrain:[
    {id:'forest-floor',kind:'ground',x:0,y:490,width:1280,height:230},
    {id:'mossy-rise',kind:'platform',x:843,y:451,width:349.2,height:155.2},
  ],
  character:{terrainId:'forest-floor',footX:414.2,scale:.8},
};
