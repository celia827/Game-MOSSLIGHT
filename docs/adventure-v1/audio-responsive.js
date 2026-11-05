async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.audioContexts=[];window.toneCount=0;const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.audioContexts.push(this)}createOscillator(){window.toneCount++;return super.createOscillator()}}});
 await page.goto('http://127.0.0.1:5173/level01/');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#game').focus();await page.keyboard.press('r');
 await page.keyboard.down('d');await page.waitForTimeout(750);await page.keyboard.up('d');
 const tones=await page.evaluate(()=>window.toneCount);if(!tones)throw Error('No generated footsteps');
 await page.locator('[data-sound]').click();await page.waitForTimeout(100);const muted=await page.evaluate(()=>window.audioContexts.every(c=>c.state==='suspended'));
 const before=await page.evaluate(()=>window.toneCount);await page.locator('#game').focus();await page.keyboard.down('d');await page.waitForTimeout(750);await page.keyboard.up('d');const silent=await page.evaluate(n=>window.toneCount===n,before);
 await page.locator('[data-sound]').click();await page.waitForTimeout(100);const resumed=await page.evaluate(()=>window.audioContexts.some(c=>c.state==='running'));
 if(!muted||!silent||!resumed)throw Error('Audio mute/resume failed');
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:760,height:640});await page.locator('#game').focus();const pauseStarted=await page.evaluate(()=>performance.now());await page.keyboard.press('j');await page.waitForFunction(()=>!document.querySelector('#journey-journal').hidden&&window.audioContexts.length>0&&window.audioContexts.every(c=>c.state==='suspended'),{},{timeout:2500});const pauseObservedMs=await page.evaluate(t=>performance.now()-t,pauseStarted);const pausedAudio=await page.evaluate(()=>window.audioContexts.every(c=>c.state==='suspended'));if(!pausedAudio)throw Error('Journal did not pause sound');await page.locator('.scene-frame').screenshot({path:'output/playwright/adventure/journal-760.png'});
 await page.keyboard.press('Tab');const trapped=await page.evaluate(()=>document.querySelector('#journey-journal').contains(document.activeElement));if(!trapped)throw Error('Journal focus escaped');
 await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});await page.locator('.scene-frame').screenshot({path:'output/playwright/adventure/mobile-390.png'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);if(overflow)throw Error('Mobile horizontal overflow');
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 return{tones,muted,silent,resumed,pausedAudio,pauseObservedMs,trapped,overflow,errors};
}
