import Phaser from 'phaser';
import {RIG_PARTS,CHARACTER_CONFIG as C} from './CharacterConfig';
import type {RigPartId,Vec} from './CharacterConfig';
import type {BoneId,FoxBones} from './FoxBones';

/** Render contract shared by the game animator and the static pose laboratory. */
export interface FoxRigPose {
  readonly bones:FoxBones;
  map(id:RigPartId,p:Vec):Vec;
  alpha(id:RigPartId):number;
}

class SkinMesh extends Phaser.GameObjects.Mesh {
  refreshSkin():void {this.preUpdate(0,0);}
}

/** Dense continuous UV skins keep the original painted outlines across bending joints. */
export class FoxRig {
  readonly root:Phaser.GameObjects.Container;
  readonly visual:Phaser.GameObjects.Container;
  private parts:{id:RigPartId;mesh:SkinMesh;points:Vec[];indices:number[];mapped:Float64Array}[]=[];
  private markers:Phaser.GameObjects.Graphics;
  inspectionRegion:'whole'|'ears'|'tail'='whole';
  jointsVisible=false;
  headNeckVisible=false;
  headPivotVisible=false;
  selectedBone:BoneId='nearElbow';
  constructor(scene:Phaser.Scene) {
    this.root=scene.add.container(0,0);
    this.root.setName('CharacterRoot');
    this.visual=scene.add.container(0,0).setName('VisualRoot');this.root.add(this.visual);
    for(const def of RIG_PARTS) {
      const [x0,y0,x1,y1]=def.bounds;
      const step=def.id.includes('arm')||def.id.includes('leg')||def.id==='coat-side'||def.id==='scarf-side'||def.id.includes('ear')||def.id==='tail'?2:4;
      const columns=Math.ceil((x1-x0)/step),rows=Math.ceil((y1-y0)/step);
      const vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
      const points:Vec[]=[];
      for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++) {
        const x=x0+(x1-x0)*i/columns,y=y0+(y1-y0)*j/rows;
        points.push({x,y});vertices.push(x-C.source.anchor.x,-(y-C.source.anchor.y));
        uvs.push(def.id==='tail'?(x+8)/216:x/200,y/220);
      }
      for(let j=0;j<rows;j++)for(let i=0;i<columns;i++) {
        const a=j*(columns+1)+i,b=a+columns+1;
        indices.push(a,b,a+1,b,b+1,a+1);
      }
      const mesh=new SkinMesh(scene,0,0,`fox-rig-${def.id}`);scene.add.existing(mesh);
      // Projection is refreshed explicitly after skinning below. Do not also
      // project every hidden laboratory mesh in Phaser's automatic update list.
      scene.sys.updateList.remove(mesh);
      mesh.setSize(200,220).setOrtho(200,220);
      mesh.hideCCW=false;mesh.ignoreDirtyCache=true;
      mesh.addVertices(vertices,uvs,indices);
      this.parts.push({id:def.id,mesh,points,indices,mapped:new Float64Array(points.length*2)});this.visual.add(mesh);
    }
    this.markers=scene.add.graphics();this.visual.add(this.markers);
  }
  pose(controller:FoxRigPose,facing:number,scale:number):void {
    this.visual.setScale(facing*scale,scale);
    for(const {id,mesh,points,indices,mapped} of this.parts) {
      mesh.setVisible(this.inspectionRegion==='whole'||(this.inspectionRegion==='ears'?id.includes('ear'):id==='tail'));
      mesh.setAlpha(controller.alpha(id));
      // Each grid point is shared by up to six triangle vertices. Skin it once;
      // retain the original triangle order and double precision coordinates.
      for(let i=0;i<points.length;i++){
        const p=controller.map(id,points[i]);mapped[i*2]=p.x-C.source.anchor.x;mapped[i*2+1]=-(p.y-C.source.anchor.y);
      }
      for(let i=0;i<mesh.vertices.length;i++){
        const j=indices[i]*2;mesh.vertices[i].x=mapped[j];mesh.vertices[i].y=mapped[j+1];
      }
      // Vertex mutation occurs after Phaser's update list; refresh the projection now.
      mesh.refreshSkin();
    }
    this.markers.clear();
    if(this.jointsVisible||this.headNeckVisible||this.headPivotVisible) {
      const joints=controller.bones.snapshot(),lookup=new Map(joints.map(b=>[b.id,b]));
      for(const p of joints) {
        if(this.inspectionRegion==='ears'&&!p.id.includes('Ear')&&p.id!=='head')continue;
        if(this.inspectionRegion==='tail'&&!p.id.startsWith('tail')&&p.id!=='pelvis')continue;
        if(!this.jointsVisible&&!['lowerSpine','chest','neck','head'].includes(p.id))continue;
        const isTail=p.id.startsWith('tail');
        const graphics=this.markers;
        const color=p.id.startsWith('far')?0x87dce0:isTail?0xffe4a2:0xf9d588;
        graphics.lineStyle(isTail?1.5:1,color,.95);
        const parent=p.parent?lookup.get(p.parent):undefined;
        if(parent)graphics.lineBetween(parent.x-124,parent.y-210,p.x-124,p.y-210);
        if(isTail){graphics.fillStyle(0x214b40,1);graphics.fillCircle(p.x-124,p.y-210,2.8);}
        graphics.strokeCircle(p.x-124,p.y-210,p.id===this.selectedBone?3.4:isTail?2.8:1.9);
      }
      if(this.headPivotVisible){
        const h=controller.bones.position('head'),x=h.x-124,y=h.y-210;
        this.markers.lineStyle(1.1,0xed8460,1).strokeCircle(x,y,5);
        this.markers.lineBetween(x-9,y,x+9,y).lineBetween(x,y-9,x,y+9);
        const a=controller.bones.worldAngle('head');this.markers.lineBetween(x,y,x+24*Math.cos(a),y+24*Math.sin(a));
      }
    }
  }
}
