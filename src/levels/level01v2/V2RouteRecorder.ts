/** Preview-only canvas capture. V1's accepted recorder remains untouched. */
export class V2RouteRecorder {
  private recorder?:MediaRecorder;private stream?:MediaStream;private url?:string;private closed=false;private generation=0;
  start(route:string):void {
    if(this.closed||this.recorder?.state==='recording')return;
    const output=document.querySelector<HTMLElement>('#record-status')!,link=document.querySelector<HTMLAnchorElement>('#record-download')!;
    const generation=++this.generation;
    try {
      const canvas=document.querySelector<HTMLCanvasElement>('#game canvas')!,mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
      if(!mime)throw Error('浏览器不支持 WebM');
      this.stream=canvas.captureStream(30);const recorder=this.recorder=new MediaRecorder(this.stream,{mimeType:mime,videoBitsPerSecond:3_000_000}),chunks:BlobPart[]=[];
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onstop=()=>{if(this.closed||generation!==this.generation)return;if(this.url)URL.revokeObjectURL(this.url);this.url=URL.createObjectURL(new Blob(chunks,{type:mime}));link.href=this.url;link.download=`mosslight-v2-p1-${route}.webm`;link.hidden=false;output.textContent='原速 Phaser 画布录像已完成';};
      recorder.onerror=()=>{if(!this.closed)output.textContent='录制失败';};link.hidden=true;recorder.start(1000);output.textContent='正在录制实际游戏画布（30fps）…';
    }catch(e){this.stream?.getTracks().forEach(t=>t.stop());output.textContent=`录制不可用：${String(e)}`;}
  }
  stop():void{if(this.recorder?.state==='recording')this.recorder.stop();this.stream?.getTracks().forEach(t=>t.stop());}
  destroy():void{if(this.closed)return;this.closed=true;this.generation++;this.stop();if(this.url)URL.revokeObjectURL(this.url);this.url=undefined;}
}
