from pathlib import Path
import tarfile,json,hashlib
root=Path.cwd();base=root/'docs/versions/level01-art-v1.0';archive=base/'baseline.tar.gz';new=base/'baseline.complete.tar.gz'
extra=['docs/art-b1/protected-before.json','docs/art-b2a/protected-before.json','docs/art-b2b/protected-before.json','docs/art-b2c/protected-before.json','AGENTS.md','.gitignore']
with tarfile.open(archive,'r:gz') as old,tarfile.open(new,'w:gz') as out:
 names=set()
 for m in old:
  names.add(m.name);out.addfile(m,old.extractfile(m) if m.isfile() else None)
 for name in extra:
  if name not in names:out.add(root/name,arcname=name)
new.replace(archive)
manifest=json.loads((base/'manifest.json').read_text())
for name in extra:manifest['files'][name]=hashlib.sha256((root/name).read_bytes()).hexdigest()
manifest['recoveryNote']='Added historical hash-test manifests; original archived src/tests remain the pre-C1 version.'
(base/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
check=root/'tmp/camera-c1-art-v1-restore-check';check.mkdir(parents=True,exist_ok=False)
with tarfile.open(archive,'r:gz') as data:
 for m in data:
  if m.name.startswith(('scripts/','src/','public/','tests/','level01/','art-lab/','animation-lab/')) or m.name in extra or m.name in ['package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json']:
   data.extract(m,check) # trusted local archive generated above; supports system Python 3.9
print(check)
