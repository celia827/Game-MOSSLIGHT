export const LAYER_DEFINITIONS = [
  {id:'sky',label:'天空',depth:0,scrollFactor:0.02},
  {id:'mountains',label:'远山',depth:10,scrollFactor:0.10},
  {id:'distantForest',label:'远景森林',depth:20,scrollFactor:0.24},
  {id:'midForest',label:'中景森林',depth:30,scrollFactor:0.55},
  {id:'terrain',label:'游戏地形',depth:40,scrollFactor:1},
  {id:'characters',label:'游戏角色',depth:50,scrollFactor:1},
  {id:'foreground',label:'前景装饰',depth:60,scrollFactor:1.12},
] as const;
export type LayerId = typeof LAYER_DEFINITIONS[number]['id'];
