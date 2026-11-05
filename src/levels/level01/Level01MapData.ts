import type {LevelMap,MapModule} from '../shared/MapModule.ts';

const flat=(id:string,x:number,y:number,width:number,height:number,region:MapModule['region'],type:MapModule['type']='ground',material:MapModule['art']['material']='moss',oneWay=false):MapModule=>({
  id,x,y,width,height,region,type,kind:type==='ground'?'ground':'platform',
  profile:[{x:0,y:0},{x:width,y:0}],oneWay,collision:oneWay?'one-way':'solid',art:{material},
});
const ramp=(id:string,x:number,y:number,width:number,rise:number,region:MapModule['region'],material:MapModule['art']['material']='rock'):MapModule=>({
  ...flat(id,x,y,width,Math.max(0,rise)+180,region,'ramp',material),profile:[{x:0,y:0},{x:width,y:rise}],
});
const modules:MapModule[]=[
  flat('bedrock',0,1680,3840,160,'D','ground','rock'),
  {...flat('entry',0,900,400,320,'A'),profile:[{x:0,y:0},{x:200,y:0},{x:300,y:-18},{x:400,y:0}],connections:['crown-fork','cave-mouth']},
  flat('west-deck',450,900,590,34,'B','bridge','wood',true),
  ramp('cave-west-return',400,900,700,580,'D'),
  {...flat('sunlit-bridge',1100,900,1700,38,'B','bridge','wood',true),connections:['cave-mouth','cave-return'],profile:[{x:0,y:0},{x:180,y:0},{x:360,y:-50},{x:510,y:-50},{x:740,y:14},{x:900,y:14},{x:1080,y:-35},{x:1240,y:-35},{x:1460,y:8},{x:1700,y:0}]},
  flat('return-bridge',2800,900,340,38,'B','bridge','wood',true),
  flat('clearing',3200,900,640,420,'E'),
  // Broad landings at 80px rises. All use the existing single jump.
  ...[[600,820,180],[780,755,140],[920,680,220],[1140,600,150],[1290,530,170],[1460,450,180]].map(([x,y,w],i)=>flat(`crown-up-${i+1}`,x,y,w,32,'C','step','moss',true)),
  flat('crown-rest',1640,420,280,40,'C','platform','moss',true),
  flat('crown-secret-perch',1740,320,140,30,'C','platform','moss',true),
  flat('crown-lookout',1960,400,260,42,'C','platform','moss',true),
  flat('crown-east',2220,420,180,40,'C','platform','moss',true),
  ...[[2400,490,140],[2540,570,220],[2760,650,140],[2900,725,170],[3070,810,130]].map(([x,y,w],i)=>flat(`crown-down-${i+1}`,x,y,w,32,'C','step','moss',true)),
  ...[[1940,520,120],[2060,620,140],[2200,720,120],[2320,810,140]].map(([x,y,w],i)=>flat(`crown-return-${i+1}`,x,y,w,26,'C','platform','moss',true)),
  // Wide, reversible lower path. The bridge above is a clearly marked one-way deck.
  {...flat('cave-landing',1100,1480,540,200,'D','cave','rock'),profile:[{x:0,y:0},{x:40,y:0},{x:180,y:-50},{x:300,y:-50},{x:440,y:0},{x:540,y:0}]},
  ramp('secret-west',1640,1480,140,110,'D'),
  flat('secret-alcove',1780,1590,180,90,'D','cave','rock'),
  ramp('secret-east',1960,1590,140,-110,'D'),
  {...flat('cave-east',2100,1480,300,200,'D','cave','rock'),profile:[{x:0,y:0},{x:80,y:-36},{x:180,y:-36},{x:300,y:0}]},
  flat('cave-shortcut',1640,1480,80,24,'D','bridge','rock',true),
  flat('cave-shortcut-east',1780,1480,320,24,'D','bridge','rock',true),
  {...ramp('cave-return',2400,1480,800,-580,'D'),connections:['cave-return']},
  flat('root-wall',0,1220,400,460,'D','cave','rock'),
];
export const Level01MapData:LevelMap={
  id:'morning-glade',title:'第一章 · 晨光林地',width:3840,height:1840,
  spawn:{x:160,y:900},finish:{x:3630,y:900},modules,
  guides:[{label:'眺望台支线',color:'#9cdbba',points:[{x:1700,y:420},{x:1810,y:320},{x:1904,y:420}]},{label:'林窗回落通路',color:'#9cdbba',points:[{x:1920,y:420},{x:2000,y:520},{x:2130,y:620},{x:2260,y:720},{x:2390,y:810},{x:2500,y:880}]}],
  landmarks:[{id:'canopy-view',label:'林冠观察点',x:1810,y:320,moduleId:'crown-secret-perch'},{id:'root-memory',label:'根室微光',x:1860,y:1590,moduleId:'secret-alcove'}],
  regions:[
    {id:'A',name:'森林入口',x:0,y:690,width:600,height:430},
    {id:'B',name:'森林主路',x:600,y:840,width:2600,height:160},
    {id:'C',name:'树冠高处',x:600,y:180,width:2600,height:660},
    {id:'D',name:'回声根洞',x:120,y:1000,width:3080,height:680},
    {id:'E',name:'晨光门庭',x:3200,y:690,width:640,height:630},
  ],
  connections:[
    {id:'crown-fork',label:'苔阶岔口',kind:'branch',x:600,y:900,routes:['main','canopy']},
    {id:'west-portal',label:'根坡双向入口',kind:'branch',x:425,y:920,routes:['main','cave']},
    {id:'crown-return',label:'林窗通路汇合',kind:'merge',x:2500,y:896,routes:['main','canopy']},
    {id:'crown-window',label:'林窗回落入口',kind:'branch',x:1920,y:420,routes:['canopy','main']},
    {id:'perch',label:'林冠观察点',kind:'branch',x:1810,y:320,routes:['canopy']},
    {id:'cave-mouth',label:'根隙洞口 · 主路跳过',kind:'branch',x:1070,y:900,routes:['main','cave']},
    {id:'hidden-entry',label:'根帘后的微光',kind:'hidden',x:1750,y:1480,routes:['cave','hidden']},
    {id:'cave-return',label:'岩坡归途 · 可折返',kind:'merge',x:3170,y:922,routes:['main','cave','canopy']},
  ],
  routes:[
    {id:'main',label:'森林主路',color:'#e8c676',points:[{x:160,y:890},{x:400,y:890},{x:425,y:830},{x:450,y:890},{x:600,y:890},{x:1040,y:890},{x:1070,y:835},{x:1100,y:890},{x:3140,y:890},{x:3170,y:835},{x:3200,y:890},{x:3630,y:890}]},
    {id:'canopy',label:'树冠高处',color:'#9cdbba',points:[{x:550,y:900},...modules.filter(m=>m.region==='C'&&m.id!=='crown-secret-perch'&&!m.id.startsWith('crown-return-')).map(m=>({x:m.x+m.width/2,y:m.y-10})),{x:3250,y:900},{x:3630,y:900}]},
    {id:'cave',label:'地下洞穴',color:'#9bb9ed',points:[{x:400,y:900},{x:700,y:1149},{x:1100,y:1470},{x:1280,y:1420},{x:1400,y:1420},{x:1640,y:1470},{x:1750,y:1415},{x:1830,y:1470},{x:2400,y:1470},{x:3200,y:890},{x:3630,y:890}]},
    {id:'hidden',label:'隐藏根室',color:'#d4a5db',points:[{x:1750,y:1480},{x:1820,y:1580},{x:1940,y:1580},{x:2100,y:1480}]},
  ],
};
