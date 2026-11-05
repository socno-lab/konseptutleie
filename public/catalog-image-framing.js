import {catalogImageBounds} from './catalog-image-bounds.js?v=frames20261105';
// Visible furniture dimensions, not source-canvas dimensions. Percent of card.
export const imageFrameRules={
 chair:{width:78,height:68,bottom:14},
 lounge:{width:82,height:65,bottom:14},
 table:{width:84,height:60,bottom:18},
 tall:{width:76,height:72,bottom:12},
 sofa:{width:86,height:54,bottom:32},
 decor:{width:70,height:62,bottom:16},
 rug:{width:84,height:72,bottom:14}
};
export function productImageType(p){
 if(!p||p.isPackage||p.isService||p.isProposal||['Pakker','Styling','Bilder'].includes(p.category))return '';
 const n=(p.name||'').toLocaleLowerCase('nb-NO');
 if(p.category==='Sofaer')return 'sofa';
 if(p.category==='Stoler'||p.category==='Utemøbler'&&/stol|chair/.test(n))return /lounge|lenestol|benk|bench|puff/.test(n)?'lounge':'chair';
 if(p.category==='Bord'||p.category==='Utemøbler'&&/bord|table/.test(n))return /ståbord|barbord/.test(n)?'tall':'table';
 if(p.category==='Tepper')return 'rug';
 if(/speil|mirror/.test(n)||['Hyller','Kunstige planter'].includes(p.category)||/gulvlampe|floor lamp/.test(n))return 'tall';
 if(['Belysning','Kunstige blomster','Tilvalg','Annet'].includes(p.category))return 'decor';
 if(p.category==='Senger')return 'table';
 return '';
}
export function catalogImageFrame(p,src=p?.image){
 const type=productImageType(p),bounds=catalogImageBounds[src];
 if(!type||!bounds)return null;
 const [w,h,l,t,r,b]=bounds,rule=imageFrameRules[type];
 return {type,bounds,width:rule.width*w/(r-l),height:rule.height*w/(b-t),x:-50*(l+r)/w,y:100*(h-b)/h,bottom:rule.bottom};
}
export function catalogImageFrameAttributes(p){
 const f=catalogImageFrame(p);if(!f)return '';
 const num=n=>n.toFixed(5);
 return `data-image-frame="${f.type}" style="--frame-width:${num(f.width)}cqw;--frame-height:${num(f.height)}cqh;--frame-x:${num(f.x)}%;--frame-y:${num(f.y)}%;--frame-bottom:${f.bottom}%"`;
}
// Called during the shared server/client card render, never after image load.
export function frameCatalogMarkup(markup,p){
 const attributes=catalogImageFrameAttributes(p);
 if(!attributes||markup.includes('sofa-card-image')||markup.includes('data-build=')||markup.includes('data-wall='))return markup;
 return markup.replace(/<img\b/,()=>'<img '+attributes);
}
