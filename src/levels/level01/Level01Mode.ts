/** A presentation boundary, not authentication: developer tools require an explicit URL. */
export function level01DeveloperMode(search:string):boolean {
  return new URLSearchParams(search).get('dev')==='1';
}

/** Keep accepted tools intact, outside the player's visible/focusable interface. */
export function applyLevel01Mode(developer:boolean,signal:AbortSignal):void {
  document.body.dataset.levelMode=developer?'developer':'player';
  for(const node of document.querySelectorAll<HTMLElement>('.level-dev,.level-links,#map-toggle')){
    node.hidden=!developer;node.inert=!developer;node.style.display=developer?'':'none';
  }
  if(!developer){
    // Child tools may own native click listeners; also reject synthetic .click().
    document.querySelector('.level-dev')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();},{capture:true,signal});
    document.querySelector<HTMLElement>('#level-map')!.hidden=true;
    document.querySelector('#map-svg')!.replaceChildren();
    for(const node of document.querySelectorAll('#level-telemetry,#physics-summary'))node.textContent='';
  }else{
    // Legacy coverage links keep their selected comparison and the explicit tool mode.
    document.querySelector('.level-dev')?.addEventListener('click',e=>{
      const link=(e.target as Element).closest<HTMLAnchorElement>('a[href]');if(!link)return;
      const url=new URL(link.href,location.href);
      if(url.origin===location.origin&&url.pathname==='/level01/'){url.searchParams.set('dev','1');link.href=url.href;}
    },{capture:true,signal});
  }
}
