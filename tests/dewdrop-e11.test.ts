import {preAdventureSource} from './helpers/accepted-source.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {spawn,spawnSync} from 'node:child_process';import {setTimeout as delay} from 'node:timers/promises';
import before from '../docs/dewdrop-e11/protected-before.json' with {type:'json'};
test('E1.1 historical lifecycle baseline and all current non-adventure product bytes remain protected',()=>{for(const[f,h]of Object.entries(before))if(f!=='src/collectibles/ForestCollectibleSystem.ts')assert.equal(createHash('sha256').update(preAdventureSource(f)).digest('hex'),h,f);});
test('E1.1 real Phaser: Game.destroy x5, stop/start x3, idempotence, listener/DOM/telemetry ownership', {timeout:90000},async()=>{
 mkdirSync('docs/completion-e3/evidence/prior-e11',{recursive:true});
 const base=process.cwd(),cache=base+'/node_modules/.cache/e11-test';mkdirSync(cache,{recursive:true});mkdirSync(base+'/.pw-sockets',{recursive:true});
 const env={...process.env,TMPDIR:cache,PWTEST_DAEMON_SESSION_DIR:cache,PWTEST_SOCKETS_DIR:base+'/.pw-sockets'};
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],{env,stdio:'ignore'});
 const cli='node_modules/.cache/qa-npm/_npx/31e32ef8478fbf80/node_modules/@playwright/cli/playwright-cli.js';
 const call=(args:string[])=>{const p=spawnSync(process.execPath,[cli,'-s=e11-test',...args],{env,encoding:'utf8',timeout:60000,maxBuffer:10*1024*1024});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout;};
 try{
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5174/')).ok)break}catch{}await delay(100)}
  call(['open','http://127.0.0.1:5174/','--config=docs/dewdrop-e11/browser.json']);
  const output=call(['run-code',readFileSync('tests/browser/dewdrop-e11.browser.js','utf8')]);writeFileSync('docs/completion-e3/evidence/prior-e11/lifecycle.txt',output);
  assert.ok(output.includes('### Result\n'),output);const result=JSON.parse(output.split('### Result\n')[1].split('\n###')[0]);writeFileSync('docs/completion-e3/evidence/prior-e11/lifecycle.json',JSON.stringify(result,null,2)+'\n');
  assert.equal(result.cycles.length,5);assert.ok(result.cycles.every((x:{nodes:number;telemetry:null})=>x.nodes===0&&x.telemetry===null));assert.deepEqual(result.errors,[]);
 }finally{try{call(['close'])}finally{server.kill('SIGTERM')}}
});
