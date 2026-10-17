export const wallPresets={single:[[125,18,110,140]],pair:[[65,32,105,125],[190,32,105,125]],quad:[[62,44,82,117],[161,27,56,75],[161,116,56,70],[233,85,60,76]],gallery:[[30,43,85,115],[132,28,85,66],[235,12,70,93],[132,110,60,75],[210,120,88,65]]};
export function presetFrames(key){return wallPresets[key].map(([x,y,w,h])=>({x:+(x/3.4).toFixed(2),y:y/2,width:+(w/3.4).toFixed(2),height:h/2}));}
export function isWall(p){return p?.category==='Bilder'&&p?.isService&&typeof p.wallGroup==='string'&&p.wallGroup.trim().length>0;}
export function wallLabel(p){return p.name.replace(/^Bildevegg\s*[–-]\s*/, '');}
export function frameSketch(frames,label='Skisse av bildevegg'){
 const safe=String(label).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<svg viewBox="0 0 340 200" role="img" aria-label="${safe}"><rect width="340" height="200" rx="6" fill="#eae6dc"/>${frames.map(f=>`<rect x="${Number(f.x)*3.4}" y="${Number(f.y)*2}" width="${Number(f.width)*3.4}" height="${Number(f.height)*2}" fill="#faf8f2" stroke="#9d8971" stroke-width="4"/>`).join('')}</svg>`;
}
