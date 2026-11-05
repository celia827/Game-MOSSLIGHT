/** Canvas-only capture: no microphone, desktop capture, or external upload. */
export class LevelRouteRecorder {
  private recorder?:MediaRecorder;private stream?:MediaStream;private url?:string;
  start(route:string):void {
    const output=document.querySelector<HTMLElement>('#record-status')!;
    const link=document.querySelector<HTMLAnchorElement>('#record-download')!;
    if(this.recorder?.state==='recording')return;
    try {
      const canvas=document.querySelector<HTMLCanvasElement>('#game canvas')!;
      const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
      if(!mime)throw new Error('浏览器不支持 WebM 录制');
      this.stream=canvas.captureStream(30);
      const recorder=new MediaRecorder(this.stream,{mimeType:mime,videoBitsPerSecond:3_000_000});
      this.recorder=recorder;const chunks:BlobPart[]=[];
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onstop=()=>{
        if(this.url)URL.revokeObjectURL(this.url);
        this.url=URL.createObjectURL(new Blob(chunks,{type:mime}));
        link.href=this.url;link.download=`mosslight-a1-${route}.webm`;link.hidden=false;
        output.textContent='录制完成，可下载实际游戏画面';
      };
      recorder.onerror=()=>{output.textContent='录制失败，请按验收文档人工录制';};
      link.hidden=true;recorder.start(1000);output.textContent='正在录制游戏画布…';
    } catch(error) {output.textContent=`录制不可用：${error instanceof Error?error.message:String(error)}`;this.stream?.getTracks().forEach(t=>t.stop());}
  }
  stop():void {
    if(this.recorder?.state==='recording')this.recorder.stop();
    this.stream?.getTracks().forEach(t=>t.stop());
  }
  destroy():void {this.stop();if(this.url)URL.revokeObjectURL(this.url);}
}
