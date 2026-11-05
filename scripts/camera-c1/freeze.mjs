import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root='docs/versions/level01-art-v1.0',candidate=JSON.parse(fs.readFileSync('docs/art-b3/ART_V1_CANDIDATE.json'));
const mismatches=Object.entries(candidate.files).filter(([f,h])=>createHash('sha256').update(fs.readFileSync(f)).digest('hex')!==h).map(([f])=>f);
if(mismatches.length)throw Error('Candidate drift: '+mismatches.join(','));
for(const d of ['src','tests','scripts'])fs.cpSync(d,`${root}/snapshot/${d}`,{recursive:true});
const paths=[];function scan(p){if(fs.statSync(p).isDirectory())for(const f of fs.readdirSync(p))scan(path.join(p,f));else paths.push(p);}
for(const p of ['src','public','scripts','tests','level01','animation-lab','art-lab','docs/art-b3','index.html','package.json','package-lock.json','vite.config.ts','tsconfig.json','README.md'])if(fs.existsSync(p))scan(p);
const files=Object.fromEntries(paths.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
fs.writeFileSync(`${root}/manifest.json`,JSON.stringify({version:'Level 01 Art V1.0',status:'user-approved-art-baseline',date:'2026-11-02',git:'No .git repository; no commit or tag created',candidateMatched:Object.keys(candidate.files).length,files},null,2));
fs.writeFileSync(`${root}/README.md`,'# Level 01 Art V1.0 已验收基线\n\n用户在C.1任务中明确确认B.3通过视觉验收。候选哈希全部匹配后保存本快照。当前目录不是Git仓库，未初始化仓库，未伪造提交或标签；没有覆盖任何既有修改。\n\nmanifest.json记录源码/素材/配置及B.3资料SHA256。snapshot/保留本轮前的源码、测试和脚本；baseline.tar.gz保留全部源码、公共资源、启动入口、锁文件及B.3验收资料（不含node_modules和dist）。恢复时应先备份当前工作，再在项目根解包归档并按锁文件安装依赖。本轮不会自动执行恢复。\n');
console.log({candidateMatched:Object.keys(candidate.files).length,manifestFiles:paths.length});
