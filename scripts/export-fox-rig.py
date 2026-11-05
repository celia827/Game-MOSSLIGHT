"""Derive animation textures from the approved original. Never rewrite its paths."""
from pathlib import Path
import copy, json, xml.etree.ElementTree as E

NS='http://www.w3.org/2000/svg'
E.register_namespace('',NS)
source=Path('public/assets/characters/nori-fox-idle.svg')
root=E.parse(source).getroot()
defs=root.find(f'{{{NS}}}defs')
wrapper=root.find(f'{{{NS}}}g')
groups={e.get('id'):e for e in wrapper if e.get('id')}
head=[e for e in wrapper if not e.get('id')]
eye_start=next(i for i,e in enumerate(head) if e.get('d','').startswith('M133 77'))
eyes=head[eye_start:eye_start+7]
head=head[:eye_start]+head[eye_start+7:]
out=Path('public/assets/characters/rig');out.mkdir(exist_ok=True,parents=True)

def export(name,nodes,extra=None):
    r=E.Element(f'{{{NS}}}svg',{'width':'200','height':'220','viewBox':'0 0 200 220'})
    if name=='tail':r.set('width','216');r.set('viewBox','-8 0 216 220')
    r.append(copy.deepcopy(defs))
    g=E.SubElement(r,f'{{{NS}}}g',{'stroke-linejoin':'round','stroke-linecap':'round'})
    if extra: g.append(E.fromstring(extra))
    for node in nodes:g.append(copy.deepcopy(node))
    if name=='scarf-side':
        # Same palette and outline: side occlusion and a soft inner fold add wrap depth.
        for path in [
            '<path d="M102 112 Q103 116 109 119 L109 123 Q104 122 102 119Z" fill="#ad9554" opacity=".22"/>',
            '<path d="M108 121 Q123 125 137 118" fill="none" stroke="#ffebba" stroke-width=".65" opacity=".65"/>',
            '<path d="M105 126 Q102 132 101 137" fill="none" stroke="#ad9554" stroke-width=".65" opacity=".32"/>'
        ]:g.append(E.fromstring(path))
    E.ElementTree(r).write(out/(name+'.svg'),encoding='unicode')

for name in ['tail','pack','near-leg','coat-side','near-arm','far-ear','near-ear','scarf-side']:
    export(name,list(groups[name]))
far=list(groups['far-limbs'])
export('far-leg',far[:3])
# Hidden overlap paint only. Existing visible sleeve, paw, colors and outline stay intact.
extra='<path d="M132 124 C123 123 121 130 125 138 L129 155 Q128 166 135 167 Q143 164 140 156 L141 139 Q144 128 132 124Z" fill="#2b7168" stroke="#2c5e53" stroke-width="1.6"/>'
export('far-arm',far[3:],extra)
export('neck-bridge',[], '<path d="M108 107 C115 103 131 104 137 110 C139 116 137 125 134 131 Q121 135 108 127 C105 121 104 113 108 107Z" fill="url(#cream)"/>')
export('head',head)
export('eyes',eyes)
export('blink',[], '<path d="M134 83 Q140 88 147 82" fill="none" stroke="#805333" stroke-width="1.8" stroke-linecap="round"/>')
print('Exported 14 source-derived rig SVGs. Original fox SVG untouched.')
