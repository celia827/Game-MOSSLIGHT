import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

test('Adventure real Phaser: restore without rewards, lifecycle/owner cleanup, sound mute/resume, journal focus and denied storage', {timeout:90000},async()=>{
  mkdirSync('docs/completion-e3/evidence/prior-adventure',{recursive:true});
  const base=process.cwd(),cache=base+'/node_modules/.cache/adventure-test';mkdirSync(cache,{recursive:true});mkdirSync(base+'/.pw-sockets',{recursive:true});
  const env={...process.env,TMPDIR:cache,PWTEST_DAEMON_SESSION_DIR:cache,PWTEST_SOCKETS_DIR:base+'/.pw-sockets'};
  const config=cache+'/browser.json';writeFileSync(config,JSON.stringify({browser:{browserName:'chromium',userDataDir:cache+'/profile',launchOptions:{channel:'chrome',headless:true},contextOptions:{viewport:{width:1440,height:1000}}},outputDir:base+'/output/playwright/e3/prior-adventure'}));
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5175','--strictPort'],{env,stdio:'ignore'});
  const cli='node_modules/.cache/qa-npm/_npx/31e32ef8478fbf80/node_modules/@playwright/cli/playwright-cli.js';
  const call=(args:string[])=>{const p=spawnSync(process.execPath,[cli,'-s=adventure-test',...args],{env,encoding:'utf8',timeout:60000,maxBuffer:10*1024*1024});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout;};
  try{
    let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5175/')).ok){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,'test server did not start');
    call(['open','http://127.0.0.1:5175/docs/adventure-v1/lifecycle-fixture.html','--config='+config]);
    for(const name of ['lifecycle','audio-responsive','storage']){
      const source=readFileSync('docs/adventure-v1/'+name+'.js','utf8').replaceAll('127.0.0.1:5173','127.0.0.1:5175').replaceAll('output/playwright/adventure/','output/playwright/e3/prior-adventure/');
      const output=call(['run-code',source]);writeFileSync('docs/completion-e3/evidence/prior-adventure/'+name+'-test.txt',output);
      assert.ok(output.includes('### Result\n'),output);const result=JSON.parse(output.split('### Result\n')[1].split('\n###')[0]);writeFileSync('docs/completion-e3/evidence/prior-adventure/'+name+'-test.json',JSON.stringify(result,null,2)+'\n');assert.deepEqual(result.errors,[],name);
      if(name==='lifecycle'){assert.equal(result.cycles.length,3);assert.equal(result.restarts.length,3);assert.equal(result.ownership,true);}
      if(name==='audio-responsive'){assert.ok(result.tones>0);assert.ok(result.muted&&result.silent&&result.resumed&&result.trapped);assert.equal(result.overflow,false);}
      if(name==='storage')assert.equal(result.saved,false);
    }
  }finally{try{call(['close']);}finally{server.kill('SIGTERM');}}
});
