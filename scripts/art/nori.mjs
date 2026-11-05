import {drawProfileBody,drawProfileScarf} from './nori-profile.mjs';
import {path,line,ellipse,grad} from './svg.mjs';

export function drawNori() {
// Right-facing profile: overlap and silhouette are defined before surface details.
let fox=drawProfileBody();
// The ear pair belongs to the rear crown, behind the eye. The far ear is a small
// occluded back surface; only the near ear exposes its inner concha to the viewer.
fox+='<g id="far-ear">';
fox+=path('M107 51 Q109 34 119 22 Q123 17 125 25 Q131 39 130 54Z','#d78b4a','stroke="#aa663b" stroke-width="2"');
fox+=path('M120 25 Q123 35 124 43 L120 45 Q120 34 120 25Z','#eeb16c');
fox+='</g>';
fox+='<g id="near-ear">';
fox+=path('M88 60 C84 43 85 24 90 13 Q92 8 97 12 C111 24 121 40 124 57 L113 68Z','url(#fur)','stroke="#a45333" stroke-width="2.5"');
fox+=path('M95 48 Q90 34 94 22 Q106 33 113 50 Q103 45 95 48Z','#bb7657');
fox+=path('M97 43 Q94 33 95 28 Q103 36 107 44 L103 42 L103 47Z','#edb58a');
fox+=path('M94 51L95 44L100 48L102 43L106 49L109 47L113 54Z','#ffe0b1');
fox+=line('M91 19 Q87 36 92 49','#ffd394',1.4);
fox+='</g>';
// Fill the head over both roots, then omit its outline across the near ear base.
// This joins head and ear into one silhouette instead of a pasted-on triangle.
fox+=path('M78 72 C76 49 101 39 124 43 C150 44 156 66 157 82 Q166 88 179 88 L177 99 Q165 111 143 114 C125 128 99 119 86 108 L74 107 L80 99 L70 96 L79 89Z','url(#fur)');
fox+=line('M88 52 C80 57 77 65 78 72 L79 89 L70 96 L80 99 L74 107 L86 108 C99 119 125 128 143 114 Q165 111 177 99 L179 88 Q166 88 157 82 C156 66 150 44 124 43','#a45333',2.5);
fox+=path('M88 62Q98 47 116 48L110 42L118 43L116 38Q129 40 134 47Q116 44 103 57Z','#ffcc7c');
fox+=path('M85 77Q82 94 97 104Q111 119 130 111Q119 126 100 116L86 109L74 107L80 99L70 96L79 89Z','#c7763e','opacity=".3"');
fox+=path('M84 85 Q98 77 112 91 Q120 102 133 96 Q151 89 168 93 L177 94 Q171 108 144 111 Q125 125 105 115 Q91 111 81 99 L87 99 L80 92Z','url(#cream)');
fox+=path('M91 92Q106 88 114 102Q128 115 145 105Q136 117 119 116Q102 112 96 103L92 106L91 100L85 99Z','#fff3d0');
fox+=line('M89 93L94 96 M91 98L97 101 M98 106L103 108 M108 111L114 112','#d2b887',.85);
fox+=path('M170 88 Q180 84 182 91 Q182 96 175 97 Q170 94 170 88Z','#374c43')+ellipse(177,89.5,2,1,'#8d9e85');
fox+=path('M133 77Q140 69 147 76Q151 88 142 94Q134 93 133 77Z','#704f32');
fox+=path('M135 78Q141 73 146 78Q149 89 141 92Q135 91 135 78Z','url(#iris)')+ellipse(142,83,3.6,6.5,'#2e443b')+ellipse(142,78.5,2.3,3.2,'#fff8de')+ellipse(138.4,87.3,1.15,1.2,'#f6dfb3');
fox+=line('M134 77Q140 72 146 76','#885632',1.4)+line('M145 94L150 93','#f6c782',1.3);
fox+=ellipse(152,99,1,.8,'#b69362')+ellipse(155.5,97.8,.9,.7,'#b69362')+ellipse(157.2,101,.8,.6,'#b69362');
fox+=line('M133 69 Q139 64 145 69','#a35b37',2.4)+line('M160 102 Q166 105 171 100','#945e45',1.8);
fox+=drawProfileScarf();
fox+=line('M89 62Q101 49 115 51','#ffc682',2.5,'opacity=".75"');
return {body:fox, defs:
grad('fur','#ffc16a','#dd7839')+grad('cream','#fff4d3','#e8cea0')+grad('coat','#65aa99','#2c7269')+grad('sleeve','#79b5a2','#337c6f')+grad('pack','#a8b47b','#667c51')+grad('scarf','#f9dfa1','#c9a459')+grad('paper','#fff1c9','#cdbb8b')+grad('iris','#c89d58','#426a50')};
}
