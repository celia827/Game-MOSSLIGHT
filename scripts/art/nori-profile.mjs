import {path,line,ellipse} from './svg.mjs';

/** A true side-view body: back at left, chest at right, near limbs overlap far limbs. */
export function drawProfileBody() {
  let b='<g id="tail">';
  b+=path('M108 160 C81 169 42 155 23 125 C12 105 8 87 5 89 C-4 116 1 149 24 173 C48 198 81 193 109 177Z','url(#fur)','stroke="#a95032" stroke-width="2.5"');
  b+=path('M23 126 Q12 107 5 90 C-2 109-1 130 7 146 L15 141 L18 151 L27 141 L30 148 L36 145Z','url(#cream)');
  b+=path('M12 143 C29 176 62 184 98 169 L107 179 C78 198 48 194 27 177 Q15 165 9 151Z','#ad5934','opacity=".26"');
  b+=line('M19 150 Q41 180 75 178 M25 145L32 153 M37 156L43 160 M56 169L63 171','#ffcd8e',1.5);
  b+='</g><g id="far-limbs">';
  // The far leg peeks out in front of the near shin; its boot is higher and darker.
  b+=path('M121 167 Q133 168 134 179 L132 197 L121 198 Q119 182 118 176Z','#bb6938','stroke="#995537" stroke-width="1.7"');
  b+=path('M121 192 L132 192 L133 197 Q145 196 148 202 Q148 205 141 205 L121 204 Q119 200 121 192Z','#465d4e','stroke="#354d40" stroke-width="1.8"');
  b+=line('M124 201L144 202','#889577',1);
  // Only a narrow sliver of the far sleeve is visible beyond the chest.
  b+=path('M130 128 Q142 130 142 149 L138 159 L133 157 L133 143Z','#2b7168','stroke="#2c5e53" stroke-width="1.6"');
  b+=path('M135 156 Q140 155 140 162 Q139 167 135 165Z','#c78242');
  b+='</g><g id="pack">';
  // A domed bag projects from the spine; it has no front-facing chest straps.
  b+=path('M74 120L70 99Q75 92 84 98L87 121Z','url(#paper)','stroke="#a39265" stroke-width="1.3"');
  b+=ellipse(77.5,98,7,3.5,'#f8ebc5','stroke="#b5a275" stroke-width="1"');
  b+=line('M73 98Q78 95 81 98Q79 101 76 99 M72 109L85 106','#b4a276',1);
  b+=path('M99 116 C89 109 77 113 73 127 Q69 146 74 161 Q79 170 98 166 L104 153 L105 128Z','url(#pack)','stroke="#5b7352" stroke-width="2.1"');
  b+=path('M95 119 Q105 121 104 133 L101 162 Q99 168 92 166 Q97 142 93 129Z','#647e55');
  b+=path('M74 126 Q77 112 91 117 L99 123 L95 131 Q85 135 73 129Z','#a8b67c','stroke="#677d56" stroke-width="1.4"');
  b+=path('M84 126L90 127L89 138L84 137Z','#8c7950')+path('M85 128L89 129L88 133L85 132Z','#e6cb86');
  b+=path('M74 144Q79 140 85 144L86 156Q81 163 74 158Z','#9ca66e','stroke="#677c55" stroke-width="1"');
  b+=line('M77 126Q84 131 95 126 M76 145L77 155L84 157','#d4ce99',.9,'stroke-dasharray="1.5 2.5"');
  b+='</g><g id="near-leg">';
  b+=path('M108 169 Q119 167 125 173 Q127 185 123 199 L111 200 Q110 184 107 178Z','url(#fur)','stroke="#a55c35" stroke-width="1.9"');
  b+=path('M111 191 Q117 193 124 192 L124 198 L111 199Z','#e6d7ac');
  b+=path('M111 197 Q118 200 124 197 L128 200 Q142 200 143 206 Q143 210 133 210 L110 209 Q106 204 111 197Z','#62705a','stroke="#374f42" stroke-width="2"');
  b+=path('M127 201 Q139 201 140 205 L126 205Z','#7f8969');
  b+=line('M111 206Q121 209 140 207 M115 201L121 201 M116 204L123 204','#ccbf91',1);
  b+='</g><g id="coat-side">';
  // No paired lapels or broad cream panel: the front opening is edge-on on the right.
  b+=path('M104 115 Q116 111 129 119 Q138 127 140 142 Q141 157 136 171 Q119 178 104 171 Q99 149 100 131Z','url(#coat)','stroke="#2b6157" stroke-width="2.2"');
  b+=path('M129 126 Q140 139 138 158 L134 169 L130 171 Q136 150 129 126Z','url(#cream)');
  b+=path('M105 164 Q118 174 137 165 L136 172 Q119 179 104 172Z','#34786a');
  b+=line('M106 168Q118 175 134 169 M134 136Q140 151 134 164','#a3c6a5',.85,'stroke-dasharray="1.5 2.5"');
  b+=line('M103 146 Q100 153 105 159','#256256',1.2);
  // The one visible strap curves over the near shoulder and disappears behind the arm.
  b+=path('M104 117 Q114 116 118 129 L113 141 L109 140 Q114 126 101 122Z','#c6b884','stroke="#74845c" stroke-width="1.2"');
  b+=path('M104 153Q109 156 114 155L115 165L110 168L105 163Z','#b9ad79','stroke="#607959" stroke-width="1"');
  b+=path('M107 157L112 158L112 163L108 163Z','#d7bf77','stroke="#7d7951" stroke-width=".8"');
  b+='</g><g id="near-arm">';
  // The shoulder is on the visible side plane, with the sleeve overlapping the torso.
  b+=path('M111 124 C119 119 127 126 126 137 Q125 148 121 157 L112 157 Q110 150 113 141 Q108 133 111 124Z','url(#sleeve)','stroke="#2d655b" stroke-width="1.9"');
  b+=path('M114 126 Q118 123 122 130 L121 140 Q117 143 115 141Z','#89bfa9','opacity=".7"');
  b+=line('M114 143Q120 148 121 150','#368172',1.2);
  b+=path('M112 153L122 153L121 159L112 159Z','#9cc8b0','stroke="#397969" stroke-width="1"');
  b+=path('M113 159Q117 157 121 160L121 165Q120 170 116 169Q111 168 112 164Z','url(#fur)','stroke="#a75f39" stroke-width="1.3"');
  b+=line('M115 164L115 166 M118 164L118 167','#b16e40',.85);
  b+=path('M116 139Q111 133 119 130Q123 136 116 139Z','#cddd9d')+line('M116 138L119 132','#739b78',.7);
  b+='</g>';
  return b;
}

export function drawProfileScarf() {
  return '<g id="scarf-side">'+
    path('M101 110 Q117 121 138 112 L139 120 Q118 131 101 119Z','url(#scarf)','stroke="#ad9554" stroke-width="1.5"')+
    path('M104 118Q110 122 112 127L108 132L103 125Z','#e3c47b','stroke="#b19552" stroke-width="1"')+
    path('M104 123 Q99 131 96 136 L102 142 Q109 134 109 128Z','#f1d895','stroke="#ad9554" stroke-width="1.1"')+
    line('M104 115Q119 123 136 116 M99 135L101 138 M102 132L105 135','#ffebba',.9)+
    '</g>';
}
