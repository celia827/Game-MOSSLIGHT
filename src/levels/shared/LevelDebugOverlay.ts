import type Phaser from 'phaser';
import type {LevelMap} from './MapModule.ts';
import {buildCollision} from '../../world/terrain/geometry.ts';

import {overviewSvg} from './MapOverview.ts';

export class LevelDebugOverlay {
  visible=false;private graphics:Phaser.GameObjects.Graphics;
  private panel:HTMLElement;private button:HTMLButtonElement;private debugButton:HTMLButtonElement;
  constructor(private scene:Phaser.Scene,private map:LevelMap) {
    this.graphics=scene.add.graphics().setDepth(98).setVisible(false);
    this.panel=document.querySelector('#level-map')!;
    document.querySelector('#map-svg')!.innerHTML=overviewSvg(map);
    this.button=document.querySelector('#map-toggle')!;this.debugButton=document.querySelector('#terrain-debug')!;
    this.button.onclick=()=>this.toggle();
    document.querySelector<HTMLButtonElement>('#map-close')!.onclick=()=>this.toggle(false);
    this.debugButton.onclick=()=>{this.visible=!this.visible;this.graphics.setVisible(this.visible);this.debugButton.setAttribute('aria-pressed',String(this.visible));};
  }
  get open():boolean{return !this.panel.hidden;}
  toggle(open=this.panel.hidden):void {this.panel.hidden=!open;this.button.setAttribute('aria-expanded',String(open));}
  update(x:number,y:number,body:{x:number;y:number}[]):void {
    if(this.visible) {
      const g=this.graphics;g.clear();
      for(const m of this.map.modules){const c=buildCollision(m);g.lineStyle(1,0xf4d397,.8).strokePoints(c.polygon,true);g.lineStyle(3,m.oneWay?0xe8c676:0x9cdbba).strokePoints(c.top,false);}
      for(const route of this.map.routes)g.lineStyle(2,parseInt(route.color.slice(1),16),.8).strokePoints(route.points,false);
      g.lineStyle(1.4,0xffffff).strokePoints(body,true);
    }
    if(this.open) {
      const dot=this.panel.querySelector('#map-player')!;dot.setAttribute('cx',String(x));dot.setAttribute('cy',String(y));
      const rect=this.panel.querySelector('#map-camera')!,c=this.scene.cameras.main;
      rect.setAttribute('x',String(c.scrollX));rect.setAttribute('y',String(c.scrollY));
    }
  }
}
