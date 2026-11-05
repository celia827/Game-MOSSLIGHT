import catalog from '../../../art-lab/catalog.json';
const groups=[['ground','A · 森林地表与土壤','grass-left','grass-middle','grass-right'],['branch','B · 苔藓树枝与树干连接','branch-left','branch-medium','branch-rest','branch-end'],['rock','C · 地下岩石与洞顶','cave-floor','cave-floor','cave-floor']] as const;
const image=(id:string)=>`<img src="/assets/terrain/b1/${id}.svg" alt="${id}">`;
const element=document.querySelector('#catalog')!;
for(const [kind,label,...stitch] of groups) {
 element.innerHTML+=`<section><h2>${label}</h2><p>单体模块 / 连续拼接 / 表面锚点</p><div class="grid">${catalog.filter(c=>(c.kind===kind&&c.id!=='rock-soil')||(kind==='branch'&&c.id==='branch-support')||(kind==='rock'&&((c.kind==='detail'&&c.id!=='branch-support')||c.id==='rock-soil'))).map(c=>`<article class="card"><div class="reference">${image(c.id)}${c.kind!=='detail'&&c.id!=='soil-interior'?`<svg class="tread" viewBox="0 0 ${c.w} ${c.h}"><path d="M0 ${c.id==='cave-ceiling'?100:64}L${c.w} ${c.id.endsWith('-slope')?112:c.id==='cave-ceiling'?100:64}" fill="none" stroke="#f5c45c" stroke-width="1.5" stroke-dasharray="5 4"/></svg>`:''}</div><p>${c.id}</p><code>${c.w} × ${c.h} / ${c.kind==='detail'?'装饰锚点':c.id==='soil-interior'?'内部重复填充':c.id==='cave-ceiling'?'洞顶参考 y=100':c.id.endsWith('-slope')?'表面 y=64 → 112':'踩踏面 y=64'}</code></article>`).join('')}</div><p>连续效果 · 独立模块直接相接</p><div class="strip">${stitch.map(image).join('')}</div>${kind!=='branch'?`<p>平地 → 斜坡 → 平地 · 踩踏高度 64 → 112</p><div class="strip slope-row">${[kind==='ground'?'grass-middle':'cave-floor',kind==='ground'?'grass-slope':'cave-slope',kind==='ground'?'grass-middle':'cave-floor'].map(image).join('')}</div>`:''}</section>`;
}
document.querySelector<HTMLButtonElement>('#reference-toggle')!.onclick=()=>document.body.classList.toggle('debug');
let sample='ground',baseline=false;
const refresh=()=>{document.querySelector<HTMLIFrameElement>('#scene')!.src=`/level01/?dev=1&artSample=${sample}${baseline?'&skin=baseline':''}`;document.querySelector('#scene-label')!.textContent=`${({ground:'A 入口地表',branch:'B 树冠休息台',cave:'C 东侧洞底'} as Record<string,string>)[sample]} · ${baseline?'原型对照':'新美术'}`;};
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-sample]'))button.onclick=()=>{sample=button.dataset.sample!;refresh();};
document.querySelector<HTMLButtonElement>('#baseline')!.onclick=()=>{baseline=!baseline;refresh();};

document.querySelector<HTMLButtonElement>('#collision-toggle')!.onclick=()=>{const frame=document.querySelector<HTMLIFrameElement>('#scene')!;frame.contentDocument?.querySelector<HTMLButtonElement>('#terrain-debug')?.click();};
