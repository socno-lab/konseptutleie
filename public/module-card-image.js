import {joinedModuleCover} from './module-joined-profiles.js?v=lagoon20261025';

// Catalogues and rental alternatives show the same example of a complete sofa.
export function moduleCardImage(modules){
 if(!modules.length)return '';
 return joinedModuleCover(modules)||(modules.some(p=>p.category==='Utemøbler')?modules[0].image:modules.flatMap(p=>p.gallery||[])[0]||modules[0].image)||'';
}

// Source-specific bounds of the furniture (not the surrounding white canvas).
// Only these exact photos use the profile; new admin uploads keep contain framing.
// Gallery/detail photos and the module builder must never use this card framing.
const sofaCovers={
 '/assets/beige-sofa-tre-moduler.webp':[1024,310,0,5,1022,302],
 '/media/73c49cd2b92a987fb22ae340307580c7':[1591,2000,94,1136,1505,1618],
 '/media/3993f06aed296378b567af4be29bbba1':[1122,1402,106,654,1015,955],
 '/media/544e49c37f1d4bb8c9db5363ad67cb90':[1122,1402,106,634,1016,955],
 '/assets/lagoon-connected-v1.webp':[2172,724,104,150,2067,609],
 '/media/09e34b3bdfc2dd14a2fd1f0915d4bc2c':[1536,1024,15,297,1520,776],
 '/media/9ed8bbde97fa7549978a7df6bdbbae45':[1536,1024,24,317,1511,734],
 '/media/0f6a6cb7eb59879e472aa49bc20333e6':[1500,1500,112,935,1393,1343]
};
export function sofaCoverProfile(src){
 if(!Object.hasOwn(sofaCovers,src))return null;
 const values=sofaCovers[src];
 const [width,height,left,top,right,bottom]=values;
 return {width,height,left,top,right,bottom};
}
const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sofaCardArt(p){
 if(p.category==='Utemøbler'||p.category!=='Sofaer'&&!p.moduleSeries)return '';
 const frame=sofaCoverProfile(p.image);if(!frame)return '';
 const {width,height,left,right,bottom}=frame;
 // Equal visible width (86%) and floor line (68%) at every card aspect ratio.
 // Auto height preserves the original perspective and furniture proportions.
 const size=86*width/(right-left),x=-50*(left+right)/width,y=100*(height-bottom)/height;
 return `<img class="sofa-card-image" src="${html(p.image)}" alt="${html(p.moduleSeries||p.name)}" loading="lazy" decoding="async" style="position:absolute;inset:auto;left:50%;top:auto;bottom:32%;width:${size.toFixed(5)}%!important;height:auto!important;max-width:none;max-height:none;object-fit:contain;transform:translate(${x.toFixed(5)}%,${y.toFixed(5)}%)">`;
}
