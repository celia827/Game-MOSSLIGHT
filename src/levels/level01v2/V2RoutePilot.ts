import type {PlayerController} from '../../characters/fox/PlayerController.ts';
export type Command=['w',number]|['r',number]|['j',number,string,number?]|['wait',number]|['s',string]|['e'];
const w=(x:number):Command=>['w',x],j=(axis:number,to:string):Command=>['j',axis,to];
const intro=[w(382),j(1,'entry-east')];
const end=[w(2602),j(1,'valley-rest'),w(2802),j(1,'valley-stone-1'),w(3012),j(1,'valley-stone-2'),w(3630)];
const up=[w(980),j(0,'crown-up-1'),w(1062),j(1,'crown-up-2'),w(1232),j(1,'crown-up-3'),w(1392),j(1,'crown-rest')];
const root=[w(1240),w(1360),w(1540)];
const east=[w(2342),j(1,'cave-return-1'),w(2482),j(1,'cave-return-2'),w(2622),j(1,'cave-return-3'),w(2730),j(0,'valley-rest'),...end.slice(2)];
const main=[...intro,w(1182),j(1,'sunlit-bridge'),...end];
const westReturn=[w(1498),j(-1,'cave-entry-2'),w(1338),j(-1,'cave-entry-1'),w(1208),j(-1,'west-deck'),w(448),j(-1,'entry'),w(160)];
const backwards=[w(3078),j(-1,'valley-stone-1'),w(2868),j(-1,'valley-rest'),w(2640),j(-1,'valley-approach'),w(2418),['j',-1,'valley-west',.02] as Command,w(1248),j(-1,'west-deck'),w(448),j(-1,'entry'),w(160)];
export const V2_ROUTES:Record<string,{label:string;commands:Command[]}>= {
  main:{label:'主路线 A→F',commands:main},
  'main-flow':{label:'主路连续助跑（提前6px）',commands:main.map(c=>c[0]==='w'&&[382,1182,2602,2802,3012].includes(c[1])?['r',c[1]-6] as Command:c)},
  'main-flow-early':{label:'主路连续助跑（提前12px）',commands:main.map(c=>c[0]==='w'&&[382,1182,2602,2802,3012].includes(c[1])?['r',c[1]-12] as Command:c)},
  'main-flow-late':{label:'主路连续助跑（原阈值）',commands:main.map(c=>c[0]==='w'&&[382,1182,2602,2802,3012].includes(c[1])?['r',c[1]] as Command:c)},
  canopy:{label:'树冠高枝露珠 → 林窗早返',commands:[...intro,...up,w(1580),j(0,'crown-secret-perch'),w(1470),w(1685),w(1800),...end]},
  'canopy-east':{label:'树冠东侧完整下返',commands:[...intro,...up,w(1652),j(1,'crown-lookout'),w(2480),...end]},
  'canopy-reverse':{label:'先到终点 → 逆行树冠 → 起点',commands:[...main,...backwards.slice(0,4),w(2478),j(-1,'crown-down-3'),w(2328),j(-1,'crown-down-2'),w(2178),j(-1,'crown-down-1'),w(2018),j(-1,'crown-lookout'),w(1718),j(-1,'crown-secret-perch'),w(1470),w(1420),w(900),w(720),w(448),j(-1,'entry'),w(160)]},
  cave:{label:'地下根室露珠 → 东口',commands:[...intro,...root,w(1885),['e'],w(1980),...east]},
  'cave-west':{label:'地下西口三级80px原路回升',commands:[...intro,...root,...westReturn]},
  'bridge-open':{label:'OPEN 洞内上路',commands:[...intro,...root,w(1852),j(1,'cave-shortcut-east'),...east]},
  'bridge-folded':{label:'FOLDED 根室下路',commands:[...intro,...root,w(1885),['e'],w(1980),...east]},
  'valley-west':{label:'溪谷第一跳失误 → 西侧恢复 → 重试',commands:[...intro,w(1182),j(1,'sunlit-bridge'),w(2602),j(1,'valley-rest'),w(2835),['s','valley-retry-high'],w(2740),j(0,'valley-rest'),...end.slice(2)]},
  'valley-east':{label:'溪谷第二跳失误 → 东侧恢复',commands:[...intro,w(1182),j(1,'sunlit-bridge'),...end.slice(0,4),w(3045),['s','valley-catch'],w(3200),j(0,'valley-retry-east-1'),j(0,'valley-retry-east-2'),w(3250),j(0,'gate-approach'),w(3630)]},
  reverse:{label:'先到终点 → 沿主路返回起点',commands:[...main,...backwards]},
  rescue:{label:'从入口失足托底 → 步行跌入救援带',commands:[w(415),['s','entry-retry-low'],w(720),['s','entry-catch'],w(740),['wait',3]]},
  'rescue-cp2':{label:'到终点再跌落 → 自动救援CP2',commands:[...main,...backwards.slice(0,9),w(1215),['s','cave-entry-1'],w(1140),['wait',4]]},
  'rescue-cp1':{label:'树冠取珠 → 洞西侧跌落 → 自动救援CP1',commands:[...intro,...up,w(1580),j(0,'crown-secret-perch'),w(1470),w(1685),w(1800),w(1215),['s','cave-entry-1'],w(1140),['wait',4]]},
};
/** Commands send ordinary keyboard edges. No motor stepping, pose/velocity writes or teleport API. */
export class V2RoutePilot {
  index=0;elapsed=0;done=false;failed=false;error='';supports=new Set<string>();
  private age=0;private started=false;private runAxis=0;
  readonly route:string;
  constructor(route:string){this.route=route;if(!V2_ROUTES[route])throw Error(`Unknown V2 route ${route}`);}
  next(p:PlayerController,dt:number):{axis:number;jump:boolean;interact:boolean} {
    this.elapsed+=dt;this.age+=dt;if(p.grounded&&p.supportId)this.supports.add(p.supportId);
    const idle={axis:0,jump:false,interact:false},c=V2_ROUTES[this.route].commands[this.index];
    if(!c){this.done=true;return idle;}
    if(this.age>30){this.failed=true;this.error=`command ${JSON.stringify(c)} at ${p.x.toFixed(1)},${p.y.toFixed(1)} ${p.supportId}`;return idle;}
    const advance=()=>{this.index++;this.age=0;this.started=false;};
    if(c[0]==='r'){const axis=Math.sign(c[1]-p.x);if(!this.started){this.started=true;this.runAxis=axis;}if((c[1]-p.x)*this.runAxis<=0){advance();return{...idle,axis:this.runAxis};}return{...idle,axis:this.runAxis};}
    if(c[0]==='w'){
      const dist=c[1]-p.x,brake=p.velocity**2/1800;
      if(Math.abs(dist)<2&&Math.abs(p.velocity)<5&&p.grounded){advance();return idle;}
      return{...idle,axis:Math.abs(dist)>Math.max(1,brake)?Math.sign(dist):0};
    }
    if(c[0]==='wait'){if(this.age>=c[1])advance();return idle;}
    if(c[0]==='s'){if(p.grounded&&p.supportId===c[1])advance();return idle;}
    if(c[0]==='e'){advance();return{...idle,interact:true};}
    if(!this.started){if(!p.grounded){this.failed=true;this.error='jump requires a stable support';return idle;}this.started=true;this.age=0;}
    else if(p.grounded&&this.age>.08){if(p.supportId!==c[2]){this.failed=true;this.error=`expected ${c[2]}, landed ${p.supportId}`;}else advance();return idle;}
    return{axis:c[1],jump:this.age<(c[3]??.6),interact:false};
  }
}
