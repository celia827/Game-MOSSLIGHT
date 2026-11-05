export const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const line = (d, color, width = 2, extra = '') => path(d, 'none', `stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}`);
export const ellipse = (x,y,rx,ry,fill,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
export const grad = (id,a,b,x2='25%',y2='100%') => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
export const radial = (id,color) => `<radialGradient id="${id}"><stop stop-color="${color}" stop-opacity=".75"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
export const svg = (w,h,body,defs='') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs><g stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>\n`;
