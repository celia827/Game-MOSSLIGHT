async(page)=>{
 const errors=[];const denied=await page.context().newPage();denied.on('pageerror',e=>errors.push(e.message));
 try{
 await denied.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage disabled','QuotaExceededError')}});
 await denied.goto('http://127.0.0.1:5173/level01/');await denied.locator('#loading').waitFor({state:'hidden'});await denied.locator('#game').focus();await denied.keyboard.press('r');await denied.waitForTimeout(300);
 const state=JSON.parse(await denied.locator('body').getAttribute('data-adventure-state'));if(state.saved)throw Error('storage failure falsely reported as saved');
 await denied.keyboard.press('j');const note=await denied.locator('[data-save-note]').textContent();if(!note.includes('未允许保存'))throw Error('missing storage failure guidance');return{saved:state.saved,note,errors};
 }finally{await denied.close()}
}
